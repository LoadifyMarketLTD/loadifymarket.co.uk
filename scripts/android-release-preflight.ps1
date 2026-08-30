param(
    [string]$DeviceSerial = "2A141FDH300HZL",
    [string]$BackupDir = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Package = "co.uk.loadifymarket.app"
$ExpectedInstalledCertSha256 = "0365a35b3413daf8c76e0bab2f56d898b94895dcee9e27151a03e1778bb97f24"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$AndroidAppDir = Join-Path $RepoRoot "android\app"
$BackupRoot = Join-Path $env:USERPROFILE "Desktop\LoadifyMarket-Android-Backups"
$EnvLocalPath = Join-Path $RepoRoot ".env.local"

function Pass([string]$Message) { Write-Host "PASS: $Message" -ForegroundColor Green }
function Info([string]$Message) { Write-Host "INFO: $Message" -ForegroundColor Cyan }
function Warn([string]$Message) { Write-Host "WARN: $Message" -ForegroundColor Yellow }
function Fail([string]$Message) { Write-Host "FAIL: $Message" -ForegroundColor Red }

function Find-ApkSigner {
    $roots = @()
    if ($env:ANDROID_HOME) { $roots += $env:ANDROID_HOME }
    if ($env:ANDROID_SDK_ROOT) { $roots += $env:ANDROID_SDK_ROOT }
    $roots += (Join-Path $env:LOCALAPPDATA "Android\Sdk")

    foreach ($root in ($roots | Select-Object -Unique)) {
        if (-not (Test-Path $root)) { continue }
        $candidate = Get-ChildItem (Join-Path $root "build-tools") -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName "apksigner.bat" } |
            Where-Object { Test-Path $_ } |
            Select-Object -First 1
        if ($candidate) { return $candidate }
    }
    return $null
}

function Get-ApkCertSha256([string]$ApkPath, [string]$ApkSigner) {
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = @(& $ApkSigner verify --print-certs $ApkPath 2>&1 | ForEach-Object { $_.ToString() })
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($exitCode -ne 0) { return $null }
    $line = $output | Select-String -Pattern "Signer #1 certificate SHA-256 digest:" | Select-Object -First 1
    if (-not $line) { return $null }
    return (($line.ToString() -split ":", 2)[1]).Trim().ToLowerInvariant()
}

function Read-KeyValueFile([string]$Path) {
    $map = @{}
    if (-not (Test-Path $Path)) { return $map }

    foreach ($line in Get-Content $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#') -or $trimmed.StartsWith('!')) { continue }
        $index = $trimmed.IndexOf('=')
        if ($index -lt 1) { $index = $trimmed.IndexOf(':') }
        if ($index -lt 1) { continue }

        $name = $trimmed.Substring(0, $index).Trim()
        $value = $trimmed.Substring($index + 1).Trim()
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        $map[$name] = $value
    }
    return $map
}

function Decode-JwtPayload([string]$Token) {
    try {
        $parts = $Token.Split('.')
        if ($parts.Count -lt 2) { return $null }
        $payload = $parts[1].Replace('-', '+').Replace('_', '/')
        switch ($payload.Length % 4) {
            2 { $payload += '==' }
            3 { $payload += '=' }
        }
        $json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload))
        return $json | ConvertFrom-Json
    } catch {
        return $null
    }
}

$repoProps = Read-KeyValueFile (Join-Path $RepoRoot "android\gradle.properties")
$userProps = Read-KeyValueFile (Join-Path $HOME ".gradle\gradle.properties")
$envLocal = Read-KeyValueFile $EnvLocalPath

function Get-ReleaseSetting([string]$Name) {
    $envValue = [Environment]::GetEnvironmentVariable($Name)
    if (-not [string]::IsNullOrWhiteSpace($envValue)) { return $envValue.Trim() }
    if ($repoProps.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace([string]$repoProps[$Name])) {
        return ([string]$repoProps[$Name]).Trim()
    }
    if ($userProps.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace([string]$userProps[$Name])) {
        return ([string]$userProps[$Name]).Trim()
    }
    return ""
}

function Get-RuntimeSetting([string]$Name) {
    $envValue = [Environment]::GetEnvironmentVariable($Name)
    if (-not [string]::IsNullOrWhiteSpace($envValue)) { return $envValue.Trim() }
    if ($envLocal.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace([string]$envLocal[$Name])) {
        return ([string]$envLocal[$Name]).Trim()
    }
    return ""
}

function Resolve-KeystorePath([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    $candidates = @($Value)
    if (-not [System.IO.Path]::IsPathRooted($Value)) {
        $candidates += (Join-Path $AndroidAppDir $Value)
        $candidates += (Join-Path $RepoRoot $Value)
        $candidates += (Join-Path $HOME $Value)
    }

    foreach ($candidate in ($candidates | Select-Object -Unique)) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }
    return $null
}

Write-Host "`n=== LOADIFY RELEASE / ROLLBACK PREFLIGHT ===" -ForegroundColor Cyan
Write-Host "Device: $DeviceSerial"
Write-Host "Package: $Package"
Write-Host "Expected signing certificate SHA-256: $ExpectedInstalledCertSha256"

$ApkSigner = Find-ApkSigner
if ($ApkSigner) { Pass "Android apksigner is available" } else { Fail "Android apksigner is unavailable" }

if ([string]::IsNullOrWhiteSpace($BackupDir) -and (Test-Path $BackupRoot)) {
    $latest = Get-ChildItem $BackupRoot -Directory -Filter "installed-*" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if ($latest) { $BackupDir = $latest.FullName }
}

Write-Host "`n=== ROLLBACK BACKUP ===" -ForegroundColor Cyan
$backupReady = $false
if (-not [string]::IsNullOrWhiteSpace($BackupDir) -and (Test-Path $BackupDir)) {
    $backupApk = Join-Path $BackupDir "base.apk"
    $shaFile = Join-Path $BackupDir "sha256.txt"

    if ((Test-Path $backupApk) -and (Test-Path $shaFile)) {
        $expectedHashLine = Get-Content $shaFile | Where-Object { $_ -match '\s+base\.apk\s*$' } | Select-Object -First 1
        $expectedHash = if ($expectedHashLine) { (($expectedHashLine -split '\s+')[0]).ToLowerInvariant() } else { "" }
        $actualHash = (Get-FileHash -Algorithm SHA256 $backupApk).Hash.ToLowerInvariant()

        if ($expectedHash -and $actualHash -eq $expectedHash) {
            Pass "Rollback base.apk SHA-256 matches saved manifest"
            if ($ApkSigner) {
                $backupCert = Get-ApkCertSha256 $backupApk $ApkSigner
                if ($backupCert -eq $ExpectedInstalledCertSha256) {
                    Pass "Rollback APK certificate matches Loadify release lineage"
                    $backupReady = $true
                } else {
                    Fail "Rollback APK certificate does not match expected Loadify release certificate"
                }
            }
        } else {
            Fail "Rollback base.apk hash does not match sha256.txt"
        }
        Info "Rollback folder: $BackupDir"
    } else {
        Fail "Rollback folder is missing base.apk or sha256.txt"
    }
} else {
    Fail "No installed-app backup folder was found"
}

Write-Host "`n=== CURRENT DEVICE IDENTITY ===" -ForegroundColor Cyan
$deviceReady = $false
adb start-server | Out-Null
$state = ((adb -s $DeviceSerial get-state 2>$null) | Out-String).Trim()
if ($state -eq 'device') {
    Pass "Pixel device is connected and authorized"
    $installedPathLine = adb -s $DeviceSerial shell pm path $Package 2>$null | Select-Object -First 1
    if ($installedPathLine -and $installedPathLine -match '^package:') {
        $remoteApk = ($installedPathLine -replace '^package:', '').Trim()
        $tempApk = Join-Path $env:TEMP "loadify-preflight-installed.apk"
        if (Test-Path $tempApk) { Remove-Item $tempApk -Force }

        adb -s $DeviceSerial pull $remoteApk $tempApk | Out-Null
        if ($LASTEXITCODE -eq 0 -and (Test-Path $tempApk) -and $ApkSigner) {
            $deviceCert = Get-ApkCertSha256 $tempApk $ApkSigner
            if ($deviceCert -eq $ExpectedInstalledCertSha256) {
                Pass "Installed app certificate matches Loadify release lineage"
                $deviceReady = $true
            } else {
                Fail "Installed app certificate differs from expected Loadify release certificate"
            }
        } else {
            Fail "Could not pull installed app for certificate verification"
        }
        Remove-Item $tempApk -Force -ErrorAction SilentlyContinue
    } else {
        Fail "$Package is not installed on the connected Pixel"
    }
} else {
    Fail "Pixel device is not currently available or authorized through ADB"
}

Write-Host "`n=== LOCAL RELEASE SIGNING MATERIAL ===" -ForegroundColor Cyan
$names = @(
    'LOADIFY_UPLOAD_STORE_FILE',
    'LOADIFY_UPLOAD_KEY_ALIAS',
    'LOADIFY_UPLOAD_STORE_PASSWORD',
    'LOADIFY_UPLOAD_KEY_PASSWORD'
)
$values = @{}
foreach ($name in $names) {
    $values[$name] = Get-ReleaseSetting $name
    if ([string]::IsNullOrWhiteSpace([string]$values[$name])) {
        Write-Host "$name = MISSING" -ForegroundColor Yellow
    } else {
        Write-Host "$name = SET" -ForegroundColor Green
    }
}

$keystorePath = Resolve-KeystorePath ([string]$values['LOADIFY_UPLOAD_STORE_FILE'])
if ($keystorePath) { Pass "Configured release keystore file exists" } else { Fail "Configured release keystore file is missing or unresolvable" }

$signingFieldsReady = @($names | ForEach-Object { -not [string]::IsNullOrWhiteSpace([string]$values[$_]) })
$signingReady = ($signingFieldsReady -notcontains $false) -and [bool]$keystorePath

if ($signingReady) {
    $certTemp = Join-Path $env:TEMP "loadify-keystore-cert.der"
    if (Test-Path $certTemp) { Remove-Item $certTemp -Force }

    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $keytoolOutput = @(& keytool -exportcert `
            -alias ([string]$values['LOADIFY_UPLOAD_KEY_ALIAS']) `
            -keystore $keystorePath `
            -storepass ([string]$values['LOADIFY_UPLOAD_STORE_PASSWORD']) `
            -file $certTemp 2>&1 | ForEach-Object { $_.ToString() })
        $keytoolExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
    }

    if ($keytoolExitCode -eq 0 -and (Test-Path $certTemp)) {
        $keystoreCert = (Get-FileHash -Algorithm SHA256 $certTemp).Hash.ToLowerInvariant()
        Remove-Item $certTemp -Force -ErrorAction SilentlyContinue
        if ($keystoreCert -eq $ExpectedInstalledCertSha256) {
            Pass "Local keystore certificate EXACTLY matches installed Loadify release certificate"
        } else {
            Fail "Local keystore certificate does NOT match installed Loadify release certificate"
            $signingReady = $false
        }
    } else {
        Remove-Item $certTemp -Force -ErrorAction SilentlyContinue
        Fail "Local keystore could not be opened with configured password and alias"
        $signingReady = $false
    }
}

Write-Host "`n=== RUNTIME BUILD CONFIG ===" -ForegroundColor Cyan
$firebaseReady = $false
$firebasePath = Join-Path $AndroidAppDir "google-services.json"
if (Test-Path $firebasePath) {
    try {
        $firebaseJson = Get-Content $firebasePath -Raw | ConvertFrom-Json
        $clients = @($firebaseJson.client)
        $matchingClients = @($clients | Where-Object { $_.client_info.android_client_info.package_name -eq $Package })
        $hasProjectNumber = -not [string]::IsNullOrWhiteSpace([string]$firebaseJson.project_info.project_number)
        $hasProjectId = -not [string]::IsNullOrWhiteSpace([string]$firebaseJson.project_info.project_id)
        $hasAppId = $matchingClients.Count -gt 0 -and -not [string]::IsNullOrWhiteSpace([string]$matchingClients[0].client_info.mobilesdk_app_id)
        $hasApiKey = $matchingClients.Count -gt 0 -and @($matchingClients[0].api_key).Count -gt 0 -and -not [string]::IsNullOrWhiteSpace([string]$matchingClients[0].api_key[0].current_key)

        git -C $RepoRoot check-ignore -q -- "android/app/google-services.json"
        $firebaseIgnored = ($LASTEXITCODE -eq 0)

        if ($hasProjectNumber -and $hasProjectId -and $hasAppId -and $hasApiKey -and $firebaseIgnored) {
            Pass "google-services.json is structurally valid, package-matched and gitignored"
            $firebaseReady = $true
        } else {
            Fail "google-services.json is incomplete, package-mismatched or not gitignored"
        }
    } catch {
        Fail "google-services.json is not valid JSON"
    }
} else {
    Warn "google-services.json is currently missing locally"
}

# Current checkout is server-driven through create-checkout and does not consume
# VITE_STRIPE_PUBLISHABLE_KEY in the APK client. Keep it informational only.
$requiredRuntimeNames = @(
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_APP_URL'
)
$runtimeValues = @{}
$runtimeReady = $true
foreach ($name in $requiredRuntimeNames) {
    $runtimeValues[$name] = Get-RuntimeSetting $name
    if ([string]::IsNullOrWhiteSpace([string]$runtimeValues[$name])) {
        Write-Host "$name = MISSING" -ForegroundColor Yellow
        $runtimeReady = $false
    } else {
        Write-Host "$name = SET" -ForegroundColor Green
    }
}

$stripePublishableKey = Get-RuntimeSetting 'VITE_STRIPE_PUBLISHABLE_KEY'
if ([string]::IsNullOrWhiteSpace($stripePublishableKey)) {
    Write-Host "VITE_STRIPE_PUBLISHABLE_KEY = OPTIONAL / NOT SET" -ForegroundColor DarkGray
} elseif ($stripePublishableKey -match '^pk_(live|test)_[A-Za-z0-9]+$') {
    Write-Host "VITE_STRIPE_PUBLISHABLE_KEY = OPTIONAL / SET" -ForegroundColor Green
} else {
    Warn "VITE_STRIPE_PUBLISHABLE_KEY is present but malformed; ignored because current checkout does not consume it"
}

if ($runtimeReady) {
    if ([string]$runtimeValues['VITE_SUPABASE_URL'] -notmatch '^https://[A-Za-z0-9-]+\.supabase\.co/?$') {
        Fail "VITE_SUPABASE_URL format is invalid"
        $runtimeReady = $false
    }

    $publicClientKey = [string]$runtimeValues['VITE_SUPABASE_ANON_KEY']
    if ($publicClientKey -match '\s') {
        Fail "VITE_SUPABASE_ANON_KEY contains whitespace or newline"
        $runtimeReady = $false
    } elseif ($publicClientKey.StartsWith('sb_publishable_')) {
        Pass "Supabase public client key uses modern publishable-key format"
    } elseif ($publicClientKey -match '^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$') {
        $payload = Decode-JwtPayload $publicClientKey
        if (-not $payload -or -not ($payload.PSObject.Properties.Name -contains 'role') -or [string]$payload.role -ne 'anon') {
            Fail "Legacy Supabase client key does not decode to role=anon"
            $runtimeReady = $false
        } else {
            Pass "Supabase public client key uses legacy anon-JWT format"
        }
    } else {
        Fail "VITE_SUPABASE_ANON_KEY is neither a legacy anon JWT nor a modern sb_publishable_ key"
        $runtimeReady = $false
    }

    if ([string]$runtimeValues['VITE_APP_URL'] -notmatch '^https://(?:www\.)?loadifymarket\.co\.uk/?$') {
        Fail "VITE_APP_URL is not the expected Loadify production URL"
        $runtimeReady = $false
    }

    if (Test-Path $EnvLocalPath) {
        git -C $RepoRoot check-ignore -q -- ".env.local"
        if ($LASTEXITCODE -ne 0) {
            Fail ".env.local exists but is not gitignored"
            $runtimeReady = $false
        }
    }

    if ($runtimeReady) {
        Pass "Required public VITE runtime values are present and structurally valid"
    }
}

Write-Host "`n=== PREFLIGHT RESULT ===" -ForegroundColor Cyan
if ($backupReady -and $deviceReady -and $signingReady -and $firebaseReady -and $runtimeReady) {
    Pass "FULL RELEASE PREFLIGHT READY - release candidate build may proceed; no install was attempted"
} else {
    Warn "Release update is NOT ready yet. No build, install or update was attempted."
}
