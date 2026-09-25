$ErrorActionPreference = 'Stop'

$versionPath = Join-Path $PSScriptRoot '..\src\environments\version.ts'
$versionContent = [System.IO.File]::ReadAllText((Resolve-Path $versionPath))
$versionMatch = [regex]::Match($versionContent, "APP_VERSION = '(\d+)'")
if (-not $versionMatch.Success) {
  throw "APP_VERSION not found in $versionPath"
}

$nextVersion = [int]$versionMatch.Groups[1].Value + 1
$versionContent = [regex]::Replace($versionContent, "APP_VERSION = '\d+'", "APP_VERSION = '$nextVersion'")
[System.IO.File]::WriteAllText((Resolve-Path $versionPath), $versionContent, [System.Text.UTF8Encoding]::new($false))

Remove-Item -Recurse -Force www-recette -ErrorAction SilentlyContinue

npx ng build --configuration recette --output-path www-recette
if (-not (Test-Path 'www-recette\index.html')) {
  throw 'Recette build did not produce www-recette/index.html'
}
Copy-Item 'src/assets/.htaccess' 'www-recette/.htaccess' -Force

Write-Output "Recette build completed: version $nextVersion"
