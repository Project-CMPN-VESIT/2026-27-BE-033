$root = "D:\College Projects\AI Election Transparency Platform"
$sc = Join-Path $root "source_code"
Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev" -WorkingDirectory $sc -RedirectStandardOutput (Join-Path $root "dev.log") -RedirectStandardError (Join-Path $root "dev.err.log") -WindowStyle Hidden
Start-Sleep -Seconds 20
"--- stdout ---"
Get-Content -LiteralPath (Join-Path $root "dev.log") -Raw
"--- stderr ---"
Get-Content -LiteralPath (Join-Path $root "dev.err.log") -Raw
