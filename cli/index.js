#!/usr/bin/env node

const readline = require('readline')
const https    = require('https')
const http     = require('http')
const fs       = require('fs')
const path     = require('path')

const API_BASE = process.env.DEPTIC_API || 'http://localhost:8081'

// ── ANSI colors ──────────────────────────────────────────────────────────────
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
  console.log(col('cyan', '  +-----------------------------------------+'))
  console.log(col('cyan', '  |') + col('green', '         DEPTIC.io Scanner               ') + col('cyan', '|'))
  console.log(col('cyan', '  |') + col('gray',  '     Local Project Security Analysis     ') + col('cyan', '|'))
  console.log(col('cyan', '  +-----------------------------------------+'))
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
  console.log('  +-----------------------------------------+')
}

// ── Manifest Discovery ───────────────────────────────────────────────────────
const MANIFEST_FILES = [
  { name: 'package.json',    ecosystem: 'npm' },
  { name: 'requirements.txt', ecosystem: 'pip' },
  { name: 'pyproject.toml',  ecosystem: 'pip' },
  { name: 'Pipfile',         ecosystem: 'pip' },
  { name: 'setup.py',        ecosystem: 'pip' },
  { name: 'pom.xml',         ecosystem: 'maven' },
  { name: 'go.mod',          ecosystem: 'go' },
  { name: 'Cargo.toml',      ecosystem: 'rust' },
  { name: 'Gemfile',         ecosystem: 'ruby' },
  { name: 'composer.json',   ecosystem: 'php' },
]

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', 'vendor', 'target',
  'dist', 'build', '.next', '__pycache__', '.venv', 'venv',
  '.yarn', '.pnp', 'coverage', '.tox', 'env', '.mypy_cache',
])

function findManifests(dir, maxDepth, relativeBase) {
  if (maxDepth < 0) return []
  const results = []
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return results
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.isDirectory()) continue
    const fullPath = path.join(dir, entry.name)
    const relPath  = path.join(relativeBase, entry.name)

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      results.push(...findManifests(fullPath, maxDepth - 1, relPath))
    } else if (entry.isFile()) {
      const match = MANIFEST_FILES.find(m => m.name === entry.name)
      if (match) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8')
          if (content.length > 5 * 1024 * 1024) continue // skip >5MB
          results.push({
            filename:  entry.name,
            path:      relPath.replace(/\\/g, '/'),
            content:   content,
            ecosystem: match.ecosystem,
          })
        } catch { /* skip unreadable files */ }
      }
    }
  }
  return results
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────
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
    req.setTimeout(600000) // 10 min timeout
    if (postData) req.write(postData)
    req.end()
  })
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)
    lib.get(url, res => {
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

// ── Spinner ──────────────────────────────────────────────────────────────────
function createSpinner(text) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let i = 0
  const id = setInterval(() => {
    process.stdout.write(`\r  ${col('green', frames[i++ % frames.length])} ${text}`)
  }, 80)
  return {
    stop(finalText) {
      clearInterval(id)
      process.stdout.write(`\r  ${col('green', '✓')} ${finalText}\n`)
    },
    fail(finalText) {
      clearInterval(id)
      process.stdout.write(`\r  ${col('red', '✗')} ${finalText}\n`)
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)
  const cwd  = process.cwd()
  const projectName = path.basename(cwd)

  // ── Help ───────────────────────────────────────────────────────────────────
  if (args.includes('--help') || args.includes('-h')) {
    banner()
    console.log(col('white', '  Usage:'))
    console.log(col('cyan',  '    cd /path/to/your/project'))
    console.log(col('cyan',  '    deptic-scan'))
    console.log('')
    console.log(col('white', '  Description:'))
    console.log('    Scans the current directory for manifest files (package.json,')
    console.log('    pom.xml, go.mod, requirements.txt, etc.) and sends them to')
    console.log('    the Deptic API for dependency analysis and vulnerability scanning.')
    console.log('')
    console.log(col('white', '  Options:'))
    console.log('    -v, --version    Print the current CLI version')
    console.log('    -h, --help       Show this help message')
    console.log('')
    console.log(col('white', '  Exit codes:'))
    console.log('    0   Scan complete, no critical CVEs')
    console.log('    1   Error (bad key, no manifests, connection failure)')
    console.log('    2   Scan complete, critical CVEs found (useful for CI/CD)')
    console.log('')
    process.exit(0)
  }

  // ── Version ────────────────────────────────────────────────────────────────
  if (args.includes('--version') || args.includes('-v')) {
    try {
      const pkg = require('./package.json')
      console.log(`deptic-scan version ${pkg.version}`)
    } catch {
      console.log('deptic-scan version 1.0.x')
    }
    process.exit(0)
  }

  banner()

  console.log(col('gray', '  Project  : ') + col('white', projectName))
  console.log(col('gray', '  Path     : ') + col('white', cwd))
  console.log('')

  // ── Find manifests ─────────────────────────────────────────────────────────
  const spinner1 = createSpinner('Scanning project directory...')
  const manifests = findManifests(cwd, 5, '')
  
  if (manifests.length === 0) {
    spinner1.fail('No supported manifest files found')
    console.log('')
    console.log(col('gray', '  Deptic looks for:'))
    MANIFEST_FILES.forEach(m => {
      console.log(col('gray', `    • ${m.name} (${m.ecosystem})`))
    })
    console.log('')
    console.log(col('gray', '  Make sure you are in the root of your project directory.'))
    console.log('')
    process.exit(1)
  }

  spinner1.stop(`Found ${manifests.length} manifest file${manifests.length > 1 ? 's' : ''}`)

  const ecosystems = [...new Set(manifests.map(m => m.ecosystem))]
  for (const m of manifests) {
    console.log(col('gray', '    ✓ ') + col('white', m.path) + col('gray', ` (${m.ecosystem})`))
  }
  console.log('')
  console.log(col('gray', '  Ecosystems: ') + col('green', ecosystems.join(' + ')))
  console.log('')

  // ── API Key ────────────────────────────────────────────────────────────────
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const key = await ask(rl, col('white', '  API Key  : '))
  rl.close()

  if (!key) {
    console.log(col('red', '\n  Error: API key is required.\n'))
    process.exit(1)
  }

  if (!key.startsWith('depticio_')) {
    console.log(col('red', '\n  Error: API key must start with depticio_\n'))
    process.exit(1)
  }

  console.log('')

  // ── Send to API ────────────────────────────────────────────────────────────
  const spinner2 = createSpinner('Analyzing dependencies...')

  const postData = JSON.stringify({
    api_key:      key,
    project_name: projectName,
    manifests:    manifests,
  })

  const apiUrl = new URL(`${API_BASE}/api/scan-local`)

  let result
  try {
    result = await makeRequest(apiUrl.href, {
      method:   'POST',
      hostname: apiUrl.hostname,
      port:     apiUrl.port || (apiUrl.protocol === 'https:' ? 443 : 80),
      path:     apiUrl.pathname,
      headers: {
        'Content-Type':   'application/json',
        'Content-Length':  Buffer.byteLength(postData),
      },
    }, postData)
  } catch (err) {
    spinner2.fail('Connection failed')
    console.log(col('red', `\n  Error: ${err.message}\n`))
    process.exit(1)
  }

  if (result.status !== 200 || result.body.status !== 'complete') {
    spinner2.fail('Scan failed')
    const msg = result.body?.error || 'Unknown error'
    if (result.status === 401) {
      console.log(col('red', '\n  Invalid API key. Generate a new one at deptic.in/dashboard/settings\n'))
    } else if (result.status === 403) {
      console.log(col('red', '\n  This API key has already been used.'))
      console.log(col('gray', '  Each key allows one scan. Generate a new key at deptic.in\n'))
    } else {
      console.log(col('red', `\n  Error (${result.status}): ${msg}\n`))
    }
    process.exit(1)
  }

  spinner2.stop('Scan complete')

  const d    = result.body
  const s    = d.stats || {}
  const v    = d.vulnerability_summary || {}
  const comp = d.compliance || {}
  const dl   = d.downloads || {}

  // ── Print results ──────────────────────────────────────────────────────────
  console.log('')
  divider()
  console.log('  |            SCAN RESULTS              |')
  divider()
  row('Inventory Size', s.inventory_size)
  row('Direct Library', s.direct_library)
  row('Transitive',     s.transitive)
  row('License Spread', s.license_spread)
  divider()
  row('Active Threats', s.active_threats, s.active_threats > 0 ? 'red' : 'green')
  if (v.critical > 0) row('  Critical CVEs', v.critical, 'red')
  if (v.high > 0)     row('  High CVEs',     v.high,     'yellow')
  if (v.medium > 0)   row('  Medium CVEs',   v.medium,   'yellow')
  divider()
  const nts      = comp.ntia_score ?? 0
  const ntsColor = nts >= 90 ? 'green' : nts >= 60 ? 'yellow' : 'red'
  row('NTIA Score',  `${nts}/100`, ntsColor)
  row('Compliance',  comp.status)
  divider()
  console.log('')

  // ── Download reports ───────────────────────────────────────────────────────
  if (dl.pdf || dl.cyclonedx || dl.spdx) {
    console.log(col('gray', '  Downloading reports...'))
    const files = [
      { url: dl.pdf,       dest: `deptic-report-${projectName}.pdf` },
      { url: dl.cyclonedx, dest: `deptic-sbom-${projectName}.cyclonedx.json` },
      { url: dl.spdx,      dest: `deptic-sbom-${projectName}.spdx` },
    ]

    for (const f of files) {
      if (!f.url) continue
      try {
        const fullPath = path.join(cwd, f.dest)
        await downloadFile(f.url, fullPath)
        console.log(col('green', `  ✓ ${f.dest}`))
      } catch (err) {
        console.log(col('red', `  ✗ ${f.dest}: ${err.message}`))
      }
    }

    console.log('')
    console.log(col('green', '  Reports saved to current directory.'))
    console.log(col('gray',  '  Download links expire in 1 hour.'))
  }

  console.log('')
  console.log(col('gray', '  View full report: ') + col('green', 'https://deptic.in/dashboard'))
  console.log(col('gray', '  ─────────────────────────────────────'))
  console.log('')

  // Exit with code 2 if critical CVEs found (useful for CI/CD)
  if (v.critical > 0) process.exit(2)
  process.exit(0)
}

main()
