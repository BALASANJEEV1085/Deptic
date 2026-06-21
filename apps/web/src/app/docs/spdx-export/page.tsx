import { H1, H2, P, CodeBlock } from '@/components/docs/ui-components'

export default function Page() {
  return (
    <>
      <H1>SPDX 2.3 SBOM Export</H1>

      <H2 id="overview">Overview:</H2>
      <P>
        Alongside CycloneDX, Deptic supports the generation of SPDX 2.3 (Software Package Data Exchange) files. SPDX is an ISO standard (ISO/IEC 5962:2021) and is widely adopted for open-source license compliance and security tracking.
      </P>

      <H2 id="file-structure">File structure (Tag:Value format):</H2>
      <P>By default, Deptic exports SPDX in the human-readable Tag:Value format.</P>
      <CodeBlock>
{`SPDXVersion: SPDX-2.3
DataLicense: CC0-1.0
SPDXID: SPDXRef-DOCUMENT
DocumentName: spring-petclinic
DocumentNamespace: http://spdx.org/spdxdocs/spring-petclinic-a13d51dc-0a70-4c1e-bcf3-9703297780d2
Creator: Tool: Deptic-1.2.0
Created: 2026-05-10T13:21:10Z

##### Package: spring-boot-starter-web
PackageName: spring-boot-starter-web
SPDXID: SPDXRef-Package-1
PackageVersion: 4.0.3
PackageSupplier: Organization: org.springframework.boot
PackageDownloadLocation: NOASSERTION
FilesAnalyzed: false
PackageLicenseConcluded: Apache-2.0
PackageLicenseDeclared: Apache-2.0
ExternalRef: PACKAGE-MANAGER purl pkg:maven/org.springframework.boot/spring-boot-starter-web@4.0.3

Relationship: SPDXRef-DOCUMENT DESCRIBES SPDXRef-Package-1`}
      </CodeBlock>

      <H2 id="json-format">JSON format:</H2>
      <P>
        SPDX 2.3 JSON is also available via the API by appending <code className="font-mono text-xs text-white bg-[#111111] px-1 rounded">?format=spdx-json</code> to the SBOM download endpoint.
      </P>
    </>
  )
}
