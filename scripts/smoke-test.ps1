#!/usr/bin/env pwsh
# smoke-test.ps1
# Local Docker smoke-test suite for the Stillwater stack.
# Run AFTER: docker compose up --build -d
# Usage:  .\scripts\smoke-test.ps1

$ErrorActionPreference = 'Stop'
$base       = 'http://localhost:3005'
$pass = 0
$fail = 0

function Assert-Http {
    param(
        [string]$Label,
        [string]$Url,
        [string]$Method = 'GET',
        [hashtable]$Body = $null,
        [int]$ExpectStatus = 200,
        [string]$ExpectBodyContains = ''
    )
    try {
        $params = @{ Uri = $Url; Method = $Method; TimeoutSec = 15 }
        if ($Body) {
            $params.Body        = ($Body | ConvertTo-Json -Compress)
            $params.ContentType = 'application/json'
        }
        $resp = Invoke-WebRequest @params -UseBasicParsing
        $ok   = $resp.StatusCode -eq $ExpectStatus
        if ($ExpectBodyContains -and $resp.Content -notmatch [regex]::Escape($ExpectBodyContains)) {
            $ok = $false
        }
        if ($ok) {
            Write-Host "  PASS  $Label" -ForegroundColor Green
            $script:pass++
        } else {
            Write-Host "  FAIL  $Label  [HTTP $($resp.StatusCode)] body: $($resp.Content.Substring(0,[Math]::Min(200,$resp.Content.Length)))" -ForegroundColor Red
            $script:fail++
        }
    } catch {
        Write-Host "  FAIL  $Label  [$($_.Exception.Message)]" -ForegroundColor Red
        $script:fail++
    }
}

Write-Host "`n=== Stillwater Smoke Tests ===" -ForegroundColor Cyan

# ── 1. Service health endpoints ────────────────────────────────────────────────
Write-Host "`n[1] Health endpoints"
Assert-Http -Label 'main-website /api/funds'                 -Url "$base/api/funds"
Assert-Http -Label 'intake form page reachable'              -Url "$base/intake.html"

# ── 2. Intake submit ──────────────────────────────────────────────────────────
Write-Host "`n[2] Intake submission API"
$submission = @{
    name = 'Smoke Tester'
    phone = '9999999999'
    age = 34
    chronicConditions = @('diabetes', 'anxiety')
    eyesightIssues = $true
    eyePower = '-1.25'
    isFamilyMember = $true
    relation = 'Brother'
}
$submissionResp = $null
try {
    $r = Invoke-WebRequest -Uri "$base/api/intake-submissions" -Method POST `
        -Body ($submission | ConvertTo-Json -Compress) -ContentType 'application/json' `
        -UseBasicParsing -TimeoutSec 15
    $submissionResp = $r.Content | ConvertFrom-Json
    if ($submissionResp.submissionId) {
        Write-Host "  PASS  POST /api/intake-submissions  [submissionId=$($submissionResp.submissionId)]" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  FAIL  POST /api/intake-submissions  [no submissionId in response]" -ForegroundColor Red
        $script:fail++
    }
} catch {
    Write-Host "  FAIL  POST /api/intake-submissions  [$($_.Exception.Message)]" -ForegroundColor Red
    $script:fail++
}

# ── 3. Validation negative case ───────────────────────────────────────────────
Write-Host "`n[3] Validation (invalid age)"
try {
    $badPayload = @{
      name = 'Bad Case'
      phone = '8888888888'
      age = 0
      chronicConditions = @('diabetes')
      eyesightIssues = $false
      eyePower = ''
      isFamilyMember = $false
      relation = ''
    }
    $response = Invoke-WebRequest -Uri "$base/api/intake-submissions" -Method POST `
      -Body ($badPayload | ConvertTo-Json -Compress) -ContentType 'application/json' `
      -UseBasicParsing -TimeoutSec 15

    Write-Host "  FAIL  POST /api/intake-submissions invalid age [unexpected HTTP $($response.StatusCode)]" -ForegroundColor Red
    $script:fail++
} catch {
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Host "  PASS  POST /api/intake-submissions invalid age rejected with 400" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  FAIL  POST /api/intake-submissions invalid age [$($_.Exception.Message)]" -ForegroundColor Red
        $script:fail++
    }
}

# ── 4. Admin endpoint protection ──────────────────────────────────────────────
Write-Host "`n[4] Admin API protection"
try {
    $response = Invoke-WebRequest -Uri "$base/api/admin/intake-submissions" -UseBasicParsing -TimeoutSec 15
    if ($response.Content -match "Login & Waitlist") {
        Write-Host "  PASS  GET /api/admin/intake-submissions unauthenticated redirected to login" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "  FAIL  GET /api/admin/intake-submissions unauthenticated [did not route to login]" -ForegroundColor Red
        $script:fail++
    }
} catch {
    Write-Host "  FAIL  GET /api/admin/intake-submissions unauthenticated [$($_.Exception.Message)]" -ForegroundColor Red
    $script:fail++
}

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host "`n=== Results: $pass passed, $fail failed ===" -ForegroundColor Cyan
if ($fail -gt 0) { exit 1 } else { exit 0 }
