param(
    [string]$BackupDir = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Package = "co.uk.loadifymarket.app"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$AndroidAppDir = Join-Path $RepoRoot "android\app"
$BackupRoot = Join-Path $env:USERPROFILE "Desktop\LoadifyMarket-Android-Backups"
$EnvTarget = Join-Path $RepoRoot ".env.local"
$FirebaseTarget = Join-Path $AndroidAppDir "google-services.json"

function Pass([string]$Message) { Write-Host "PASS: $Message" -ForegroundColor Green }
function Info([string]$Message) { Write-Host "INFO: $Message" -ForegroundColor Cyan }
function Warn([string]$Message) { Write-Host "WARN: $Message" -ForegroundColor Yellow }
function Fail([string]$Message) { Write-Host "FAIL: $Message" -ForegroundColor Red }

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

function Find-Aapt2 {
    $roots = @()
    if ($env:ANDROID_HOME) { $roots += $env:ANDROID_HOME }
    if ($env:ANDROID_SDK_ROOT) { $roots += $env:ANDROID_SDK_ROOT }
    $roots += (Join-Path $env:LOCALAPPDATA "Android\Sdk")
    foreach ($root in ($roots | Select-Object -Unique)) {
        if (-not (Test-Path $root)) { continue }
        $candidate = Get-ChildItem (Join-Path $root "build-tools") -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName "aapt2.exe" } |
            Where-Object { Test-Path $_ } |
            Select-Object -First 1
        if ($candidate) { return $candidate }
    }
    return $null
}

function Get-AaptStringResource([string[]]$DumpLines, [string]$Name) {
    for ($i = 0; $i -lt $DumpLines.Count; $i++) {
        if ($DumpLines[$i] -notmatch ([regex]::Escape("string/$Name"))) { continue }
        $max = [Math]::Min($DumpLines.Count - 1, $i + 10)
        for ($j = $i; $j -le $max; $j++) {
            $line = $DumpLines[$j]
            if ($line -match '"([^"\r\n]+)"') {
                $value = $matches[1]
                if ($value -and $value -ne $Name) { return $value }
            }
        }
    }
    return $null
}

Write-Host "`n=== LOADIFY PUBLIC CONFIG RECOVERY FROM BACKUP APK ===" -ForegroundColor Cyan

if ([string]::IsNullOrWhiteSpace($BackupDir)) {
    if (Test-Path $BackupRoot) {
        $latest = Get-ChildItem $BackupRoot -Directory -Filter "installed-*" -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($latest) { $BackupDir = $latest.FullName }
    }
}

if ([string]::IsNullOrWhiteSpace($BackupDir) -or -not (Test-Path $BackupDir)) {
    Fail "No installed-app backup folder was found."
    exit 1
}

$Apk = Join-Path $BackupDir "base.apk"
$ShaFile = Join-Path $BackupDir "sha256.txt"
if (-not (Test-Path $Apk) -or -not (Test-Path $ShaFile)) {
    Fail "Backup is missing base.apk or sha256.txt."
    exit 1
}

$expectedHashLine = Get-Content $ShaFile | Where-Object { $_ -match '\s+base\.apk\s*$' } | Select-Object -First 1
$expectedHash = if ($expectedHashLine) { (($expectedHashLine -split '\s+')[0]).ToLowerInvariant() } else { "" }
$actualHash = (Get-FileHash -Algorithm SHA256 $Apk).Hash.ToLowerInvariant()
if (-not $expectedHash -or $actualHash -ne $expectedHash) {
    Fail "Backup APK hash does not match sha256.txt. Recovery aborted."
    exit 1
}
Pass "Backup APK hash verified before extraction"

$tempRoot = Join-Path $env:TEMP ("loadify-apk-public-config-" + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($Apk, $tempRoot)

    $jsFiles = @(Get-ChildItem $tempRoot -Recurse -File -Filter "*.js" -ErrorAction SilentlyContinue)
    if ($jsFiles.Count -eq 0) {
        Fail "No JavaScript bundle was found inside the backed-up APK."
        exit 1
    }
    Info "Scanning $($jsFiles.Count) JavaScript bundle file(s) for public VITE values; values will not be printed."

    $supabaseUrls = New-Object System.Collections.Generic.HashSet[string]
    $anonTokens = New-Object System.Collections.Generic.HashSet[string]
    $stripeKeys = New-Object System.Collections.Generic.HashSet[string]
    $appUrls = New-Object System.Collections.Generic.HashSet[string]

    foreach ($file in $jsFiles) {
        $text = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if ([string]::IsNullOrWhiteSpace($text)) { continue }

        foreach ($m in [regex]::Matches($text, 'https://[a-z0-9-]+\.supabase\.co', 'IgnoreCase')) {
            [void]$supabaseUrls.Add($m.Value)
        }
        foreach ($m in [regex]::Matches($text, 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+')) {
            $payload = Decode-JwtPayload $m.Value
            if ($payload -and $payload.PSObject.Properties.Name -contains 'role' -and [string]$payload.role -eq 'anon') {
                [void]$anonTokens.Add($m.Value)
            }
        }
        foreach ($m in [regex]::Matches($text, 'pk_(?:live|test)_[A-Za-z0-9]+')) {
            [void]$stripeKeys.Add($m.Value)
        }
        foreach ($m in [regex]::Matches($text, 'https://(?:www\.)?loadifymarket\.co\.uk', 'IgnoreCase')) {
            [void]$appUrls.Add($m.Value.TrimEnd('/'))
        }
    }

    $recovered = [ordered]@{}
    if ($supabaseUrls.Count -eq 1) {
        $recovered['VITE_SUPABASE_URL'] = @($supabaseUrls)[0]
        Pass "Recovered one Supabase project URL from installed APK"
    } else {
        Warn "Supabase URL recovery was not unambiguous (found $($supabaseUrls.Count))."
    }

    if ($anonTokens.Count -eq 1) {
        $recovered['VITE_SUPABASE_ANON_KEY'] = @($anonTokens)[0]
        Pass "Recovered one Supabase anon JWT from installed APK"
    } else {
        Warn "Supabase anon-key recovery was not unambiguous (found $($anonTokens.Count))."
    }

    if ($stripeKeys.Count -eq 1) {
        $recovered['VITE_STRIPE_PUBLISHABLE_KEY'] = @($stripeKeys)[0]
        Pass "Recovered one Stripe publishable key from installed APK"
    } else {
        Warn "Stripe publishable-key recovery was not unambiguous (found $($stripeKeys.Count))."
    }

    if ($appUrls.Count -eq 1) {
        $recovered['VITE_APP_URL'] = @($appUrls)[0]
        Pass "Recovered one Loadify application URL from installed APK"
    } else {
        Warn "Loadify app-URL recovery was not unambiguous (found $($appUrls.Count))."
    }

    if ($recovered.Count -gt 0) {
        if (Test-Path $EnvTarget) {
            Warn ".env.local already exists; it was left unchanged to avoid overwriting local configuration."
        } else {
            $lines = @(
                "# Recovered locally from the signed installed Loadify Android APK.",
                "# Public build-time values only. File is gitignored and must not be committed."
            )
            foreach ($entry in $recovered.GetEnumerator()) {
                $lines += "$($entry.Key)=$($entry.Value)"
            }
            $lines | Set-Content -LiteralPath $EnvTarget -Encoding utf8
            git -C $RepoRoot check-ignore -q -- ".env.local"
            if ($LASTEXITCODE -ne 0) {
                Remove-Item $EnvTarget -Force -ErrorAction SilentlyContinue
                Fail ".env.local is not gitignored; recovered values were removed."
                exit 1
            }
            Pass "Recovered public VITE configuration written to gitignored .env.local"
        }
    }

    Write-Host "`n=== FIREBASE RESOURCE RECOVERY ===" -ForegroundColor Cyan
    if (Test-Path $FirebaseTarget) {
        Pass "google-services.json already exists locally; existing file was left unchanged"
    } else {
        $aapt2 = Find-Aapt2
        if (-not $aapt2) {
            Warn "aapt2.exe not found; Firebase resource recovery cannot run locally."
        } else {
            # As with keytool, Windows PowerShell may promote benign native stderr
            # text into a terminating NativeCommandError. Capture output under a
            # non-terminating preference and decide only from the native exit code.
            $previousErrorActionPreference = $ErrorActionPreference
            $ErrorActionPreference = "Continue"
            try {
                $dump = @(& $aapt2 dump resources $Apk 2>&1 | ForEach-Object { $_.ToString() })
                $aaptExitCode = $LASTEXITCODE
            } finally {
                $ErrorActionPreference = $previousErrorActionPreference
            }

            if ($aaptExitCode -ne 0 -or $dump.Count -eq 0) {
                Warn "aapt2 could not dump APK resources; no Firebase file was generated."
            } else {
                $googleAppId = Get-AaptStringResource $dump 'google_app_id'
                $senderId = Get-AaptStringResource $dump 'gcm_defaultSenderId'
                $projectId = Get-AaptStringResource $dump 'project_id'
                $apiKey = Get-AaptStringResource $dump 'google_api_key'
                $storageBucket = Get-AaptStringResource $dump 'google_storage_bucket'
                $webClientId = Get-AaptStringResource $dump 'default_web_client_id'

                $requiredFirebase = @($googleAppId, $senderId, $projectId, $apiKey)
                if ($requiredFirebase -contains $null -or $requiredFirebase -contains '') {
                    Warn "Installed APK did not expose all Firebase resources required for a safe google-services.json reconstruction. No file was generated."
                } else {
                    $projectInfo = [ordered]@{
                        project_number = $senderId
                        project_id = $projectId
                    }
                    if ($storageBucket) { $projectInfo['storage_bucket'] = $storageBucket }

                    $client = [ordered]@{
                        client_info = [ordered]@{
                            mobilesdk_app_id = $googleAppId
                            android_client_info = [ordered]@{ package_name = $Package }
                        }
                        api_key = @([ordered]@{ current_key = $apiKey })
                    }
                    if ($webClientId) {
                        $client['oauth_client'] = @([ordered]@{ client_id = $webClientId; client_type = 3 })
                    }

                    $firebase = [ordered]@{
                        project_info = $projectInfo
                        client = @($client)
                        configuration_version = '1'
                    }
                    $firebase | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $FirebaseTarget -Encoding utf8
                    git -C $RepoRoot check-ignore -q -- "android/app/google-services.json"
                    if ($LASTEXITCODE -ne 0) {
                        Remove-Item $FirebaseTarget -Force -ErrorAction SilentlyContinue
                        Fail "Recovered google-services.json is not gitignored; file was removed."
                        exit 1
                    }

                    # Read back and validate the generated local file before it can
                    # be accepted by the release preflight. Values remain hidden.
                    try {
                        $roundTrip = Get-Content $FirebaseTarget -Raw | ConvertFrom-Json
                        $packages = @($roundTrip.client | ForEach-Object { $_.client_info.android_client_info.package_name })
                        if ($Package -notin $packages) { throw "package mismatch" }
                    } catch {
                        Remove-Item $FirebaseTarget -Force -ErrorAction SilentlyContinue
                        Fail "Recovered google-services.json failed local structural/package validation and was removed."
                        exit 1
                    }

                    Pass "Reconstructed package-matched google-services.json from Firebase resources embedded in the signed installed APK"
                    Info "No Firebase value was printed and no remote secret was read."
                }
            }
        }
    }

    Write-Host "`n=== RESULT ===" -ForegroundColor Cyan
    Write-Host "PUBLIC CONFIG RECOVERY COMPLETE"
    Write-Host "No APK was built or installed; the phone was not modified."
} finally {
    Remove-Item $tempRoot -Recurse -Force -ErrorAction SilentlyContinue
}
