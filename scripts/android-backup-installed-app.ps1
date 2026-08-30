param(
    [string]$DeviceSerial = "57311FDCQ00BGS"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Package = "co.uk.loadifymarket.app"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BackupRoot = Join-Path $env:USERPROFILE "Desktop\LoadifyMarket-Android-Backups"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupDir = Join-Path $BackupRoot "installed-$Timestamp"

function Fail([string]$Message) {
    Write-Host "`nSTOP: $Message" -ForegroundColor Red
    exit 1
}

function Pass([string]$Message) {
    Write-Host "PASS: $Message" -ForegroundColor Green
}

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

Write-Host "`n=== LOADIFY INSTALLED-APP BACKUP ===" -ForegroundColor Cyan
Write-Host "Device: $DeviceSerial"
Write-Host "Package: $Package"

adb -s $DeviceSerial get-state | Out-Null
if ($LASTEXITCODE -ne 0) { Fail "ADB device '$DeviceSerial' is not available/authorized." }

$pathLines = @(adb -s $DeviceSerial shell pm path $Package 2>$null |
    ForEach-Object { $_.ToString().Trim() } |
    Where-Object { $_ -match '^package:' })

if ($pathLines.Count -eq 0) {
    Fail "Package $Package is not currently installed."
}

New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

$metadataPath = Join-Path $BackupDir "package-dumpsys.txt"
adb -s $DeviceSerial shell dumpsys package $Package | Out-File -FilePath $metadataPath -Encoding utf8
if ($LASTEXITCODE -ne 0) { Fail "Could not save package metadata." }

$pathsPath = Join-Path $BackupDir "package-paths.txt"
$pathLines | Out-File -FilePath $pathsPath -Encoding utf8

$pulled = @()
$index = 0
foreach ($line in $pathLines) {
    $remote = ($line -replace '^package:', '').Trim()
    $leaf = Split-Path $remote -Leaf
    if ([string]::IsNullOrWhiteSpace($leaf)) { $leaf = "package-$index.apk" }
    if ($pulled.Name -contains $leaf) { $leaf = "package-$index-$leaf" }
    $local = Join-Path $BackupDir $leaf
    adb -s $DeviceSerial pull $remote $local | Out-Null
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $local)) {
        Fail "Could not pull installed APK '$remote'. Backup is incomplete; no update should be attempted."
    }
    $pulled += Get-Item $local
    $index++
}

$baseApk = $pulled | Where-Object { $_.Name -eq 'base.apk' } | Select-Object -First 1
if (-not $baseApk) { $baseApk = $pulled | Select-Object -First 1 }

$apkSigner = Find-ApkSigner
if ($apkSigner -and $baseApk) {
    $certPath = Join-Path $BackupDir "installed-apk-certificate.txt"
    & $apkSigner verify --print-certs $baseApk.FullName 2>&1 | Out-File -FilePath $certPath -Encoding utf8
    if ($LASTEXITCODE -ne 0) { Fail "Backup APK was pulled but signature verification failed." }
}

$shaPath = Join-Path $BackupDir "sha256.txt"
$pulled | ForEach-Object {
    $hash = Get-FileHash -Algorithm SHA256 $_.FullName
    "$($hash.Hash.ToLowerInvariant())  $($_.Name)"
} | Out-File -FilePath $shaPath -Encoding ascii

$summaryPath = Join-Path $BackupDir "BACKUP-README.txt"
$versionLines = adb -s $DeviceSerial shell dumpsys package $Package |
    Select-String -Pattern "versionCode=|versionName=|firstInstallTime=|lastUpdateTime=" |
    ForEach-Object { $_.Line.Trim() }

@(
    "Loadify Market installed-app backup",
    "Created: $(Get-Date -Format o)",
    "Device serial: $DeviceSerial",
    "Package: $Package",
    "",
    "Installed metadata:",
    $versionLines,
    "",
    "APK files backed up:",
    ($pulled | ForEach-Object { "- $($_.Name) ($($_.Length) bytes)" }),
    "",
    "This backup preserves the installed APK package files and metadata.",
    "It does not guarantee a full export of private app data; Android normally blocks that for release apps without root/debuggable access.",
    "Future updates must use adb install -r and must never uninstall the existing app as a workaround."
) | Out-File -FilePath $summaryPath -Encoding utf8

# Best-effort private-data snapshot only when Android explicitly allows run-as.
# Failure here is expected for a non-debuggable release build and is NOT treated
# as a backup failure because APK preservation is the mandatory rollback asset.
$dataProbe = ((adb -s $DeviceSerial shell run-as $Package pwd 2>$null) | Out-String).Trim()
if ($dataProbe) {
    $dataNote = Join-Path $BackupDir "private-data-access.txt"
    "run-as available for $Package at $dataProbe. Private data was not modified." | Out-File $dataNote -Encoding utf8
} else {
    $dataNote = Join-Path $BackupDir "private-data-access.txt"
    "run-as unavailable (normal for a release/non-debuggable app). APK files and package metadata are backed up; private app data remains on-device and is preserved by adb install -r." | Out-File $dataNote -Encoding utf8
}

Write-Host "`n=== BACKUP CONTENTS ===" -ForegroundColor Cyan
Get-ChildItem $BackupDir | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize

Write-Host "`n=== RESULT ===" -ForegroundColor Green
Write-Host "INSTALLED APP BACKUP PASS"
Write-Host "Backup folder: $BackupDir"
Pass "No uninstall, install, clear-data or app mutation was performed"
