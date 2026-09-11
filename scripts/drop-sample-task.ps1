# Drop a sample monday.cursor-task.v1 pack into mail/inbox/{taskId}/.
# Output messages are English (cross-platform encoding).
param(
    [string]$SharedRoot = $env:MONDAY_SHARED_ROOT,
    [string]$TaskId = '',
    [string]$ServiceId = 'mail',
    [string]$ExampleJson = ''
)

$ErrorActionPreference = 'Stop'

if (-not $SharedRoot -or [string]::IsNullOrWhiteSpace($SharedRoot)) {
    $SharedRoot = Join-Path $env:LOCALAPPDATA 'monday-desk\shared-sandbox'
}

if ($ServiceId -notin @('mail', 'project')) {
    throw "ServiceId must be mail or project, got: $ServiceId"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
if (-not $ExampleJson -or [string]::IsNullOrWhiteSpace($ExampleJson)) {
    $ExampleJson = Join-Path $repoRoot 'docs\samples\cursor-task.v1.example.json'
}
if (-not (Test-Path $ExampleJson)) {
    throw "Example JSON not found: $ExampleJson"
}

# Ensure skeleton exists
& (Join-Path $scriptDir 'init-cursor-job-dirs.ps1') -SharedRoot $SharedRoot | Out-Host

$task = Get-Content -Raw -Encoding UTF8 $ExampleJson | ConvertFrom-Json
if (-not $TaskId -or [string]::IsNullOrWhiteSpace($TaskId)) {
    $TaskId = [string]$task.taskId
    if (-not $TaskId) {
        $TaskId = ('{0:yyyyMMdd}-sample{1}' -f (Get-Date), (Get-Random -Maximum 9999))
    }
}

$task.taskId = $TaskId
$task.serviceId = $ServiceId
$task.createdAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')

$destDir = Join-Path $SharedRoot "cursor-jobs\$ServiceId\inbox\$TaskId"
$inDir = Join-Path $destDir 'in'
New-Item -ItemType Directory -Force -Path $destDir, $inDir | Out-Null

$taskPath = Join-Path $destDir 'task.json'
$json = $task | ConvertTo-Json -Depth 12
[System.IO.File]::WriteAllText($taskPath, $json, [System.Text.UTF8Encoding]::new($false))

Write-Host "OK dropped sample task: $taskPath"
Write-Host "OK empty in/: $inDir"
