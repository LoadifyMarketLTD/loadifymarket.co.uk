[CmdletBinding()]
param(
  [string]$ArchivePath = "",
  [switch]$SkipRootAssets,
  [switch]$ForceSubcategoryDownload,
  [switch]$OpenAuditReport,
  [switch]$StartDevServer
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repo = (git rev-parse --show-toplevel 2>$null)
if (-not $repo) { throw 'Run this script from inside the Loadify Market repository.' }
Set-Location $repo

$expectedBranch = 'visual-restore/user-source-20260823'
$currentBranch = (git branch --show-current).Trim()
if ($currentBranch -ne $expectedBranch) {
  throw "Wrong branch: $currentBranch. Expected $expectedBranch."
}

Write-Host '=== LOADIFY VISUAL RESTORE LOCAL RELEASE GATE ===' -ForegroundColor Cyan
Write-Host "Branch: $currentBranch"
Write-Host 'Existing unrelated working-tree changes are preserved; this script never resets or stashes them.'

if (-not $SkipRootAssets) {
  $originalAssetsStaged = $false

  if ($ArchivePath) {
    & powershell -ExecutionPolicy Bypass -File '.\scripts\stage-user-visual-assets.ps1' -ArchivePath $ArchivePath
    $originalAssetsStaged = ($LASTEXITCODE -eq 0)
  } else {
    & powershell -ExecutionPolicy Bypass -File '.\scripts\stage-user-visual-assets.ps1'
    $originalAssetsStaged = ($LASTEXITCODE -eq 0)
  }

  if (-not $originalAssetsStaged) {
    Write-Warning 'Original restore archive was not available. Staging the 16 wholesale root visuals directly from focused-image-craft instead.'
  }

  $rootDir = '.\public\category-visuals\wholesale'
  $rootCount = if (Test-Path $rootDir) { @(Get-ChildItem $rootDir -File -Filter '*.jpg').Count } else { 0 }
  if ($rootCount -ne 16) {
    & powershell -ExecutionPolicy Bypass -File '.\scripts\stage-wholesale-root-assets.ps1'
    if ($LASTEXITCODE -ne 0) { throw 'Wholesale root visual staging failed.' }
  }
}

if ($ForceSubcategoryDownload) {
  & powershell -ExecutionPolicy Bypass -File '.\scripts\stage-wholesale-subcategory-assets.ps1' -Force
} else {
  & powershell -ExecutionPolicy Bypass -File '.\scripts\stage-wholesale-subcategory-assets.ps1'
}
if ($LASTEXITCODE -ne 0) { throw 'Wholesale subcategory visual staging failed.' }

$rootImages = Get-ChildItem '.\public\category-visuals\wholesale' -File -Filter '*.jpg' -ErrorAction Stop
$subcategoryImages = Get-ChildItem '.\public\category-visuals\subcategories' -File -Filter '*.jpg' -Recurse -ErrorAction Stop
if ($rootImages.Count -ne 16) { throw "Expected 16 wholesale root JPGs, found $($rootImages.Count)." }
if ($subcategoryImages.Count -ne 96) { throw "Expected 96 wholesale subcategory JPGs, found $($subcategoryImages.Count)." }

Write-Host "Root images: $($rootImages.Count)/16" -ForegroundColor Green
Write-Host "Subcategory images: $($subcategoryImages.Count)/96" -ForegroundColor Green

Write-Host "`n=== IMAGE DUPLICATE / PARENT-REUSE GUARD ===" -ForegroundColor Cyan
if ($OpenAuditReport) {
  & powershell -ExecutionPolicy Bypass -File '.\scripts\audit-wholesale-visual-assets.ps1' -OpenReport
} else {
  & powershell -ExecutionPolicy Bypass -File '.\scripts\audit-wholesale-visual-assets.ps1'
}
if ($LASTEXITCODE -ne 0) { throw 'Wholesale visual image audit failed.' }

if (-not (Test-Path '.\node_modules')) {
  Write-Host 'node_modules missing; running npm ci...' -ForegroundColor Yellow
  npm ci
  if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
}

Write-Host "`n=== TYPECHECK ===" -ForegroundColor Cyan
npm run typecheck
if ($LASTEXITCODE -ne 0) { throw 'Typecheck failed.' }

Write-Host "`n=== VISUAL CONTRACT TESTS ===" -ForegroundColor Cyan
npm test -- src/data/wholesaleSubcategoryBlueprint.test.ts src/data/wholesaleVisualTaxonomy.test.ts src/data/wholesaleSubcategoryVisualManifest.test.ts src/data/wholesaleLocalAssets.test.ts src/data/categoryVisualContract.test.ts
if ($LASTEXITCODE -ne 0) { throw 'Visual contract tests failed.' }

Write-Host "`n=== PRODUCTION BUILD ===" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Production build failed.' }

Write-Host "`n=== LOCAL RELEASE GATE PASS ===" -ForegroundColor Green
Write-Host '16/16 root visuals present.'
Write-Host '96/96 dedicated subcategory visuals present.'
Write-Host '96/96 subcategory file hashes unique.'
Write-Host '0 parent-image reuse violations.'
Write-Host 'Typecheck PASS.'
Write-Host 'Visual contract tests PASS.'
Write-Host 'Production build PASS.'
Write-Host "`nManual semantic/browser inspection is still required before any PR/merge to main."
Write-Host 'Inspect the generated audit report plus homepage, /catalog, all 16 View All galleries, mobile/tablet/desktop widths.'

Write-Host "`n=== WORKTREE (PRESERVED) ===" -ForegroundColor Cyan
git status --short

if ($StartDevServer) {
  Write-Host "`nStarting Vite dev server for manual inspection..." -ForegroundColor Cyan
  npm run dev -- --host 127.0.0.1
} else {
  Write-Host "`nFor browser inspection run: npm run dev -- --host 127.0.0.1" -ForegroundColor Yellow
}
