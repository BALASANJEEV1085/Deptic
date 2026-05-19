#!/usr/bin/env node

const readline = require('readline')
const https    = require('https')
const http     = require('http')
const fs       = require('fs')
const path     = require('path')

const API_BASE = process.env.SBOM_API || 'http://localhost:8081'

// ── ANSI colors (safe fallback if terminal doesn't support them) ──────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
  gray:   '\x1b[90m',
}

function col(color, text) {
  return `${c[color]}${text}${c.reset}`
}

function banner() {
  console.log('')
  console.log(col('cyan', '  +---------------------------------+'))
  console.log(col('cyan', '  |        SBOM.io Scanner          |'))
  console.log(col('cyan', '  +---------------------------------+'))
  console.log('')
}

function ask(rl, question) {
  return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())))
}

function row(label, value, color) {
  const padLabel = label.padEnd(20)
  const padValue = String(value).padStart(10)
  const coloredValue = color ? col(color, padValue) : padValue
  console.log(`  |  ${padLabel} ${coloredValue}  |`)
}

function divider() {
  console.log('  +---------------------------------+')
}

function makeRequest(url, options, postData) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const req = lib.request(url, options, res => {
      let body = ''
      res.on('data', chunk => { body += chunk })
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) })
        } catch {
          resolve({ status: res.statusCode, body: body })
        }
      })
    })
    req.on('error', reject)
    if (postData) req.write(postData)
    req.end()
  })
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)
    lib.get(url, res => {
      // Follow redirect
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close()
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject)
      }
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    }).on('error', err => {
      fs.unlink(dest, () => {})
      reject(err)
    })
  })
}

async function main() {
  const args = process.argv.slice(2)

  // ── Handle Help Flag ────────────────────────────────────────────────────────
  if (args.includes('--help') || args.includes('-h')) {
    banner()
    console.log(col('white', '  Usage:'))
    console.log(col('cyan',  '    ssbom-scan'))
    console.log('')
    console.log(col('white', '  Description:'))
    console.log('    Interactive CLI to scan any GitHub repository for vulnerabilities')
    console.log('    and NTIA compliance via SBOM.io.')
    console.log('')
    console.log(col('white', '  Options:'))
    console.log('    -v, --version    Print the current CLI version')
    console.log('    -h, --help       Show this help message')
    console.log('')
    process.exit(0)
  }

  // ── Handle Version Flag ─────────────────────────────────────────────────────
  if (args.includes('--version') || args.includes('-v')) {
    try {
      const pkg = require('./package.json')
      console.log(`ssbom-scan version ${pkg.version}`)
    } catch {
      console.log('ssbom-scan version 1.0.x')
    }
    process.exit(0)
  }

  banner()

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  // Interactive prompts — simple and clean
  const key  = await ask(rl, col('white', '  API Key   : '))
  const repo = await ask(rl, col('white', '  Repo URL  : '))
  rl.close()

  if (!key || !repo) {
    console.log(col('red', '\n  Error: API key and repo URL are required.\n'))
    process.exit(1)
  }

  if (!key.startsWith('sbomio_')) {
    console.log(col('red', '\n  Error: API key must start with sbomio_\n'))
    process.exit(1)
  }

  console.log('')
  console.log(col('gray', '  Scanning... (this may take up to 2 minutes)'))
  console.log('')

  // Build request
  const postData = JSON.stringify({ github_url: repo })
  const apiUrl   = new URL(`${API_BASE}/api/scan-cli`)

  let result
  try {
    result = await makeRequest(apiUrl.href, {
      method: 'POST',
      hostname: apiUrl.hostname,
      port: apiUrl.port || (apiUrl.protocol === 'https:' ? 443 : 80),
      path: apiUrl.pathname,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-API-Key': key,
      },
    }, postData)
  } catch (err) {
    console.log(col('red', `\n  Error: ${err.message}\n`))
    process.exit(1)
  }

  if (result.status !== 200 || result.body.status !== 'complete') {
    const msg = result.body?.error || 'Unknown error'
    console.log(col('red', `\n  Error (${result.status}): ${msg}\n`))
    process.exit(1)
  }

  const d    = result.body
  const s    = d.stats || {}
  const v    = d.vulnerability_summary || {}
  const comp = d.compliance || {}
  const dl   = d.downloads || {}

  // ── Print results table ───────────────────────────────────────────────────
  divider()
  console.log('  |           SCAN RESULTS          |')
  divider()
  row('Inventory Size', s.inventory_size)
  row('Direct Library', s.direct_library)
  row('Transitive', s.transitive)
  row('License Spread', s.license_spread)
  row('Active Threats', s.active_threats, s.active_threats > 0 ? 'red' : 'green')
  divider()
  row('Critical CVEs', v.critical, v.critical > 0 ? 'red' : 'green')
  row('High CVEs',     v.high,     v.high > 0     ? 'yellow' : 'green')
  row('Medium CVEs',   v.medium,   v.medium > 0   ? 'yellow' : 'green')
  divider()
  const nts      = comp.ntia_score ?? 0
  const ntsColor = nts >= 90 ? 'green' : nts >= 60 ? 'yellow' : 'red'
  row('NTIA Score', `${nts}/100`, ntsColor)
  row('Compliance', comp.status)
  divider()
  console.log('')

  // ── Download reports ──────────────────────────────────────────────────────
  console.log('  Downloading reports...')
  const files = [
    { url: dl.pdf,       dest: 'sbom-report.pdf'       },
    { url: dl.cyclonedx, dest: 'sbom.cyclonedx.json'   },
    { url: dl.spdx,      dest: 'sbom.spdx'             },
  ]

  for (const f of files) {
    if (!f.url) continue
    try {
      const fullPath = path.join(process.cwd(), f.dest)
      await downloadFile(f.url, fullPath)
      console.log(col('green', `  [ok] ${fullPath}`))
    } catch (err) {
      console.log(col('red', `  [err] ${f.dest}: ${err.message}`))
    }
  }

  console.log('')
  console.log(col('green', '  All files saved to current directory.'))
  console.log(col('gray',  '  Note: Download links expire in 1 hour.'))
  console.log('  -------------------------------------')
  console.log('')
}

main()
