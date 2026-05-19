# SBOM.io CLI Scanner for Windows PowerShell
param(
  [Parameter(Mandatory=$true)]
  [string]$key,

  [Parameter(Mandatory=$true)]
  [string]$repo,

  [Parameter(Mandatory=$false)]
  [string]$base = "https://api.sbom.io"
)

$API_BASE = $base

Write-Host "  +---------------------------------+" -ForegroundColor Cyan
Write-Host "  |        SBOM.io Scanner          |" -ForegroundColor Cyan
Write-Host "  +---------------------------------+" -ForegroundColor Cyan
Write-Host "  Repository : $repo"
Write-Host "  Scanning… (this may take up to 2 minutes)"
Write-Host ""

$body = @{ github_url = $repo } | ConvertTo-Json

try {
  $response = Invoke-RestMethod `
    -Method POST `
    -Uri "$API_BASE/api/scan-cli" `
    -Headers @{ "X-API-Key" = $key; "Content-Type" = "application/json" } `
    -Body $body `
    -ErrorAction Stop
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  try {
    $errBody = $_.ErrorDetails.Message | ConvertFrom-Json
    $errMsg  = $errBody.error
  } catch {
    $errMsg = $_.Exception.Message
  }
  Write-Host "  ERROR ($statusCode): $errMsg" -ForegroundColor Red
  Write-Host ""
  exit 1
}

if ($response.status -ne "complete") {
  Write-Host "  ERROR: $($response.error)" -ForegroundColor Red
  exit 1
}

$inv = $response.stats.inventory_size
$dir = $response.stats.direct_library
$trn = $response.stats.transitive
$lic = $response.stats.license_spread
$thr = $response.stats.active_threats
$cri = $response.vulnerability_summary.critical
$hig = $response.vulnerability_summary.high
$med = $response.vulnerability_summary.medium
$nts = $response.compliance.ntia_score
$ntc = $response.compliance.status

$thrColor = if ($thr -gt 0) { "Red" } else { "Green" }
$criColor = if ($cri -gt 0) { "Red" } else { "Green" }
$higColor = if ($hig -gt 0) { "Yellow" } else { "Green" }
$medColor = if ($med -gt 0) { "Yellow" } else { "Green" }
$ntsColor = if ($nts -ge 90) { "Green" } elseif ($nts -ge 60) { "Yellow" } else { "Red" }

Write-Host "  +---------------------------------+"
Write-Host "  |           SCAN RESULTS          |"
Write-Host "  +---------------------------------+"
Write-Host ("  |  {0,-20} {1,10}  |" -f "Inventory Size",  $inv)
Write-Host ("  |  {0,-20} {1,10}  |" -f "Direct Library",  $dir)
Write-Host ("  |  {0,-20} {1,10}  |" -f "Transitive",      $trn)
Write-Host ("  |  {0,-20} {1,10}  |" -f "License Spread",  $lic)
Write-Host -NoNewline "  |  " ; Write-Host -NoNewline ("{0,-20}" -f "Active Threats") ; Write-Host -NoNewline " " ; Write-Host -NoNewline ("{0,10}" -f $thr) -ForegroundColor $thrColor ; Write-Host "  |"
Write-Host "  +---------------------------------+"
Write-Host -NoNewline "  |  " ; Write-Host -NoNewline ("{0,-20}" -f "Critical CVEs") ; Write-Host -NoNewline " " ; Write-Host -NoNewline ("{0,10}" -f $cri) -ForegroundColor $criColor ; Write-Host "  |"
Write-Host -NoNewline "  |  " ; Write-Host -NoNewline ("{0,-20}" -f "High CVEs") ; Write-Host -NoNewline " " ; Write-Host -NoNewline ("{0,10}" -f $hig) -ForegroundColor $higColor ; Write-Host "  |"
Write-Host -NoNewline "  |  " ; Write-Host -NoNewline ("{0,-20}" -f "Medium CVEs") ; Write-Host -NoNewline " " ; Write-Host -NoNewline ("{0,10}" -f $med) -ForegroundColor $medColor ; Write-Host "  |"
Write-Host "  +---------------------------------+"
Write-Host -NoNewline "  |  " ; Write-Host -NoNewline ("{0,-20}" -f "NTIA Score") ; Write-Host -NoNewline " " ; Write-Host -NoNewline ("{0,10}" -f "$nts/100") -ForegroundColor $ntsColor ; Write-Host "  |"
Write-Host ("  |  {0,-20} {1,10}  |" -f "Compliance", $ntc)
Write-Host "  +---------------------------------+"
Write-Host ""
Write-Host "  Downloading reports…"

$pdf = $response.downloads.pdf
$cdx = $response.downloads.cyclonedx
$spd = $response.downloads.spdx

if ($pdf) {
  try {
    Invoke-WebRequest -Uri $pdf -OutFile "sbom-report.pdf" -UseBasicParsing
    Write-Host "  [ok] sbom-report.pdf" -ForegroundColor Green
  } catch {
    Write-Host "  [err] Failed to download sbom-report.pdf: $_" -ForegroundColor Red
  }
}
if ($cdx) {
  try {
    Invoke-WebRequest -Uri $cdx -OutFile "sbom.cyclonedx.json" -UseBasicParsing
    Write-Host "  [ok] sbom.cyclonedx.json" -ForegroundColor Green
  } catch {
    Write-Host "  [err] Failed to download sbom.cyclonedx.json: $_" -ForegroundColor Red
  }
}
if ($spd) {
  try {
    Invoke-WebRequest -Uri $spd -OutFile "sbom.spdx" -UseBasicParsing
    Write-Host "  [ok] sbom.spdx" -ForegroundColor Green
  } catch {
    Write-Host "  [err] Failed to download sbom.spdx: $_" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "  All files saved to current directory." -ForegroundColor Green
Write-Host "  Note: Download links expire in 1 hour."
Write-Host "  -------------------------------------"
Write-Host ""
