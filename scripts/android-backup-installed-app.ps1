param(
    [string]$DeviceSerial = "2A141FDH300HZL"
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

function Get-AdbDeviceState([string]$Serial) {
    $rows = @(adb devices 2>$null | ForEach-Object { $_.ToString().Trim() })
    foreach ($row in $rows) {
        if ($row -match ('^' + [regex]::Escape($Serial) + '\s+(\S+)')) {
            return $matches[1]
        }
    }
    return $null
}

Write-Host "`n=== LOADIFY INSTALLED-APP BACKUP ===" -ForegroundColor Cyan
Write-Host "Device: $DeviceSerial"
Write-Host "Package: $Package"

# Start/reuse the local ADB server, then give the known device a short window to
# reconnect. This does not install, uninstall, clear data, or otherwise mutate it.
adb start-server | Out-Null

Write-Host "`n=== ADB DEVICE DISCOVERY ===" -ForegroundColor Cyan
$deviceState = Get-AdbDeviceState $DeviceSerial
for ($attempt = 1; -not $deviceState -and $attempt -le 10; $attempt++) {
    if ($attempt -eq 1) {
        Write-Host "Waiting up to 20 seconds for the known phone to reconnect..." -ForegroundColor Yellow
    }
    Start-Sleep -Seconds 2
    $deviceState = Get-AdbDeviceState $DeviceSerial
}

Write-Host "Current ADB devices:"
adb devices -l

if (-not $deviceState) {
    Fail "ADB cannot see device '$DeviceSerial'. Connect/unlock the phone, keep USB debugging enabled, then rerun this backup."
}
if ($deviceState -eq 'unauthorized') {
    Fail "Device '$DeviceSerial' is visible but UNAUTHORIZED. Unlock the phone and approve the 'Allow USB debugging' RSA prompt, then rerun."
}
if ($deviceState -eq 'offline') {
    Fail "Device '$DeviceSerial' is OFFLINE. Reconnect USB (or restart ADB) and rerun; no app mutation occurred."
}
if ($deviceState -ne 'device') {
    Fail "Device '$DeviceSerial' has unexpected ADB state '$deviceState'. Backup will not continue."
}
Pass "Exact Android device is connected and authorized"

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
    $existingNames = @($pulled | ForEach-Object { $_.Name })
    if ($existingNames -contains $leaf) { $leaf = "package-$index-$leaf" }
    $local = Join-Path $BackupDir $leaf
    adb -s $DeviceSerial pull $remote $local | Out-Null
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $local)) {
        Fail "Could not pull installed APK '$remote'. Backup is incomplete; no update should be attempted."
    }
    $pulled += Get-Item $local
    $index++
}

if ($pulled.Count -eq 0) {
    Fail "No APK files were copied from the installed package."
}

$baseApk = $pulled | Where-Object { $_.Name -eq 'base.apk' } | Select-Object -First 1
if (-not $baseApk) { $baseApk = $pulled | Select-Object -First 1 }
if (-not $baseApk -or $baseApk.Length -le 0) {
    Fail "Backed-up base APK is missing or empty."
}
Pass "Installed APK package files copied from phone"

$apkSigner = Find-ApkSigner
if ($apkSigner -and $baseApk) {
    $certPath = Join-Path $BackupDir "installed-apk-certificate.txt"
    & $apkSigner verify --print-certs $baseApk.FullName 2>&1 | Out-File -FilePath $certPath -Encoding utf8
    if ($LASTEXITCODE -ne 0) { Fail "Backup APK was pulled but signature verification failed." }
    Pass "Backed-up base APK signature verified"
} else {
    Write-Host "WARN: apksigner was not found; APK hash/metadata backup will still be preserved." -ForegroundColor Yellow
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
    "Private app data is not exported: Android protects release/non-debuggable app data without root/debuggable access.",
    "Private app data remains on the phone and must be preserved by using adb install -r; never uninstall or clear app data as an update workaround."
) | Out-File -FilePath $summaryPath -Encoding utf8

$dataNote = Join-Path $BackupDir "private-data-access.txt"
@(
    "Private app data was NOT accessed or exported.",
    "Reason: the installed package is treated as a protected release/non-debuggable application.",
    "This is expected Android security behavior and is not a backup failure.",
    "APK package files, package metadata, hashes and available certificate information are preserved in this folder."
) | Out-File -FilePath $dataNote -Encoding utf8

Write-Host "`n=== BACKUP CONTENTS ===" -ForegroundColor Cyan
Get-ChildItem $BackupDir | Select-Object Name, Length, LastWriteTime | Format-Table -AutoSize

Write-Host "`n=== RESULT ===" -ForegroundColor Green
Write-Host "INSTALLED APP BACKUP PASS"
Write-Host "Backup folder: $BackupDir"
Pass "No uninstall, install, clear-data or app mutation was performed"
