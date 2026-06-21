[![Deptic Security](https://deptic-api.onrender.com/badge/github/BALASANJEEV1085/Deptic)](https://deptic.netlify.app/dashboard)

<p align="center">
  <a href="https://deptic.netlify.app">
    <img src="https://deptic.netlify.app/logo-dark.png" width="320" alt="Deptic Logo">
  </a>
</p>

<p align="center">
  <em>Automated Software Supply Chain Security & SBOM Generation Platform</em>
</p>

<p align="center">
  <a href="https://deptic.netlify.app"><img src="https://img.shields.io/badge/Live-deptic.netlify.app-00E89D?style=for-the-badge&logo=netlify&logoColor=white" alt="Live Demo"></a>
  <a href="https://github.com/BALASANJEEV1085/sbom-tool/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License"></a>
  <a href="https://deptic.netlify.app/docs"><img src="https://img.shields.io/badge/Docs-Documentation-8B5CF6?style=for-the-badge" alt="Docs"></a>
</p>

<p align="center">
  <a href="https://deptic.netlify.app">Website</a> · <a href="https://deptic.netlify.app/docs">Documentation</a> · <a href="https://deptic.netlify.app/pricing">Pricing</a> · <a href="https://github.com/BALASANJEEV1085/sbom-tool/issues">Report Bug</a> · <a href="https://github.com/BALASANJEEV1085/sbom-tool/issues">Request Feature</a>
</p>

<br>

---

# Deptic

[Deptic](https://deptic.netlify.app) is an automated software supply chain security platform. Scan any GitHub repository and instantly generate compliant SBOMs, detect critical CVEs, and prove regulatory compliance — all from a single dashboard.

- [x] Instant GitHub repository scanning
- [x] SBOM generation (CycloneDX 1.5 & SPDX 2.3)
- [x] Real-time CVE vulnerability detection
- [x] NTIA & EU CRA compliance scoring
- [x] Multi-ecosystem support (8 package managers)
- [x] Automated Fix Pull Requests
- [x] CLI Scanner for CI/CD pipelines
- [x] Shareable security reports
- [x] GitHub Actions integration
- [x] Enterprise dashboard

<br>

## 🖥️ Dashboard

<p align="center">
  <img src="https://deptic.netlify.app/og-image.png" alt="Deptic Dashboard" width="100%">
</p>

<br>

## ⚡ Quick Start

Get your first SBOM in under 60 seconds:

1. Go to **[deptic.netlify.app](https://deptic.netlify.app)**
2. Sign in with GitHub or Google
3. Paste any public GitHub repository URL
4. Click **Scan** — your SBOM and vulnerability report is ready instantly

### CLI Scanner

```bash
# Install the Deptic CLI
npm install -g deptic-scan

# Scan your project
deptic-scan 



<br>

## 🏗️ Architecture

Deptic is a monorepo built with modern, production-grade tools:

```
deptic/
├── apps/
│   ├── web/          # Next.js 14 (App Router) — Frontend & Landing Page
│   └── api/          # Go (Golang) — Backend Scanning Engine & REST API
├── packages/
│   └── shared/       # Shared types & utilities
└── public/
    └── cli/          # CLI Scanner distribution
```

### Tech Stack

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| **Frontend** | [Next.js 14](https://nextjs.org/) | App Router, React Server Components, SSR |
| **Backend** | [Go (Golang)](https://go.dev/) | High-performance scanning engine, dependency resolution |
| **Database** | [Supabase](https://supabase.com/) | PostgreSQL database, real-time subscriptions |
| **Auth** | [Supabase Auth](https://supabase.com/auth) | OAuth (GitHub, Google), session management |
| **Payments** | [Razorpay](https://razorpay.com/) | Subscription billing & payment processing |
| **Deployment** | [Netlify](https://netlify.com/) | Edge-optimized frontend hosting |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | Utility-first CSS framework |

<br>

## 🛡️ Features

### SBOM Generation
Generate industry-standard Software Bills of Materials with a single click. Export in **CycloneDX 1.5** or **SPDX 2.3** JSON format — fully compliant with NTIA minimum elements.

### CVE Vulnerability Detection
Deptic cross-references your entire dependency tree against global CVE databases in real-time. Every vulnerability is scored with CVSS severity and mapped to its exact dependency path.

### Multi-Ecosystem Support

| Ecosystem | Manifest Files |
|:----------|:---------------|
| **Node.js** | `package.json`, `package-lock.json`, `yarn.lock` |
| **Python** | `requirements.txt`, `Pipfile.lock`, `pyproject.toml` |
| **Go** | `go.mod`, `go.sum` |
| **Java/Kotlin** | `pom.xml`, `build.gradle` |


### Compliance Scoring
Automatically score your project against regulatory frameworks:
- **NTIA Minimum Elements** — US Executive Order 14028
- **EU Cyber Resilience Act (CRA)** — European compliance
- **NIST SSDF** — Secure Software Development Framework

### Automated Fix PRs
Deptic analyzes vulnerable dependencies, resolves them to the nearest safe version, and opens a GitHub Pull Request directly on your repository — zero manual work required.

### Shareable Reports
Generate cryptographically verified, publicly shareable security reports. Share compliance status with auditors, customers, or stakeholders via a unique URL.

<br>

## 🔧 Development

### Prerequisites

- **Node.js** >= 18.x
- **Go** >= 1.21
- **pnpm** (recommended) or npm

### Setup

```bash
# Clone the repository
git clone https://github.com/BALASANJEEV1085/sbom-tool.git
cd sbom-tool

# Install frontend dependencies
cd apps/web
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase & API keys

# Start the development server
npm run dev
```

### Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=your_api_url
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

<br>

## 📖 Documentation

For full documentation, visit **[deptic.netlify.app/docs](https://deptic.netlify.app/docs)**

| Resource | Description |
|:---------|:------------|
| [Getting Started](https://deptic.netlify.app/docs) | Quick start guide and overview |
| [SBOM Formats](https://deptic.netlify.app/docs/sbom-formats) | CycloneDX & SPDX format specifications |
| [CLI Scanner](https://deptic.netlify.app/docs/cli-scanner) | Install and use the CLI scanner |
| [GitHub Actions](https://deptic.netlify.app/docs/github-actions) | Automate scans in your CI/CD pipeline |
| [API Reference](https://deptic.netlify.app/docs/api-reference) | REST API documentation |
| [Vulnerability Scoring](https://deptic.netlify.app/docs/vulnerability-scoring) | CVSS scoring methodology |

<br>

## 🗺️ Roadmap

- [x] Core SBOM generation (CycloneDX & SPDX)
- [x] Real-time CVE detection
- [x] Compliance scoring (NTIA, EU CRA)
- [x] CLI scanner
- [x] GitHub Actions integration
- [x] Automated Fix PRs
- [x] Shareable security reports
- [ ] Private repository scanning
- [ ] SBOM diffing between versions
- [ ] Slack & Teams notifications
- [ ] Policy-as-code engine
- [ ] SBOM signing with Sigstore
- [ ] Dependency license compliance (SPDX License List)
- [ ] GitLab & Bitbucket integration

<br>

## 🤝 Community & Support

- [GitHub Issues](https://github.com/BALASANJEEV1085/sbom-tool/issues) — Bug reports and feature requests
- [GitHub Discussions](https://github.com/BALASANJEEV1085/sbom-tool/discussions) — Questions and community help
- [Documentation](https://deptic.netlify.app/docs) — Guides and API reference
- [Email Support](https://deptic.netlify.app/contact) — Direct support for Enterprise users

<br>

## 💎 Pricing

Deptic is **free** for individual developers and open-source projects.

| Plan | Price | Features |
|:-----|:------|:---------|
| **Free** | $0/mo | Unlimited scans, SBOM export, CVE detection |
| **Enterprise** | ₹999/mo | Priority support, advanced compliance, team workspaces |

See full pricing at **[deptic.netlify.app/pricing](https://deptic.netlify.app/pricing)**

<br>

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

<br>

---

<p align="center">
  <strong>Built with ❤️ by Balasanjeev</strong>
</p>

<p align="center">
  <a href="https://deptic.netlify.app">Website</a> · <a href="https://deptic.netlify.app/docs">Docs</a> · <a href="https://deptic.netlify.app/pricing">Pricing</a>
</p>
