# Headless DOM selftest runner — PowerShell, zero dependencies (tanpa Node).
# Pakai:  pwsh -NoProfile -File static/tests/run.ps1 [groups...]
# Prasyarat: server Flask berjalan di BASE_URL (default http://127.0.0.1:5000)
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Groups = @()
)
$ErrorActionPreference = "Stop"

$EDGE = if ($env:EDGE_PATH) { $env:EDGE_PATH } else { "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" }
$BASE = if ($env:BASE_URL) { $env:BASE_URL } else { "http://127.0.0.1:5000" }
$groupStr = if ($Groups -and $Groups.Count) { ($Groups -join ",") } else { "all" }
$ts = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$url = "$BASE/static/tests/selftest.html?groups=$([uri]::EscapeDataString($groupStr))&t=$ts"

$tmp = Join-Path ([IO.Path]::GetTempPath()) ("selftest_" + [Guid]::NewGuid().ToString("N") + ".html")
& $EDGE --headless=new --disable-gpu --no-first-run --disable-extensions --virtual-time-budget=45000 --dump-dom $url 2>$null | Out-File -FilePath $tmp -Encoding utf8
$html = [string](Get-Content -LiteralPath $tmp -Raw)
Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue

$m = [regex]::Match($html, '(?s)<pre id="results">(.*?)</pre>')
if (-not $m.Success) {
    Write-Output "ERROR: hasil tidak ditemukan (selftest tidak selesai dalam budget virtual time)."
    exit 2
}
$raw = [System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value)
if ([string]::IsNullOrWhiteSpace($raw) -or $raw.Trim() -eq "PENDING") {
    Write-Output "ERROR: hasil PENDING (selftest tidak selesai)."
    exit 2
}
try {
    $data = $raw | ConvertFrom-Json
} catch {
    Write-Output "ERROR: JSON hasil tidak valid: $($_.Exception.Message)"
    exit 2
}

$failed = 0
foreach ($r in @($data.results)) {
    if ($r.pass) { Write-Output "PASS  $($r.name)" }
    else { Write-Output "FAIL  $($r.name)  — $($r.detail)"; $failed++ }
}
Write-Output ""
Write-Output "$(@($data.results).Count - $failed)/$(@($data.results).Count) lulus"
if ($failed -gt 0) { exit 1 } else { exit 0 }
