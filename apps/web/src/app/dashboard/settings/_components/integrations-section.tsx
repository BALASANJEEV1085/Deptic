import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { ExternalLink, CheckCircle2, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function IntegrationsSection({ user, loading }: { user: User | null; loading: boolean }) {
  const supabase = createClient()
  const [integrations, setIntegrations] = useState<any[]>([])
  const [slackUrl, setSlackUrl] = useState('')
  const [slackChannel, setSlackChannel] = useState('')
  const [jiraUrl, setJiraUrl] = useState('')
  const [jiraEmail, setJiraEmail] = useState('')
  const [jiraToken, setJiraToken] = useState('')
  const [jiraProject, setJiraProject] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    fetchIntegrations()
  }, [user])

  const fetchIntegrations = async () => {
    if (!user) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('http://localhost:8081/api/integrations', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setIntegrations(data.integrations || [])
      }
    } catch (err) {
      console.error('Failed to load integrations', err)
    }
  }

  const handleConnectSlack = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const payload = (slackUrl === '' && slackChannel === '' && integrations.find(i => i.type === 'slack'))
        ? { webhook_url: integrations.find(i => i.type === 'slack').config.webhook_url, channel: integrations.find(i => i.type === 'slack').config.channel }
        : { webhook_url: slackUrl, channel: slackChannel }

      const res = await fetch('http://localhost:8081/api/integrations/slack', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        setSuccess('Slack connected successfully! Check your channel for a test message.')
        fetchIntegrations()
        setSlackUrl('')
        setSlackChannel('')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to connect Slack')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleConnectJira = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const payload = (jiraUrl === '' && integrations.find(i => i.type === 'jira'))
        ? { 
            base_url: integrations.find(i => i.type === 'jira').config.base_url, 
            email: integrations.find(i => i.type === 'jira').config.email, 
            api_token: integrations.find(i => i.type === 'jira').config.api_token, 
            project_key: integrations.find(i => i.type === 'jira').config.project_key 
          }
        : { base_url: jiraUrl, email: jiraEmail, api_token: jiraToken, project_key: jiraProject }

      const res = await fetch('http://localhost:8081/api/integrations/jira', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        setSuccess('Jira connected successfully! Check your Jira project for a test ticket.')
        fetchIntegrations()
        setJiraToken('')
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to connect Jira')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = async (type: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`http://localhost:8081/api/integrations/${type}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (res.ok) fetchIntegrations()
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggle = async (type: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`http://localhost:8081/api/integrations/${type}/toggle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      if (res.ok) fetchIntegrations()
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return <div className="animate-pulse bg-white/5 rounded-xl h-64 border border-white/10" />
  }

  const slackConfig = integrations.find(i => i.type === 'slack')
  const jiraConfig = integrations.find(i => i.type === 'jira')

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium flex items-center gap-3">
          <XCircle className="h-5 w-5" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] p-4 rounded-xl text-sm font-medium flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Slack Integration */}
        <Card className="bg-[#0f1117] border-white/[0.06] shadow-xl overflow-hidden group hover:border-[#22c55e]/30 transition-colors">
          <CardHeader className="border-b border-white/[0.04] bg-white/[0.01]">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-3 text-white">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/d/d5/Slack_icon_2019.svg" alt="Slack" className="w-6 h-6" />
                  Slack
                </CardTitle>
                <CardDescription className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                  Get real-time security alerts directly in your workspace.
                </CardDescription>
              </div>
              {slackConfig ? (
                <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20 font-bold tracking-widest text-[9px] uppercase px-2 py-0.5">Connected</Badge>
              ) : (
                <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 font-bold tracking-widest text-[9px] uppercase px-2 py-0.5">Disconnected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {slackConfig ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Active Channel</Label>
                  <p className="text-white text-sm font-mono bg-white/5 px-3 py-2 rounded-lg border border-white/10">{slackConfig.config.channel}</p>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-white/5">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold text-white">Enable Notifications</Label>
                    <p className="text-[11px] text-zinc-500">Receive alerts for new scans</p>
                  </div>
                  <Switch 
                    checked={slackConfig.enabled} 
                    onCheckedChange={() => handleToggle('slack')}
                    className="data-[state=checked]:bg-[#22c55e]"
                  />
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <Button variant="outline" className="h-8 text-xs font-semibold bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white" onClick={handleConnectSlack}>
                    Send Test Message
                  </Button>
                  <button onClick={() => handleDisconnect('slack')} className="text-[11px] text-red-400 hover:text-red-300 font-semibold tracking-wide transition-colors">
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConnectSlack} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="slackUrl" className="text-zinc-400 text-xs font-bold">Webhook URL</Label>
                  <Input 
                    id="slackUrl" 
                    placeholder="https://hooks.slack.com/services/..." 
                    className="bg-[#0a0c10] border-white/10 text-sm h-10"
                    value={slackUrl}
                    onChange={(e) => setSlackUrl(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slackChannel" className="text-zinc-400 text-xs font-bold">Channel Name</Label>
                  <Input 
                    id="slackChannel" 
                    placeholder="#security-alerts" 
                    className="bg-[#0a0c10] border-white/10 text-sm h-10 font-mono"
                    value={slackChannel}
                    onChange={(e) => setSlackChannel(e.target.value)}
                    required
                  />
                </div>
                <div className="pt-2">
                  <Button type="submit" disabled={saving} className="w-full bg-white text-black hover:bg-zinc-200 font-bold h-10 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                    {saving ? 'Connecting...' : 'Connect Slack'}
                  </Button>
                  <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-zinc-500 hover:text-[#22c55e] transition-colors">
                    How to create a Slack webhook <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Jira Integration */}
        <Card className="bg-[#0f1117] border-white/[0.06] shadow-xl overflow-hidden group hover:border-blue-500/30 transition-colors">
          <CardHeader className="border-b border-white/[0.04] bg-white/[0.01]">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-3 text-white">
                  <img src="https://w7.pngwing.com/pngs/399/659/png-transparent-jira-hd-logo-thumbnail.png" alt="Jira" className="w-6 h-6 rounded" />
                  Jira Software
                </CardTitle>
                <CardDescription className="text-zinc-400 text-xs mt-1.5 leading-relaxed">
                  Auto-create tickets for critical security issues.
                </CardDescription>
              </div>
              {jiraConfig ? (
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-bold tracking-widest text-[9px] uppercase px-2 py-0.5">Connected</Badge>
              ) : (
                <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 font-bold tracking-widest text-[9px] uppercase px-2 py-0.5">Disconnected</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {jiraConfig ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Active Project</Label>
                  <p className="text-white text-sm font-mono bg-white/5 px-3 py-2 rounded-lg border border-white/10">{jiraConfig.config.project_key}</p>
                </div>
                <div className="flex items-center justify-between py-2 border-t border-white/5">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-semibold text-white">Auto-create Tickets</Label>
                    <p className="text-[11px] text-zinc-500">Only for Critical & High severity</p>
                  </div>
                  <Switch 
                    checked={jiraConfig.enabled} 
                    onCheckedChange={() => handleToggle('jira')}
                    className="data-[state=checked]:bg-blue-500"
                  />
                </div>
                <div className="pt-2 flex items-center justify-between">
                  <Button variant="outline" className="h-8 text-xs font-semibold bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white" onClick={handleConnectJira}>
                    Create Test Ticket
                  </Button>
                  <button onClick={() => handleDisconnect('jira')} className="text-[11px] text-red-400 hover:text-red-300 font-semibold tracking-wide transition-colors">
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConnectJira} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="jiraUrl" className="text-zinc-400 text-xs font-bold">Jira Base URL</Label>
                  <Input 
                    id="jiraUrl" 
                    placeholder="https://company.atlassian.net" 
                    className="bg-[#0a0c10] border-white/10 text-sm h-10"
                    value={jiraUrl}
                    onChange={(e) => setJiraUrl(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jiraEmail" className="text-zinc-400 text-xs font-bold">Email Address</Label>
                  <Input 
                    id="jiraEmail" 
                    type="email"
                    placeholder="admin@company.com" 
                    className="bg-[#0a0c10] border-white/10 text-sm h-10"
                    value={jiraEmail}
                    onChange={(e) => setJiraEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jiraToken" className="text-zinc-400 text-xs font-bold">API Token</Label>
                  <Input 
                    id="jiraToken" 
                    type="password"
                    placeholder="••••••••••••••••" 
                    className="bg-[#0a0c10] border-white/10 text-sm h-10"
                    value={jiraToken}
                    onChange={(e) => setJiraToken(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jiraProject" className="text-zinc-400 text-xs font-bold">Project Key</Label>
                  <Input 
                    id="jiraProject" 
                    placeholder="SEC" 
                    className="bg-[#0a0c10] border-white/10 text-sm h-10 font-mono uppercase"
                    value={jiraProject}
                    onChange={(e) => setJiraProject(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="pt-2">
                  <Button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold h-10 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                    {saving ? 'Connecting...' : 'Connect Jira'}
                  </Button>
                  <a href="https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-zinc-500 hover:text-blue-400 transition-colors">
                    How to get a Jira API token <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
