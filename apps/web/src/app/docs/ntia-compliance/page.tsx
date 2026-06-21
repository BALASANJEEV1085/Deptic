import { H1, H2, P, Callout, CodeBlock, Table, Th, Td, Tr } from '@/components/docs/ui-components'

export default function Page() {
  return (
    <>
      <H1>NTIA EO14028 Compliance</H1>

      <H2 id="background">Background:</H2>
      <P>
        US Executive Order 14028 (May 2021) requires all software sold to the US federal government to include a Software Bill of Materials. The NTIA (National Telecommunications and Information Administration) defined the minimum data fields required in every SBOM.
      </P>

      <H2 id="the-7-ntia-minimum-elements">The 7 NTIA Minimum Elements:</H2>
      <Table>
        <thead>
          <Tr>
            <Th>#</Th>
            <Th>Element</Th>
            <Th>NTIA Definition</Th>
            <Th>How Deptic collects it</Th>
          </Tr>
        </thead>
        <tbody>
          <Tr>
            <Td className="text-white font-medium">1</Td>
            <Td className="text-white font-medium">Supplier Name</Td>
            <Td>The name of an entity that creates, defines, and identifies components</Td>
            <Td>For npm: package author field from registry. For Maven: groupID. For pip: PyPI maintainer. Note: often unavailable — most common reason for scores below 100.</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">2</Td>
            <Td className="text-white font-medium">Component Name</Td>
            <Td>Designation assigned to a unit of software defined by the originating supplier</Td>
            <Td>Package name field from manifest</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">3</Td>
            <Td className="text-white font-medium">Version of the Component</Td>
            <Td>Identifier used by the supplier to specify a change in software from a previously identified version</Td>
            <Td>Version field from manifest and registry</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">4</Td>
            <Td className="text-white font-medium">Other Unique Identifiers</Td>
            <Td>Other identifiers that are used to identify a component, or serve as a look-up key</Td>
            <Td>Package URL (PURL) generated per component using standard pkg: scheme</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">5</Td>
            <Td className="text-white font-medium">Dependency Relationship</Td>
            <Td>Characterizing the relationship that an upstream component X is included in software Y</Td>
            <Td>Depth field: 0=direct, 1=transitive L1, 2=transitive L2. ParentName field links child to parent.</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">6</Td>
            <Td className="text-white font-medium">Author of SBOM Data</Td>
            <Td>The name of the entity that creates the SBOM data for this component</Td>
            <Td>&quot;Deptic v1.2.0&quot; set as SBOM author in all exports</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">7</Td>
            <Td className="text-white font-medium">Timestamp</Td>
            <Td>Record of the date and time of the SBOM data assembly</Td>
            <Td>UTC timestamp set at scan completion</Td>
          </Tr>
        </tbody>
      </Table>

      <H2 id="scoring-algorithm">Scoring algorithm:</H2>
      <CodeBlock language="go">
{`score = 0

Element 1 (Supplier):
  coverage = components with non-empty supplier / total components
  if coverage == 100% → +14 points
  else → +14 * (coverage / 100)

Element 2 (Component Name):
  coverage = components with non-empty name / total
  passed = coverage == 100%
  if passed → +14 points

Element 3 (Version):
  coverage = components where version != "" AND != "unknown" AND != "latest"
  passed = coverage == 100%
  if passed → +14 points

Element 4 (Unique Identifiers / PURL):
  valid PURL = name + version + ecosystem all present
  coverage = components with valid PURL / total
  if coverage == 100% → +14 points

Element 5 (Dependency Relationships):
  count = components where depth > 0 AND parent_name != ""
  passed = count > 0
  if passed → +14 points

Element 6 (SBOM Author):
  passed = sbom_author != "" AND sbom_tool != ""
  if passed → +14 points

Element 7 (Timestamp):
  passed = generated_at is valid and within last 365 days
  if passed → +14 points

final_score = sum of all elements (max 100, 2 points rounding)`}
      </CodeBlock>

      <H2 id="compliance-status-thresholds">Compliance status thresholds:</H2>
      <Table>
        <thead>
          <Tr>
            <Th>Score</Th>
            <Th>Status</Th>
            <Th>Meaning</Th>
          </Tr>
        </thead>
        <tbody>
          <Tr>
            <Td>95–100</Td>
            <Td className="text-white font-bold">COMPLIANT</Td>
            <Td>Meets all NTIA minimum elements</Td>
          </Tr>
          <Tr>
            <Td>75–94</Td>
            <Td className="text-white font-bold">PARTIALLY COMPLIANT</Td>
            <Td>Meets most elements, minor gaps</Td>
          </Tr>
          <Tr>
            <Td>0–74</Td>
            <Td className="text-white font-bold">NON-COMPLIANT</Td>
            <Td>Significant data gaps — not suitable for federal submission</Td>
          </Tr>
        </tbody>
      </Table>

      <Callout type="warning" className="mt-8">
        The most common reason for scores below 100 is missing Supplier Name data. npm packages rarely include author metadata. Maven packages using groupID as supplier (e.g., org.springframework) are considered compliant for this element.
      </Callout>
    </>
  )
}
