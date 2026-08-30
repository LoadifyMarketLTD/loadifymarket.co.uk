param(
    [Parameter(Mandatory = $true)]
    [string]$CandidateFolder,
    [string]$DeviceSerial = "2A141FDH300HZL",
    [switch]$AcknowledgeSameVersionRepair
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Package = "co.uk.loadifymarket.app"
$ExpectedVersionCode = "2"
$ExpectedVersionName = "1.0.1"
$ExpectedCertSha256 = "0365a35b3413daf8c76e0bab2f56d898b94895dcee9e27151a03e1778bb97f24"
$ExpectedBranch = "visual/product-detail-premium-polish-20260829"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$OriginalBackupDir = Join-Path $env:USERPROFILE "Desktop\LoadifyMarket-Android-Backups\installed-20260830-023504"
$OriginalBackup = Join-Path $OriginalBackupDir "base.apk"
$OriginalBackupManifest = Join-Path $OriginalBackupDir "sha256.txt"
Set-Location $RepoRoot

function Pass([string]$Message) { Write-Host "PASS: $Message" -ForegroundColor Green }
function Info([string]$Message) { Write-Host "INFO: $Message" -ForegroundColor Cyan }
function Warn([string]$Message) { Write-Host "WARN: $Message" -ForegroundColor Yellow }
function Fail([string]$Message) {
    Write-Host "`nSTOP: $Message" -ForegroundColor Red
    Write-Host "No uninstall, clear-data or downgrade fallback will be attempted." -ForegroundColor Yellow
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

function Read-KeyValueFile([string]$Path) {
    $map = @{}
    if (-not (Test-Path -LiteralPath $Path)) { return $map }
    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
        $index = $trimmed.IndexOf('=')
        if ($index -lt 1) { continue }
        $map[$trimmed.Substring(0, $index).Trim()] = $trimmed.Substring($index + 1).Trim()
    }
    return $map
}

Write-Host "`n=== LOADIFY SAME-VERSION V2 REPAIR INSTALL ===" -ForegroundColor Cyan
Write-Host "Device: $DeviceSerial"
Write-Host "Package: $Package"
Write-Host "Repair target: $ExpectedVersionCode / $ExpectedVersionName -> $ExpectedVersionCode / $ExpectedVersionName"
Write-Host "Install method: adb install -r ONLY"
Write-Host "Forbidden: uninstall, pm clear, clear-data, downgrade flags"
Write-Host "Original saved APK policy: READ-ONLY / DO NOT MODIFY"

if (-not $AcknowledgeSameVersionRepair) {
    Fail "Explicit acknowledgement is required. Re-run with -AcknowledgeSameVersionRepair."
}
Pass "Same-version in-place repair explicitly acknowledged"

Write-Host "`n=== ORIGINAL BACKUP INTEGRITY LOCK ===" -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath $OriginalBackup -PathType Leaf)) {
    Fail "Exact original saved base.apk is missing: $OriginalBackup"
}
if (-not (Test-Path -LiteralPath $OriginalBackupManifest -PathType Leaf)) {
    Fail "Original backup SHA-256 manifest is missing: $OriginalBackupManifest"
}
$manifestLine = Get-Content -LiteralPath $OriginalBackupManifest |
    Where-Object { $_ -match '\s+base\.apk\s*$' } |
    Select-Object -First 1
if (-not $manifestLine) { Fail "Original backup manifest has no base.apk hash entry." }
$backupExpectedHash = (($manifestLine -split '\s+')[0]).ToLowerInvariant()
if ([string]::IsNullOrWhiteSpace($backupExpectedHash)) { Fail "Original backup manifest hash is empty." }
$backupHashBefore = (Get-FileHash -Algorithm SHA256 -LiteralPath $OriginalBackup).Hash.ToLowerInvariant()
if ($backupHashBefore -ne $backupExpectedHash) {
    Fail "Original saved base.apk no longer matches its saved SHA-256 manifest."
}
Pass "Exact original saved base.apk matches its saved SHA-256 manifest and is locked read-only"
Info "Original backup: $OriginalBackup"

$branch = (git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $branch -ne $ExpectedBranch) { Fail "Wrong Git branch. Expected $ExpectedBranch." }
$head = (git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) { Fail "Could not read current Git HEAD." }
Pass "Git branch is the approved Android repair branch"

$CandidateApk = Join-Path $CandidateFolder "loadify-market-$ExpectedVersionName-release.apk"
$MetadataPath = Join-Path $CandidateFolder "candidate-metadata.txt"
$HashPath = Join-Path $CandidateFolder "candidate-sha256.txt"
if (-not (Test-Path -LiteralPath $CandidateApk)) { Fail "Candidate APK is missing." }
if (-not (Test-Path -LiteralPath $MetadataPath)) { Fail "candidate-metadata.txt is missing." }
if (-not (Test-Path -LiteralPath $HashPath)) { Fail "candidate-sha256.txt is missing." }

$metadata = Read-KeyValueFile $MetadataPath
foreach ($name in @('package','versionCode','versionName','gitHead','certificateSha256','apkSha256')) {
    if (-not $metadata.ContainsKey($name) -or [string]::IsNullOrWhiteSpace([string]$metadata[$name])) {
        Fail "Candidate metadata is missing $name."
    }
}
if ([string]$metadata['package'] -ne $Package) { Fail "Candidate metadata package mismatch." }
if ([string]$metadata['versionCode'] -ne $ExpectedVersionCode) { Fail "Candidate metadata versionCode mismatch." }
if ([string]$metadata['versionName'] -ne $ExpectedVersionName) { Fail "Candidate metadata versionName mismatch." }
if ([string]$metadata['gitHead'] -ne $head) { Fail "Candidate was not built from the current checked-out HEAD." }
if (([string]$metadata['certificateSha256']).ToLowerInvariant() -ne $ExpectedCertSha256) { Fail "Candidate metadata certificate mismatch." }

$actualCandidateHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $CandidateApk).Hash.ToLowerInvariant()
if ($actualCandidateHash -ne ([string]$metadata['apkSha256']).ToLowerInvariant()) { Fail "Candidate APK hash differs from candidate metadata." }
$hashLine = Get-Content -LiteralPath $HashPath | Select-Object -First 1
$hashFromFile = if ($hashLine) { (($hashLine -split '\s+')[0]).ToLowerInvariant() } else { "" }
if ($hashFromFile -ne $actualCandidateHash) { Fail "candidate-sha256.txt does not match the APK." }
Pass "Candidate metadata and SHA-256 are internally consistent and bound to current HEAD"

$ApkSigner = Find-BuildTool "apksigner.bat"
if (-not $ApkSigner) { Fail "apksigner.bat not found." }
$candidateCert = Get-ApkCertSha256 $CandidateApk $ApkSigner
if ($candidateCert -ne $ExpectedCertSha256) { Fail "Candidate certificate does not match Loadify release lineage." }
Pass "Candidate certificate EXACTLY matches Loadify release lineage"

$stateResult = Invoke-NativeCapture { adb -s $DeviceSerial get-state }
$stateLine = $stateResult.Output | Select-Object -First 1
$deviceState = if ($null -eq $stateLine) { "" } else { $stateLine.ToString().Trim() }
if ($stateResult.ExitCode -ne 0 -or $deviceState -ne "device") { Fail "Pixel is not online/authorized through ADB." }
Pass "Pixel is online and authorized"

$before = Get-PackageDumpsys
if (-not $before) { Fail "Could not inspect currently installed Loadify package." }
$beforeVersionCode = Get-DumpsysValue $before "versionCode"
$beforeVersionName = Get-DumpsysValue $before "versionName"
$beforeFirstInstall = Get-DumpsysValue $before "firstInstallTime"
if (-not $beforeVersionCode -or $beforeVersionCode -notmatch "^$ExpectedVersionCode(?:\s|$)") { Fail "Installed app is not versionCode $ExpectedVersionCode before repair." }
if ($beforeVersionName -ne $ExpectedVersionName) { Fail "Installed app is not versionName $ExpectedVersionName before repair." }
if (-not $beforeFirstInstall) { Fail "Could not capture firstInstallTime before repair." }
Pass "Current installed app is exactly $ExpectedVersionCode / $ExpectedVersionName"

$pmPathBefore = Invoke-NativeCapture { adb -s $DeviceSerial shell pm path $Package }
$remoteBefore = $pmPathBefore.Output | Where-Object { $_ -match '^package:.*base\.apk\s*$' } | Select-Object -First 1
if (-not $remoteBefore) { Fail "Could not locate installed base.apk before repair." }
$remoteBefore = ($remoteBefore -replace '^package:', '').Trim()
$tempBefore = Join-Path $env:TEMP ("loadify-before-repair-" + [guid]::NewGuid().ToString('N') + ".apk")
try {
    $pullBefore = Invoke-NativeCapture { adb -s $DeviceSerial pull $remoteBefore $tempBefore }
    if ($pullBefore.ExitCode -ne 0 -or -not (Test-Path $tempBefore)) { Fail "Could not pull installed APK before repair." }
    $installedCertBefore = Get-ApkCertSha256 $tempBefore $ApkSigner
    if ($installedCertBefore -ne $ExpectedCertSha256) { Fail "Installed v2 certificate differs from Loadify release lineage." }
} finally {
    Remove-Item -LiteralPath $tempBefore -Force -ErrorAction SilentlyContinue
}
Pass "Installed v2 certificate matches candidate lineage before mutation"

Write-Host "`n=== SAME-VERSION IN-PLACE REPAIR ===" -ForegroundColor Cyan
Write-Host "Executing: adb install -r <verified repaired v2 APK>"
$installResult = Invoke-NativeCapture { adb -s $DeviceSerial install -r $CandidateApk }
$installResult.Output | ForEach-Object { Write-Host $_ }
if ($installResult.ExitCode -ne 0 -or -not ($installResult.Output -contains "Success")) {
    Fail "adb install -r did not complete successfully."
}
Pass "adb install -r returned Success"

$after = Get-PackageDumpsys
if (-not $after) { Fail "Could not inspect installed package after repair." }
$afterVersionCode = Get-DumpsysValue $after "versionCode"
$afterVersionName = Get-DumpsysValue $after "versionName"
$afterFirstInstall = Get-DumpsysValue $after "firstInstallTime"
$afterLastUpdate = Get-DumpsysValue $after "lastUpdateTime"
if (-not $afterVersionCode -or $afterVersionCode -notmatch "^$ExpectedVersionCode(?:\s|$)") { Fail "Installed versionCode changed unexpectedly after repair." }
if ($afterVersionName -ne $ExpectedVersionName) { Fail "Installed versionName changed unexpectedly after repair." }
if ($afterFirstInstall -ne $beforeFirstInstall) { Fail "firstInstallTime changed; repair does not look like an in-place replacement." }
Pass "Same package/version remains installed and firstInstallTime is preserved"

$pmPathAfter = Invoke-NativeCapture { adb -s $DeviceSerial shell pm path $Package }
$remoteAfter = $pmPathAfter.Output | Where-Object { $_ -match '^package:.*base\.apk\s*$' } | Select-Object -First 1
if (-not $remoteAfter) { Fail "Could not locate installed base.apk after repair." }
$remoteAfter = ($remoteAfter -replace '^package:', '').Trim()
$tempAfter = Join-Path $env:TEMP ("loadify-after-repair-" + [guid]::NewGuid().ToString('N') + ".apk")
try {
    $pullAfter = Invoke-NativeCapture { adb -s $DeviceSerial pull $remoteAfter $tempAfter }
    if ($pullAfter.ExitCode -ne 0 -or -not (Test-Path $tempAfter)) { Fail "Could not pull installed APK after repair." }
    $installedCertAfter = Get-ApkCertSha256 $tempAfter $ApkSigner
    if ($installedCertAfter -ne $ExpectedCertSha256) { Fail "Installed certificate mismatch after repair." }
    $installedHashAfter = (Get-FileHash -Algorithm SHA256 -LiteralPath $tempAfter).Hash.ToLowerInvariant()
    if ($installedHashAfter -ne $actualCandidateHash) { Fail "Installed base.apk does not exactly match repaired candidate." }
} finally {
    Remove-Item -LiteralPath $tempAfter -Force -ErrorAction SilentlyContinue
}
Pass "Installed APK hash and certificate EXACTLY match repaired candidate"

Write-Host "`n=== STARTUP GATE ===" -ForegroundColor Cyan
Invoke-NativeCapture { adb -s $DeviceSerial shell am force-stop $Package } | Out-Null
Invoke-NativeCapture { adb -s $DeviceSerial logcat -c } | Out-Null
$launchResult = Invoke-NativeCapture { adb -s $DeviceSerial shell monkey -p $Package -c android.intent.category.LAUNCHER 1 }
if ($launchResult.ExitCode -ne 0) { Fail "Launcher event failed after repair." }
Start-Sleep -Seconds 8

$pidResult = Invoke-NativeCapture { adb -s $DeviceSerial shell pidof $Package }
$pidLine = $pidResult.Output | Select-Object -First 1
$appPid = if ($null -eq $pidLine) { "" } else { $pidLine.ToString().Trim() }
if ($pidResult.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($appPid)) { Fail "Loadify process is not alive eight seconds after launch." }
Pass "Loadify process remains alive after launch (PID $appPid)"

$logResult = Invoke-NativeCapture { adb -s $DeviceSerial logcat -d -v brief }
$appCritical = @($logResult.Output | Where-Object {
    ($_ -match 'Default FirebaseApp is not initialized') -or
    ($_ -match 'java\.lang\.IllegalStateException: Default FirebaseApp') -or
    ($_ -match 'Process: co\.uk\.loadifymarket\.app.*has died') -or
    ($_ -match 'Unable to start activity.*co\.uk\.loadifymarket\.app')
})
if ($appCritical.Count -gt 0) {
    $appCritical | Select-Object -First 20 | ForEach-Object { Write-Host $_ }
    Fail "Critical Loadify/Firebase startup marker detected after repair."
}
Pass "No Loadify Firebase initialization fatal detected in startup window"

Write-Host "`n=== ORIGINAL BACKUP POST-CHECK ===" -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath $OriginalBackup -PathType Leaf)) {
    Fail "Original saved base.apk disappeared during repair."
}
$backupHashAfter = (Get-FileHash -Algorithm SHA256 -LiteralPath $OriginalBackup).Hash.ToLowerInvariant()
if ($backupHashAfter -ne $backupHashBefore -or $backupHashAfter -ne $backupExpectedHash) {
    Fail "Original saved base.apk hash changed unexpectedly."
}
Pass "Original saved base.apk remained byte-for-byte untouched and still matches its saved manifest"

Write-Host "`n=== RESULT ===" -ForegroundColor Green
Write-Host "SAME-VERSION V2 REPAIR INSTALL PASS"
Write-Host "Installed package: $Package"
Write-Host "Installed version: $ExpectedVersionCode / $ExpectedVersionName"
Write-Host "Installed repaired APK SHA-256: $actualCandidateHash"
Write-Host "Certificate SHA-256: $ExpectedCertSha256"
Write-Host "firstInstallTime preserved: $afterFirstInstall"
Write-Host "lastUpdateTime: $afterLastUpdate"
Write-Host "PID after startup: $appPid"
Write-Host "PASS: No uninstall, clear-data or downgrade operation was executed."
Write-Host "PASS: Original saved base.apk was not modified by this script."
Write-Host "Next gate: manual functional + visual E2E smoke on the repaired installed app."
