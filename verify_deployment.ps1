# PowerShell Deployment Verification Script for Windows
# Tests both frontend and backend after deployment

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "NavFlow Deployment Verification" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Prompt for URLs
$BACKEND_URL = Read-Host "Enter your BACKEND URL (e.g., https://navflow-api.onrender.com)"
$FRONTEND_URL = Read-Host "Enter your FRONTEND URL (e.g., https://your-app.vercel.app)"

# Remove trailing slashes
$BACKEND_URL = $BACKEND_URL.TrimEnd('/')
$FRONTEND_URL = $FRONTEND_URL.TrimEnd('/')

Write-Host ""
Write-Host "Testing deployment..." -ForegroundColor Yellow
Write-Host ""

# Function to test endpoint
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int[]]$ExpectedCodes = @(200)
    )
    
    Write-Host "$Name... " -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -ErrorAction SilentlyContinue
        $statusCode = $response.StatusCode
        
        if ($ExpectedCodes -contains $statusCode) {
            Write-Host "✓ PASSED" -ForegroundColor Green -NoNewline
            Write-Host " (HTTP $statusCode)"
            return $true
        } else {
            Write-Host "✗ FAILED" -ForegroundColor Red -NoNewline
            Write-Host " (HTTP $statusCode)"
            return $false
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($ExpectedCodes -contains $statusCode) {
            Write-Host "✓ PASSED" -ForegroundColor Green -NoNewline
            Write-Host " (HTTP $statusCode)"
            return $true
        } else {
            Write-Host "✗ FAILED" -ForegroundColor Red -NoNewline
            Write-Host " (HTTP $statusCode) - $($_.Exception.Message)"
            return $false
        }
    }
}

# Run Tests
$results = @()

# Test 1: Backend Health Check
$results += Test-Endpoint -Name "1. Backend Health Check" -Url "$BACKEND_URL/api/v1/health/"

# Test 2: API Schema
$results += Test-Endpoint -Name "2. API Schema Endpoint" -Url "$BACKEND_URL/api/v1/schema/"

# Test 3: Swagger UI
$results += Test-Endpoint -Name "3. Swagger UI" -Url "$BACKEND_URL/api/v1/schema/swagger-ui/"

# Test 4: Auth Endpoints (405 or 400 is expected for GET request)
Write-Host "4. Authentication Endpoints... " -NoNewline
try {
    $response = Invoke-WebRequest -Uri "$BACKEND_URL/api/v1/auth/register/" -Method Get -UseBasicParsing -ErrorAction SilentlyContinue
    Write-Host "⚠ WARNING" -ForegroundColor Yellow -NoNewline
    Write-Host " (Unexpected success)"
    $results += $false
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 405 -or $statusCode -eq 400) {
        Write-Host "✓ PASSED" -ForegroundColor Green -NoNewline
        Write-Host " (HTTP $statusCode - Endpoint exists)"
        $results += $true
    } else {
        Write-Host "⚠ WARNING" -ForegroundColor Yellow -NoNewline
        Write-Host " (HTTP $statusCode)"
        $results += $false
    }
}

# Test 5: Frontend Accessibility
$results += Test-Endpoint -Name "5. Frontend Accessibility" -Url "$FRONTEND_URL"

# Test 6: CORS (simplified check)
Write-Host "6. CORS Configuration... " -NoNewline
try {
    $headers = @{
        "Origin" = $FRONTEND_URL
        "Access-Control-Request-Method" = "POST"
    }
    $response = Invoke-WebRequest -Uri "$BACKEND_URL/api/v1/auth/login/" -Method Options -Headers $headers -UseBasicParsing -ErrorAction SilentlyContinue
    $statusCode = $response.StatusCode
    if ($statusCode -eq 200 -or $statusCode -eq 204) {
        Write-Host "✓ PASSED" -ForegroundColor Green -NoNewline
        Write-Host " (HTTP $statusCode)"
        $results += $true
    } else {
        Write-Host "⚠ WARNING" -ForegroundColor Yellow -NoNewline
        Write-Host " (HTTP $statusCode) - Check CORS_ALLOWED_ORIGINS"
        $results += $false
    }
} catch {
    Write-Host "⚠ WARNING" -ForegroundColor Yellow -NoNewline
    Write-Host " - Check CORS_ALLOWED_ORIGINS in Render"
    $results += $false
}

# Summary
$passedTests = ($results | Where-Object { $_ -eq $true }).Count
$totalTests = $results.Count

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tests Passed: $passedTests / $totalTests" -ForegroundColor $(if ($passedTests -eq $totalTests) { "Green" } else { "Yellow" })
Write-Host ""
Write-Host "Backend URL:  $BACKEND_URL" -ForegroundColor White
Write-Host "Frontend URL: $FRONTEND_URL" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Visit: $FRONTEND_URL"
Write-Host "2. Test user registration and login"
Write-Host "3. Check browser console (F12) for errors"
Write-Host "4. Visit API docs: $BACKEND_URL/api/v1/schema/swagger-ui/"
Write-Host ""
Write-Host "If any tests failed, check DEPLOYMENT_GUIDE.md" -ForegroundColor Yellow
Write-Host "Troubleshooting section for solutions." -ForegroundColor Yellow
Write-Host ""
