[CmdletBinding()]
param(
  [switch]$Force
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

$targetRoot = Join-Path $repo 'public\category-visuals\wholesale'
New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null

$map = [ordered]@{
  'electronics-and-technology' = 'electronics.jpg'
  'clothing-and-apparel'       = 'clothing.jpg'
  'home-and-garden'            = 'home.jpg'
  'health-and-beauty'          = 'health-beauty.jpg'
  'toys-and-games'             = 'toys.jpg'
  'food-and-drink'             = 'food-drink.jpg'
  'tools-and-diy'              = 'tools.jpg'
  'sports-and-leisure'         = 'sports.jpg'
  'automotive'                 = 'automotive.jpg'
  'office-and-stationery'      = 'office.jpg'
  'baby-and-nursery'           = 'baby.jpg'
  'jewellery-and-watches'      = 'jewellery.jpg'
  'mixed-lots'                 = 'mixed-pallets.jpg'
  'customer-returns'           = 'returns.jpg'
  'overstock'                  = 'overstock.jpg'
  'clearance-deals'            = 'clearance.jpg'
}

function Assert-Jpeg([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { throw "Wholesale root image is missing: $Path" }
  $info = Get-Item -LiteralPath $Path
  if ($info.Length -lt 20000) { throw "Wholesale root image is unexpectedly small: $Path ($($info.Length) bytes)." }
  $stream = [System.IO.File]::OpenRead($Path)
  try {
    $b1 = $stream.ReadByte(); $b2 = $stream.ReadByte(); $b3 = $stream.ReadByte()
    if ($b1 -ne 0xFF -or $b2 -ne 0xD8 -or $b3 -ne 0xFF) {
      throw "Wholesale root file is not a JPEG: $Path"
    }
  } finally {
    $stream.Dispose()
  }
}

$needsSource = $Force
if (-not $needsSource) {
  foreach ($slug in $map.Keys) {
    $candidate = Join-Path $targetRoot "$slug.jpg"
    if (-not (Test-Path -LiteralPath $candidate)) {
      $needsSource = $true
      break
    }
  }
}

$tempClone = Join-Path $env:TEMP 'loadify-focused-image-craft-root-assets'
if ($needsSource) {
  if (Test-Path -LiteralPath $tempClone) { Remove-Item -LiteralPath $tempClone -Recurse -Force }

  Write-Host 'Cloning focused-image-craft temporarily using Git authentication...' -ForegroundColor Cyan
  git clone --depth 1 --filter=blob:none --sparse https://github.com/LoadifyMarketLTD/focused-image-craft.git $tempClone
  if ($LASTEXITCODE -ne 0) { throw 'Could not clone LoadifyMarketLTD/focused-image-craft with local Git credentials.' }

  Push-Location $tempClone
  try {
    git sparse-checkout set src/assets/categories
    if ($LASTEXITCODE -ne 0) { throw 'Could not sparse-checkout src/assets/categories from focused-image-craft.' }
  } finally {
    Pop-Location
  }
}

try {
  $completed = 0
  foreach ($slug in $map.Keys) {
    $sourceName = $map[$slug]
    $target = Join-Path $targetRoot "$slug.jpg"

    if ((Test-Path -LiteralPath $target) -and -not $Force) {
      Assert-Jpeg $target
      $completed++
      Write-Host "[$completed/16] EXISTS  public/category-visuals/wholesale/$slug.jpg"
      continue
    }

    $source = Join-Path $tempClone "src\assets\categories\$sourceName"
    if (-not (Test-Path -LiteralPath $source)) {
      throw "Missing source root asset in focused-image-craft: src/assets/categories/$sourceName"
    }

    Copy-Item -LiteralPath $source -Destination $target -Force
    Assert-Jpeg $target
    $completed++
    Write-Host "[$completed/16] STAGED  public/category-visuals/wholesale/$slug.jpg"
  }

  $files = @(Get-ChildItem $targetRoot -File -Filter '*.jpg')
  if ($files.Count -ne 16) { throw "Expected 16 wholesale root JPGs, found $($files.Count)." }

  Write-Host "`n=== WHOLESALE ROOT VISUAL STAGING COMPLETE ===" -ForegroundColor Green
  Write-Host 'Root images validated: 16 / 16'
  Write-Host 'Source: authenticated temporary Git checkout of LoadifyMarketLTD/focused-image-craft'
  Write-Host 'No database, migration, Android or production changes were made.'
} finally {
  if (Test-Path -LiteralPath $tempClone) {
    Remove-Item -LiteralPath $tempClone -Recurse -Force -ErrorAction SilentlyContinue
  }
}
