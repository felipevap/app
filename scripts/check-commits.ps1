$commits = @("bab5a32", "221110e", "d7c3c66")
foreach ($commit in $commits) {
    Write-Host "`n=== Checking commit $commit ==="
    $content = git show "${commit}:src/app/(pos)/pos/page.tsx" 2>$null
    if ($content) {
        $lines = $content -split "`n"
        Write-Host "Lines 1-10:"
        $lines[0..9] | ForEach-Object { Write-Host $_ }
        Write-Host "`nLines 110-120:"
        $lines[109..119] | ForEach-Object { Write-Host $_ }
    }
}
