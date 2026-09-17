$ErrorActionPreference = 'Stop'

npx ng build
Copy-Item 'src/assets/.htaccess' 'www-production/.htaccess' -Force

Write-Output 'Production build completed'
