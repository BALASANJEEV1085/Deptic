"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { 
  User as UserIcon, 
  Mail, 
  Bell, 
  Moon, 
  Sun, 
  Laptop, 
  CreditCard, 
  Trash2, 
  Shield, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Zap,
  Key,
  ShieldCheck,
  Smartphone,
  Globe,
  Plus,
  Copy,
  ExternalLink,
  Lock,
  ChevronRight,
  ChevronDown,
  LifeBuoy,
  FileText
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useTheme } from 'next-themes'

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [securityAlerts, setSecurityAlerts] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()
  }, [supabase])

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security & Auth', icon: ShieldCheck },
    { id: 'api', label: 'API Access', icon: Key },
    { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
  ]

  const plans = [
    {
      name: 'Free',
      price: '$0',
      description: 'Individual researchers and hobbyists.',
      features: ['3 active projects', 'Standard SBOM scan', 'Weekly reports'],
      current: true
    },
    {
      name: 'Enterprise',
      price: '$149',
      description: 'Full compliance for security teams.',
      features: ['Unlimited projects', 'Real-time CVE monitoring', 'NTIA Compliance Export', 'API Access'],
      current: false,
      recommended: true
    }
  ]

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-border border-t-[#22c55e] animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-24">
      {/* Page Header - Standard Sizing */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">System Configuration</h1>
          <p className="text-xs text-zinc-500">Manage your global preferences, authentication, and enterprise licensing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" className="border-border bg-white/5 text-zinc-400 hover:text-foreground h-8 text-xs font-bold px-3">
             <LifeBuoy className="mr-2 h-3 w-3" /> Support
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs font-bold px-4">
             Save Changes
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar - Standard Sizing */}
        <aside className="w-full lg:w-64 shrink-0">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-bold transition-all relative group min-w-max lg:min-w-0",
                    activeTab === tab.id 
                      ? "bg-muted/50 text-foreground" 
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-muted/30"
                  )}
                >
                  {activeTab === tab.id && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-[#22c55e] rounded-full shadow-[0_0_10px_rgba(34,197,94,0.8)] hidden lg:block" />
                  )}
                  <Icon className={cn(
                    "h-4 w-4 transition-colors",
                    activeTab === tab.id ? "text-[#22c55e]" : "text-zinc-600 group-hover:text-zinc-400"
                  )} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="hidden lg:block mt-8 p-4 rounded-xl bg-[#22c55e]/5 border border-[#22c55e]/10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-3.5 w-3.5 text-[#22c55e]" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-foreground">Upgrade</span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed mb-3">
              Unlock enterprise-grade security scanning and compliance.
            </p>
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-8 text-[11px] font-bold">
              View Plans
            </Button>
          </div>
        </aside>

        {/* Content Area - Standard Sizing */}
        <div className="flex-1 min-w-0">
          <div className="space-y-12">
            
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <section className="space-y-4">
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-1">Personal Profile</h3>
                  
                  <Card className="glass-card border-border overflow-hidden bg-muted/20">
                     <CardContent className="p-0">
                        <div className="p-6 border-b border-border bg-muted/30 flex flex-col md:flex-row items-center gap-6">
                           <div className="relative group">
                              <Avatar className="h-16 w-16 border border-border ring-2 ring-black">
                                 <AvatarImage src={user?.user_metadata?.avatar_url} />
                                 <AvatarFallback className="bg-gradient-to-br from-[#22c55e]/20 to-[#22c55e]/5 text-[#22c55e] text-xl font-black">
                                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                                 </AvatarFallback>
                              </Avatar>
                              <button className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                                 <Plus className="h-4 w-4 text-foreground" />
                              </button>
                           </div>
                           <div className="flex-1 text-center md:text-left space-y-1">
                              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                 <h4 className="text-lg font-bold text-foreground tracking-tight">
                                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Security User'}
                                 </h4>
                                 <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20 font-bold px-2 py-0.5 text-[10px]">Admin</Badge>
                              </div>
                              <p className="text-zinc-500 font-medium flex items-center justify-center md:justify-start gap-1.5 text-xs">
                                 <Mail className="h-3.5 w-3.5" />
                                 {user?.email}
                              </p>
                           </div>
                           <Button variant="outline" className="w-full md:w-auto border-border text-foreground font-bold px-4 h-8 text-xs hover:bg-white/5">
                              Update Photo
                           </Button>
                        </div>
                        
                        <div className="p-6 grid md:grid-cols-2 gap-6">
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Full Display Name</label>
                              <Input 
                                 defaultValue={user?.user_metadata?.full_name || ''} 
                                 className="bg-muted/40 border-border focus:border-[#22c55e]/40 h-9 text-xs font-medium transition-all"
                                 placeholder="John Doe"
                              />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Email Reference</label>
                              <Input 
                                 defaultValue={user?.email || ''} 
                                 disabled
                                 className="bg-black/20 border-border text-zinc-600 h-9 cursor-not-allowed text-xs"
                              />
                           </div>
                           <div className="md:col-span-2 space-y-1.5">
                              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Professional Summary</label>
                              <textarea 
                                 rows={3}
                                 className="w-full bg-muted/40 border border-border rounded-lg p-3 text-xs font-medium text-foreground focus:border-[#22c55e]/40 focus:outline-none transition-all resize-none"
                                 placeholder="Lead security researcher..."
                              />
                           </div>
                        </div>
                     </CardContent>
                  </Card>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-1">Localization</h3>
                  <Card className="glass-card border-border bg-muted/20 p-6">
                     <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Timezone</label>
                          <div className="relative group">
                            <select className="w-full bg-muted/40 border border-border rounded-lg h-9 px-3 text-xs font-bold text-foreground appearance-none focus:border-[#22c55e]/40 outline-none cursor-pointer transition-all pr-10">
                               <option className="bg-card">UTC (Coordinated Universal Time)</option>
                               <option className="bg-card">EST (Eastern Standard Time)</option>
                               <option className="bg-card">PST (Pacific Standard Time)</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 group-focus-within:text-[#22c55e] pointer-events-none transition-colors" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Language</label>
                          <div className="relative group">
                            <select className="w-full bg-muted/40 border border-border rounded-lg h-9 px-3 text-xs font-bold text-foreground appearance-none focus:border-[#22c55e]/40 outline-none cursor-pointer transition-all pr-10">
                               <option className="bg-card">English (US)</option>
                               <option className="bg-card">German (DE)</option>
                               <option className="bg-card">Japanese (JP)</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 group-focus-within:text-[#22c55e] pointer-events-none transition-colors" />
                          </div>
                        </div>
                     </div>
                  </Card>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-1">Appearance</h3>
                  <Card className="glass-card border-border bg-muted/20 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <button
                        onClick={() => setTheme('light')}
                        className={cn(
                          "flex items-center justify-center gap-2.5 p-3 rounded-lg border transition-all",
                          theme === 'light' 
                            ? "border-[#22c55e] bg-[#22c55e]/5 text-[#22c55e]" 
                            : "border-border bg-muted/30 text-zinc-400 hover:border-border hover:text-foreground"
                        )}
                      >
                        <Sun className="h-4 w-4" />
                        <span className="font-bold text-[13px]">Light</span>
                      </button>
                      <button
                        onClick={() => setTheme('dark')}
                        className={cn(
                          "flex items-center justify-center gap-2.5 p-3 rounded-lg border transition-all",
                          theme === 'dark' 
                            ? "border-[#22c55e] bg-[#22c55e]/5 text-[#22c55e]" 
                            : "border-border bg-muted/30 text-zinc-400 hover:border-border hover:text-foreground"
                        )}
                      >
                        <Moon className="h-4 w-4" />
                        <span className="font-bold text-[13px]">Dark</span>
                      </button>
                      <button
                        onClick={() => setTheme('system')}
                        className={cn(
                          "flex items-center justify-center gap-2.5 p-3 rounded-lg border transition-all",
                          theme === 'system' 
                            ? "border-[#22c55e] bg-[#22c55e]/5 text-[#22c55e]" 
                            : "border-border bg-muted/30 text-zinc-400 hover:border-border hover:text-foreground"
                        )}
                      >
                        <Laptop className="h-4 w-4" />
                        <span className="font-bold text-[13px]">System</span>
                      </button>
                    </div>
                  </Card>
                </section>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                 <section className="space-y-4">
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-1">Alert Channels</h3>
                  <Card className="glass-card border-border bg-muted/20 overflow-hidden">
                     <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                           <div className="space-y-0.5">
                              <p className="text-sm font-bold text-foreground">Email Digest</p>
                              <p className="text-[11px] text-zinc-500">Daily summary of all repository scans and findings.</p>
                           </div>
                           <button 
                              onClick={() => setEmailNotifications(!emailNotifications)}
                              className={cn(
                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none",
                                emailNotifications ? "bg-[#22c55e]" : "bg-white/10"
                              )}
                            >
                              <span className={cn(
                                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xl transition duration-300 ease-in-out",
                                emailNotifications ? "translate-x-4" : "translate-x-0"
                              )} />
                           </button>
                        </div>
                        <div className="h-px bg-muted/50" />
                        <div className="flex items-center justify-between">
                           <div className="space-y-0.5">
                              <p className="text-sm font-bold text-foreground">Security Alerts</p>
                              <p className="text-[11px] text-zinc-500">Instant notification for new high/critical CVEs discovered.</p>
                           </div>
                           <button 
                              onClick={() => setSecurityAlerts(!securityAlerts)}
                              className={cn(
                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none",
                                securityAlerts ? "bg-[#22c55e]" : "bg-white/10"
                              )}
                            >
                              <span className={cn(
                                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xl transition duration-300 ease-in-out",
                                securityAlerts ? "translate-x-4" : "translate-x-0"
                              )} />
                           </button>
                        </div>
                     </div>
                  </Card>
                 </section>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                 <section className="space-y-4">
                    <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-1">Authentication</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                       <Card className="glass-card border-border bg-muted/20 p-6 hover:border-white/[0.08] transition-all group">
                          <div className="flex items-start gap-3.5">
                             <div className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                <Smartphone className="h-4.5 w-4.5 text-foreground" />
                             </div>
                             <div className="space-y-0.5">
                                <p className="text-[13px] font-bold text-foreground">2FA Protection</p>
                                <p className="text-[11px] text-zinc-500 leading-relaxed">Additional verification layer via TOTP.</p>
                                <Button variant="outline" className="border-border text-[10px] h-7 px-3 mt-2 font-bold text-zinc-400">Enable</Button>
                             </div>
                          </div>
                       </Card>
                       <Card className="glass-card border-border bg-muted/20 p-6 hover:border-white/[0.08] transition-all group">
                          <div className="flex items-start gap-3.5">
                             <div className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                <Globe className="h-4.5 w-4.5 text-foreground" />
                             </div>
                             <div className="space-y-0.5">
                                <p className="text-[13px] font-bold text-foreground">Active Session</p>
                                <p className="text-[11px] text-zinc-500 leading-relaxed">Logged in from New York, USA</p>
                                <Button variant="ghost" className="text-[10px] h-7 px-3 mt-2 font-bold text-[#22c55e] hover:bg-[#22c55e]/5">Revoke All</Button>
                             </div>
                          </div>
                       </Card>
                    </div>
                 </section>

                 <section className="space-y-4">
                    <h3 className="text-[11px] font-bold text-red-400 uppercase tracking-widest px-1">Governance</h3>
                    <Card className="border-red-500/20 bg-red-500/[0.02] p-6">
                       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-0.5">
                             <p className="text-[13px] font-bold text-foreground">Delete Account</p>
                             <p className="text-[11px] text-zinc-500 max-w-lg leading-relaxed">
                                Permanently purge all SBOM history, scan results, and compliance metadata.
                             </p>
                          </div>
                          <Button className="w-full md:w-auto bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-foreground transition-all font-bold px-6 h-8 text-[11px]">
                             Terminate
                          </Button>
                       </div>
                    </Card>
                 </section>
              </div>
            )}

            {activeTab === 'api' && (
               <div className="space-y-6">
                  <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                       <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">API Access</h3>
                       <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold h-7 px-3 text-[10px]">
                          <Plus className="mr-1.5 h-3 w-3" /> New Token
                       </Button>
                    </div>
                    <Card className="glass-card border-border bg-muted/20 overflow-hidden">
                       <div className="overflow-x-auto">
                          <table className="w-full text-left text-[13px]">
                             <thead className="bg-muted/30 border-b border-border">
                                <tr>
                                   <th className="px-6 py-3 font-bold text-zinc-500 text-[9px] uppercase tracking-widest">Identity</th>
                                   <th className="px-6 py-3 text-right"></th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-white/[0.04]">
                                <tr>
                                   <td className="px-6 py-4">
                                      <div className="flex items-center gap-3 text-[13px] font-bold text-foreground">
                                         <div className="h-7 w-7 rounded-lg bg-[#22c55e]/10 flex items-center justify-center">
                                            <Lock className="h-3.5 w-3.5 text-[#22c55e]" />
                                         </div>
                                         <div>
                                            <p>CI/CD Production</p>
                                            <p className="text-[9px] text-zinc-500 font-mono">sb_live_****_a2b3</p>
                                         </div>
                                      </div>
                                   </td>
                                   <td className="px-6 py-4 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                         <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-foreground"><Copy className="h-3.5 w-3.5" /></Button>
                                         <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500/50 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></Button>
                                      </div>
                                   </td>
                                </tr>
                             </tbody>
                          </table>
                       </div>
                    </Card>
                  </section>
               </div>
            )}

            {activeTab === 'billing' && (
               <div className="space-y-6">
                  <section className="space-y-4">
                    <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-1">Subscription</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                       {plans.map((plan) => (
                        <Card 
                           key={plan.name} 
                           className={cn(
                              "relative overflow-hidden transition-all",
                              plan.recommended 
                                 ? "bg-gradient-to-br from-[#22c55e]/10 via-card to-card border-[#22c55e]/20" 
                                 : "bg-muted/20 border-border"
                           )}
                        >
                           <CardHeader className="p-6 pb-0">
                              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">{plan.name}</p>
                              <div className="flex items-baseline gap-1">
                                 <h4 className="text-2xl font-bold text-foreground">{plan.price}</h4>
                                 <span className="text-zinc-500 font-bold text-[10px] uppercase">/mo</span>
                              </div>
                              <p className="text-zinc-500 text-[11px] mt-2 font-medium leading-relaxed">{plan.description}</p>
                           </CardHeader>
                           <CardContent className="p-6 space-y-4">
                              <div className="space-y-2.5">
                                 {plan.features.map(f => (
                                    <div key={f} className="flex items-start gap-2.5">
                                       <CheckCircle2 className="h-3.5 w-3.5 text-[#22c55e] mt-0.5 shrink-0" />
                                       <span className="text-[11px] text-zinc-400 font-bold">{f}</span>
                                    </div>
                                 ))}
                              </div>
                              <Button 
                                 className={cn(
                                    "w-full h-8.5 font-bold transition-all text-[11px]",
                                    plan.current 
                                       ? "bg-white/5 border border-white/10 text-zinc-600" 
                                       : "bg-primary text-primary-foreground hover:bg-primary/90"
                                 )}
                                 disabled={plan.current}
                                >
                                   {plan.current ? 'Current Plan' : 'Upgrade Workspace'}
                                </Button>
                             </CardContent>
                          </Card>
                       ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest px-1">Billing History</h3>
                    <Card className="glass-card border-white/[0.04] bg-white/[0.01] p-10">
                       <div className="flex flex-col items-center justify-center text-center space-y-3">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <p className="text-xs text-zinc-500">No recent transactions found.</p>
                       </div>
                    </Card>
                  </section>
               </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
