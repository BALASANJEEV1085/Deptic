import { H1, H2, P, Callout, CodeBlock, Ul, Li, StepIndicator } from '@/components/docs/ui-components'

export default function Page() {
  return (
    <>
      <div className="flex items-center text-[13px] text-[#666666] mb-4 font-medium">
        Getting Started <span className="mx-2">/</span> <span className="text-white">Quick Start</span>
      </div>
      
      <H1>Quick Start</H1>

      <StepIndicator step={1}>
        <h3 className="text-lg font-semibold text-white mb-2 leading-none">Create an account</h3>
        <P className="mb-4">
          Sign up at deptic.in using your GitHub account. Deptic uses GitHub OAuth to authenticate and access repository manifests.
        </P>
        <Callout type="info">
          <p className="text-sm text-white mb-2 font-semibold">Deptic requires the following GitHub permissions:</p>
          <Ul className="mb-0 text-sm">
            <Li><code>repo</code> — read access to repository contents (manifest files only)</Li>
            <Li><code>admin:repo_hook</code> — register webhooks for auto-scan (optional)</Li>
          </Ul>
        </Callout>
      </StepIndicator>

      <StepIndicator step={2}>
        <h3 className="text-lg font-semibold text-white mb-2 leading-none">Scan a repository</h3>
        <P>
          Navigate to Projects → Initiate Scan. Enter any public or private GitHub repository URL:
        </P>
        <CodeBlock>
          https://github.com/your-org/your-repo
        </CodeBlock>
        <P>
          Deptic automatically detects all manifest files across the repository tree. No configuration required.
        </P>
      </StepIndicator>

      <StepIndicator step={3}>
        <h3 className="text-lg font-semibold text-white mb-2 leading-none">Review results</h3>
        <P>
          Once the scan completes (typically 30–120 seconds depending on project size), you will see:
        </P>
        <Ul>
          <Li><strong>Inventory size:</strong> total components including transitive dependencies</Li>
          <Li><strong>Active threats:</strong> number of components with known CVEs</Li>
          <Li><strong>NTIA compliance score:</strong> 0–100 based on the 7 minimum elements</Li>
          <Li><strong>Severity breakdown:</strong> Critical / High / Medium / Low CVE counts</Li>
        </Ul>
      </StepIndicator>

      <StepIndicator step={4}>
        <h3 className="text-lg font-semibold text-white mb-2 leading-none">Export your SBOM</h3>
        <P>
          Download a signed SBOM in CycloneDX 1.5 or SPDX 2.3 format from the Bill of Materials tab. Both formats are accepted by US federal agencies and EU procurement systems.
        </P>
        <Callout type="info">
          CycloneDX JSON files are SHA-256 signed and include a timestamp, author, and component PURLs — all 7 NTIA minimum elements.
        </Callout>
      </StepIndicator>

      <StepIndicator step={5}>
        <h3 className="text-lg font-semibold text-white mb-2 leading-none">Fix vulnerabilities</h3>
        <P>
          Click <strong className="text-white">Fix All with PR</strong> in the Vulnerabilities tab. Deptic:
        </P>
        <Ul>
          <Li>Queries OSV.dev for ALL affected versions of each vulnerable package</Li>
          <Li>Finds the latest version with ZERO known CVEs</Li>
          <Li>Creates a branch and opens a GitHub Pull Request with the version bumps</Li>
          <Li>Verifies the chosen versions against OSV before creating the PR</Li>
        </Ul>
      </StepIndicator>
    </>
  )
}
