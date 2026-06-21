import { H1, H2, P, Callout, CodeBlock, Table, Th, Td, Tr, InlineCode } from '@/components/docs/ui-components'

export default function Page() {
  return (
    <>
      <H1>Compliance Scoring Algorithm</H1>

      <P>
        The Deptic Compliance Score is a unified metric (0–100) that indicates how well your software supply chain documentation adheres to federal and enterprise mandates. 
      </P>

      <H2 id="algorithm-breakdown">Algorithm breakdown:</H2>
      <Table>
        <thead>
          <Tr>
            <Th>Category</Th>
            <Th>Max Points</Th>
            <Th>Evaluation Criteria</Th>
          </Tr>
        </thead>
        <tbody>
          <Tr>
            <Td className="text-white font-medium">NTIA Base Elements</Td>
            <Td>70 pts</Td>
            <Td>10 points for each of the 7 minimum elements required by EO14028. Partial points awarded proportionally for incomplete metadata (e.g., missing supplier names).</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">Transitive Depth</Td>
            <Td>15 pts</Td>
            <Td>Full points if transitive dependencies are fully resolved. 0 points if only direct dependencies are listed.</Td>
          </Tr>
          <Tr>
            <Td className="text-white font-medium">Vulnerability Status</Td>
            <Td>15 pts</Td>
            <Td>15 pts for 0 Critical/High CVEs. -5 pts for every High CVE. -15 pts if any Critical CVE exists.</Td>
          </Tr>
        </tbody>
      </Table>

      <H2 id="calculation-example">Calculation example:</H2>
      <CodeBlock language="json">
{`{
  "project": "my-backend-api",
  "scoring": {
    "ntia_elements_score": 62, // Lost 8 points due to 80% supplier name coverage
    "transitive_depth": 15,    // Full resolution achieved
    "vulnerabilities": 10      // 1 High CVE (-5 pts)
  },
  "final_score": 87,
  "status": "PARTIALLY COMPLIANT"
}`}
      </CodeBlock>

      <H2 id="improving-your-score">Improving your score:</H2>
      <Callout type="info">
        <ul className="list-disc list-outside pl-6 text-[#888888] space-y-2 text-sm">
          <li><strong>Fix high severity CVEs:</strong> Use the "Fix All with PR" feature to bump vulnerable packages to safe versions.</li>
          <li><strong>Use supported package managers:</strong> Ensure you are not relying on <InlineCode>git+</InlineCode> URL dependencies, which cannot be reliably fingerprinted for SBOM generation.</li>
        </ul>
      </Callout>
    </>
  )
}
