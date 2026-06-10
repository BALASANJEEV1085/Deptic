import { H1, H2, P, Callout, CodeBlock, Table, Th, Td, Tr, StepIndicator } from '@/components/docs/ui-components'

export default function Page() {
  return (
    <>
      <H1>Webhook Auto-Scan</H1>

      <H2 id="overview">Overview:</H2>
      <P>
        Deptic can automatically scan a repository whenever code is pushed to GitHub. This is implemented using GitHub webhooks — GitHub sends a push event to Deptic, which triggers a full scan without any manual action.
      </P>

      <H2 id="how-it-works">How it works:</H2>
      
      <StepIndicator step={1}>
        <P className="mb-0 text-sm">User enables auto-scan for a repository in Projects page (toggle switch)</P>
      </StepIndicator>
      <StepIndicator step={2}>
        <P className="mb-0 text-sm">Deptic registers a webhook on GitHub: <code className="text-white font-mono bg-[#111111] px-1.5 py-0.5 rounded border border-[#1a1a1a]">POST /repos/{'{owner}'}/{'{repo}'}/hooks</code></P>
      </StepIndicator>
      <StepIndicator step={3}>
        <P className="mb-0 text-sm">On every push to the watched branch, GitHub sends a push event to <code className="text-white font-mono bg-[#111111] px-1.5 py-0.5 rounded border border-[#1a1a1a]">https://api.deptic.in/api/webhooks/github</code></P>
      </StepIndicator>
      <StepIndicator step={4}>
        <P className="mb-0 text-sm">Deptic verifies the HMAC-SHA256 signature using the per-webhook secret</P>
      </StepIndicator>
      <StepIndicator step={5}>
        <P className="mb-0 text-sm">Smart trigger: scan only fires if manifest files changed (package.json, pom.xml, go.mod etc.) OR commit message contains <code className="text-white font-mono bg-[#111111] px-1.5 py-0.5 rounded border border-[#1a1a1a]">[deptic-scan]</code></P>
      </StepIndicator>
      <StepIndicator step={6}>
        <P className="mb-0 text-sm">Scan runs in background, results appear in dashboard automatically</P>
      </StepIndicator>
      <StepIndicator step={7}>
        <P className="mb-0 text-sm">Push notification sent to all subscribed devices</P>
      </StepIndicator>

      <H2 id="smart-trigger-rules">Smart trigger rules:</H2>
      <Callout type="info">
        Deptic does NOT trigger a scan on every push. It checks HEAD commit&apos;s changed files and only scans when dependency files are modified. This prevents excessive API usage and keeps scan counts within limits.
      </Callout>
      
      <H2 id="files-that-trigger-a-scan">Files that trigger a scan:</H2>
      <CodeBlock>
{`package.json
package-lock.json
requirements.txt
pyproject.toml
setup.py
Pipfile
pom.xml
go.mod
go.sum
Cargo.toml
Cargo.lock
Gemfile
Gemfile.lock
composer.json
composer.lock
*.csproj
packages.config`}
      </CodeBlock>

      <H2 id="rate-limits">Rate limits:</H2>
      <Table>
        <thead>
          <Tr>
            <Th>Limit</Th>
            <Th>Value</Th>
          </Tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Max webhook-triggered scans per user per day</Td>
            <Td className="text-white font-medium">10</Td>
          </Tr>
          <Tr>
            <Td>Minimum time between scans for same repo</Td>
            <Td className="text-white font-medium">5 minutes</Td>
          </Tr>
          <Tr>
            <Td>Duplicate commit SHA</Td>
            <Td className="text-white font-medium">Skipped (no re-scan)</Td>
          </Tr>
        </tbody>
      </Table>

      <H2 id="webhook-signature-verification">Webhook signature verification:</H2>
      <CodeBlock language="go">
{`func verifyGitHubSignature(payload []byte, signature, secret string) bool {
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write(payload)
    expected := "sha256=" + hex.EncodeToString(mac.Sum(nil))
    return hmac.Equal([]byte(expected), []byte(signature))
}`}
      </CodeBlock>
    </>
  )
}
