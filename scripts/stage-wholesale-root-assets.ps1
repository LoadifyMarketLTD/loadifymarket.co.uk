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

$sourceBase = 'https://raw.githubusercontent.com/LoadifyMarketLTD/focused-image-craft/main/src/assets/categories'
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

  $url = "$sourceBase/$sourceName"
  Invoke-WebRequest -Uri $url -OutFile $target -MaximumRedirection 10 -Headers @{ 'User-Agent' = 'LoadifyMarketVisualStager/1.0' }
  Assert-Jpeg $target
  $completed++
  Write-Host "[$completed/16] STAGED  public/category-visuals/wholesale/$slug.jpg"
}

$files = Get-ChildItem $targetRoot -File -Filter '*.jpg'
if ($files.Count -ne 16) { throw "Expected 16 wholesale root JPGs, found $($files.Count)." }

Write-Host "`n=== WHOLESALE ROOT VISUAL STAGING COMPLETE ===" -ForegroundColor Green
Write-Host 'Root images validated: 16 / 16'
Write-Host 'Source: LoadifyMarketLTD/focused-image-craft'
Write-Host 'No database, migration, Android or production changes were made.'
