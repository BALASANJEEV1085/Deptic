import { H1, H2, P, Callout, Ul, Li, StepIndicator } from '@/components/docs/ui-components'

export default function Page() {
  return (
    <>
      <H1>How Deptic Works</H1>

      <P>
        Deptic is built on a simple premise: full visibility without code execution. Unlike traditional SCA tools that require you to run <code className="font-mono text-xs">npm install</code> or build your project, Deptic analyzes your repository statically and constructs the dependency tree exactly as the package manager would.
      </P>

      <H2 id="the-scanning-pipeline">The Scanning Pipeline:</H2>
      
      <StepIndicator step={1}>
        <h3 className="text-lg font-semibold text-white mb-2 leading-none">Discovery</h3>
        <P className="mb-0 text-sm">
          Deptic scans your repository tree to find all supported manifest files (e.g., <code className="font-mono text-xs">package.json</code>, <code className="font-mono text-xs">requirements.txt</code>, <code className="font-mono text-xs">pom.xml</code>). It intentionally skips noise directories like <code className="font-mono text-xs">node_modules</code> or <code className="font-mono text-xs">target</code>.
        </P>
      </StepIndicator>

      <StepIndicator step={2}>
        <h3 className="text-lg font-semibold text-white mb-2 leading-none">Parsing</h3>
        <P className="mb-0 text-sm">
          Manifests are parsed to extract direct dependencies. Deptic supports multiple lockfile formats to ensure versions are mapped accurately.
        </P>
      </StepIndicator>

      <StepIndicator step={3}>
        <h3 className="text-lg font-semibold text-white mb-2 leading-none">Transitive Resolution</h3>
        <P className="mb-0 text-sm">
          For each direct dependency, Deptic queries the upstream registry (npm, PyPI, Maven Central, etc.) to fetch its metadata and dependencies. This process is applied recursively to construct the full graph.
        </P>
      </StepIndicator>

      <StepIndicator step={4}>
        <h3 className="text-lg font-semibold text-white mb-2 leading-none">Vulnerability Matching</h3>
        <P className="mb-0 text-sm">
          The completed inventory is batched and sent to OSV.dev and NVD to identify known vulnerabilities across all components, including deeply nested transitive dependencies.
        </P>
      </StepIndicator>

      <StepIndicator step={5}>
        <h3 className="text-lg font-semibold text-white mb-2 leading-none">Report Generation</h3>
        <P className="mb-0 text-sm">
          Finally, Deptic calculates compliance scores and generates CycloneDX/SPDX SBOMs and PDF reports, available for download or via API.
        </P>
      </StepIndicator>

      <Callout type="info" className="mt-8">
        <h4 className="text-sm font-semibold text-white mb-3">Zero-execution guarantee</h4>
        <P className="mb-0 text-sm">
          Because Deptic does not execute any build commands or run package installation scripts (like <code className="font-mono text-xs">postinstall</code>), your CI/CD pipelines are inherently safe from malicious dependency execution during the scanning phase.
        </P>
      </Callout>
    </>
  )
}
