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

Write-Host "`nStaged 24 user-provided visual assets." -ForegroundColor Green
Write-Host "No commit was created automatically." -ForegroundColor Yellow
Write-Host "`n=== GIT STATUS ===" -ForegroundColor Cyan
git status --short -- src/assets

Remove-Item $temp -Recurse -Force
