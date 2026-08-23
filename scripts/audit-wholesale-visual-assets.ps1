[CmdletBinding()]
param(
  [switch]$OpenReport
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

$manifest = Get-Content '.\scripts\wholesale-subcategory-assets.json' -Raw | ConvertFrom-Json
if ($manifest.categories.Count -ne 16) { throw 'Expected exactly 16 wholesale categories.' }

$allHashes = @{}
$rows = New-Object System.Collections.Generic.List[string]
$failures = New-Object System.Collections.Generic.List[string]

function Html([string]$Value) {
  return [System.Net.WebUtility]::HtmlEncode($Value)
}

foreach ($category in $manifest.categories) {
  if ($category.subcategories.Count -ne 6) {
    $failures.Add("$($category.category): expected 6 subcategories, found $($category.subcategories.Count)")
    continue
  }

  $rootRelative = "public/category-visuals/wholesale/$($category.categorySlug).jpg"
  $rootPath = Join-Path $repo ($rootRelative -replace '/', [System.IO.Path]::DirectorySeparatorChar)
  if (-not (Test-Path -LiteralPath $rootPath)) {
    $failures.Add("Missing parent image: $rootRelative")
    continue
  }
  $rootHash = (Get-FileHash -LiteralPath $rootPath -Algorithm SHA256).Hash

  $siblingHashes = @{}
  $cards = New-Object System.Collections.Generic.List[string]
  foreach ($subcategory in $category.subcategories) {
    $localPath = Join-Path $repo ($subcategory.targetPath -replace '/', [System.IO.Path]::DirectorySeparatorChar)
    if (-not (Test-Path -LiteralPath $localPath)) {
      $failures.Add("Missing subcategory image: $($subcategory.targetPath)")
      continue
    }

    $hash = (Get-FileHash -LiteralPath $localPath -Algorithm SHA256).Hash
    if ($hash -eq $rootHash) {
      $failures.Add("Parent image reused by $($category.category) -> $($subcategory.title)")
    }
    if ($siblingHashes.ContainsKey($hash)) {
      $failures.Add("Sibling duplicate in $($category.category): '$($siblingHashes[$hash])' and '$($subcategory.title)'")
    } else {
      $siblingHashes[$hash] = $subcategory.title
    }
    if ($allHashes.ContainsKey($hash)) {
      $failures.Add("Global duplicate image: '$($allHashes[$hash])' and '$($category.category) -> $($subcategory.title)'")
    } else {
      $allHashes[$hash] = "$($category.category) -> $($subcategory.title)"
    }

    $absoluteUri = [System.Uri]::new($localPath).AbsoluteUri
    $cards.Add(@"
<a class="card" href="$(Html $subcategory.sourcePage)" target="_blank" rel="noreferrer">
  <img src="$(Html $absoluteUri)" alt="$(Html $subcategory.title)" />
  <strong>$(Html $subcategory.title)</strong>
  <span>Source: $(Html $subcategory.sourceId)</span>
</a>
"@)
  }

  $rows.Add(@"
<section>
  <h2>$(Html $category.category)</h2>
  <div class="grid">$($cards -join "`n")</div>
</section>
"@)
}

if ($allHashes.Count -ne 96) {
  $failures.Add("Expected 96 globally unique subcategory image hashes; found $($allHashes.Count).")
}

$reportPath = Join-Path $env:TEMP 'loadify-wholesale-visual-audit.html'
$html = @"
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Loadify Wholesale Visual Audit</title>
<style>
body{font-family:Arial,sans-serif;margin:0;background:#f7f9fc;color:#071039}main{max-width:1280px;margin:auto;padding:32px}h1{margin-bottom:8px}p{color:#536184}section{margin:34px 0}h2{font-size:22px}.grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:14px}.card{display:block;text-decoration:none;color:inherit;background:#fff;border:1px solid #dce2ed;border-radius:12px;overflow:hidden}.card img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;background:#e5e7eb}.card strong,.card span{display:block;padding:8px 10px}.card span{padding-top:0;color:#6b7280;font-size:11px}@media(max-width:1000px){.grid{grid-template-columns:repeat(3,1fr)}}@media(max-width:640px){.grid{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body><main>
<h1>Loadify Market — 96 Subcategory Visual Audit</h1>
<p>Manual relevance review: every card must clearly match its label, differ from its siblings, and never read as a parent-category placeholder.</p>
$($rows -join "`n")
</main></body></html>
"@
Set-Content -LiteralPath $reportPath -Value $html -Encoding UTF8

if ($failures.Count -gt 0) {
  Write-Host "`n=== VISUAL HASH GUARD FAIL ===" -ForegroundColor Red
  $failures | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
  throw "Visual audit failed with $($failures.Count) guard violation(s)."
}

Write-Host '=== VISUAL HASH GUARD PASS ===' -ForegroundColor Green
Write-Host '16/16 parent categories checked.'
Write-Host '96/96 subcategory files checked.'
Write-Host '96/96 subcategory hashes are globally unique.'
Write-Host '0 parent-image reuse violations.'
Write-Host "Audit report: $reportPath"
Write-Host 'Semantic/relevance inspection in the report remains mandatory before main.'

if ($OpenReport) {
  Start-Process $reportPath
}
