param(
    [string]$DeviceSerial = "2A141FDH300HZL"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Package = "co.uk.loadifymarket.app"
$ExpectedVersionCode = "2"
$ExpectedVersionName = "1.0.1"
$ExpectedCertSha256 = "0365a35b3413daf8c76e0bab2f56d898b94895dcee9e27151a03e1778bb97f24"
$ExpectedBranch = "visual/product-detail-premium-polish-20260829"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$CandidateRoot = Join-Path $env:USERPROFILE "Desktop\LoadifyMarket-Android-Candidates"
Set-Location $RepoRoot

function Pass([string]$Message) { Write-Host "PASS: $Message" -ForegroundColor Green }
function Info([string]$Message) { Write-Host "INFO: $Message" -ForegroundColor Cyan }
function Warn([string]$Message) { Write-Host "WARN: $Message" -ForegroundColor Yellow }
function Fail([string]$Message) {
    Write-Host "`nSTOP: $Message" -ForegroundColor Red
    Write-Host "No APK was installed or uninstalled by this script." -ForegroundColor Yellow
    exit 1
}

function Find-BuildTool([string]$FileName) {
    $roots = @()
    if ($env:ANDROID_HOME) { $roots += $env:ANDROID_HOME }
    if ($env:ANDROID_SDK_ROOT) { $roots += $env:ANDROID_SDK_ROOT }
    $roots += (Join-Path $env:LOCALAPPDATA "Android\Sdk")

    foreach ($root in ($roots | Select-Object -Unique)) {
        if (-not (Test-Path $root)) { continue }
        $candidate = Get-ChildItem (Join-Path $root "build-tools") -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName $FileName } |
            Where-Object { Test-Path $_ } |
            Select-Object -First 1
        if ($candidate) { return $candidate }
    }
    return $null
}

function Invoke-NativeCapture([scriptblock]$Command) {
    $previousErrorActionPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        $output = @(& $Command 2>&1 | ForEach-Object { $_.ToString() })
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousErrorActionPreference
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

Write-Host "`n=== LOADIFY SIGNED RELEASE CANDIDATE BUILD ===" -ForegroundColor Cyan
Write-Host "Repository: $RepoRoot"
Write-Host "Package: $Package"
Write-Host "Candidate version: $ExpectedVersionCode / $ExpectedVersionName"
Write-Host "Install policy: BUILD + VERIFY ONLY; NO INSTALL"

# ---------------------------------------------------------------------------
# 1. Git safety and exact branch
# ---------------------------------------------------------------------------
Write-Host "`n=== GIT SAFETY ===" -ForegroundColor Cyan
$branch = (git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0) { Fail "Not inside a Git checkout." }
if ($branch -ne $ExpectedBranch) { Fail "Wrong branch '$branch'. Expected '$ExpectedBranch'." }

$allowedGenerated = @(
    "android/app/capacitor.build.gradle",
    "android/capacitor.settings.gradle"
)
$trackedDirty = @(git status --porcelain=v1 --untracked-files=no | ForEach-Object {
    if ($_.Length -ge 4) { $_.Substring(3).Trim() }
})
$unexpectedDirty = @($trackedDirty | Where-Object { $_ -and ($_ -notin $allowedGenerated) })
if ($unexpectedDirty.Count -gt 0) {
    Write-Host "Unexpected tracked local changes:" -ForegroundColor Yellow
    $unexpectedDirty | ForEach-Object { Write-Host "  $_" }
    Fail "Preserve unexpected tracked local work before release build."
}
$generatedDirty = @($trackedDirty | Where-Object { $_ -in $allowedGenerated })
if ($generatedDirty.Count -gt 0) {
    git restore -- $generatedDirty
    if ($LASTEXITCODE -ne 0) { Fail "Could not restore generated Capacitor Gradle files." }
}

git fetch origin $ExpectedBranch
if ($LASTEXITCODE -ne 0) { Fail "git fetch failed." }
git merge --ff-only "origin/$ExpectedBranch"
if ($LASTEXITCODE -ne 0) { Fail "Branch cannot fast-forward cleanly; no reset was attempted." }
$Head = (git rev-parse HEAD).Trim()
$HeadShort = (git rev-parse --short=12 HEAD).Trim()
Write-Host "HEAD: $Head"
Pass "Exact branch synchronized without reset"

# ---------------------------------------------------------------------------
# 2. Full release preflight must pass verbatim
# ---------------------------------------------------------------------------
Write-Host "`n=== RELEASE PREFLIGHT RECHECK ===" -ForegroundColor Cyan
$preflightScript = Join-Path $PSScriptRoot "android-release-preflight.ps1"
$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
    $preflightOutput = @(& powershell -ExecutionPolicy Bypass -File $preflightScript -DeviceSerial $DeviceSerial 2>&1 | ForEach-Object {
        $text = $_.ToString()
        Write-Host $text
        $text
    })
    $preflightExitCode = $LASTEXITCODE
} finally {
    $ErrorActionPreference = $previousErrorActionPreference
}
if ($preflightExitCode -ne 0) {
    Fail "Release preflight child process exited with code $preflightExitCode."
}
if ($preflightOutput -notcontains "PASS: FULL RELEASE PREFLIGHT READY - release candidate build may proceed; no install was attempted") {
    Fail "FULL RELEASE PREFLIGHT READY was not proven in this build run."
}
Pass "Full rollback/device/signing/Firebase/runtime preflight"

# ---------------------------------------------------------------------------
# 3. Source identity before expensive build
# ---------------------------------------------------------------------------
Write-Host "`n=== SOURCE IDENTITY ===" -ForegroundColor Cyan
$gradleText = Get-Content ".\android\app\build.gradle" -Raw
if ($gradleText -notmatch 'applicationId\s+"co\.uk\.loadifymarket\.app"') { Fail "Android applicationId mismatch." }
if ($gradleText -notmatch 'versionCode\s+2') { Fail "Expected versionCode 2 not found." }
if ($gradleText -notmatch 'versionName\s+"1\.0\.1"') { Fail "Expected versionName 1.0.1 not found." }

$nativeShell = Get-Content ".\src\components\native\UpdatedNativeMarketplace.tsx" -Raw
foreach ($colour in @('#F8F7F4', '#0A234F', '#8A7351')) {
    if ($nativeShell -notmatch [regex]::Escape($colour)) { Fail "Required current app colour $colour missing from native shell." }
}
Pass "Package/version/current native colour identity present in source"

# ---------------------------------------------------------------------------
# 4. Local JS quality gates
# ---------------------------------------------------------------------------
Write-Host "`n=== LOCAL JS QUALITY GATES ===" -ForegroundColor Cyan
npm ci
if ($LASTEXITCODE -ne 0) { Fail "npm ci failed." }
npm run typecheck
if ($LASTEXITCODE -ne 0) { Fail "TypeScript typecheck failed." }
npm run lint
if ($LASTEXITCODE -ne 0) { Fail "ESLint failed." }
npm test
if ($LASTEXITCODE -ne 0) { Fail "Unit tests failed." }
npm run build
if ($LASTEXITCODE -ne 0) { Fail "Production Vite build failed." }
Pass "npm ci + typecheck + lint + tests + production build"

# Fail closed if obvious historical placeholder credentials leaked into dist.
$distJs = @(Get-ChildItem ".\dist\assets" -File -Filter "*.js" -ErrorAction SilentlyContinue)
if ($distJs.Count -eq 0) { Fail "No production JavaScript bundles found in dist/assets." }
foreach ($file in $distJs) {
    $text = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($text -match 'placeholder\.supabase\.co' -or $text -match 'pk_test_placeholder') {
        Fail "Historical placeholder runtime configuration detected in production bundle."
    }
}
Pass "No historical placeholder Supabase/Stripe markers in production bundle"

# ---------------------------------------------------------------------------
# 5. Capacitor sync + Firebase release processing
# ---------------------------------------------------------------------------
Write-Host "`n=== CAPACITOR + FIREBASE RELEASE PROCESSING ===" -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) { Fail "Capacitor Android sync failed." }

$firebasePath = Join-Path $RepoRoot "android\app\google-services.json"
if (-not (Test-Path $firebasePath)) { Fail "google-services.json disappeared before release build." }
try {
    $firebaseJson = Get-Content $firebasePath -Raw | ConvertFrom-Json
    $firebasePackages = @($firebaseJson.client | ForEach-Object { $_.client_info.android_client_info.package_name })
    if ($Package -notin $firebasePackages) { Fail "Firebase package mismatch before release processing." }
} catch {
    Fail "google-services.json is invalid before release processing."
}
git check-ignore -q -- "android/app/google-services.json"
if ($LASTEXITCODE -ne 0) { Fail "google-services.json is not gitignored." }
Pass "Firebase file still valid/package-matched/gitignored after Capacitor sync"

Push-Location ".\android"
try {
    & .\gradlew.bat :app:processReleaseGoogleServices
    if ($LASTEXITCODE -ne 0) { Fail "processReleaseGoogleServices failed." }
} finally {
    Pop-Location
}

$googleResource = Get-ChildItem ".\android\app\build" -Recurse -File -Filter "values.xml" -ErrorAction SilentlyContinue |
    Where-Object {
        $_.FullName -match 'release' -and
        (Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue) -match 'name="google_app_id"'
    } |
    Select-Object -First 1
if (-not $googleResource) { Fail "Release Google Services resources do not contain google_app_id." }
Pass "Release Google Services generated google_app_id"

# ---------------------------------------------------------------------------
# 6. Signed release APK build - never install
# ---------------------------------------------------------------------------
Write-Host "`n=== ASSEMBLE SIGNED RELEASE APK ===" -ForegroundColor Cyan
Push-Location ".\android"
try {
    & .\gradlew.bat assembleRelease
    if ($LASTEXITCODE -ne 0) { Fail "assembleRelease failed." }
} finally {
    Pop-Location
}

$Candidate = Join-Path $RepoRoot "android\app\build\outputs\apk\release\app-release.apk"
if (-not (Test-Path $Candidate)) { Fail "Signed release APK was not produced at expected path." }
Pass "Release APK produced"

$firebaseProvider = Get-ChildItem ".\android\app\build\intermediates" -Recurse -File -Filter "AndroidManifest.xml" -ErrorAction SilentlyContinue |
    Where-Object {
        $_.FullName -match 'release' -and
        (Get-Content $_.FullName -Raw -ErrorAction SilentlyContinue) -match 'FirebaseInitProvider'
    } |
    Select-Object -First 1
if (-not $firebaseProvider) { Fail "FirebaseInitProvider not found in merged release manifest." }
Pass "FirebaseInitProvider present in merged release manifest"

# ---------------------------------------------------------------------------
# 7. APK identity + cryptographic gates
# ---------------------------------------------------------------------------
Write-Host "`n=== RELEASE APK IDENTITY + SIGNATURE ===" -ForegroundColor Cyan
$ApkSigner = Find-BuildTool "apksigner.bat"
$Aapt2 = Find-BuildTool "aapt2.exe"
if (-not $ApkSigner) { Fail "apksigner.bat not found." }
if (-not $Aapt2) { Fail "aapt2.exe not found." }

$cert = Get-ApkCertSha256 $Candidate $ApkSigner
if (-not $cert) { Fail "Could not verify candidate signing certificate." }
Write-Host "Candidate certificate SHA-256: $cert"
if ($cert -ne $ExpectedCertSha256) { Fail "Candidate certificate does not match installed Loadify release lineage." }
Pass "Candidate certificate EXACTLY matches installed Loadify release certificate"

$badgingResult = Invoke-NativeCapture { & $Aapt2 dump badging $Candidate }
if ($badgingResult.ExitCode -ne 0) { Fail "aapt2 could not inspect candidate APK identity." }
$packageLine = $badgingResult.Output | Where-Object { $_ -match "^package: name='" } | Select-Object -First 1
if (-not $packageLine) { Fail "Candidate APK package metadata could not be read." }
if ($packageLine -notmatch "name='co\.uk\.loadifymarket\.app'") { Fail "Candidate APK package id mismatch." }
if ($packageLine -notmatch "versionCode='2'") { Fail "Candidate APK versionCode is not 2." }
if ($packageLine -notmatch "versionName='1\.0\.1'") { Fail "Candidate APK versionName is not 1.0.1." }
Pass "Candidate package/version is co.uk.loadifymarket.app / 2 / 1.0.1"

$verifyResult = Invoke-NativeCapture { & $ApkSigner verify --verbose --print-certs $Candidate }
if ($verifyResult.ExitCode -ne 0) { Fail "apksigner verbose verification failed." }
Pass "APK signature verification completed successfully"

# ---------------------------------------------------------------------------
# 8. Preserve immutable candidate evidence outside the repo
# ---------------------------------------------------------------------------
Write-Host "`n=== PRESERVE RELEASE CANDIDATE ===" -ForegroundColor Cyan
New-Item -ItemType Directory -Path $CandidateRoot -Force | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$OutDir = Join-Path $CandidateRoot ("candidate-$ExpectedVersionName-$HeadShort-$stamp")
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
$OutApk = Join-Path $OutDir "loadify-market-$ExpectedVersionName-release.apk"
Copy-Item -LiteralPath $Candidate -Destination $OutApk -Force

$hash = (Get-FileHash -Algorithm SHA256 $OutApk).Hash.ToLowerInvariant()
"$hash  loadify-market-$ExpectedVersionName-release.apk" | Set-Content -LiteralPath (Join-Path $OutDir "candidate-sha256.txt") -Encoding ascii
$verifyResult.Output | Set-Content -LiteralPath (Join-Path $OutDir "candidate-certificate.txt") -Encoding utf8
@(
    "package=$Package",
    "versionCode=$ExpectedVersionCode",
    "versionName=$ExpectedVersionName",
    "gitHead=$Head",
    "certificateSha256=$cert",
    "apkSha256=$hash",
    "sourceApk=$Candidate",
    "buildMode=release",
    "installPerformed=false"
) | Set-Content -LiteralPath (Join-Path $OutDir "candidate-metadata.txt") -Encoding utf8
Pass "Release candidate and verification evidence copied outside repository"

# Restore only generated tracked Capacitor Gradle files if cap sync changed them.
$generatedAfter = @(git status --porcelain=v1 --untracked-files=no | ForEach-Object {
    if ($_.Length -ge 4) { $_.Substring(3).Trim() }
} | Where-Object { $_ -in $allowedGenerated })
if ($generatedAfter.Count -gt 0) {
    git restore -- $generatedAfter
}

Write-Host "`n=== RESULT ===" -ForegroundColor Green
Write-Host "SIGNED RELEASE CANDIDATE PASS"
Write-Host "Candidate folder: $OutDir"
Write-Host "APK SHA-256: $hash"
Write-Host "Certificate SHA-256: $cert"
Write-Host "NO INSTALL WAS PERFORMED. The Pixel application and its data were not mutated by this script."
Write-Host "Next gate: inspect this exact preserved candidate, then separately authorize in-place adb install -r."
