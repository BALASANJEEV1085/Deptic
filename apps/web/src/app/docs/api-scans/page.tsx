import { H1, H2, H3, P, CodeBlock, Table, Th, Td, Tr, InlineCode } from '@/components/docs/ui-components'

export default function Page() {
  return (
    <>
      <H1>Scan Endpoints</H1>

      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] uppercase tracking-widest font-semibold bg-[#111111] border border-[#1a1a1a] rounded px-2 py-1 text-white">POST</span>
          <code className="text-sm text-white font-mono">/api/scans</code>
        </div>
        <P className="mb-6"><strong className="text-white">Auth:</strong> JWT Bearer</P>
        <P>Create a new scan for a GitHub repository.</P>

        <H3 className="text-sm text-[#888888] uppercase tracking-wider mb-3">Request body</H3>
        <Table>
          <thead>
            <Tr>
              <Th>Field</Th>
              <Th>Type</Th>
              <Th>Required</Th>
              <Th>Description</Th>
            </Tr>
          </thead>
          <tbody>
            <Tr>
              <Td><InlineCode>github_url</InlineCode></Td>
              <Td>string</Td>
              <Td>Yes</Td>
              <Td>Full GitHub URL: https://github.com/owner/repo</Td>
            </Tr>
          </tbody>
        </Table>

        <H3 className="text-sm text-[#888888] uppercase tracking-wider mb-3 mt-6">Response</H3>
        <Table>
          <thead>
            <Tr>
              <Th>Field</Th>
              <Th>Type</Th>
              <Th>Description</Th>
            </Tr>
          </thead>
          <tbody>
            <Tr><Td><InlineCode>id</InlineCode></Td><Td>uuid</Td><Td>Scan ID</Td></Tr>
            <Tr><Td><InlineCode>status</InlineCode></Td><Td>string</Td><Td>&quot;queued&quot; — scan runs asynchronously</Td></Tr>
            <Tr><Td><InlineCode>github_url</InlineCode></Td><Td>string</Td><Td>Repository URL</Td></Tr>
            <Tr><Td><InlineCode>created_at</InlineCode></Td><Td>timestamp</Td><Td>ISO 8601</Td></Tr>
          </tbody>
        </Table>

        <H3 className="text-sm text-[#888888] uppercase tracking-wider mb-3 mt-6">Code example</H3>
        <CodeBlock language="bash">
{`curl -X POST https://api.deptic.in/api/scans \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"github_url": "https://github.com/spring-projects/spring-petclinic"}'`}
        </CodeBlock>

        <H3 className="text-sm text-[#888888] uppercase tracking-wider mb-3 mt-6">Response example</H3>
        <CodeBlock language="json">
{`{
  "id": "e6caf740-993c-4ed6-8f09-48c2c3db1b99",
  "status": "queued",
  "github_url": "https://github.com/spring-projects/spring-petclinic",
  "ecosystem": "",
  "created_at": "2026-05-10T13:21:10Z"
}`}
        </CodeBlock>
      </div>

      <div className="mb-12 pt-12 border-t border-[#1a1a1a]">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] uppercase tracking-widest font-semibold bg-[#111111] border border-[#1a1a1a] rounded px-2 py-1 text-white">GET</span>
          <code className="text-sm text-white font-mono">/api/scans/:scanID</code>
        </div>
        <P className="mb-6"><strong className="text-white">Auth:</strong> JWT Bearer</P>
        <P>Get full scan results including stats, vulnerability summary, and compliance score.</P>

        <H3 className="text-sm text-[#888888] uppercase tracking-wider mb-3 mt-6">Path parameters</H3>
        <Table>
          <thead>
            <Tr>
              <Th>Parameter</Th>
              <Th>Type</Th>
              <Th>Description</Th>
            </Tr>
          </thead>
          <tbody>
            <Tr>
              <Td><InlineCode>scanID</InlineCode></Td>
              <Td>uuid</Td>
              <Td>Scan ID from POST /api/scans response</Td>
            </Tr>
          </tbody>
        </Table>

        <H3 className="text-sm text-[#888888] uppercase tracking-wider mb-3 mt-6">Response example</H3>
        <CodeBlock language="json">
{`{
  "id": "e6caf740-993c-4ed6-8f09-48c2c3db1b99",
  "status": "done",
  "github_url": "https://github.com/spring-projects/spring-petclinic",
  "ecosystem": "maven",
  "stats": {
    "inventory_size": 63,
    "direct_library": 15,
    "transitive": 48,
    "license_spread": 14,
    "active_threats": 12
  },
  "vulnerability_summary": {
    "critical": 0,
    "high": 0,
    "medium": 12,
    "low": 0
  },
  "compliance": {
    "ntia_score": 85,
    "status": "PARTIALLY COMPLIANT",
    "ntia_compliant": false,
    "eu_cra_compliant": false
  },
  "ecosystem_breakdown": {
    "maven": {
      "count": 63,
      "direct": 15,
      "transitive": 48
    }
  },
  "manifest_files": [
    { "path": "pom.xml", "ecosystem": "maven" }
  ],
  "created_at": "2026-05-10T13:21:10Z",
  "completed_at": "2026-05-10T13:21:52Z"
}`}
        </CodeBlock>
      </div>

      <div className="mb-12 pt-12 border-t border-[#1a1a1a]">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[10px] uppercase tracking-widest font-semibold bg-[#111111] border border-[#1a1a1a] rounded px-2 py-1 text-white">POST</span>
          <code className="text-sm text-white font-mono">/api/scan-local</code>
        </div>
        <P className="mb-6"><strong className="text-white">Auth:</strong> API Key in request body</P>
        <P>Scan a local project by uploading manifest file contents. Used by the deptic-scan CLI.</P>

        <H3 className="text-sm text-[#888888] uppercase tracking-wider mb-3 mt-6">Request body example</H3>
        <CodeBlock language="json">
{`{
  "api_key": "depticio_your_key",
  "project_name": "my-app",
  "manifests": [
    {
      "filename": "package.json",
      "path": "package.json",
      "content": "{ \\"dependencies\\": { \\"express\\": \\"4.16.0\\" } }",
      "ecosystem": "npm"
    }
  ]
}`}
        </CodeBlock>

        <H3 className="text-sm text-[#888888] uppercase tracking-wider mb-3 mt-6">Limits</H3>
        <Table>
          <thead>
            <Tr>
              <Th>Limit</Th>
              <Th>Value</Th>
            </Tr>
          </thead>
          <tbody>
            <Tr><Td>Max manifests per request</Td><Td>50</Td></Tr>
            <Tr><Td>Max file size per manifest</Td><Td>5 MB</Td></Tr>
            <Tr><Td>Request timeout</Td><Td>10 minutes</Td></Tr>
            <Tr><Td>Max scans per key</Td><Td>1 (single-use)</Td></Tr>
          </tbody>
        </Table>
      </div>
    </>
  )
}
