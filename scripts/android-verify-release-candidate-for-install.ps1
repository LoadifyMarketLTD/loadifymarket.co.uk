param(
    [string]$DeviceSerial = "2A141FDH300HZL",
    [string]$CandidateFolder = "$env:USERPROFILE\Desktop\LoadifyMarket-Android-Candidates\candidate-1.0.1-aa440a1458c0-20260830-114414"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Package = "co.uk.loadifymarket.app"
$ExpectedCurrentVersionCode = "1"
$ExpectedCurrentVersionName = "1.0"
$ExpectedCandidateVersionCode = "2"
$ExpectedCandidateVersionName = "1.0.1"
$ExpectedCandidateHead = "aa440a1458c07caeeca22bfd6c073265f931eee8"
$ExpectedCandidateSha256 = "3095429c2aa4af21c58fa8bbd8d058ef14694c2fc4c462573e0e04bf44685c19"
$ExpectedCertSha256 = "0365a35b3413daf8c76e0bab2f56d898b94895dcee9e27151a03e1778bb97f24"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $RepoRoot

function Pass([string]$Message) { Write-Host "PASS: $Message" -ForegroundColor Green }
function Info([string]$Message) { Write-Host "INFO: $Message" -ForegroundColor Cyan }
function Warn([string]$Message) { Write-Host "WARN: $Message" -ForegroundColor Yellow }
function Fail([string]$Message) {
    Write-Host "`nSTOP: $Message" -ForegroundColor Red
    Write-Host "NO INSTALL WAS PERFORMED." -ForegroundColor Yellow
    exit 1
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

function Get-ApkCertSha256([string]$ApkPath, [string]$ApkSigner) {
    $result = Invoke-NativeCapture { & $ApkSigner verify --print-certs $ApkPath }
    if ($result.ExitCode -ne 0) { return $null }
    $line = $result.Output | Select-String -Pattern "Signer #1 certificate SHA-256 digest:" | Select-Object -First 1
    if (-not $line) { return $null }
    return (($line.ToString() -split ":", 2)[1]).Trim().ToLowerInvariant()
}

Write-Host "`n=== LOADIFY EXACT RELEASE CANDIDATE PRE-INSTALL GATE ===" -ForegroundColor Cyan
Write-Host "Device: $DeviceSerial"
Write-Host "Package: $Package"
Write-Host "Candidate source HEAD: $ExpectedCandidateHead"
Write-Host "Candidate expected SHA-256: $ExpectedCandidateSha256"
Write-Host "Policy: VERIFY ONLY; NO INSTALL / UNINSTALL / CLEAR DATA"

# ---------------------------------------------------------------------------
# 1. Exact preserved candidate evidence
# ---------------------------------------------------------------------------
Write-Host "`n=== PRESERVED CANDIDATE IDENTITY ===" -ForegroundColor Cyan
if (-not (Test-Path -LiteralPath $CandidateFolder)) { Fail "Candidate folder does not exist: $CandidateFolder" }

$CandidateApk = Join-Path $CandidateFolder "loadify-market-$ExpectedCandidateVersionName-release.apk"
$MetadataPath = Join-Path $CandidateFolder "candidate-metadata.txt"
$HashPath = Join-Path $CandidateFolder "candidate-sha256.txt"
if (-not (Test-Path -LiteralPath $CandidateApk)) { Fail "Expected preserved release APK is missing." }
if (-not (Test-Path -LiteralPath $MetadataPath)) { Fail "candidate-metadata.txt is missing." }
if (-not (Test-Path -LiteralPath $HashPath)) { Fail "candidate-sha256.txt is missing." }

$actualHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $CandidateApk).Hash.ToLowerInvariant()
if ($actualHash -ne $ExpectedCandidateSha256) { Fail "Preserved APK SHA-256 does not match the already-approved build output." }
Pass "Preserved APK SHA-256 EXACTLY matches approved candidate"

$savedHashLine = (Get-Content -LiteralPath $HashPath -ErrorAction Stop | Select-Object -First 1).Trim().ToLowerInvariant()
if (-not $savedHashLine.StartsWith($ExpectedCandidateSha256)) { Fail "candidate-sha256.txt does not describe the approved APK hash." }
Pass "Saved candidate hash evidence matches approved APK"

$metadata = @{}
foreach ($line in (Get-Content -LiteralPath $MetadataPath -ErrorAction Stop)) {
    if ($line -match '^([^=]+)=(.*)$') { $metadata[$matches[1].Trim()] = $matches[2].Trim() }
}
$requiredMetadata = @{
    package = $Package
    versionCode = $ExpectedCandidateVersionCode
    versionName = $ExpectedCandidateVersionName
    gitHead = $ExpectedCandidateHead
    certificateSha256 = $ExpectedCertSha256
    apkSha256 = $ExpectedCandidateSha256
    buildMode = "release"
    installPerformed = "false"
}
foreach ($entry in $requiredMetadata.GetEnumerator()) {
    if (-not $metadata.ContainsKey($entry.Key)) { Fail "Candidate metadata is missing '$($entry.Key)'." }
    if ($metadata[$entry.Key].ToLowerInvariant() -ne $entry.Value.ToLowerInvariant()) {
        Fail "Candidate metadata mismatch for '$($entry.Key)'."
    }
}
Pass "Candidate metadata binds exact package/version/source/certificate/hash"

# ---------------------------------------------------------------------------
# 2. Re-run release preflight against current phone + rollback + signing
# ---------------------------------------------------------------------------
Write-Host "`n=== CURRENT RELEASE PREFLIGHT RECHECK ===" -ForegroundColor Cyan
$preflightScript = Join-Path $PSScriptRoot "android-release-preflight.ps1"
$previous = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
    $preflightOutput = @(& powershell -ExecutionPolicy Bypass -File $preflightScript -DeviceSerial $DeviceSerial 2>&1 | ForEach-Object {
        $text = $_.ToString()
        Write-Host $text
        $text
    })
    $preflightExitCode = $LASTEXITCODE
} finally {
    $ErrorActionPreference = $previous
}
if ($preflightExitCode -ne 0) { Fail "Release preflight child process exited with code $preflightExitCode." }
if ($preflightOutput -notcontains "PASS: FULL RELEASE PREFLIGHT READY - release candidate build may proceed; no install was attempted") {
    Fail "Current rollback/device/signing/runtime preflight is no longer fully ready."
}
Pass "Current rollback/device/signing/Firebase/runtime preflight remains green"

# ---------------------------------------------------------------------------
# 3. Current installed version must still be the untouched v1 baseline
# ---------------------------------------------------------------------------
Write-Host "`n=== CURRENT INSTALLED BASELINE ===" -ForegroundColor Cyan
$state = (adb -s $DeviceSerial get-state 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or $state -ne "device") { Fail "Pixel is not connected/authorized as an online ADB device." }

$dumpsys = @(adb -s $DeviceSerial shell dumpsys package $Package 2>$null | ForEach-Object { $_.ToString() })
if ($LASTEXITCODE -ne 0 -or $dumpsys.Count -eq 0) { Fail "Could not inspect currently installed Loadify package." }
$currentVersionCodeLine = $dumpsys | Where-Object { $_ -match '^\s*versionCode=' } | Select-Object -First 1
$currentVersionNameLine = $dumpsys | Where-Object { $_ -match '^\s*versionName=' } | Select-Object -First 1
if (-not $currentVersionCodeLine -or $currentVersionCodeLine -notmatch "versionCode=$ExpectedCurrentVersionCode(?:\s|$)") {
    Fail "Current installed app is no longer the expected versionCode $ExpectedCurrentVersionCode baseline."
}
if (-not $currentVersionNameLine -or $currentVersionNameLine -notmatch "versionName=$([regex]::Escape($ExpectedCurrentVersionName))(?:\s|$)") {
    Fail "Current installed app is no longer the expected versionName $ExpectedCurrentVersionName baseline."
}
Pass "Pixel still has untouched installed baseline $ExpectedCurrentVersionCode / $ExpectedCurrentVersionName"

# ---------------------------------------------------------------------------
# 4. Candidate APK cryptographic + package/version inspection
# ---------------------------------------------------------------------------
Write-Host "`n=== CANDIDATE CRYPTOGRAPHIC RECHECK ===" -ForegroundColor Cyan
$ApkSigner = Find-BuildTool "apksigner.bat"
$Aapt2 = Find-BuildTool "aapt2.exe"
if (-not $ApkSigner) { Fail "apksigner.bat not found." }
if (-not $Aapt2) { Fail "aapt2.exe not found." }

$cert = Get-ApkCertSha256 $CandidateApk $ApkSigner
if (-not $cert) { Fail "Could not inspect candidate signing certificate." }
if ($cert -ne $ExpectedCertSha256) { Fail "Candidate certificate no longer matches installed Loadify release lineage." }
Pass "Candidate certificate EXACTLY matches installed release lineage"

$verify = Invoke-NativeCapture { & $ApkSigner verify --verbose --print-certs $CandidateApk }
if ($verify.ExitCode -ne 0) { Fail "Candidate APK signature verification failed." }
Pass "Candidate APK signature verifies"

$badging = Invoke-NativeCapture { & $Aapt2 dump badging $CandidateApk }
if ($badging.ExitCode -ne 0) { Fail "aapt2 could not inspect candidate package metadata." }
$packageLine = $badging.Output | Where-Object { $_ -match "^package: name='" } | Select-Object -First 1
if (-not $packageLine) { Fail "Candidate package metadata is unreadable." }
if ($packageLine -notmatch "name='co\.uk\.loadifymarket\.app'") { Fail "Candidate package id mismatch." }
if ($packageLine -notmatch "versionCode='2'") { Fail "Candidate versionCode mismatch." }
if ($packageLine -notmatch "versionName='1\.0\.1'") { Fail "Candidate versionName mismatch." }
Pass "Candidate package/version is exactly co.uk.loadifymarket.app / 2 / 1.0.1"

# ---------------------------------------------------------------------------
# 5. Final no-install verdict
# ---------------------------------------------------------------------------
Write-Host "`n=== RESULT ===" -ForegroundColor Green
Write-Host "VERIFIED RELEASE CANDIDATE READY FOR SEPARATE IN-PLACE INSTALL GATE"
Write-Host "Candidate: $CandidateApk"
Write-Host "APK SHA-256: $actualHash"
Write-Host "Certificate SHA-256: $cert"
Write-Host "Current installed version: $ExpectedCurrentVersionCode / $ExpectedCurrentVersionName"
Write-Host "Candidate version: $ExpectedCandidateVersionCode / $ExpectedCandidateVersionName"
Write-Host "NO INSTALL WAS PERFORMED."
Warn "After installing versionCode 2, Android may refuse a downgrade to saved versionCode 1 without uninstalling. The v1 backup is a strong binary recovery asset, but a data-preserving downgrade is NOT guaranteed."
Write-Host "Next action must be a separately authorized adb install -r of this exact SHA-256 only."
