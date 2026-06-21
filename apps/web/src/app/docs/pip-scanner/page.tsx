import { H1, H2, P, Callout, CodeBlock, Table, Th, Td, Tr, InlineCode } from '@/components/docs/ui-components'

export default function Page() {
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[10px] uppercase tracking-widest font-semibold bg-[#111111] border border-[#1a1a1a] rounded px-2 py-1 text-white">Ecosystem</span>
        <span className="text-[10px] uppercase tracking-widest font-semibold bg-[#111111] border border-[#1a1a1a] rounded px-2 py-1 text-white">pip / Python</span>
      </div>
      
      <H1>pip / Python Scanner</H1>

      <P>
        Deptic&apos;s Python scanner parses dependency definitions and queries the PyPI registry to resolve transitive dependencies without executing Python code or setting up virtual environments.
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
            <Td><InlineCode>requirements.txt</InlineCode></Td>
            <Td>High</Td>
            <Td>Standard pip requirements</Td>
          </Tr>
          <Tr>
            <Td><InlineCode>pyproject.toml</InlineCode></Td>
            <Td>High</Td>
            <Td>Poetry, Flit, Hatchling</Td>
          </Tr>
          <Tr>
            <Td><InlineCode>Pipfile.lock</InlineCode></Td>
            <Td>Medium</Td>
            <Td>Pipenv locked dependencies</Td>
          </Tr>
          <Tr>
            <Td><InlineCode>setup.py</InlineCode></Td>
            <Td>Low</Td>
            <Td>Legacy setuptools (static parsing only)</Td>
          </Tr>
        </tbody>
      </Table>

      <H2 id="purl-format-for-pypi">PURL format for PyPI:</H2>
      <CodeBlock>
{`pkg:pypi/requests@2.31.0
pkg:pypi/django@4.2.1`}
      </CodeBlock>
      <P>
        Note: PyPI package names in PURLs are always lowercased and use hyphens instead of underscores, following the standard specification.
      </P>

      <H2 id="known-limitations">Known limitations:</H2>
      <Callout type="warning">
        <ul className="list-disc list-outside pl-6 text-[#888888] space-y-2 text-sm">
          <li>Dependencies specified as GitHub repository links (<InlineCode>git+https://...</InlineCode>) are not resolved transitively</li>
          <li>For <InlineCode>setup.py</InlineCode>, Deptic uses AST parsing to extract dependencies. Highly dynamic definitions may be missed.</li>
        </ul>
      </Callout>
    </>
  )
}
