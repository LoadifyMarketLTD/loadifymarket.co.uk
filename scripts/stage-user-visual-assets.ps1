param(
  [string]$ArchivePath = ""
)

$ErrorActionPreference = "Stop"

$repo = (git rev-parse --show-toplevel 2>$null)
if (-not $repo) { throw "Run this script from inside the Loadify Market repository." }
Set-Location $repo

$expectedBranch = "visual-restore/user-source-20260823"
$currentBranch = (git branch --show-current).Trim()
if ($currentBranch -ne $expectedBranch) {
  throw "Wrong branch: $currentBranch. Switch to $expectedBranch first."
}

if (-not $ArchivePath) {
  $candidates = @(
    "$HOME\Downloads\loadify-homepage-restore (1)(1).zip",
    "$HOME\Downloads\loadify-homepage-restore.zip",
    "$HOME\Desktop\loadify-homepage-restore (1)(1).zip",
    "$HOME\Desktop\loadify-homepage-restore.zip"
  ) | Where-Object { Test-Path $_ }

  if ($candidates.Count -eq 0) {
    throw "Homepage restore archive not found automatically. Re-run with -ArchivePath 'C:\path\to\loadify-homepage-restore.zip'."
  }
  $ArchivePath = $candidates[0]
}

$ArchivePath = (Resolve-Path $ArchivePath).Path
$temp = Join-Path $env:TEMP "loadify-visual-restore-20260823"
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }
New-Item -ItemType Directory -Path $temp | Out-Null

Write-Host "Extracting: $ArchivePath" -ForegroundColor Cyan
Expand-Archive -LiteralPath $ArchivePath -DestinationPath $temp -Force

$sourceRoot = Get-ChildItem $temp -Directory -Recurse |
  Where-Object { Test-Path (Join-Path $_.FullName "src\assets\hero-seller-dashboard.jpg") } |
  Select-Object -First 1

if (-not $sourceRoot) {
  throw "Could not locate restore package root containing src\assets\hero-seller-dashboard.jpg"
}

$assetSource = Join-Path $sourceRoot.FullName "src\assets"
$assetTarget = Join-Path $repo "src\assets"

$files = @(
  "auth-login-bg.jpg",
  "auth-signup-bg.jpg",
  "hero-clearance-alt1.jpg",
  "hero-clearance-alt2.jpg",
  "hero-clearance-alt3.jpg",
  "hero-seller-dashboard.jpg",
  "hero-warehouse.jpg",
  "loadify-logo.png",
  "categories\automotive.jpg",
  "categories\baby.jpg",
  "categories\clearance.jpg",
  "categories\clothing.jpg",
  "categories\electronics.jpg",
  "categories\food-drink.jpg",
  "categories\health-beauty.jpg",
  "categories\home.jpg",
  "categories\jewellery.jpg",
  "categories\mixed-pallets.jpg",
  "categories\office.jpg",
  "categories\overstock.jpg",
  "categories\returns.jpg",
  "categories\sports.jpg",
  "categories\tools.jpg",
  "categories\toys.jpg"
)

foreach ($relative in $files) {
  $src = Join-Path $assetSource $relative
  if (-not (Test-Path $src)) { throw "Missing asset in package: $relative" }

  $dst = Join-Path $assetTarget $relative
  $dstDir = Split-Path $dst -Parent
  if (-not (Test-Path $dstDir)) { New-Item -ItemType Directory -Path $dstDir -Force | Out-Null }
  Copy-Item -LiteralPath $src -Destination $dst -Force
}

# Canonical 10-root navigation assets used by the existing category contract.
$categoryVisualTarget = Join-Path $repo "public\category-visuals"
if (-not (Test-Path $categoryVisualTarget)) {
  New-Item -ItemType Directory -Path $categoryVisualTarget -Force | Out-Null
}

$canonicalMap = @{
  "electronics"       = "categories\electronics.jpg"
  "home-garden"       = "categories\home.jpg"
  "clothing-fashion"  = "categories\clothing.jpg"
  "toys-games"        = "categories\toys.jpg"
  "sports-fitness"    = "categories\sports.jpg"
  "automotive"        = "categories\automotive.jpg"
  "health-beauty"     = "categories\health-beauty.jpg"
  "food-drink"        = "categories\food-drink.jpg"
  "office-business"   = "categories\office.jpg"
}

foreach ($slug in $canonicalMap.Keys) {
  $src = Join-Path $assetSource $canonicalMap[$slug]
  $dst = Join-Path $categoryVisualTarget "$slug.jpg"
  Copy-Item -LiteralPath $src -Destination $dst -Force
}

# Wholesale storefront 16-root visual contract imported from focused-image-craft.
$wholesaleTarget = Join-Path $categoryVisualTarget "wholesale"
if (-not (Test-Path $wholesaleTarget)) {
  New-Item -ItemType Directory -Path $wholesaleTarget -Force | Out-Null
}

$wholesaleMap = @{
  "electronics-and-technology" = "categories\electronics.jpg"
  "clothing-and-apparel"       = "categories\clothing.jpg"
  "home-and-garden"            = "categories\home.jpg"
  "health-and-beauty"          = "categories\health-beauty.jpg"
  "toys-and-games"             = "categories\toys.jpg"
  "food-and-drink"             = "categories\food-drink.jpg"
  "tools-and-diy"              = "categories\tools.jpg"
  "sports-and-leisure"         = "categories\sports.jpg"
  "automotive"                 = "categories\automotive.jpg"
  "office-and-stationery"      = "categories\office.jpg"
  "baby-and-nursery"           = "categories\baby.jpg"
  "jewellery-and-watches"      = "categories\jewellery.jpg"
  "mixed-lots"                 = "categories\mixed-pallets.jpg"
  "customer-returns"           = "categories\returns.jpg"
  "overstock"                  = "categories\overstock.jpg"
  "clearance-deals"            = "categories\clearance.jpg"
}

foreach ($slug in $wholesaleMap.Keys) {
  $src = Join-Path $assetSource $wholesaleMap[$slug]
  $dst = Join-Path $wholesaleTarget "$slug.jpg"
  Copy-Item -LiteralPath $src -Destination $dst -Force
}

$subcategoryTarget = Join-Path $categoryVisualTarget "subcategories"
if (-not (Test-Path $subcategoryTarget)) {
  New-Item -ItemType Directory -Path $subcategoryTarget -Force | Out-Null
}

Write-Host "`nStaged 24 user-provided source assets." -ForegroundColor Green
Write-Host "Staged 9 canonical root category navigation images." -ForegroundColor Green
Write-Host "Staged all 16 wholesale root category images." -ForegroundColor Green
Write-Host "Prepared public/category-visuals/subcategories for the 96 dedicated subcategory assets." -ForegroundColor Green
Write-Host "Dedicated subcategory images remain pending until each real asset is added." -ForegroundColor Yellow
Write-Host "No commit was created automatically." -ForegroundColor Yellow
Write-Host "`n=== GIT STATUS ===" -ForegroundColor Cyan
git status --short -- src/assets public/category-visuals

Remove-Item $temp -Recurse -Force
