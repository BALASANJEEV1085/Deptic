# SBOM.io CLI Scanner

Scan any GitHub repository for dependencies, vulnerabilities, and NTIA compliance — all from your terminal. Each API key is **single-use and disposable**.

---

## Prerequisites

- **curl** — pre-installed on macOS, Linux, and Windows 10+ (build 1803+)
- **python3** — required for JSON parsing on Linux/macOS (pre-installed on most systems)
- An **SBOM.io API key** — generate one from [Settings → API Keys](https://sbom.io/dashboard/settings)

---

## Linux / macOS

### 1. Make the script executable

```bash
chmod +x sbom-scan.sh
```

### 2. Run the scanner

```bash
chmod +x sbom-scan.sh
./sbom-scan.sh --key=sbomio_YOUR_KEY --repo=https://github.com/owner/repo
```

### Example output

```
  +---------------------------------+
  |           SCAN RESULTS          |
  +---------------------------------+
  |  Inventory Size            3238  |
  |  Direct Library             459  |
  |  Transitive                2779  |
  |  License Spread             133  |
  |  Active Threats               0  |
  +---------------------------------+
  |  Critical CVEs                0  |
  |  High CVEs                    3  |
  |  Medium CVEs                 12  |
  +---------------------------------+
  |  NTIA Score              85/100  |
  |  Compliance  PARTIALLY COMPLIANT |
  +---------------------------------+

  Downloading reports…
  [ok] sbom-report.pdf
  [ok] sbom.cyclonedx.json
  [ok] sbom.spdx
```

---

## Windows PowerShell

### 1. Allow script execution (one-time, per session)

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### 2. Run the scanner

```powershell
.\sbom-scan.ps1 -key "sbomio_YOUR_KEY" -repo "https://github.com/owner/repo"
```

> PowerShell output includes **colored highlighting**: 🔴 red for threats/CVEs, 🟡 yellow for warnings, 🟢 green for clean results.

---

## What happens when you run it

1. Sends your API key + GitHub URL to the SBOM.io API
2. The API scans all package manifests in the repository (`package-lock.json`, `requirements.txt`, `pom.xml`, etc.)
3. Resolves all direct and transitive dependencies
4. Runs CVE matching via OSV.dev for all components
5. Calculates NTIA SBOM compliance score
6. Generates three files: PDF report, CycloneDX SBOM, SPDX SBOM
7. Prints results to your terminal
8. Downloads all three files to your current directory

---

## Output files

| File | Format | Description |
|------|--------|-------------|
| `sbom-report.pdf` | PDF | Full human-readable report with stats, CVEs, and compliance |
| `sbom.cyclonedx.json` | CycloneDX 1.5 JSON | Machine-readable SBOM for tool integration |
| `sbom.spdx` | SPDX 2.3 | SPDX-format SBOM for licensing and compliance tools |

> ⚠️ **Download links expire after 1 hour.** Run the scanner again with a new key if needed.

---

## Important notes

- **Each API key is single-use** — it works for exactly one scan, then is permanently consumed.
- Scans are **ephemeral** — results are not saved to your SBOM.io dashboard.
- Generate new keys anytime from [Settings → API Keys](https://sbom.io/dashboard/settings).
- API keys start with `sbomio_` and are 47 characters total.

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| `Invalid API key` | Check your key is correct and starts with `sbomio_` |
| `This API key has already been used` | Generate a new key from the settings page |
| `No supported manifests found` | The repository may not have `package-lock.json`, `requirements.txt`, or `pom.xml` |
| `curl: command not found` | Install curl: `apt install curl` / `brew install curl` |
