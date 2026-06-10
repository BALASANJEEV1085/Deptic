import { H1, H2, P, CodeBlock } from '@/components/docs/ui-components'

export default function Page() {
  return (
    <>
      <H1>CycloneDX 1.5 SBOM Export</H1>

      <H2 id="overview">Overview:</H2>
      <P>
        Deptic generates CycloneDX 1.5 JSON files compliant with the official CycloneDX specification. Every exported SBOM is SHA-256 signed and includes all metadata required by NTIA EO14028.
      </P>

      <H2 id="file-structure">File structure:</H2>
      <CodeBlock language="json">
{`{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "serialNumber": "urn:uuid:a13d51dc-0a70-4c1e-bcf3-9703297780d2",
  "version": 1,
  "metadata": {
    "timestamp": "2026-05-10T13:21:10Z",
    "tools": [
      {
        "vendor": "Deptic",
        "name": "Deptic SBOM Scanner",
        "version": "1.2.0"
      }
    ],
    "component": {
      "type": "application",
      "name": "spring-projects/spring-petclinic",
      "version": "HEAD"
    }
  },
  "components": [
    {
      "type": "library",
      "name": "org.springframework.boot:spring-boot-starter-web",
      "version": "4.0.3",
      "purl": "pkg:maven/org.springframework.boot/spring-boot-starter-web@4.0.3",
      "licenses": [
        { "license": { "id": "Apache-2.0" } }
      ],
      "hashes": [],
      "scope": "required"
    }
  ],
  "dependencies": [
    {
      "ref": "pkg:maven/org.springframework.boot/spring-boot-starter-web@4.0.3",
      "dependsOn": [
        "pkg:maven/org.springframework:spring-web@7.0.5"
      ]
    }
  ],
  "vulnerabilities": [
    {
      "id": "CVE-2026-22731",
      "source": { "name": "NVD", "url": "https://nvd.nist.gov/vuln/detail/CVE-2026-22731" },
      "ratings": [
        { "score": 6.5, "severity": "medium", "method": "CVSSv3" }
      ],
      "affects": [
        {
          "ref": "pkg:maven/org.springframework.boot/spring-boot-starter-actuator@4.0.3"
        }
      ]
    }
  ]
}`}
      </CodeBlock>

      <H2 id="sha-256-verification">SHA-256 verification:</H2>
      <CodeBlock language="bash">
{`# Verify the downloaded SBOM file
sha256sum deptic-sbom-spring-petclinic.cyclonedx.json

# Compare with the hash shown in Deptic dashboard
# Expected: a3f9c2e1d4b7... (shown in Export modal)`}
      </CodeBlock>
    </>
  )
}
