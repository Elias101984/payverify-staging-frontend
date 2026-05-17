# run_migrations.ps1

$RG_ENV = "rg-payverify-dev"
$MIG_JOB = "job-migrate-dev"

Write-Host "Starting the migration job..." -ForegroundColor Cyan
az containerapp job start -g $RG_ENV -n $MIG_JOB

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migration job started successfully. Waiting for completion..." -ForegroundColor Green
    
    # Monitor the job status
    $timeout = 300  # 5 minute timeout
    $elapsed = 0
    do {
        Start-Sleep -Seconds 10
        $elapsed += 10
        $jobStatus = az containerapp job execution list -g $RG_ENV -n $MIG_JOB --query "[0].status" -o tsv 2>$null
        Write-Host "  Current status: $jobStatus ($elapsed seconds)" -ForegroundColor Gray
    } while (($jobStatus -eq "Running" -or $jobStatus -eq "Processing") -and $elapsed -lt $timeout)
    
    if ($jobStatus -eq "Succeeded") {
        Write-Host "`n✓ Database migrations completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n⚠ Migrations may not have completed fully. Final status: $jobStatus" -ForegroundColor Yellow
        Write-Host "Check the logs with this command:" -ForegroundColor White
        Write-Host "az containerapp job logs show -g $RG_ENV -n $MIG_JOB" -ForegroundColor White
    }
} else {
    Write-Host "Failed to start the migration job. It may not have been created correctly." -ForegroundColor Red
}