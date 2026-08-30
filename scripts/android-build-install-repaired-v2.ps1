param(
    [string]$DeviceSerial = "2A141FDH300HZL",
    [switch]$AcknowledgeSameVersionRepair
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$FunctionalBaseline = "dc232738b0f24fee2d2f8fd36e79c2079a61877e"
$AllowedPostBaselineFiles = @(
    "src/native.css",
    "src/pages/pixel-perfect/seller/SellerShell.tsx",
    "scripts/android-install-repaired-v2-candidate.ps1",
    "scripts/android-build-install-repaired-v2.ps1"
)
Set-Location $RepoRoot

function Fail([string]$Message) {
    Write-Host "`nSTOP: $Message" -ForegroundColor Red
    exit 1
}

if (-not $AcknowledgeSameVersionRepair) {
    Fail "Explicit acknowledgement required. Re-run with -AcknowledgeSameVersionRepair."
}

Write-Host "`n=== LOADIFY REPAIRED V2 BUILD + IN-PLACE E2E GATE ===" -ForegroundColor Cyan
Write-Host "Policy: same package co.uk.loadifymarket.app, same version 2 / 1.0.1"
Write-Host "Functional baseline: $FunctionalBaseline"
Write-Host "Original saved base.apk: read-only / never overwritten"
Write-Host "Forbidden: uninstall, clear-data, downgrade"

$buildScript = Join-Path $PSScriptRoot "android-build-release-candidate.ps1"
$installScript = Join-Path $PSScriptRoot "android-install-repaired-v2-candidate.ps1"

$previous = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
    $buildOutput = @(& powershell -ExecutionPolicy Bypass -File $buildScript -DeviceSerial $DeviceSerial 2>&1 | ForEach-Object {
        $text = $_.ToString()
        Write-Host $text
        $text
    })
    $buildExit = $LASTEXITCODE
} finally {
    $ErrorActionPreference = $previous
}

if ($buildExit -ne 0) { Fail "Signed release candidate build failed with exit code $buildExit." }
if ($buildOutput -notcontains "SIGNED RELEASE CANDIDATE PASS") {
    Fail "Build did not produce the exact SIGNED RELEASE CANDIDATE PASS verdict."
}

$candidateLine = $buildOutput | Where-Object { $_ -match '^Candidate folder:\s+' } | Select-Object -Last 1
if (-not $candidateLine) { Fail "Could not resolve candidate folder from successful build output." }
$CandidateFolder = ($candidateLine -replace '^Candidate folder:\s*', '').Trim()
if (-not (Test-Path -LiteralPath $CandidateFolder -PathType Container)) {
    Fail "Resolved candidate folder does not exist: $CandidateFolder"
}

$metadataPath = Join-Path $CandidateFolder "candidate-metadata.txt"
if (-not (Test-Path -LiteralPath $metadataPath)) { Fail "Candidate metadata is missing." }
$metadataLines = Get-Content -LiteralPath $metadataPath
$gitHeadLine = $metadataLines | Where-Object { $_ -match '^gitHead=' } | Select-Object -First 1
if (-not $gitHeadLine) { Fail "Candidate metadata does not contain gitHead." }
$candidateHead = ($gitHeadLine -replace '^gitHead=', '').Trim()
if ([string]::IsNullOrWhiteSpace($candidateHead)) { Fail "Candidate gitHead is empty." }

Write-Host "`n=== FUNCTIONAL BASELINE LOCK ===" -ForegroundColor Cyan
$changedSinceBaseline = @(git diff --name-only "$FunctionalBaseline..$candidateHead" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if ($LASTEXITCODE -ne 0) { Fail "Could not compare candidate HEAD with functional baseline." }
$unexpected = @($changedSinceBaseline | Where-Object { $_ -notin $AllowedPostBaselineFiles })
if ($unexpected.Count -gt 0) {
    Write-Host "Unexpected post-baseline files:" -ForegroundColor Yellow
    $unexpected | ForEach-Object { Write-Host "  $_" }
    Fail "Candidate contains post-baseline changes outside the approved Android visual/install surfaces."
}
Write-Host "Allowed post-baseline files:" -ForegroundColor DarkGray
$changedSinceBaseline | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
Write-Host "PASS: Candidate functional delta is locked to approved visual/install files only" -ForegroundColor Green

Write-Host "`n=== APPROVED CANDIDATE HANDOFF ===" -ForegroundColor Cyan
Write-Host "Candidate folder: $CandidateFolder"
Write-Host "Candidate gitHead: $candidateHead"
Write-Host "Proceeding only through guarded same-version adb install -r gate."

& powershell -ExecutionPolicy Bypass -File $installScript `
    -DeviceSerial $DeviceSerial `
    -CandidateFolder $CandidateFolder `
    -AcknowledgeSameVersionRepair
$installExit = $LASTEXITCODE
if ($installExit -ne 0) { Fail "Same-version repaired v2 install/startup gate failed with exit code $installExit." }

Write-Host "`n=== RESULT ===" -ForegroundColor Green
Write-Host "REPAIRED V2 BUILD + IN-PLACE STARTUP GATE PASS"
Write-Host "Candidate folder: $CandidateFolder"
Write-Host "Candidate gitHead: $candidateHead"
Write-Host "Next: manual visual/function smoke on the physical app; do not merge PR until that passes."
