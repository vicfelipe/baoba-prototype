[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$assetRoot = Join-Path $projectRoot 'Assets'
$guids = @{}
$assets = Get-ChildItem -LiteralPath $assetRoot -Recurse -Force
foreach ($asset in $assets) {
    if ($asset.Extension -eq '.meta') {
        if (-not (Test-Path -LiteralPath $asset.FullName.Substring(0, $asset.FullName.Length - 5))) {
            throw "Orphan metadata: $($asset.FullName)"
        }
        $match = Select-String -LiteralPath $asset.FullName -Pattern '^guid: ([a-f0-9]{32})$'
        if (@($match).Count -ne 1) { throw "Invalid GUID metadata: $($asset.FullName)" }
        $guid = $match.Matches[0].Groups[1].Value
        if ($guids.ContainsKey($guid)) { throw "Duplicate GUID: $($asset.FullName) / $($guids[$guid])" }
        $guids[$guid] = $asset.FullName
    } elseif (-not (Test-Path -LiteralPath ($asset.FullName + '.meta'))) {
        throw "Missing Unity-generated .meta: $($asset.FullName). Import in Unity first."
    }
}

$manifest = Get-Content (Join-Path $projectRoot 'Packages/manifest.json') -Raw | ConvertFrom-Json
$lock = Get-Content (Join-Path $projectRoot 'Packages/packages-lock.json') -Raw | ConvertFrom-Json
foreach ($dependency in $manifest.dependencies.PSObject.Properties) {
    if ($dependency.Value -notmatch '^\d+\.\d+\.\d+$') { throw "Unpinned dependency: $($dependency.Name)" }
    if ($lock.dependencies.($dependency.Name).version -ne $dependency.Value) {
        throw "Manifest/lock mismatch: $($dependency.Name)"
    }
}

$definitions = @{}
foreach ($file in Get-ChildItem -LiteralPath $assetRoot -Recurse -Filter '*.asmdef') {
    $definition = Get-Content $file.FullName -Raw | ConvertFrom-Json
    if ($definitions.ContainsKey($definition.name)) { throw "Duplicate assembly name: $($definition.name)" }
    $definitions[$definition.name] = $definition
}
foreach ($layer in @('Core', 'Gameplay')) {
    $definition = $definitions["Baoba.$layer"]
    if (-not $definition -or -not $definition.noEngineReferences) { throw "Engine coupling in $layer" }
    foreach ($reference in $definition.references) {
        if ($reference -ne 'Baoba.Core') { throw "Invalid domain reference: $reference" }
    }
}

Write-Output "PASS Repository: $($guids.Count) unique GUIDs, paired metadata, $($definitions.Count) assemblies, pinned manifest/lock."
