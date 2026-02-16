$content = git show "d7c3c66:src/app/(pos)/pos/page.tsx"
$lines = $content -split "`n"
Write-Host "Lines 110-120:"
$lines[109..119] | ForEach-Object { Write-Host $_ }
