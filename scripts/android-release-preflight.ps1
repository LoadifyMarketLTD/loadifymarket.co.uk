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
    $out = & $ApkSigner verify --print-certs $ApkPath 2>&1
    if ($LASTEXITCODE -ne 0) { return $null }
    $line = $out | Select-String -Pattern "Signer #1 certificate SHA-256 digest:" | Select-Object -First 1
    if (-not $line) { return $null }
    return (($line.ToString() -split ":", 2)[1]).Trim().ToLowerInvariant()
}

function Read-GradleProperties([string]$Path) {
    $map = @{}
    if (-not (Test-Path $Path)) { return $map }
    foreach ($line in Get-Content $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#') -or $trimmed.StartsWith('!')) { continue }
        $idx = $trimmed.IndexOf('=')
        if ($idx -lt 1) { $idx = $trimmed.IndexOf(':') }
        if ($idx -lt 1) { continue }
        $name = $trimmed.Substring(0, $idx).Trim()
        $value = $trimmed.Substring($idx + 1).Trim()
        $map[$name] = $value
    }
    return $map
}

$repoProps = Read-GradleProperties (Join-Path $RepoRoot "android\gradle.properties")
$userProps = Read-GradleProperties (Join-Path $HOME ".gradle\gradle.properties")

function Get-ReleaseSetting([string]$Name) {
    $envValue = [Environment]::GetEnvironmentVariable($Name)
    if (-not [string]::IsNullOrWhiteSpace($envValue)) { return $envValue.Trim() }
    if ($repoProps.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace([string]$repoProps[$Name])) { return ([string]$repoProps[$Name]).Trim() }
    if ($userProps.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace([string]$userProps[$Name])) { return ([string]$userProps[$Name]).Trim() }
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

if ([string]::IsNullOrWhiteSpace($BackupDir)) {
    if (Test-Path $BackupRoot) {
        $latest = Get-ChildItem $BackupRoot -Directory -Filter "installed-*" -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latest) { $BackupDir = $latest.FullName }
    }
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
        }
    } else {
        Fail "$Package is not installed on the connected Pixel"
    }
} else {
    Fail "Pixel device is not currently available/authorized through ADB"
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
if ($keystorePath) { Pass "Configured release keystore file exists" } else { Fail "Configured release keystore file is missing/unresolvable" }

$signingFieldsReady = $names | ForEach-Object { -not [string]::IsNullOrWhiteSpace([string]$values[$_]) }
$signingReady = ($signingFieldsReady -notcontains $false) -and [bool]$keystorePath

if ($signingReady) {
    $certTemp = Join-Path $env:TEMP "loadify-keystore-cert.der"
    if (Test-Path $certTemp) { Remove-Item $certTemp -Force }
    & keytool -exportcert -alias ([string]$values['LOADIFY_UPLOAD_KEY_ALIAS']) -keystore $keystorePath -storepass ([string]$values['LOADIFY_UPLOAD_STORE_PASSWORD']) -file $certTemp 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0 -and (Test-Path $certTemp)) {
        $keystoreCert = (Get-FileHash -Algorithm SHA256 $certTemp).Hash.ToLowerInvariant()
        Remove-Item $certTemp -Force -ErrorAction SilentlyContinue
        if ($keystoreCert -eq $ExpectedInstalledCertSha256) {
            Pass "Local keystore certificate EXACTLY matches installed Loadify release certificate"
        } else {
            Fail "Local keystore certificate does NOT match the installed Loadify release certificate"
            $signingReady = $false
        }
    } else {
        Fail "Local keystore could not be opened with the configured store password/alias"
        $signingReady = $false
    }
}

Write-Host "`n=== RUNTIME BUILD CONFIG ===" -ForegroundColor Cyan
$firebasePath = Join-Path $AndroidAppDir "google-services.json"
if (Test-Path $firebasePath) { Pass "google-services.json is present locally" } else { Warn "google-services.json is currently missing locally" }

$runtimeNames = @('VITE_SUPABASE_URL','VITE_SUPABASE_ANON_KEY','VITE_STRIPE_PUBLISHABLE_KEY','VITE_APP_URL')
foreach ($name in $runtimeNames) {
    $v = [Environment]::GetEnvironmentVariable($name)
    if ([string]::IsNullOrWhiteSpace($v)) {
        Write-Host "$name = NOT SET IN PROCESS" -ForegroundColor Yellow
    } else {
        Write-Host "$name = SET IN PROCESS" -ForegroundColor Green
    }
}

Write-Host "`n=== PREFLIGHT RESULT ===" -ForegroundColor Cyan
if ($backupReady -and $deviceReady -and $signingReady) {
    Pass "Rollback + device lineage + local signing identity are ready"
} else {
    Warn "Release update is NOT ready yet. No build/install/update was attempted."
}
Write-Host "Firebase/runtime configuration is reported separately above and must also be complete before any release candidate is built."
