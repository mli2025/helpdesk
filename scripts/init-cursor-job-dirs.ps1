# Create Monday cursor-jobs + memory directory skeleton under shared root.
# Output messages are English (cross-platform encoding).
param(
    [string]$SharedRoot = $env:MONDAY_SHARED_ROOT
)

$ErrorActionPreference = 'Stop'

if (-not $SharedRoot -or [string]::IsNullOrWhiteSpace($SharedRoot)) {
    $SharedRoot = Join-Path $env:LOCALAPPDATA 'monday-desk\shared-sandbox'
}

$services = @('mail', 'project')
$queues = @('inbox', 'processing', 'done', 'failed')

foreach ($svc in $services) {
    foreach ($q in $queues) {
        $p = Join-Path $SharedRoot "cursor-jobs\$svc\$q"
        New-Item -ItemType Directory -Force -Path $p | Out-Null
    }
}

$sampleUser = 'u_sample'
foreach ($svc in $services) {
    $mem = Join-Path $SharedRoot "memory\$sampleUser\$svc"
    New-Item -ItemType Directory -Force -Path $mem | Out-Null
}

Write-Host "OK shared root: $SharedRoot"
Write-Host "OK cursor-jobs: mail,project x inbox/processing/done/failed"
Write-Host "OK memory sample: memory\$sampleUser\{mail,project}"
