import { H1, H2, P, Callout, CodeBlock, Table, Th, Td, Tr, InlineCode } from '@/components/docs/ui-components'

export default function Page() {
  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-[10px] uppercase tracking-widest font-semibold bg-[#111111] border border-[#1a1a1a] rounded px-2 py-1 text-white">Ecosystem</span>
        <span className="text-[10px] uppercase tracking-widest font-semibold bg-[#111111] border border-[#1a1a1a] rounded px-2 py-1 text-white">Maven / Java</span>
      </div>
      
      <H1>Maven / Java Scanner</H1>

      <P>
        Deptic parses <InlineCode>pom.xml</InlineCode> files to extract dependencies and queries Maven Central to resolve the full transitive dependency graph.
      </P>

      <H2 id="manifest-files-detected">Manifest files detected:</H2>
      <Table>
        <thead>
          <Tr>
            <Th>File</Th>
            <Th>Notes</Th>
          </Tr>
        </thead>
        <tbody>
          <Tr>
            <Td><InlineCode>pom.xml</InlineCode></Td>
            <Td>Standard Maven configuration. Deptic supports multi-module projects via parent POM resolution.</Td>
          </Tr>
        </tbody>
      </Table>

      <H2 id="parent-pom-resolution">Parent POM and properties:</H2>
      <P>
        Deptic fully supports Maven properties and dependency management sections. If a version is defined as <InlineCode>{`\${spring.version}`}</InlineCode>, Deptic traverses up to the parent POM or reads the properties section to interpolate the correct value.
      </P>

      <H2 id="purl-format-for-maven">PURL format for Maven:</H2>
      <CodeBlock>
{`pkg:maven/org.springframework.boot/spring-boot-starter-web@3.1.2`}
      </CodeBlock>
      <P>
        Note: The namespace is the <InlineCode>groupId</InlineCode> and the name is the <InlineCode>artifactId</InlineCode>.
      </P>

      <H2 id="known-limitations">Known limitations:</H2>
      <Callout type="warning">
        <ul className="list-disc list-outside pl-6 text-[#888888] space-y-2 text-sm">
          <li>Custom, private Maven repositories require explicit configuration in your Deptic Workspace integrations</li>
          <li>Gradle (<InlineCode>build.gradle</InlineCode>) support is currently in beta and must be manually enabled</li>
        </ul>
      </Callout>
    </>
  )
}
