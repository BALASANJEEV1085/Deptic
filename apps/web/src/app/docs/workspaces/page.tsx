import { H1, H2, P, Callout, Table, Th, Td, Tr, StepIndicator } from '@/components/docs/ui-components'

export default function Page() {
  return (
    <>
      <H1>Workspaces</H1>

      <H2 id="overview">Overview:</H2>
      <P>
        A Workspace is a shared environment where multiple developers collaborate on the same repositories and scans. All workspace members see identical data — scans, vulnerabilities, compliance scores, and reports are shared in real time.
      </P>

      <H2 id="default-workspace">Default workspace:</H2>
      <Callout type="info">
        Every user starts with a Personal Workspace created automatically at signup. Scans in the personal workspace are only visible to you.
      </Callout>

      <H2 id="roles-and-permissions">Roles and permissions:</H2>
      <Table>
        <thead>
          <Tr>
            <Th>Permission</Th>
            <Th>Owner</Th>
            <Th>Admin</Th>
            <Th>Member</Th>
            <Th>Viewer</Th>
          </Tr>
        </thead>
        <tbody>
          <Tr>
            <Td>Create scans</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-center">—</Td>
          </Tr>
          <Tr>
            <Td>Delete scans</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-center">—</Td>
            <Td className="text-center">—</Td>
          </Tr>
          <Tr>
            <Td>View scans</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-white text-center">✓</Td>
          </Tr>
          <Tr>
            <Td>Create Fix PRs</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-center">—</Td>
          </Tr>
          <Tr>
            <Td>Invite members</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-center">—</Td>
            <Td className="text-center">—</Td>
          </Tr>
          <Tr>
            <Td>Manage integrations</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-center">—</Td>
            <Td className="text-center">—</Td>
          </Tr>
          <Tr>
            <Td>Delete workspace</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-center">—</Td>
            <Td className="text-center">—</Td>
            <Td className="text-center">—</Td>
          </Tr>
          <Tr>
            <Td>Export SBOM</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-center">—</Td>
          </Tr>
          <Tr>
            <Td>Create API keys</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-white text-center">✓</Td>
            <Td className="text-center">—</Td>
          </Tr>
        </tbody>
      </Table>

      <H2 id="invitation-flow">Invitation flow:</H2>
      
      <StepIndicator step={1}>
        <P className="mb-0 text-sm">Go to Settings → Workspace → Members → Invite Member</P>
      </StepIndicator>
      <StepIndicator step={2}>
        <P className="mb-0 text-sm">Enter email address and select role</P>
      </StepIndicator>
      <StepIndicator step={3}>
        <P className="mb-0 text-sm">Deptic sends invitation email with a secure 7-day expiry link</P>
      </StepIndicator>
      <StepIndicator step={4}>
        <P className="mb-0 text-sm">Invitee clicks link → signs in (or creates account) → automatically joins workspace</P>
      </StepIndicator>
      <StepIndicator step={5}>
        <P className="mb-0 text-sm">Owner and admins receive a push notification and email when member joins</P>
      </StepIndicator>
    </>
  )
}
