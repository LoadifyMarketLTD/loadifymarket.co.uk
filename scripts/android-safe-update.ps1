param(
    [string]$DeviceSerial = "2A141FDH300HZL"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$BackupScript = Join-Path $PSScriptRoot "android-backup-installed-app.ps1"
$PreflightScript = Join-Path $PSScriptRoot "android-release-preflight.ps1"

if (-not (Test-Path $BackupScript)) {
    throw "STOP: backup script is missing. Update is not allowed."
}
if (-not (Test-Path $PreflightScript)) {
    throw "STOP: release preflight script is missing. Update is not allowed."
}

Write-Host "`n=== PHASE 1/2 — BACK UP INSTALLED APP ===" -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File $BackupScript -DeviceSerial $DeviceSerial
if ($LASTEXITCODE -ne 0) {
    throw "STOP: installed-app backup failed. Android update was NOT started."
}

Write-Host "`n=== PHASE 2/2 — RELEASE / ROLLBACK PREFLIGHT ===" -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File $PreflightScript -DeviceSerial $DeviceSerial
if ($LASTEXITCODE -ne 0) {
    throw "STOP: release preflight failed. Android update was NOT started."
}

Write-Host "`n=== SAFE UPDATE HOLD ===" -ForegroundColor Yellow
Write-Host "The installed Loadify app is release-signed. Debug APK installation is disabled." -ForegroundColor Yellow
Write-Host "No candidate will be installed until the release keystore certificate, Firebase configuration, runtime VITE configuration and rollback path are all proven." -ForegroundColor Yellow
Write-Host "No uninstall, install or clear-data command was executed by this wrapper." -ForegroundColor Green
