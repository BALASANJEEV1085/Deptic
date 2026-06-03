#!/usr/bin/env node
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { glob } from 'fast-glob';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import Conf from 'conf';

const API_BASE = 'https://api.deptic.in';
const config = new Conf({ projectName: 'deptic-scan' });

// ── MANIFEST DETECTION ───────────────────────────────────────────────────────
const MANIFEST_PATTERNS = [
  { pattern: '**/package.json', ecosystem: 'npm',
    exclude: ['**/node_modules/**', '**/.yarn/**', '**/dist/**', '**/build/**', '**/.next/**'] },
  { pattern: '**/requirements.txt', ecosystem: 'pip',
    exclude: ['**/.venv/**', '**/venv/**', '**/__pycache__/**'] },
  { pattern: '**/pyproject.toml', ecosystem: 'pip',
    exclude: ['**/.venv/**', '**/venv/**'] },
  { pattern: '**/Pipfile', ecosystem: 'pip', exclude: [] },
  { pattern: '**/pom.xml', ecosystem: 'maven',
    exclude: ['**/target/**'] },
  { pattern: '**/go.mod', ecosystem: 'go',
    exclude: ['**/vendor/**'] },
  { pattern: '**/Cargo.toml', ecosystem: 'rust',
    exclude: ['**/target/**'] },
  { pattern: '**/Gemfile', ecosystem: 'ruby',
    exclude: ['**/vendor/**'] },
  { pattern: '**/composer.json', ecosystem: 'php',
    exclude: ['**/vendor/**'] },
];

async function findManifests(cwd) {
  const found = [];
  for (const { pattern, ecosystem, exclude } of MANIFEST_PATTERNS) {
    const files = await glob(pattern, {
      cwd,
      ignore: exclude,
      onlyFiles: true,
      followSymbolicLinks: false,
      dot: false,
      deep: 5,  // max 5 levels deep
    });
    for (const file of files) {
      const fullPath = path.join(cwd, file);
      const content = fs.readFileSync(fullPath, 'utf-8');
      if (content.length > 5 * 1024 * 1024) continue; // skip >5MB
      found.push({
        filename: path.basename(file),
        path: file,
        content,
        ecosystem,
      });
    }
  }
  return found;
}

// ── DISPLAY HELPERS ──────────────────────────────────────────────────────────
function printHeader() {
  console.log('');
  console.log(chalk.white('  ┌─────────────────────────────────────┐'));
  console.log(chalk.white('  │') + chalk.green.bold('         DEPTIC Security Scanner        ') + chalk.white('│'));
  console.log(chalk.white('  │') + chalk.gray('     Software Supply Chain Analysis     ') + chalk.white('│'));
  console.log(chalk.white('  └─────────────────────────────────────┘'));
  console.log('');
}

function printResults(data) {
  const s = data.stats;
  const v = data.vulnerability_summary;
  const c = data.compliance;

  console.log('');
  console.log(chalk.white('  ┌─────────────────────────────────────┐'));
  console.log(chalk.white('  │') + chalk.white.bold('            SCAN RESULTS                ') + chalk.white('│'));
  console.log(chalk.white('  ├─────────────────────────────────────┤'));
  console.log(chalk.white('  │  ') + chalk.gray('Inventory Size     ') + chalk.white.bold(String(s.inventory_size).padStart(10)) + chalk.white('  │'));
  console.log(chalk.white('  │  ') + chalk.gray('Direct Library     ') + chalk.white.bold(String(s.direct_library).padStart(10)) + chalk.white('  │'));
  console.log(chalk.white('  │  ') + chalk.gray('Transitive         ') + chalk.white.bold(String(s.transitive).padStart(10)) + chalk.white('  │'));
  console.log(chalk.white('  │  ') + chalk.gray('License Spread     ') + chalk.white.bold(String(s.license_spread).padStart(10)) + chalk.white('  │'));
  console.log(chalk.white('  ├─────────────────────────────────────┤'));

  const threatColor = s.active_threats > 0 ? chalk.red.bold : chalk.green.bold;
  console.log(chalk.white('  │  ') + chalk.gray('Active Threats     ') + threatColor(String(s.active_threats).padStart(10)) + chalk.white('  │'));

  if (v.critical > 0) console.log(chalk.white('  │  ') + chalk.red('  Critical CVEs   ') + chalk.red.bold(String(v.critical).padStart(10)) + chalk.white('  │'));
  if (v.high > 0)     console.log(chalk.white('  │  ') + chalk.yellow('  High CVEs       ') + chalk.yellow.bold(String(v.high).padStart(10)) + chalk.white('  │'));
  if (v.medium > 0)   console.log(chalk.white('  │  ') + chalk.white('  Medium CVEs     ') + chalk.white(String(v.medium).padStart(10)) + chalk.white('  │'));

  console.log(chalk.white('  ├─────────────────────────────────────┤'));

  const scoreColor = c.ntia_score >= 95 ? chalk.green.bold : c.ntia_score >= 75 ? chalk.yellow.bold : chalk.red.bold;
  console.log(chalk.white('  │  ') + chalk.gray('NTIA Score         ') + scoreColor((c.ntia_score + '/100').padStart(10)) + chalk.white('  │'));
  console.log(chalk.white('  │  ') + chalk.gray('Compliance         ') + scoreColor(c.status.padStart(10)) + chalk.white('  │'));
  console.log(chalk.white('  └─────────────────────────────────────┘'));
  console.log('');
}

async function downloadFile(url, filename) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
  await pipeline(resp.body, createWriteStream(filename));
}

// ── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  const cwd = process.cwd();
  const projectName = path.basename(cwd);

  printHeader();

  console.log(chalk.gray('  Project  : ') + chalk.white(projectName));
  console.log(chalk.gray('  Path     : ') + chalk.white(cwd));
  console.log('');

  // Get API key — check saved key first
  let apiKey = config.get('api_key');
  let usingSaved = false;

  if (apiKey) {
    console.log(chalk.gray('  Saved API key found: ') + chalk.white(apiKey.slice(0, 14) + '...'));
    const { useExisting } = await prompts({
      type: 'confirm',
      name: 'useExisting',
      message: 'Use saved API key?',
      initial: true,
    });
    if (useExisting) {
      usingSaved = true;
    } else {
      apiKey = null;
    }
  }

  if (!apiKey) {
    const response = await prompts({
      type: 'password',
      name: 'apiKey',
      message: 'Enter your Deptic API key',
      validate: v => v.startsWith('depticio_') ? true : 'Invalid key format. Keys start with depticio_',
    });
    if (!response.apiKey) process.exit(0);
    apiKey = response.apiKey;

    const { saveKey } = await prompts({
      type: 'confirm',
      name: 'saveKey',
      message: 'Save this API key for future scans?',
      initial: true,
    });
    if (saveKey) {
      config.set('api_key', apiKey);
      console.log(chalk.green('  ✓ API key saved'));
    }
  }

  console.log('');

  // Find manifest files
  const spinner = ora({ text: 'Scanning project directory...', color: 'green' }).start();

  let manifests;
  try {
    manifests = await findManifests(cwd);
  } catch (err) {
    spinner.fail('Failed to read project files');
    console.error(chalk.red('  Error: ' + err.message));
    process.exit(1);
  }

  if (manifests.length === 0) {
    spinner.fail('No supported manifest files found');
    console.log('');
    console.log(chalk.gray('  Deptic looks for:'));
    console.log(chalk.gray('  • package.json (npm)'));
    console.log(chalk.gray('  • requirements.txt / pyproject.toml (pip)'));
    console.log(chalk.gray('  • pom.xml (Maven)'));
    console.log(chalk.gray('  • go.mod (Go)'));
    console.log(chalk.gray('  • Cargo.toml (Rust)'));
    console.log(chalk.gray('  • Gemfile (Ruby)'));
    console.log('');
    console.log(chalk.gray('  Make sure you are in the root of your project directory.'));
    process.exit(1);
  }

  spinner.succeed(`Found ${manifests.length} manifest file${manifests.length > 1 ? 's' : ''}`);

  // List found files
  const ecosystems = [...new Set(manifests.map(m => m.ecosystem))];
  for (const m of manifests) {
    console.log(chalk.gray('    ✓ ') + chalk.white(m.path) + chalk.gray(' (' + m.ecosystem + ')'));
  }
  console.log('');
  console.log(chalk.gray('  Ecosystems: ') + chalk.green(ecosystems.join(' + ')));
  console.log('');

  // Run scan
  const scanSpinner = ora({ text: 'Analyzing dependencies...', color: 'green' }).start();

  let result;
  try {
    const resp = await fetch(`${API_BASE}/api/scan-local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        project_name: projectName,
        manifests,
      }),
      timeout: 600000, // 10 minute timeout
    });

    const data = await resp.json();

    if (!resp.ok) {
      scanSpinner.fail('Scan failed');
      console.log('');
      if (resp.status === 401) {
        console.log(chalk.red('  ✗ Invalid API key. Generate a new key at deptic.in/dashboard/settings'));
        config.delete('api_key');
      } else if (resp.status === 403) {
        console.log(chalk.red('  ✗ This API key has already been used.'));
        console.log(chalk.gray('  Each API key allows one scan. Generate a new key at deptic.in'));
        config.delete('api_key');
      } else {
        console.log(chalk.red('  ✗ Error: ' + (data.error || 'Unknown error')));
      }
      process.exit(1);
    }

    result = data;
  } catch (err) {
    scanSpinner.fail('Connection failed');
    console.log(chalk.red('  ✗ Could not connect to Deptic API: ' + err.message));
    process.exit(1);
  }

  scanSpinner.succeed('Scan complete');

  // Print results
  printResults(result);

  // Download reports
  if (result.downloads) {
    console.log(chalk.gray('  Downloading reports...'));
    console.log('');

    const files = [
      { url: result.downloads.pdf, name: `deptic-report-${projectName}.pdf` },
      { url: result.downloads.cyclonedx, name: `deptic-sbom-${projectName}.cyclonedx.json` },
      { url: result.downloads.spdx, name: `deptic-sbom-${projectName}.spdx` },
    ];

    for (const file of files) {
      try {
        await downloadFile(file.url, path.join(cwd, file.name));
        console.log(chalk.green('  ✓ ') + chalk.white(file.name));
      } catch (err) {
        console.log(chalk.red('  ✗ Failed to download: ') + file.name);
      }
    }

    console.log('');
    console.log(chalk.gray('  Reports saved to current directory.'));
  }

  console.log('');
  console.log(chalk.gray('  View full report: ') + chalk.green('https://deptic.in/dashboard'));
  console.log(chalk.gray('  ─────────────────────────────────────'));
  console.log('');

  // Exit with error code if critical CVEs found (useful for CI/CD)
  if (result.vulnerability_summary?.critical > 0) {
    process.exit(2); // exit code 2 = critical CVEs found (not a crash)
  }
  process.exit(0);
}

main().catch(err => {
  console.error(chalk.red('\n  Unexpected error: ' + err.message));
  process.exit(1);
});
