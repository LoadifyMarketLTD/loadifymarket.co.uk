param(
    [string]$DeviceSerial = "2A141FDH300HZL",
    [string]$CandidateFolder = "$env:USERPROFILE\Desktop\LoadifyMarket-Android-Candidates\candidate-1.0.1-aa440a1458c0-20260830-114414",
    [switch]$AcknowledgeVersionCodeUpgradeRisk
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Package = "co.uk.loadifymarket.app"
$ExpectedCurrentVersionCode = "1"
$ExpectedCurrentVersionName = "1.0"
$ExpectedCandidateVersionCode = "2"
$ExpectedCandidateVersionName = "1.0.1"
$ExpectedCandidateSha256 = "3095429c2aa4af21c58fa8bbd8d058ef14694c2fc4c462573e0e04bf44685c19"
$ExpectedCertSha256 = "0365a35b3413daf8c76e0bab2f56d898b94895dcee9e27151a03e1778bb97f24"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot

function Pass([string]$Message) { Write-Host "PASS: $Message" -ForegroundColor Green }
function Info([string]$Message) { Write-Host "INFO: $Message" -ForegroundColor Cyan }
function Warn([string]$Message) { Write-Host "WARN: $Message" -ForegroundColor Yellow }
function Fail([string]$Message) {
    Write-Host "`nSTOP: $Message" -ForegroundColor Red
    exit 1
}

function Invoke-NativeCapture([scriptblock]$Command) {
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

function Find-BuildTool([string]$FileName) {
    $roots = @()
    if ($env:ANDROID_HOME) { $roots += $env:ANDROID_HOME }
    if ($env:ANDROID_SDK_ROOT) { $roots += $env:ANDROID_SDK_ROOT }
    $roots += (Join-Path $env:LOCALAPPDATA "Android\Sdk")

    foreach ($root in ($roots | Select-Object -Unique)) {
        if (-not (Test-Path $root)) { continue }
        $buildTools = Join-Path $root "build-tools"
        if (-not (Test-Path $buildTools)) { continue }
        $candidate = Get-ChildItem $buildTools -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName $FileName } |
            Where-Object { Test-Path $_ } |
            Select-Object -First 1
        if ($candidate) { return $candidate }
    }
    return $null
}

function Get-ApkCertSha256([string]$ApkPath, [string]$ApkSigner) {
    $result = Invoke-NativeCapture { & $ApkSigner verify --print-certs $ApkPath }
    if ($result.ExitCode -ne 0) { return $null }
    $line = $result.Output | Select-String -Pattern "Signer #1 certificate SHA-256 digest:" | Select-Object -First 1
    if (-not $line) { return $null }
    return (($line.ToString() -split ":", 2)[1]).Trim().ToLowerInvariant()
}

function Get-PackageDumpsys {
    $result = Invoke-NativeCapture { adb -s $DeviceSerial shell dumpsys package $Package }
    if ($result.ExitCode -ne 0 -or $result.Output.Count -eq 0) { return $null }
    return $result.Output
}

function Get-DumpsysValue([string[]]$Lines, [string]$Name) {
    $line = $Lines | Where-Object { $_ -match "^\s*$([regex]::Escape($Name))=" } | Select-Object -First 1
    if (-not $line) { return $null }
    return (($line -split '=', 2)[1]).Trim()
}

Write-Host "`n=== LOADIFY GUARDED IN-PLACE RELEASE INSTALL ===" -ForegroundColor Cyan
Write-Host "Device: $DeviceSerial"
Write-Host "Package: $Package"
Write-Host "Expected transition: $ExpectedCurrentVersionCode / $ExpectedCurrentVersionName -> $ExpectedCandidateVersionCode / $ExpectedCandidateVersionName"
Write-Host "Install method: adb install -r ONLY"
Write-Host "Forbidden: uninstall, clear-data, downgrade flags"

if (-not $AcknowledgeVersionCodeUpgradeRisk) {
    Warn "Installing versionCode 2 may make a data-preserving downgrade to saved versionCode 1 unavailable."
    Fail "Explicit acknowledgement is required. Re-run with -AcknowledgeVersionCodeUpgradeRisk only if you accept this version-code rollback limitation."
}
Pass "Version-code rollback limitation explicitly acknowledged"

$CandidateApk = Join-Path $CandidateFolder "loadify-market-$ExpectedCandidateVersionName-release.apk"
if (-not (Test-Path -LiteralPath $CandidateApk)) { Fail "Exact preserved candidate APK is missing." }
$actualCandidateHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $CandidateApk).Hash.ToLowerInvariant()
if ($actualCandidateHash -ne $ExpectedCandidateSha256) { Fail "Candidate SHA-256 changed; refusing install." }
Pass "Exact approved candidate SHA-256 locked"

# Re-run the full non-mutating install gate immediately before mutation.
Write-Host "`n=== FINAL NON-MUTATING GATE RECHECK ===" -ForegroundColor Cyan
$verifyScript = Join-Path $PSScriptRoot "android-verify-release-candidate-for-install.ps1"
$previous = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
    $verifyOutput = @(& powershell -ExecutionPolicy Bypass -File $verifyScript -DeviceSerial $DeviceSerial -CandidateFolder $CandidateFolder 2>&1 | ForEach-Object {
        $text = $_.ToString()
        Write-Host $text
        $text
    })
    $verifyExitCode = $LASTEXITCODE
} finally {
    $ErrorActionPreference = $previous
}
if ($verifyExitCode -ne 0) { Fail "Pre-install verification child process failed with code $verifyExitCode." }
if ($verifyOutput -notcontains "VERIFIED RELEASE CANDIDATE READY FOR SEPARATE IN-PLACE INSTALL GATE") {
    Fail "Exact pre-install READY verdict was not reproduced; refusing install."
}
Pass "Exact candidate + baseline + signing + rollback pre-install gate reproduced"

$stateResult = Invoke-NativeCapture { adb -s $DeviceSerial get-state }
if ($stateResult.ExitCode -ne 0 -or (($stateResult.Output | Select-Object -First 1).Trim()) -ne "device") {
    Fail "Pixel is not currently online/authorized in ADB."
}
Pass "Pixel is online and authorized immediately before install"

$before = Get-PackageDumpsys
if (-not $before) { Fail "Could not inspect baseline immediately before install." }
$beforeVersionCode = Get-DumpsysValue $before "versionCode"
$beforeVersionName = Get-DumpsysValue $before "versionName"
$beforeFirstInstall = Get-DumpsysValue $before "firstInstallTime"
if (-not $beforeVersionCode -or $beforeVersionCode -notmatch "^$ExpectedCurrentVersionCode(?:\s|$)") { Fail "Baseline versionCode changed before install." }
if ($beforeVersionName -ne $ExpectedCurrentVersionName) { Fail "Baseline versionName changed before install." }
if (-not $beforeFirstInstall) { Fail "Could not capture baseline firstInstallTime." }
Pass "Baseline is still exactly $ExpectedCurrentVersionCode / $ExpectedCurrentVersionName immediately before mutation"

Write-Host "`n=== IN-PLACE UPDATE ===" -ForegroundColor Cyan
Write-Host "Executing: adb install -r <exact verified release APK>"
$installResult = Invoke-NativeCapture { adb -s $DeviceSerial install -r $CandidateApk }
$installResult.Output | ForEach-Object { Write-Host $_ }
if ($installResult.ExitCode -ne 0 -or -not ($installResult.Output -contains "Success")) {
    Fail "adb install -r did not complete successfully. No uninstall or clear-data fallback will be attempted."
}
Pass "adb install -r returned Success"

Write-Host "`n=== POST-INSTALL PACKAGE IDENTITY ===" -ForegroundColor Cyan
$after = Get-PackageDumpsys
if (-not $after) { Fail "Could not inspect installed package after update." }
$afterVersionCode = Get-DumpsysValue $after "versionCode"
$afterVersionName = Get-DumpsysValue $after "versionName"
$afterFirstInstall = Get-DumpsysValue $after "firstInstallTime"
$afterLastUpdate = Get-DumpsysValue $after "lastUpdateTime"
if (-not $afterVersionCode -or $afterVersionCode -notmatch "^$ExpectedCandidateVersionCode(?:\s|$)") { Fail "Installed versionCode is not $ExpectedCandidateVersionCode after update." }
if ($afterVersionName -ne $ExpectedCandidateVersionName) { Fail "Installed versionName is not $ExpectedCandidateVersionName after update." }
if ($afterFirstInstall -ne $beforeFirstInstall) { Fail "firstInstallTime changed; package history does not look like an in-place update." }
Pass "Installed package is $ExpectedCandidateVersionCode / $ExpectedCandidateVersionName and firstInstallTime was preserved"

$ApkSigner = Find-BuildTool "apksigner.bat"
if (-not $ApkSigner) { Fail "apksigner.bat not found for post-install certificate verification." }

$pmPathResult = Invoke-NativeCapture { adb -s $DeviceSerial shell pm path $Package }
if ($pmPathResult.ExitCode -ne 0) { Fail "Could not resolve installed APK path after update." }
$baseRemote = $pmPathResult.Output |
    Where-Object { $_ -match '^package:.*base\.apk\s*$' } |
    Select-Object -First 1
if (-not $baseRemote) { Fail "Installed base.apk path was not found after update." }
$baseRemote = ($baseRemote -replace '^package:', '').Trim()

$tempDir = Join-Path $env:TEMP ("loadify-post-install-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
$pulledApk = Join-Path $tempDir "installed-base.apk"
try {
    $pullResult = Invoke-NativeCapture { adb -s $DeviceSerial pull $baseRemote $pulledApk }
    if ($pullResult.ExitCode -ne 0 -or -not (Test-Path $pulledApk)) { Fail "Could not pull installed base.apk for post-install verification." }

    $installedCert = Get-ApkCertSha256 $pulledApk $ApkSigner
    if ($installedCert -ne $ExpectedCertSha256) { Fail "Installed certificate no longer matches the Loadify release lineage." }
    Pass "Installed certificate EXACTLY matches approved Loadify release certificate"

    $installedHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $pulledApk).Hash.ToLowerInvariant()
    if ($installedHash -ne $ExpectedCandidateSha256) { Fail "Installed base.apk SHA-256 does not match the exact approved candidate." }
    Pass "Installed base.apk SHA-256 EXACTLY matches approved candidate"
} finally {
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "`n=== STARTUP / FIREBASE FATAL GATE ===" -ForegroundColor Cyan
Invoke-NativeCapture { adb -s $DeviceSerial shell am force-stop $Package } | Out-Null
Invoke-NativeCapture { adb -s $DeviceSerial logcat -c } | Out-Null
$launchResult = Invoke-NativeCapture { adb -s $DeviceSerial shell monkey -p $Package -c android.intent.category.LAUNCHER 1 }
if ($launchResult.ExitCode -ne 0) { Fail "Launcher event failed after update." }
Start-Sleep -Seconds 8

$pidResult = Invoke-NativeCapture { adb -s $DeviceSerial shell pidof $Package }
$pid = (($pidResult.Output | Select-Object -First 1) -as [string]).Trim()
if ($pidResult.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($pid)) { Fail "Loadify process is not alive eight seconds after launch." }
Pass "Loadify process remains alive after launch (PID present)"

$logResult = Invoke-NativeCapture { adb -s $DeviceSerial logcat -d -v brief }
$criticalPatterns = @(
    'Default FirebaseApp is not initialized',
    'FATAL EXCEPTION',
    'Process: co\.uk\.loadifymarket\.app.*has died',
    'Unable to start activity.*co\.uk\.loadifymarket\.app',
    'java\.lang\.IllegalStateException: Default FirebaseApp'
)
$critical = @($logResult.Output | Where-Object {
    $line = $_
    $criticalPatterns | Where-Object { $line -match $_ } | Select-Object -First 1
})
if ($critical.Count -gt 0) {
    Write-Host "Critical startup markers:" -ForegroundColor Red
    $critical | Select-Object -First 20 | ForEach-Object { Write-Host $_ }
    Fail "Critical Android/Firebase startup marker detected after update. No automatic downgrade/uninstall will be attempted."
}
Pass "No Firebase initialization fatal or app FATAL EXCEPTION detected in startup window"

Write-Host "`n=== RESULT ===" -ForegroundColor Green
Write-Host "IN-PLACE RELEASE UPDATE PASS"
Write-Host "Installed package: $Package"
Write-Host "Installed version: $ExpectedCandidateVersionCode / $ExpectedCandidateVersionName"
Write-Host "Installed APK SHA-256: $ExpectedCandidateSha256"
Write-Host "Certificate SHA-256: $ExpectedCertSha256"
Write-Host "firstInstallTime preserved: $afterFirstInstall"
Write-Host "lastUpdateTime: $afterLastUpdate"
Write-Host "PID after startup: $pid"
Write-Host "PASS: No uninstall, clear-data or downgrade operation was executed."
Write-Host "Next gate: manual functional + visual smoke on the installed Pixel app before PR merge/readiness changes."
