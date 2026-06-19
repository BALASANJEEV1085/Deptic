# deptic-scan

Local project security scanner by [Deptic](https://deptic.in).

## Install

npm install -g deptic-scan

## Usage

Navigate to your project directory and run:

cd D:\my-project
deptic-scan

The scanner will:
1. Find all manifest files (package.json, pom.xml, go.mod, requirements.txt etc.)
2. Analyze the full dependency tree
3. Check every component against CVE databases
4. Generate NTIA compliance report
5. Download PDF + CycloneDX + SPDX files to your project folder

## API Keys

Get your free API key at https://deptic.netlify.app/dashboard/settings

Each key is single-use. Generate a new key for each scan.
The CLI saves your key locally for convenience.

## Exit Codes

0 — Scan complete, no critical CVEs
1 — Error (invalid key, connection failed, no manifests found)
2 — Scan complete, critical CVEs detected (useful for CI/CD fail gates)

## Supported Ecosystems

npm (package.json) · pip (requirements.txt, pyproject.toml) ·
Maven (pom.xml) · Go (go.mod) · Rust (Cargo.toml) · Ruby (Gemfile)
