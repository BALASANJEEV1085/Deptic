#!/bin/bash
# DEPTIC.io CLI Scanner
# Usage: ./deptic-scan.sh --key=depticio_xxx --repo=https://github.com/owner/repo

API_BASE="https://api.deptic.io"
KEY=""
REPO=""

for arg in "$@"; do
  case $arg in
    --key=*) KEY="${arg#*=}" ;;
    --repo=*) REPO="${arg#*=}" ;;
    --base=*) API_BASE="${arg#*=}" ;;
  esac
done

if [ -z "$KEY" ] || [ -z "$REPO" ]; then
  echo ""
  echo "  DEPTIC.io CLI Scanner"
  echo "  Usage: ./deptic-scan.sh --key=YOUR_API_KEY --repo=GITHUB_URL"
  echo ""
  exit 1
fi

echo "  +---------------------------------+"
echo "  |        DEPTIC.io Scanner          |"
echo "  +---------------------------------+"
echo "  Repository : $REPO"
echo "  Scanning… (this may take up to 2 minutes)"
echo ""

RESPONSE=$(curl -s -X POST "$API_BASE/api/scan-cli" \
  -H "X-API-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d "{\"github_url\":\"$REPO\"}")

STATUS=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('status','error'))" 2>/dev/null)

if [ "$STATUS" != "complete" ]; then
  ERROR=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error','Unknown error'))" 2>/dev/null)
  echo "  ERROR: $ERROR"
  echo ""
  exit 1
fi

INV=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['stats']['inventory_size'])")
DIR=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['stats']['direct_library'])")
TRN=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['stats']['transitive'])")
LIC=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['stats']['license_spread'])")
THR=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['stats']['active_threats'])")
CRI=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['vulnerability_summary']['critical'])")
HIG=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['vulnerability_summary']['high'])")
MED=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['vulnerability_summary']['medium'])")
NTS=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['compliance']['ntia_score'])")
NTC=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['compliance']['status'])")
PDF=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['downloads'].get('pdf',''))" 2>/dev/null)
CDX=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['downloads'].get('cyclonedx',''))" 2>/dev/null)
SPD=$(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['downloads'].get('spdx',''))" 2>/dev/null)

echo "  +---------------------------------+"
echo "  |           SCAN RESULTS          |"
echo "  +---------------------------------+"
printf "  |  %-20s %10s  |\n" "Inventory Size"  "$INV"
printf "  |  %-20s %10s  |\n" "Direct Library"  "$DIR"
printf "  |  %-20s %10s  |\n" "Transitive"      "$TRN"
printf "  |  %-20s %10s  |\n" "License Spread"  "$LIC"
printf "  |  %-20s %10s  |\n" "Active Threats"  "$THR"
echo "  +---------------------------------+"
printf "  |  %-20s %10s  |\n" "Critical CVEs"   "$CRI"
printf "  |  %-20s %10s  |\n" "High CVEs"       "$HIG"
printf "  |  %-20s %10s  |\n" "Medium CVEs"     "$MED"
echo "  +---------------------------------+"
printf "  |  %-20s %10s  |\n" "NTIA Score"      "$NTS/100"
printf "  |  %-20s %10s  |\n" "Compliance"      "$NTC"
echo "  +---------------------------------+"
echo ""
echo "  Downloading reports…"

if [ -n "$PDF" ] && [ "$PDF" != "None" ]; then
  curl -s -L "$PDF" -o "deptic-report.pdf" && echo "  [ok] deptic-report.pdf"
fi
if [ -n "$CDX" ] && [ "$CDX" != "None" ]; then
  curl -s -L "$CDX" -o "deptic.cyclonedx.json" && echo "  [ok] deptic.cyclonedx.json"
fi
if [ -n "$SPD" ] && [ "$SPD" != "None" ]; then
  curl -s -L "$SPD" -o "deptic.spdx" && echo "  [ok] deptic.spdx"
fi


echo ""
echo "  All files saved to current directory."
echo "  Note: Download links expire in 1 hour."
echo "  ─────────────────────────────────────"
echo ""
