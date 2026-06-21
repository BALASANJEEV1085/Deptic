import { H1, H2, P, Table, Th, Td, Tr, Callout } from '@/components/docs/ui-components'

export default function Page() {
  return (
    <>
      <H1>Severity Levels</H1>

      <P>
        Deptic uses the Common Vulnerability Scoring System (CVSS) to assign severity levels to detected vulnerabilities. When multiple CVSS versions are available (e.g., v2.0, v3.1, v4.0), Deptic always prefers the highest available version for calculation.
      </P>

      <H2 id="classification-mapping">Classification mapping:</H2>
      <Table>
        <thead>
          <Tr>
            <Th>Severity</Th>
            <Th>Base Score</Th>
            <Th>Description & Expected Action</Th>
          </Tr>
        </thead>
        <tbody>
          <Tr>
            <Td><span className="font-semibold text-white">CRITICAL</span></Td>
            <Td>9.0 - 10.0</Td>
            <Td>Vulnerability allows remote execution without authentication. Immediate action required. Recommended to block CI/CD pipelines.</Td>
          </Tr>
          <Tr>
            <Td><span className="font-semibold text-white">HIGH</span></Td>
            <Td>7.0 - 8.9</Td>
            <Td>Significant vulnerability, often requiring elevated privileges or complex conditions. Should be patched within 72 hours.</Td>
          </Tr>
          <Tr>
            <Td><span className="font-semibold text-white">MEDIUM</span></Td>
            <Td>4.0 - 6.9</Td>
            <Td>Moderate risk, usually requires local access or highly specific configurations. Add to the backlog for the next sprint.</Td>
          </Tr>
          <Tr>
            <Td><span className="font-semibold text-white">LOW</span></Td>
            <Td>0.1 - 3.9</Td>
            <Td>Informational or theoretical vulnerabilities. Monitor and update when convenient.</Td>
          </Tr>
          <Tr>
            <Td><span className="font-semibold text-white">UNKNOWN</span></Td>
            <Td>N/A</Td>
            <Td>The vulnerability database has published a CVE ID but has not yet assigned a CVSS score.</Td>
          </Tr>
        </tbody>
      </Table>

      <H2 id="how-scores-are-derived">How scores are derived:</H2>
      <Callout type="info">
        The Base Score is calculated from three groups of metrics:
        <ul className="list-disc list-outside pl-6 mt-3 space-y-1">
          <li><strong>Exploitability:</strong> Attack Vector, Attack Complexity, Privileges Required, User Interaction</li>
          <li><strong>Impact:</strong> Confidentiality, Integrity, Availability (the CIA triad)</li>
          <li><strong>Scope:</strong> Whether the vulnerability can affect resources beyond its immediate authorization scope</li>
        </ul>
      </Callout>
    </>
  )
}
