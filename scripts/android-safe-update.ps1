param(
    [string]$DeviceSerial = "57311FDCQ00BGS",
    [string]$FirebaseSource = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$BackupScript = Join-Path $PSScriptRoot "android-backup-installed-app.ps1"
$UpdateScript = Join-Path $PSScriptRoot "android-update-existing-app.ps1"

if (-not (Test-Path $BackupScript)) {
    throw "STOP: backup script is missing. Update is not allowed."
}
if (-not (Test-Path $UpdateScript)) {
    throw "STOP: update script is missing."
}

Write-Host "`n=== PHASE 1/2 — BACK UP INSTALLED APP ===" -ForegroundColor Cyan
& powershell -NoProfile -ExecutionPolicy Bypass -File $BackupScript -DeviceSerial $DeviceSerial
if ($LASTEXITCODE -ne 0) {
    throw "STOP: installed-app backup failed. Android update was NOT started."
}

Write-Host "`n=== PHASE 2/2 — VALIDATE AND UPDATE ===" -ForegroundColor Cyan
if ([string]::IsNullOrWhiteSpace($FirebaseSource)) {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $UpdateScript -DeviceSerial $DeviceSerial
} else {
    & powershell -NoProfile -ExecutionPolicy Bypass -File $UpdateScript -DeviceSerial $DeviceSerial -FirebaseSource $FirebaseSource
}

if ($LASTEXITCODE -ne 0) {
    throw "STOP: update gate failed after backup. Installed-app backup remains preserved on Desktop."
}
