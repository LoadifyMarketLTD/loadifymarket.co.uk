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

function Assert-JpegBytes([string]$Path) {
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
}

function Normalize-Jpeg4x3([string]$SourcePath, [string]$DestinationPath) {
  Add-Type -AssemblyName System.Drawing -ErrorAction Stop
  $source = [System.Drawing.Image]::FromFile($SourcePath)
  try {
    $targetRatio = 4.0 / 3.0
    $sourceRatio = [double]$source.Width / [double]$source.Height

    if ($sourceRatio -gt $targetRatio) {
      $cropHeight = $source.Height
      $cropWidth = [int][Math]::Round($cropHeight * $targetRatio)
      $cropX = [int][Math]::Floor(($source.Width - $cropWidth) / 2.0)
      $cropY = 0
    } else {
      $cropWidth = $source.Width
      $cropHeight = [int][Math]::Round($cropWidth / $targetRatio)
      $cropX = 0
      $cropY = [int][Math]::Floor(($source.Height - $cropHeight) / 2.0)
    }

    $bitmap = [System.Drawing.Bitmap]::new(1400, 1050)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $destRect = [System.Drawing.Rectangle]::new(0, 0, 1400, 1050)
        $srcRect = [System.Drawing.Rectangle]::new($cropX, $cropY, $cropWidth, $cropHeight)
        $graphics.DrawImage($source, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
      } finally {
        $graphics.Dispose()
      }

      $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
        Where-Object { $_.MimeType -eq 'image/jpeg' } |
        Select-Object -First 1
      if (-not $jpegCodec) { throw 'JPEG encoder unavailable in System.Drawing.' }

      $encoderParams = [System.Drawing.Imaging.EncoderParameters]::new(1)
      $qualityParam = [System.Drawing.Imaging.EncoderParameter]::new(
        [System.Drawing.Imaging.Encoder]::Quality,
        [long]90
      )
      try {
        $encoderParams.Param[0] = $qualityParam
        $bitmap.Save($DestinationPath, $jpegCodec, $encoderParams)
      } finally {
        $qualityParam.Dispose()
        $encoderParams.Dispose()
      }
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $source.Dispose()
  }
}

function Assert-FinalJpeg([string]$Path) {
  Assert-JpegBytes $Path
  Add-Type -AssemblyName System.Drawing -ErrorAction Stop
  $image = [System.Drawing.Image]::FromFile($Path)
  try {
    if ($image.Width -ne 1400 -or $image.Height -ne 1050) {
      throw "Final image must be exactly 1400x1050 (4:3), got $($image.Width)x$($image.Height): $Path"
    }
  } finally {
    $image.Dispose()
  }
}

Assert-RepoRoot
Assert-VisualBranch

$manifest = Get-Content 'scripts/wholesale-subcategory-assets.json' -Raw | ConvertFrom-Json
$entries = @($manifest.categories | ForEach-Object { $_.subcategories })

if ($manifest.categories.Count -ne 16) { throw "Expected 16 categories, got $($manifest.categories.Count)." }
foreach ($category in $manifest.categories) {
  if ($category.subcategories.Count -ne 6) {
    throw "Category '$($category.category)' must have exactly 6 subcategory sources; got $($category.subcategories.Count)."
  }
}
if ($entries.Count -ne 96) { throw "Expected 96 subcategory images, got $($entries.Count)." }

$sourceIds = @($entries | ForEach-Object { $_.sourceId })
$targets = @($entries | ForEach-Object { $_.targetPath })
if (($sourceIds | Sort-Object -Unique).Count -ne 96) { throw 'Source-image IDs are not globally unique.' }
if (($targets | Sort-Object -Unique).Count -ne 96) { throw 'Target image paths are not globally unique.' }

foreach ($entry in $entries) {
  if ($entry.sourceUrl -notmatch '^https://unsplash\.com/photos/') {
    throw "Unexpected visual source host for '$($entry.title)': $($entry.sourceUrl)"
  }
  if ($entry.targetPath -notmatch '^public/category-visuals/subcategories/[a-z0-9-]+/[a-z0-9-]+\.jpg$') {
    throw "Unsafe or invalid target path for '$($entry.title)': $($entry.targetPath)"
  }
}

$repoRoot = (Resolve-Path '.').Path
$tempRoot = Join-Path $env:TEMP 'loadify-wholesale-subcategory-assets'
New-Item -ItemType Directory -Force -Path $tempRoot | Out-Null

$completed = 0
foreach ($entry in $entries) {
  $target = Join-Path $repoRoot ($entry.targetPath -replace '/', [System.IO.Path]::DirectorySeparatorChar)
  $targetDir = Split-Path -Parent $target
  New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

  if ((Test-Path -LiteralPath $target) -and -not $Force) {
    Assert-FinalJpeg $target
    $completed++
    Write-Host "[$completed/96] EXISTS  $($entry.targetPath)"
    continue
  }

  $rawTemp = Join-Path $tempRoot ("{0}-{1}-raw.jpg" -f ([Guid]::NewGuid().ToString('N')), $entry.sourceId)
  $finalTemp = Join-Path $tempRoot ("{0}-{1}-final.jpg" -f ([Guid]::NewGuid().ToString('N')), $entry.sourceId)
  $attempt = 0
  $downloaded = $false
  while (-not $downloaded -and $attempt -lt 3) {
    $attempt++
    try {
      Invoke-WebRequest -Uri $entry.sourceUrl -OutFile $rawTemp -MaximumRedirection 10 -Headers @{ 'User-Agent' = 'LoadifyMarketVisualStager/1.0'; 'Accept' = 'image/jpeg,image/*;q=0.8' }
      Assert-JpegBytes $rawTemp
      $downloaded = $true
    } catch {
      Remove-Item -LiteralPath $rawTemp -Force -ErrorAction SilentlyContinue
      if ($attempt -ge 3) { throw }
      Start-Sleep -Seconds (2 * $attempt)
    }
  }

  Normalize-Jpeg4x3 -SourcePath $rawTemp -DestinationPath $finalTemp
  Assert-FinalJpeg $finalTemp
  Move-Item -LiteralPath $finalTemp -Destination $target -Force
  Remove-Item -LiteralPath $rawTemp -Force -ErrorAction SilentlyContinue
  Assert-FinalJpeg $target
  $completed++
  Write-Host "[$completed/96] STAGED  $($entry.targetPath)"
}

Write-Host "`n=== WHOLESALE SUBCATEGORY VISUAL STAGING COMPLETE ==="
Write-Host "Images normalized and validated: $completed / 96"
Write-Host 'Final format: JPEG 1400x1050, exact 4:3, quality 90.'
Write-Host 'No database, migration, Android or production changes were made.'
Write-Host "`nRun next:"
Write-Host '  git status --short -- public/category-visuals/subcategories'
Write-Host '  powershell -ExecutionPolicy Bypass -File .\scripts\audit-wholesale-visual-assets.ps1 -OpenReport'
Write-Host '  npm run typecheck'
Write-Host '  npm test -- src/data/wholesaleSubcategoryBlueprint.test.ts src/data/wholesaleVisualTaxonomy.test.ts src/data/wholesaleSubcategoryVisualManifest.test.ts src/data/wholesaleLocalAssets.test.ts'
Write-Host '  npm run build'
