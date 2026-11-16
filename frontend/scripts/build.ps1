$ErrorActionPreference = 'Stop'

npx ng build --configuration production
if ($LASTEXITCODE -ne 0) {
  throw "Production build failed with exit code $LASTEXITCODE"
}
if (-not (Test-Path 'www-production/index.html')) {
  throw 'Production build did not produce www-production/index.html'
}
Copy-Item 'src/assets/.htaccess' 'www-production/.htaccess' -Force

Write-Output 'Production build completed'
