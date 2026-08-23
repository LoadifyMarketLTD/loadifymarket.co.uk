[CmdletBinding()]
param(
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Assert-VisualBranch {
  $branch = (git branch --show-current).Trim()
  if ($branch -ne 'visual-restore/user-source-20260823') {
    throw "Refusing to stage wholesale visuals on branch '$branch'. Expected visual-restore/user-source-20260823."
  }
}

function Assert-RepoRoot {
  if (-not (Test-Path '.git')) { throw 'Run this script from the Loadify Market repository root.' }
  if (-not (Test-Path 'scripts/wholesale-subcategory-assets.json')) {
    throw 'Missing scripts/wholesale-subcategory-assets.json.'
  }
}

function Assert-JpegFile([string]$Path) {
  $info = Get-Item -LiteralPath $Path
  if ($info.Length -lt 20000) {
    throw "Downloaded image is unexpectedly small: $Path ($($info.Length) bytes)."
  }

  $stream = [System.IO.File]::OpenRead($Path)
  try {
    $b1 = $stream.ReadByte(); $b2 = $stream.ReadByte(); $b3 = $stream.ReadByte()
    if ($b1 -ne 0xFF -or $b2 -ne 0xD8 -or $b3 -ne 0xFF) {
      throw "Downloaded file is not a JPEG: $Path"
    }
  } finally {
    $stream.Dispose()
  }

  try {
    Add-Type -AssemblyName System.Drawing -ErrorAction Stop
    $image = [System.Drawing.Image]::FromFile($Path)
    try {
      if ($image.Width -lt 1000 -or $image.Height -lt 700) {
        throw "Image resolution below visual contract minimum: $($image.Width)x$($image.Height) at $Path"
      }
      $ratio = [double]$image.Width / [double]$image.Height
      if ([Math]::Abs($ratio - (4.0 / 3.0)) -gt 0.03) {
        throw "Image is not approximately 4:3: $($image.Width)x$($image.Height) at $Path"
      }
    } finally {
      $image.Dispose()
    }
  } catch [System.IO.FileNotFoundException] {
    Write-Warning 'System.Drawing is unavailable; JPEG byte and size validation still passed.'
  } catch [System.TypeInitializationException] {
    Write-Warning 'System.Drawing is unavailable; JPEG byte and size validation still passed.'
  }
}

Assert-RepoRoot
Assert-VisualBranch

$manifest = Get-Content 'scripts/wholesale-subcategory-assets.json' -Raw | ConvertFrom-Json
$entries = @($manifest.categories | ForEach-Object { $_.subcategories })

if ($manifest.categories.Count -ne 16) { throw "Expected 16 categories, got $($manifest.categories.Count)." }
if ($entries.Count -ne 96) { throw "Expected 96 subcategory images, got $($entries.Count)." }

$sourceIds = @($entries | ForEach-Object { $_.sourceId })
$targets = @($entries | ForEach-Object { $_.targetPath })
if (($sourceIds | Sort-Object -Unique).Count -ne 96) { throw 'Source-image IDs are not globally unique.' }
if (($targets | Sort-Object -Unique).Count -ne 96) { throw 'Target image paths are not globally unique.' }

$repoRoot = (Resolve-Path '.').Path
$tempRoot = Join-Path $env:TEMP 'loadify-wholesale-subcategory-assets'
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

$completed = 0
foreach ($entry in $entries) {
  $target = Join-Path $repoRoot ($entry.targetPath -replace '/', [System.IO.Path]::DirectorySeparatorChar)
  $targetDir = Split-Path -Parent $target
  New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

  if ((Test-Path -LiteralPath $target) -and -not $Force) {
    Assert-JpegFile $target
    $completed++
    Write-Host "[$completed/96] EXISTS  $($entry.targetPath)"
    continue
  }

  $temp = Join-Path $tempRoot ("{0}-{1}.jpg" -f ([Guid]::NewGuid().ToString('N')), $entry.sourceId)
  $attempt = 0
  $downloaded = $false
  while (-not $downloaded -and $attempt -lt 3) {
    $attempt++
    try {
      Invoke-WebRequest -Uri $entry.sourceUrl -OutFile $temp -MaximumRedirection 10 -Headers @{ 'User-Agent' = 'LoadifyMarketVisualStager/1.0' }
      Assert-JpegFile $temp
      $downloaded = $true
    } catch {
      Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
      if ($attempt -ge 3) { throw }
      Start-Sleep -Seconds (2 * $attempt)
    }
  }

  Move-Item -LiteralPath $temp -Destination $target -Force
  Assert-JpegFile $target
  $completed++
  Write-Host "[$completed/96] STAGED  $($entry.targetPath)"
}

Write-Host "`n=== WHOLESALE SUBCATEGORY VISUAL STAGING COMPLETE ==="
Write-Host "Images validated: $completed / 96"
Write-Host 'No database, migration, Android or production changes were made.'
Write-Host "`nRun next:"
Write-Host '  git status --short -- public/category-visuals/subcategories'
Write-Host '  npm run typecheck'
Write-Host '  npm test -- --run src/data/wholesaleSubcategoryBlueprint.test.ts src/data/wholesaleVisualTaxonomy.test.ts src/data/wholesaleSubcategoryVisualManifest.test.ts'
Write-Host '  npm run build'
