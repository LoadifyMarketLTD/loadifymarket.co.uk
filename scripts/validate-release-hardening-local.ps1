param(
    [string]$RepoRoot = "",
    [string]$ExpectedBranch = "release-hardening/audit-20260822"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Invoke-NativeStep {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][scriptblock]$Command
    )

    Write-Host "`n=== $Name ===" -ForegroundColor Cyan
    & $Command
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        throw "STOP: $Name failed with exit code $exitCode"
    }
    Write-Host "$Name = PASS" -ForegroundColor Green
}

function Get-GitValue {
    param([Parameter(Mandatory = $true)][scriptblock]$Command)
    $value = (& $Command | Out-String).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($value)) {
        throw "STOP: git query failed"
    }
    return $value
}

function Invoke-LocalSqlFile {
    param(
        [Parameter(Mandatory = $true)][string]$DbContainer,
        [Parameter(Mandatory = $true)][System.IO.FileInfo]$File
    )

    Write-Host ("APPLY SQL: {0}" -f $File.FullName) -ForegroundColor DarkCyan
    Get-Content -LiteralPath $File.FullName -Raw |
        docker exec -i $DbContainer psql -v ON_ERROR_STOP=1 -U postgres -d postgres
    if ($LASTEXITCODE -ne 0) {
        throw "STOP: SQL replay failed -> $($File.Name)"
    }
}

if ([string]::IsNullOrWhiteSpace($RepoRoot)) {
    $RepoRoot = Get-GitValue { git rev-parse --show-toplevel }
}
$RepoRoot = (Resolve-Path -LiteralPath $RepoRoot).Path

$WorktreePath = Join-Path ([System.IO.Path]::GetTempPath()) ("loadify-release-hardening-{0}" -f $PID)
$WorktreeCreated = $false
$SupabaseStarted = $false
$TimestampHold = $null
$InitialMainHead = $null
$InitialBranchHead = $null

try {
    Write-Host "`nLOADIFY RELEASE-HARDENING LOCAL VALIDATION" -ForegroundColor Green
    Write-Host "Source repo: $RepoRoot"
    Write-Host "Validation branch: $ExpectedBranch"
    Write-Host "Policy: LOCAL ONLY / NO CI / NO NETLIFY / NO PRODUCTION DB PUSH" -ForegroundColor Yellow

    Write-Host "`n=== 0. PRESERVE SOURCE WORKTREE ===" -ForegroundColor Cyan
    $sourceStatus = @(git -C $RepoRoot status --short)
    if ($LASTEXITCODE -ne 0) { throw "STOP: unable to read source worktree status" }
    if ($sourceStatus.Count -gt 0) {
        Write-Host "Source worktree is intentionally left untouched. Existing changes:" -ForegroundColor Yellow
        $sourceStatus | ForEach-Object { Write-Host $_ }
    } else {
        Write-Host "Source worktree clean; it will still not be used for validation." -ForegroundColor Green
    }

    Invoke-NativeStep "1. FETCH ORIGIN" { git -C $RepoRoot fetch origin --prune }

    $InitialMainHead = Get-GitValue { git -C $RepoRoot rev-parse origin/main }
    $InitialBranchHead = Get-GitValue { git -C $RepoRoot rev-parse "origin/$ExpectedBranch" }
    $mergeBase = Get-GitValue { git -C $RepoRoot merge-base origin/main "origin/$ExpectedBranch" }

    if ($mergeBase -ne $InitialMainHead) {
        throw "STOP: hardening branch is stale/diverged. merge-base=$mergeBase main=$InitialMainHead"
    }

    $counts = (Get-GitValue { git -C $RepoRoot rev-list --left-right --count "origin/main...origin/$ExpectedBranch" }) -split '\s+'
    if ($counts.Count -lt 2) { throw "STOP: cannot parse ahead/behind counts" }
    $behind = [int]$counts[0]
    $ahead = [int]$counts[1]
    if ($behind -ne 0) { throw "STOP: hardening branch is behind main by $behind commit(s)" }

    Write-Host "MAIN=$InitialMainHead"
    Write-Host "BRANCH=$InitialBranchHead"
    Write-Host "AHEAD=$ahead BEHIND=$behind" -ForegroundColor Green

    if (Test-Path -LiteralPath $WorktreePath) {
        throw "STOP: validation path already exists -> $WorktreePath"
    }

    Invoke-NativeStep "2. CREATE ISOLATED WORKTREE" {
        git -C $RepoRoot worktree add --detach $WorktreePath $InitialBranchHead
    }
    $WorktreeCreated = $true
    Set-Location -LiteralPath $WorktreePath

    Invoke-NativeStep "3. NPM CLEAN INSTALL" { npm ci }

    Invoke-NativeStep "4. TARGETED RELEASE-HARDENING TESTS" {
        npx vitest run `
            netlify/functions/__tests__/legacy-transport-replay-envelope.test.ts `
            netlify/functions/__tests__/release-hardening-security-contract.test.ts
    }

    Invoke-NativeStep "5. REPAIRED / REGRESSION SUITES" {
        npx vitest run `
            netlify/functions/__tests__/commercial-history-consumers.test.ts `
            netlify/functions/__tests__/commercial-snapshot-cutover.test.ts `
            netlify/functions/__tests__/marketplace-tax-evidence.test.ts `
            netlify/functions/__tests__/delete-product.test.ts `
            netlify/functions/__tests__/update-product.test.ts `
            netlify/functions/__tests__/create-checkout.test.ts `
            netlify/functions/__tests__/create-payment-intent.test.ts `
            netlify/functions/__tests__/checkout-safety.test.ts
    }

    Invoke-NativeStep "6. FULL TEST SUITE" { npm test }
    Invoke-NativeStep "7. ESLINT" { npm run lint }
    Invoke-NativeStep "8. TYPESCRIPT" { npm run typecheck }

    $env:VITE_SUPABASE_URL = "https://placeholder.supabase.co"
    $env:VITE_SUPABASE_ANON_KEY = "placeholder-anon-key"
    $env:VITE_STRIPE_PUBLISHABLE_KEY = "pk_test_placeholder"
    Invoke-NativeStep "9. PRODUCTION BUILD" { npm run build }

    Write-Host "`n=== 10. FRESH LOCAL DATABASE REPLAY ===" -ForegroundColor Cyan
    Write-Host "This phase starts only because tests/lint/typecheck/build are green." -ForegroundColor Yellow

    if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
        throw "STOP: Supabase CLI is not installed or not on PATH"
    }
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw "STOP: Docker CLI is not installed or not on PATH"
    }

    $existingSupabaseDbContainers = @(docker ps --filter "name=supabase_db_" --format "{{.Names}}")
    if ($LASTEXITCODE -ne 0) { throw "STOP: Docker is not available" }
    if ($existingSupabaseDbContainers.Count -gt 0) {
        Write-Host "Existing local Supabase DB containers:" -ForegroundColor Yellow
        $existingSupabaseDbContainers | ForEach-Object { Write-Host $_ }
        throw "STOP: another local Supabase stack is running. This validator will not stop or reuse another project's database."
    }

    $TrackedMigrations = Join-Path $WorktreePath "supabase\migrations"
    $TimestampHold = Join-Path $WorktreePath "supabase\__release_hardening_timestamped_hold"
    if (Test-Path -LiteralPath $TimestampHold) {
        throw "STOP: timestamp migration hold path already exists"
    }
    if (Test-Path -LiteralPath $TrackedMigrations) {
        Move-Item -LiteralPath $TrackedMigrations -Destination $TimestampHold
    }

    if (-not (Test-Path -LiteralPath (Join-Path $WorktreePath "supabase\config.toml"))) {
        Invoke-NativeStep "10A. INITIALISE LOCAL SUPABASE CONFIG" { supabase init --force }
    }

    Invoke-NativeStep "10B. START FRESH LOCAL SUPABASE" { supabase start }
    $SupabaseStarted = $true

    $dbContainers = @(docker ps --filter "name=supabase_db_" --format "{{.Names}}")
    if ($LASTEXITCODE -ne 0 -or $dbContainers.Count -ne 1) {
        throw "STOP: expected exactly one isolated Supabase DB container after start"
    }
    $dbContainer = $dbContainers[0]
    Write-Host "LOCAL DB CONTAINER=$dbContainer" -ForegroundColor Green

    $numericMigrations = @(
        Get-ChildItem -LiteralPath (Join-Path $WorktreePath "supabase") -File -Filter "*.sql" |
            Where-Object {
                $_.Name -match '^\d+_.*\.sql$' -and
                $_.Name -ne '00_consolidated_schema.sql'
            } |
            Sort-Object `
                @{ Expression = { [int]([regex]::Match($_.Name, '^(\d+)_').Groups[1].Value) } }, `
                @{ Expression = { $_.Name } }
    )
    if ($numericMigrations.Count -eq 0) {
        throw "STOP: no executable numeric migrations found in supabase/"
    }

    if ($numericMigrations.Name -contains '00_consolidated_schema.sql') {
        throw "STOP: deprecated consolidated schema tombstone entered executable replay set"
    }

    Write-Host ("Numeric replay files: {0}" -f $numericMigrations.Count)
    foreach ($migration in $numericMigrations) {
        Invoke-LocalSqlFile -DbContainer $dbContainer -File $migration
    }

    if ($TimestampHold -and (Test-Path -LiteralPath $TimestampHold)) {
        $timestampedMigrations = @(
            Get-ChildItem -LiteralPath $TimestampHold -File -Filter "*.sql" | Sort-Object Name
        )
        foreach ($migration in $timestampedMigrations) {
            Invoke-LocalSqlFile -DbContainer $dbContainer -File $migration
        }
    }

    Invoke-NativeStep "11. DATABASE LINT" {
        supabase db lint --local --schema public --level error --fail-on error
    }

    Invoke-NativeStep "12. RELEASE-HARDENING DB CONTRACT" {
        supabase test db "supabase/tests/release_hardening_contract.sql" --local
    }

    Write-Host "`n=== 13. FINAL BRANCH GUARD ===" -ForegroundColor Cyan
    Invoke-NativeStep "13A. REFRESH ORIGIN" { git -C $RepoRoot fetch origin --prune }

    $finalMainHead = Get-GitValue { git -C $RepoRoot rev-parse origin/main }
    $finalBranchHead = Get-GitValue { git -C $RepoRoot rev-parse "origin/$ExpectedBranch" }
    if ($finalMainHead -ne $InitialMainHead) {
        throw "STOP: main moved during validation. initial=$InitialMainHead final=$finalMainHead"
    }
    if ($finalBranchHead -ne $InitialBranchHead) {
        throw "STOP: hardening branch moved during validation. initial=$InitialBranchHead final=$finalBranchHead"
    }

    $finalMergeBase = Get-GitValue { git -C $RepoRoot merge-base origin/main "origin/$ExpectedBranch" }
    if ($finalMergeBase -ne $finalMainHead) {
        throw "STOP: hardening branch is no longer based on current main"
    }

    $changedFiles = @(git -C $RepoRoot diff --name-only "origin/main...origin/$ExpectedBranch")
    if ($LASTEXITCODE -ne 0) { throw "STOP: exact diff inspection failed" }

    $forbidden = @(
        $changedFiles | Where-Object {
            $_ -like 'android/*' -or
            $_ -like 'src/*' -or
            $_ -like 'public/*'
        }
    )
    if ($forbidden.Count -gt 0) {
        Write-Host "Unexpected UI/mobile files in hardening diff:" -ForegroundColor Red
        $forbidden | ForEach-Object { Write-Host $_ }
        throw "STOP: release-hardening scope contamination detected"
    }

    Write-Host "Exact hardening diff:" -ForegroundColor Cyan
    $changedFiles | ForEach-Object { Write-Host "  $_" }

    Write-Host "`n==============================================================" -ForegroundColor Green
    Write-Host " LOADIFY RELEASE-HARDENING LOCAL VALIDATION = PASS" -ForegroundColor Green
    Write-Host " MAIN=$finalMainHead" -ForegroundColor Green
    Write-Host " BRANCH=$finalBranchHead" -ForegroundColor Green
    Write-Host " NODE FULL SUITE / LINT / TYPECHECK / BUILD = PASS" -ForegroundColor Green
    Write-Host " FRESH NUMERIC + TIMESTAMPED DB REPLAY / LINT / DB CONTRACT = PASS" -ForegroundColor Green
    Write-Host " NO CI / NO NETLIFY / NO PRODUCTION DB PUSH" -ForegroundColor Green
    Write-Host "==============================================================" -ForegroundColor Green
}
finally {
    if ($SupabaseStarted) {
        try {
            Set-Location -LiteralPath $WorktreePath
            Write-Host "`n=== STOP ISOLATED LOCAL SUPABASE ===" -ForegroundColor Cyan
            supabase stop --no-backup
        }
        catch {
            Write-Warning "Unable to stop isolated Supabase cleanly: $($_.Exception.Message)"
        }
    }

    if ($TimestampHold -and (Test-Path -LiteralPath $TimestampHold)) {
        try {
            $target = Join-Path $WorktreePath "supabase\migrations"
            if (Test-Path -LiteralPath $target) {
                Remove-Item -LiteralPath $target -Recurse -Force
            }
            Move-Item -LiteralPath $TimestampHold -Destination $target
        }
        catch {
            Write-Warning "Unable to restore timestamp migration folder inside disposable worktree: $($_.Exception.Message)"
        }
    }

    if ($WorktreeCreated) {
        try {
            Set-Location -LiteralPath $RepoRoot
            Write-Host "`n=== REMOVE DISPOSABLE WORKTREE ===" -ForegroundColor Cyan
            git -C $RepoRoot worktree remove --force $WorktreePath
            if ($LASTEXITCODE -ne 0) {
                Write-Warning "git worktree remove returned exit code $LASTEXITCODE"
            }
            git -C $RepoRoot worktree prune
        }
        catch {
            Write-Warning "Unable to remove disposable worktree automatically: $($_.Exception.Message)"
        }
    }
}
