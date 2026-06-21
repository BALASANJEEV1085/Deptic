import { H1, H2, P, Callout, CodeBlock, Table, Th, Td, Tr, InlineCode } from '@/components/docs/ui-components'

export default function Page() {
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[10px] uppercase tracking-widest font-semibold bg-[#111111] border border-[#1a1a1a] rounded px-2 py-1 text-white">Ecosystem</span>
        <span className="text-[10px] uppercase tracking-widest font-semibold bg-[#111111] border border-[#1a1a1a] rounded px-2 py-1 text-white">Go Modules</span>
      </div>
      
      <H1>Go Modules Scanner</H1>

      <P>
        Deptic analyzes <InlineCode>go.mod</InlineCode> and <InlineCode>go.sum</InlineCode> files to identify direct and indirect dependencies. Go&apos;s Minimal Version Selection (MVS) algorithm is respected when determining the final resolved versions.
      </P>

      <H2 id="manifest-files-detected">Manifest files detected:</H2>
      <Table>
        <thead>
          <Tr>
            <Th>File</Th>
            <Th>Priority</Th>
            <Th>Notes</Th>
          </Tr>
        </thead>
        <tbody>
          <Tr>
            <Td><InlineCode>go.mod</InlineCode></Td>
            <Td>High</Td>
            <Td>Primary module file</Td>
          </Tr>
          <Tr>
            <Td><InlineCode>go.sum</InlineCode></Td>
            <Td>High</Td>
            <Td>Checksums and exact version locking</Td>
          </Tr>
        </tbody>
      </Table>

      <H2 id="indirect-dependencies">Indirect dependencies:</H2>
      <P>
        Go includes <InlineCode>{'// indirect'}</InlineCode> markers in <InlineCode>go.mod</InlineCode>. Deptic treats these as transitive dependencies in the SBOM generation to ensure NTIA compliance.
      </P>

      <H2 id="purl-format-for-golang">PURL format for Golang:</H2>
      <CodeBlock>
{`pkg:golang/github.com/gin-gonic/gin@v1.9.1`}
      </CodeBlock>
      <P>
        Note: The prefix is <InlineCode>golang</InlineCode> (not <InlineCode>go</InlineCode>) according to the official PURL specification.
      </P>

      <H2 id="known-limitations">Known limitations:</H2>
      <Callout type="warning">
        <ul className="list-disc list-outside pl-6 text-[#888888] space-y-2 text-sm">
          <li>Replaced modules (<InlineCode>replace github.com/x/y =&gt; ../z</InlineCode>) pointing to local paths are omitted from the vulnerability scan as they cannot be queried remotely</li>
        </ul>
      </Callout>
    </>
  )
}
