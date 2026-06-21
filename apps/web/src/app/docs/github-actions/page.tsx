import { H1, H2, H3, P, CodeBlock, Table, Th, Td, Tr, InlineCode, StepIndicator } from '@/components/docs/ui-components'

export default function Page() {
  return (
    <>
      <H1>GitHub Actions Integration</H1>

      <H2 id="overview">Overview:</H2>
      <P>
        Deptic integrates into GitHub Actions workflows to automatically scan repositories on every push, block builds when critical CVEs are found, and upload SBOM artifacts.
      </P>

      <H2 id="installation">Installation:</H2>
      
      <StepIndicator step={1}>
        <H3 className="mt-0 pt-0">Generate an API key:</H3>
        <P>
          Navigate to Settings → API Keys → Generate New Key. Give it a name like &apos;GitHub Actions CI&apos;. Copy the full key immediately — it is shown only once.
        </P>
      </StepIndicator>

      <StepIndicator step={2}>
        <H3 className="mt-0 pt-0">Add secret to repository:</H3>
        <P>
          In your GitHub repository: Settings → Secrets and variables → Actions → New repository secret
        </P>
        <CodeBlock>
{`Name:  DEPTIC_API_KEY
Value: depticio_your_full_key_here`}
        </CodeBlock>
      </StepIndicator>

      <StepIndicator step={3}>
        <H3 className="mt-0 pt-0">Add workflow file:</H3>
        <CodeBlock language="yaml">
{`name: Deptic Security Scan

on:
  push:
    branches: [main, master]
    paths:
      - 'package.json'
      - 'requirements.txt'
      - 'pom.xml'
      - 'go.mod'
      - '**/package.json'
  pull_request:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    name: Supply Chain Security Scan

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Install Deptic CLI
        run: npm install -g deptic-scan

      - name: Run security scan
        env:
          DEPTIC_API_KEY: \${{ secrets.DEPTIC_API_KEY }}
        run: |
          deptic-scan --api-key=$DEPTIC_API_KEY --output=json > deptic-results.json
          cat deptic-results.json

      - name: Check for critical vulnerabilities
        run: |
          CRITICAL=$(cat deptic-results.json | jq '.vulnerability_summary.critical')
          if [ "$CRITICAL" -gt "0" ]; then
            echo "FAILED: $CRITICAL critical CVEs detected"
            exit 1
          fi
          echo "PASSED: No critical vulnerabilities"

      - name: Upload SBOM artifact
        uses: actions/upload-artifact@v4
        with:
          name: sbom-\${{ github.sha }}
          path: |
            deptic-sbom-*.cyclonedx.json
            deptic-sbom-*.spdx
            deptic-report-*.pdf
          retention-days: 90`}
        </CodeBlock>
      </StepIndicator>

      <H2 id="exit-codes">Exit codes:</H2>
      <Table>
        <thead>
          <Tr>
            <Th>Exit Code</Th>
            <Th>Meaning</Th>
            <Th>CI/CD behavior</Th>
          </Tr>
        </thead>
        <tbody>
          <Tr>
            <Td className="text-white font-medium">0</Td>
            <Td>Scan complete, no critical CVEs</Td>
            <Td>Build continues</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">1</Td>
            <Td>Error (invalid key, connection, no manifests)</Td>
            <Td>Build fails with error</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">2</Td>
            <Td>Scan complete, critical CVEs found</Td>
            <Td>Build fails — blocks merge</Td>
          </Tr>
        </tbody>
      </Table>
    </>
  )
}
