param([string]$DeviceSerial = "2A141FDH300HZL")

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Package = "co.uk.loadifymarket.app"
$ExpectedVersionCode = "2"
$ExpectedVersionName = "1.0.1"

function Fail([string]$Message) {
  Write-Host "STOP: $Message" -ForegroundColor Red
  exit 1
}

function Capture([scriptblock]$Command) {
  $previous = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = @(& $Command 2>&1 | ForEach-Object { $_.ToString() })
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previous
  }
  return [pscustomobject]@{ Output = $output; ExitCode = $exitCode }
}

Write-Host "`n=== LOADIFY POST-INSTALL STARTUP GATE ===" -ForegroundColor Cyan
Write-Host "Policy: verify already-installed app only; no package install/remove/data-clear action"

$state = Capture { adb -s $DeviceSerial get-state }
if ($state.ExitCode -ne 0 -or (($state.Output | Select-Object -First 1).Trim()) -ne "device") { Fail "Pixel is not online/authorized." }

$dumpsys = (Capture { adb -s $DeviceSerial shell dumpsys package $Package }).Output
$versionCodeLine = $dumpsys | Where-Object { $_ -match '^\s*versionCode=' } | Select-Object -First 1
$versionNameLine = $dumpsys | Where-Object { $_ -match '^\s*versionName=' } | Select-Object -First 1
if (-not $versionCodeLine -or $versionCodeLine -notmatch "versionCode=$ExpectedVersionCode(?:\s|$)") { Fail "Installed versionCode is not $ExpectedVersionCode." }
if (-not $versionNameLine -or $versionNameLine -notmatch "versionName=$([regex]::Escape($ExpectedVersionName))(?:\s|$)") { Fail "Installed versionName is not $ExpectedVersionName." }
Write-Host "PASS: Installed package is $ExpectedVersionCode / $ExpectedVersionName" -ForegroundColor Green

Capture { adb -s $DeviceSerial shell am force-stop $Package } | Out-Null
Capture { adb -s $DeviceSerial logcat -c } | Out-Null
$launch = Capture { adb -s $DeviceSerial shell monkey -p $Package -c android.intent.category.LAUNCHER 1 }
if ($launch.ExitCode -ne 0) { Fail "Launcher event failed." }
Start-Sleep -Seconds 8

$pidResult = Capture { adb -s $DeviceSerial shell pidof $Package }
$appPid = (($pidResult.Output | Select-Object -First 1) -as [string]).Trim()
if ($pidResult.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($appPid)) { Fail "Loadify process is not alive eight seconds after launch." }
Write-Host "PASS: Loadify process remains alive after launch" -ForegroundColor Green

$logs = Capture { adb -s $DeviceSerial logcat -d -v brief }
$critical = @($logs.Output | Where-Object {
  $_ -match 'Default FirebaseApp is not initialized|FATAL EXCEPTION|Unable to start activity.*co\.uk\.loadifymarket\.app|java\.lang\.IllegalStateException: Default FirebaseApp'
})
if ($critical.Count -gt 0) {
  $critical | Select-Object -First 20 | ForEach-Object { Write-Host $_ }
  Fail "Critical Android/Firebase startup marker detected."
}
Write-Host "PASS: No Firebase initialization fatal or app FATAL EXCEPTION detected" -ForegroundColor Green

Write-Host "`n=== RESULT ===" -ForegroundColor Green
Write-Host "POST-INSTALL STARTUP GATE PASS"
Write-Host "Installed version: $ExpectedVersionCode / $ExpectedVersionName"
Write-Host "PID after startup: $appPid"
Write-Host "Next gate: manual functional and visual smoke on the installed Pixel app."
