[CmdletBinding()]
param(
    [ValidateSet('Import', 'Setup', 'Validate', 'EditMode', 'PlayMode', 'Build', 'Smoke', 'All')]
    [string]$Action = 'All',
    [string]$EditorPath = $env:UNITY_EDITOR_PATH,
    [ValidateRange(1, 120)]
    [int]$TimeoutMinutes = 20
)

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$logRoot = Join-Path $projectRoot 'Logs'
$resultRoot = Join-Path $projectRoot 'TestResults'
New-Item -ItemType Directory $logRoot, $resultRoot -Force | Out-Null

function Invoke-CheckedProcess([string]$Executable, [string[]]$Arguments, [int]$TimeoutSeconds) {
    # Start-Process joins ArgumentList; quote each path explicitly, including paths with spaces.
    $quotedArguments = $Arguments | ForEach-Object {
        if ($_.Contains('"')) { throw 'Embedded double quotes are not supported in process arguments.' }
        '"' + $_ + '"'
    }
    $process = Start-Process -FilePath $Executable -ArgumentList $quotedArguments -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru
    if (-not $process.WaitForExit($TimeoutSeconds * 1000)) {
        & taskkill.exe /PID $process.Id /T /F | Out-Null
        throw "Process timed out after $TimeoutSeconds seconds: $Executable"
    }
    $process.Refresh()
    if ($process.ExitCode -ne 0) { throw "Exit code $($process.ExitCode): $Executable. See $logRoot" }
}

function Invoke-Stage([string]$Stage) {
    if ($Stage -eq 'Smoke') {
        $player = Join-Path $projectRoot 'Builds/Windows/BAOBA.exe'
        if (-not (Test-Path -LiteralPath $player)) { throw 'Build is required before Smoke.' }
        $smokeLog = Join-Path $logRoot 'player-smoke.log'
        if (Test-Path -LiteralPath $smokeLog) { Remove-Item -LiteralPath $smokeLog }
        Invoke-CheckedProcess $player @('-batchmode', '-nographics', '-baobaSmoke', '-logFile', $smokeLog) 60
        if (-not (Test-Path -LiteralPath $smokeLog) -or
            -not (Select-String -LiteralPath $smokeLog -SimpleMatch 'BAOBA_INFRASTRUCTURE_SMOKE_PASS' -Quiet)) {
            throw 'Player exited without confirming Bootstrap/services/scene/camera startup.'
        }
        Write-Output 'PASS Smoke (Bootstrap/services/scene/camera; no visual or gameplay validation)'
        return
    }
    if (-not $EditorPath -or -not (Test-Path -LiteralPath $EditorPath -PathType Leaf)) {
        throw 'Set UNITY_EDITOR_PATH or pass -EditorPath with the absolute path to Unity 6000.3.27f1.'
    }
    $version = (Get-Content (Join-Path $projectRoot 'ProjectSettings/ProjectVersion.txt') | Select-String '^m_EditorVersion: ').Line.Split(' ')[1]
    $installedVersion = (Get-Item -LiteralPath $EditorPath).VersionInfo.ProductVersion
    if (-not $installedVersion.StartsWith($version)) { throw "Editor mismatch: expected $version; found $installedVersion" }
    $arguments = @('-batchmode', '-projectPath', $projectRoot, '-buildTarget', 'Win64', '-logFile', (Join-Path $logRoot ($Stage.ToLowerInvariant() + '.log')))
    if ($Stage -ne 'PlayMode') { $arguments += '-nographics' }
    if ($Stage -in @('EditMode', 'PlayMode')) {
        $resultFile = Join-Path $resultRoot ($Stage.ToLowerInvariant() + '.xml')
        if (Test-Path -LiteralPath $resultFile) { Remove-Item -LiteralPath $resultFile }
        # Test Framework owns Editor shutdown; -quit can abort the run before results are written.
        $arguments += @('-runTests', '-testPlatform', $Stage, '-testResults', $resultFile)
    } else {
        $arguments += '-quit'
        $method = switch ($Stage) {
            'Setup' { 'Baoba.Editor.ProjectSetup.Configure' }
            'Validate' { 'Baoba.Editor.ContentValidator.Validate' }
            'Build' { 'Baoba.Editor.BuildCommands.BuildWindows' }
        }
        if ($method) { $arguments += @('-executeMethod', $method) }
    }
    Invoke-CheckedProcess $EditorPath $arguments ($TimeoutMinutes * 60)
    if ($Stage -in @('EditMode', 'PlayMode')) {
        if (-not (Test-Path -LiteralPath $resultFile)) { throw "Missing test report: $resultFile" }
        [xml]$report = Get-Content -LiteralPath $resultFile -Raw
        $run = $report.'test-run'
        if ($run.result -ne 'Passed' -or [int]$run.total -lt 1 -or [int]$run.failed -ne 0 -or [int]$run.skipped -ne 0) {
            throw "Incomplete/failing $Stage tests: $($run.result), total=$($run.total), failed=$($run.failed), skipped=$($run.skipped)"
        }
        Write-Output "PASS $Stage ($($run.passed) tests)"
    } else { Write-Output "PASS $Stage" }
}

if ($Action -eq 'All') {
    foreach ($stage in @('Import', 'Validate', 'EditMode', 'PlayMode', 'Build', 'Smoke')) { Invoke-Stage $stage }
} else { Invoke-Stage $Action }
