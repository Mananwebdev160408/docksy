$file = 'C:\Users\asus\.gemini\antigravity-ide\brain\b589c430-fded-4e93-95c9-f6a55e955596\.system_generated\steps\120\content.md'
$raw = Get-Content $file -Raw
$json = $raw | ConvertFrom-Json
$b64 = $json.content -replace '[\r\n]',''
$bytes = [Convert]::FromBase64String($b64)
$text = [System.Text.Encoding]::UTF8.GetString($bytes)

# Search for the relevant interface section
$matches = $text | Select-String -Pattern 'IVirtualDesktopManagerInternal|53F5CA0B|A3175F2D|MoveViewToDesktop' -AllMatches
Write-Output "Total matches: $($matches.Count)"

# Find the interface definition
$lines = $text -split "`n"
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'IVirtualDesktopManagerInternal|53F5CA0B|A3175F2D') {
        $start = [Math]::Max(0, $i - 2)
        $end = [Math]::Min($lines.Count - 1, $i + 20)
        Write-Output "--- Line $i ---"
        ($lines[$start..$end]) -join "`n"
        Write-Output "---"
    }
}
