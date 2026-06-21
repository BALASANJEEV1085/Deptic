import { H1, H2, P, Callout, CodeBlock, Table, Th, Td, Tr, InlineCode } from '@/components/docs/ui-components'

export default function Page() {
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[10px] uppercase tracking-widest font-semibold bg-[#111111] border border-[#1a1a1a] rounded px-2 py-1 text-white">Ecosystem</span>
        <span className="text-[10px] uppercase tracking-widest font-semibold bg-[#111111] border border-[#1a1a1a] rounded px-2 py-1 text-white">npm</span>
      </div>
      
      <H1>npm / Node.js Scanner</H1>

      <P>
        Deptic&apos;s npm scanner resolves the complete dependency tree from <InlineCode>package.json</InlineCode> files found anywhere in the repository. Unlike running <InlineCode>npm install</InlineCode>, Deptic uses the npm registry API directly — no code execution, no containers, no environment setup required.
      </P>

      <H2 id="manifest-files-detected">Manifest files detected:</H2>
      <Table>
        <thead>
          <Tr>
            <Th>File</Th>
            <Th>Purpose</Th>
            <Th>Notes</Th>
          </Tr>
        </thead>
        <tbody>
          <Tr>
            <Td><InlineCode>package.json</InlineCode></Td>
            <Td>Direct dependencies</Td>
            <Td>Required</Td>
          </Tr>
          <Tr>
            <Td><InlineCode>package-lock.json</InlineCode></Td>
            <Td>Locked versions</Td>
            <Td>Used when available for exact versions</Td>
          </Tr>
        </tbody>
      </Table>

      <H2 id="excluded-paths">Excluded paths:</H2>
      <CodeBlock>
{`node_modules/
.yarn/
dist/
build/
.next/
out/
coverage/`}
      </CodeBlock>

      <H2 id="transitive-resolution">Transitive resolution:</H2>
      <P>
        Deptic fetches each direct dependency&apos;s own <InlineCode>package.json</InlineCode> from the npm registry and recursively resolves to depth 3. A typical Next.js application has 40–60 direct dependencies and 800–1,200 transitive dependencies.
      </P>

      <H2 id="example-scan-output">Example scan output:</H2>
      <CodeBlock language="json">
{`{
  "ecosystem": "npm",
  "stats": {
    "inventory_size": 1247,
    "direct_library": 43,
    "transitive": 1204,
    "license_spread": 18
  },
  "top_licenses": ["MIT", "ISC", "Apache-2.0", "BSD-3-Clause"]
}`}
      </CodeBlock>

      <H2 id="purl-format-for-npm">PURL format for npm:</H2>
      <CodeBlock>
{`pkg:npm/lodash@4.17.21
pkg:npm/%40types%2Fnode@20.0.0`}
      </CodeBlock>
      <P>
        Note: Scoped packages (<InlineCode>@org/name</InlineCode>) are percent-encoded in PURLs.
      </P>

      <H2 id="known-limitations">Known limitations:</H2>
      <Callout type="warning">
        <ul className="list-disc list-outside pl-6 text-[#888888] space-y-2 text-sm">
          <li>Packages using <InlineCode>git:</InlineCode> or <InlineCode>file:</InlineCode> specifiers in <InlineCode>package.json</InlineCode> are resolved as &quot;version unknown&quot;</li>
          <li>Workspace packages in pnpm/yarn workspaces are detected but resolved individually</li>
          <li>Private registry packages (not on npmjs.com) return metadata as &quot;unavailable&quot;</li>
        </ul>
      </Callout>
    </>
  )
}
