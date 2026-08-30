param(
    [string]$ExpectedCertSha256 = "0365a35b3413daf8c76e0bab2f56d898b94895dcee9e27151a03e1778bb97f24"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$AndroidAppDir = Join-Path $RepoRoot "android\app"

function Pass([string]$Message) { Write-Host "PASS: $Message" -ForegroundColor Green }
function Info([string]$Message) { Write-Host "INFO: $Message" -ForegroundColor Cyan }
function Warn([string]$Message) { Write-Host "WARN: $Message" -ForegroundColor Yellow }
function Fail([string]$Message) { Write-Host "FAIL: $Message" -ForegroundColor Red }

function Read-GradleProperties([string]$Path) {
    $map = @{}
    if (-not (Test-Path $Path)) { return $map }
    foreach ($line in Get-Content $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#') -or $trimmed.StartsWith('!')) { continue }
        $idx = $trimmed.IndexOf('=')
        if ($idx -lt 1) { $idx = $trimmed.IndexOf(':') }
        if ($idx -lt 1) { continue }
        $name = $trimmed.Substring(0, $idx).Trim()
        $value = $trimmed.Substring($idx + 1).Trim()
        $map[$name] = $value
    }
    return $map
}

$repoProps = Read-GradleProperties (Join-Path $RepoRoot "android\gradle.properties")
$userProps = Read-GradleProperties (Join-Path $HOME ".gradle\gradle.properties")

function Get-ReleaseSetting([string]$Name) {
    $envValue = [Environment]::GetEnvironmentVariable($Name)
    if (-not [string]::IsNullOrWhiteSpace($envValue)) { return $envValue.Trim() }
    if ($repoProps.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace([string]$repoProps[$Name])) { return ([string]$repoProps[$Name]).Trim() }
    if ($userProps.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace([string]$userProps[$Name])) { return ([string]$userProps[$Name]).Trim() }
    return ""
}

$configuredStore = Get-ReleaseSetting 'LOADIFY_UPLOAD_STORE_FILE'
$keyAlias = Get-ReleaseSetting 'LOADIFY_UPLOAD_KEY_ALIAS'
$storePassword = Get-ReleaseSetting 'LOADIFY_UPLOAD_STORE_PASSWORD'

Write-Host "`n=== LOADIFY RELEASE KEYSTORE DISCOVERY ===" -ForegroundColor Cyan
Write-Host "Expected certificate SHA-256: $ExpectedCertSha256"

if ([string]::IsNullOrWhiteSpace($keyAlias) -or [string]::IsNullOrWhiteSpace($storePassword)) {
    Fail "Signing alias/store password are not configured, so keystore identity cannot be proven locally."
    exit 1
}

$roots = @(
    (Join-Path $HOME 'Desktop'),
    (Join-Path $HOME 'Documents'),
    (Join-Path $HOME 'Downloads'),
    (Join-Path $HOME '.android'),
    (Join-Path $HOME '.gradle'),
    $RepoRoot,
    (Split-Path $RepoRoot -Parent)
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique

$candidates = New-Object System.Collections.Generic.List[string]

# First try the configured path and common relative interpretations.
if (-not [string]::IsNullOrWhiteSpace($configuredStore)) {
    $direct = @($configuredStore)
    if (-not [System.IO.Path]::IsPathRooted($configuredStore)) {
        $direct += (Join-Path $AndroidAppDir $configuredStore)
        $direct += (Join-Path $RepoRoot $configuredStore)
        $direct += (Join-Path $HOME $configuredStore)
    }
    foreach ($p in $direct | Select-Object -Unique) {
        if (Test-Path -LiteralPath $p -PathType Leaf) {
            $candidates.Add((Resolve-Path -LiteralPath $p).Path)
        }
    }
}

# Then search common user locations. We inspect only keystore/jks filenames and
# never print or copy key material.
foreach ($root in $roots) {
    Info "Scanning: $root"
    Get-ChildItem -LiteralPath $root -Recurse -File -Include *.keystore,*.jks -ErrorAction SilentlyContinue |
        ForEach-Object {
            if (-not $candidates.Contains($_.FullName)) { $candidates.Add($_.FullName) }
        }
}

if ($candidates.Count -eq 0) {
    Warn "No .keystore/.jks files were found in the scanned local locations."
    Write-Host "`n=== RESULT ===" -ForegroundColor Cyan
    Write-Host "MATCHING RELEASE KEYSTORE NOT FOUND"
    exit 2
}

Info "Candidate keystore files found: $($candidates.Count)"
$matches = @()
$tempCert = Join-Path $env:TEMP 'loadify-keystore-discovery-cert.der'

foreach ($candidate in $candidates) {
    if (Test-Path $tempCert) { Remove-Item $tempCert -Force -ErrorAction SilentlyContinue }
    try {
        & keytool -exportcert -alias $keyAlias -keystore $candidate -storepass $storePassword -file $tempCert 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0 -or -not (Test-Path $tempCert)) { continue }
        $certSha = (Get-FileHash -Algorithm SHA256 $tempCert).Hash.ToLowerInvariant()
        if ($certSha -eq $ExpectedCertSha256.ToLowerInvariant()) {
            $matches += $candidate
        }
    } catch {
        continue
    } finally {
        Remove-Item $tempCert -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`n=== RESULT ===" -ForegroundColor Cyan
if ($matches.Count -eq 1) {
    Pass "Exactly one local keystore matches the installed Loadify release certificate"
    Write-Host "MATCHING_KEYSTORE=$($matches[0])"
    Write-Host "No keystore was copied or modified."
    exit 0
}
if ($matches.Count -gt 1) {
    Pass "Multiple local copies match the installed Loadify release certificate"
    $matches | ForEach-Object { Write-Host "MATCHING_KEYSTORE=$_" }
    Write-Host "No keystore was copied or modified."
    exit 0
}

Warn "Keystore files exist locally, but none matched the installed Loadify release certificate with the configured alias/password."
Write-Host "MATCHING RELEASE KEYSTORE NOT FOUND"
exit 3
