import { H1, H2, P, CodeBlock, Table, Th, Td, Tr, Ul, Li, StepIndicator } from '@/components/docs/ui-components'

export default function Page() {
  return (
    <>
      <H1>CLI Scanner</H1>

      <H2 id="prerequisites">Prerequisites:</H2>
      <Ul>
        <Li>Node.js 18 or higher</Li>
        <Li>npm (comes with Node.js)</Li>
        <Li>A Deptic API key (generate at deptic.netlify.app/dashboard/settings)</Li>
      </Ul>

      <H2 id="installation">Installation:</H2>
      <CodeBlock language="bash">
        npm install -g deptic-scan
      </CodeBlock>
      
      <H2 id="verify-installation">Verify installation:</H2>
      <CodeBlock language="bash">
{`deptic-scan --version
# deptic-scan v1.0.0`}
      </CodeBlock>

      <H2 id="basic-usage">Basic usage:</H2>
      <CodeBlock language="bash">
{`# Navigate to your project directory
cd /path/to/your/project

# Run the scanner
deptic-scan

# You will be prompted for your API key on first run
# The key is saved locally for convenience`}
      </CodeBlock>

      <H2 id="what-happens-when-you-run-deptic-scan">What happens when you run deptic-scan:</H2>
      
      <StepIndicator step={1}>
        <P className="mb-0 text-sm">Detects current working directory name as project name</P>
      </StepIndicator>
      <StepIndicator step={2}>
        <P className="mb-0 text-sm">Searches recursively (max depth 5) for manifest files — package.json, requirements.txt, pyproject.toml, pom.xml, go.mod, Cargo.toml, Gemfile, composer.json</P>
      </StepIndicator>
      <StepIndicator step={3}>
        <P className="mb-0 text-sm">Excludes noise directories: node_modules, .venv, venv, target, dist, build, vendor, .git</P>
      </StepIndicator>
      <StepIndicator step={4}>
        <P className="mb-0 text-sm">Reads and sends manifest file contents to POST /api/scan-local</P>
      </StepIndicator>
      <StepIndicator step={5}>
        <P className="mb-0 text-sm">Waits for scan to complete (progress shown in terminal)</P>
      </StepIndicator>
      <StepIndicator step={6}>
        <P className="mb-0 text-sm">Prints results table</P>
      </StepIndicator>
      <StepIndicator step={7}>
        <P className="mb-0 text-sm">Downloads PDF report, CycloneDX JSON, and SPDX file to current directory</P>
      </StepIndicator>

      <H2 id="example-terminal-output">Example terminal output:</H2>
      <CodeBlock>
{`  ┌─────────────────────────────────────┐
  │         DEPTIC Security Scanner        │
  │     Software Supply Chain Analysis     │
  └─────────────────────────────────────┘

  Project  : spring-petclinic
  Path     : D:\\projects\\spring-petclinic

  ✓ Found 1 manifest file
    ✓ pom.xml (maven)

  Ecosystems: maven

  ┌─────────────────────────────────────┐
  │            SCAN RESULTS                │
  ├─────────────────────────────────────┤
  │  Inventory Size              63  │
  │  Direct Library              15  │
  │  Transitive                  48  │
  │  License Spread              14  │
  ├─────────────────────────────────────┤
  │  Active Threats              12  │
  │  Medium CVEs                 12  │
  ├─────────────────────────────────────┤
  │  NTIA Score              85/100  │
  │  Compliance     PARTIALLY COMPLIANT  │
  └─────────────────────────────────────┘

  Downloading reports...

  ✓ deptic-report-spring-petclinic.pdf
  ✓ deptic-sbom-spring-petclinic.cyclonedx.json
  ✓ deptic-sbom-spring-petclinic.spdx

  Reports saved to current directory.
  View full report: https://deptic.netlify.app/dashboard`}
      </CodeBlock>

      <H2 id="flags">Flags:</H2>
      <Table>
        <thead>
          <Tr>
            <Th>Flag</Th>
            <Th>Description</Th>
            <Th>Default</Th>
          </Tr>
        </thead>
        <tbody>
          <Tr>
            <Td className="text-white font-medium">--api-key</Td>
            <Td>Provide API key non-interactively</Td>
            <Td>Prompts if not set</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">--output=json</Td>
            <Td>Print results as JSON instead of table</Td>
            <Td>table</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">--no-download</Td>
            <Td>Skip report file downloads</Td>
            <Td>false</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">--depth=N</Td>
            <Td>Max directory scan depth</Td>
            <Td>5</Td>
          </Tr>
        </tbody>
      </Table>
    </>
  )
}
