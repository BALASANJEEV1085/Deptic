import { H1, H2, H3, P, Callout, CodeBlock, Table, Th, Td, Tr, InlineCode } from '@/components/docs/ui-components'

export default function Page() {
  return (
    <>
      <H1>API Authentication</H1>

      <H2 id="base-url">Base URL:</H2>
      <CodeBlock>
        https://api.deptic.in
      </CodeBlock>

      <H2 id="authentication-methods">Authentication methods:</H2>

      <H3 id="jwt-bearer">1. JWT Bearer Token (Dashboard users)</H3>
      <P>
        All dashboard API endpoints require a JWT token issued by Supabase Auth. Include it in the Authorization header:
      </P>
      <CodeBlock language="bash">
{`curl https://api.deptic.in/api/scans \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."`}
      </CodeBlock>

      <H3 id="api-key">2. API Key (CLI and CI/CD)</H3>
      <P>
        Single-use API keys for programmatic access. Include in the request body or <InlineCode>X-API-Key</InlineCode> header:
      </P>
      <CodeBlock language="bash">
{`curl -X POST https://api.deptic.in/api/scan-local \\
  -H "Content-Type: application/json" \\
  -d '{
    "api_key": "depticio_your_key_here",
    "project_name": "my-app",
    "manifests": [...]
  }'`}
      </CodeBlock>

      <Callout type="warning">
        API keys are single-use. Each key allows exactly one scan. After use, the key is invalidated and returns HTTP 403 on subsequent requests. Generate a new key for each scan from Settings → API Keys.
      </Callout>

      <H2 id="api-key-format">API key format:</H2>
      <CodeBlock>
{`depticio_{40 random alphanumeric characters}
Total length: 47 characters
Example: depticio_REcw6aPPddYnhYw7ewIx3fa0gJuR2bsEYAP2ERRQ`}
      </CodeBlock>

      <H2 id="http-status-codes">HTTP status codes:</H2>
      <Table>
        <thead>
          <Tr>
            <Th>Status</Th>
            <Th>Meaning</Th>
          </Tr>
        </thead>
        <tbody>
          <Tr>
            <Td className="text-white font-medium">200</Td>
            <Td>Success</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">201</Td>
            <Td>Created</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">400</Td>
            <Td>Bad request — missing or invalid parameters</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">401</Td>
            <Td>Unauthorized — missing or invalid credentials</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">403</Td>
            <Td>Forbidden — API key already used, or insufficient permissions</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">404</Td>
            <Td>Not found</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">429</Td>
            <Td>Rate limit exceeded</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">500</Td>
            <Td>Internal server error</Td>
          </Tr>
        </tbody>
      </Table>
    </>
  )
}
