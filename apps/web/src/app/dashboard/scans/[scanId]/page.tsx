"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { getScan, GetScanResponse, getScanVulnerabilities, ScanVulnerabilitiesResponse, generateDEPTIC, createShareLink, getCompliance, ComplianceResponse, downloadPDFReport, shortId, createFixPR, getFixPRs, FixPR, getFixPRStatus, FixPRStatus, addBadgeToReadme } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search, Download, Package, Layers, ShieldCheck, ShieldAlert, Share2, Copy, CheckCircle2, ChevronDown, ExternalLink, Globe, AlertTriangle, ArrowLeft, FileText, Check, X, FileBarChart2, Zap, GitBranch, Shield, GitPullRequest } from "lucide-react";
import Link from "next/link";
import { CustomLoader } from "@/components/custom-loader";
import { cn, getComplianceStatus } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function EcoDot({ eco }: { eco: string }) {
  switch (eco.toLowerCase()) {
    case 'npm': return <div className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />;
    case 'pip': return <div className="h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]" />;
    case 'maven': return <div className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />;
    case 'go': return <div className="h-2 w-2 rounded-full bg-[#00add8] shadow-[0_0_8px_rgba(0,173,216,0.5)]" />;
    default: return <div className="h-2 w-2 rounded-full bg-zinc-600" />;
  }
}

function LicenseBadge({ license }: { license: string }) {
  const l = license.toUpperCase();
  if (l.includes('MIT')) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">MIT</span>;
  if (l.includes('APACHE')) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">Apache</span>;
  if (l.includes('GPL')) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">GPL</span>;
  if (l.includes('ISC')) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-500/10 text-muted-foreground border border-zinc-500/20">ISC</span>;
  if (l === 'UNKNOWN') return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-600 border border-zinc-700/50">Unknown</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-500/5 text-zinc-500 border border-zinc-500/10">{license}</span>;
}

export default function ScanResultsPage() {
  const params = useParams();
  const scanId = params.scanId as string;

  const [data, setData] = useState<GetScanResponse | null>(null);
  const [vulnData, setVulnData] = useState<ScanVulnerabilitiesResponse | null>(null);
  const [complianceData, setComplianceData] = useState<ComplianceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'vulnerabilities' | 'compliance' | 'bom'>('vulnerabilities');
  const [activeEcosystem, setActiveEcosystem] = useState<string>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [expandedElements, setExpandedElements] = useState<Record<string, boolean>>({});

  const [fixModalOpen, setFixModalOpen] = useState(false);
  const [fixLoading, setFixLoading] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);
  const [fixStatus, setFixStatus] = useState<FixPRStatus | null>(null);
  const [createdPRs, setCreatedPRs] = useState<FixPR[]>([]);
  
  // Badge state
  const [badgeLoading, setBadgeLoading] = useState(false);
  const [badgeStatus, setBadgeStatus] = useState<{ status: string; message: string; pr_url?: string } | null>(null);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLabel, setShareLabel] = useState("");
  const [shareExpires, setShareExpires] = useState(30);
  const [shareLink, setShareLink] = useState("");
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  
  const [lastDepticId, setLastDepticId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const parseRepoName = (url: string) => {
    try {
      const parts = url.replace(/\/$/, '').split('/');
      if (parts.length >= 2) {
        return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
      }
      return url;
    } catch {
      return url;
    }
  };

  const copyIdToClipboard = () => {
    navigator.clipboard.writeText(scanId);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 2000);
  };

  const handleExport = async (format: "cyclonedx" | "spdx" | "pdf") => {
    try {
      setGenerating(true);
      if (format === "pdf") {
        await downloadPDFReport(scanId);
        showToast("PDF report downloaded successfully");
      } else {
        const res = await generateDEPTIC(scanId, format);
        setLastDepticId(res.deptic_id);
        const url = URL.createObjectURL(res.blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", res.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast("Artifact generated successfully");
      }
    } catch (err: any) {
      alert("Export failed: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateShare = async () => {
    if (!lastDepticId) {
      alert("Please export an DEPTIC first to create a secure share link.");
      return;
    }
    try {
      setSharing(true);
      const res = await createShareLink(lastDepticId, shareLabel, shareExpires);
      setShareLink(res.share_url);
    } catch (err: any) {
      alert("Share failed: " + err.message);
    } finally {
      setSharing(false);
    }
  };

  const toggleElement = (name: string) => {
    setExpandedElements(prev => ({ ...prev, [name]: !prev[name] }));
  };

  useEffect(() => {
    if (activeTab === 'vulnerabilities' && scanId) {
      getFixPRs(scanId as string).then(res => setCreatedPRs(res.prs || [])).catch(console.error);
    }
  }, [activeTab, scanId]);

  useEffect(() => {
    if (!scanId) return;
    
    Promise.all([
      getScan(scanId),
      getScanVulnerabilities(scanId, true).catch(err => {
        console.error("Failed to load vulns", err);
        return { summary: { critical: 0, high: 0, medium: 0, low: 0 }, grouped: [] };
      }),
      getCompliance(scanId).catch(err => {
        console.error("Failed to load compliance", err);
        return null;
      })
    ])
      .then(([scanRes, vulnRes, compRes]) => {
        setData(scanRes);
        setVulnData(vulnRes);
        setComplianceData(compRes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [scanId]);

  const filteredComponents = useMemo(() => {
    if (!data?.components) return [];
    let filtered = data.components;
    
    if (activeEcosystem !== 'All') {
      filtered = filtered.filter(c => c.ecosystem === activeEcosystem);
    }
    
    if (!searchQuery) return filtered;
    const lowerQuery = searchQuery.toLowerCase();
    return filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.license.toLowerCase().includes(lowerQuery) ||
        c.version.toLowerCase().includes(lowerQuery) ||
        c.ecosystem.toLowerCase().includes(lowerQuery)
    );
  }, [data?.components, searchQuery, activeEcosystem]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <CustomLoader size={40} className="text-[#ffffff]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-2xl mx-auto mt-20">
        <div className="bg-red-500/5 border border-red-500/10 text-red-400 p-10 rounded-2xl text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-6 opacity-30" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Audit Retrieval Failure</h2>
          <p className="text-sm opacity-60 mb-8">{error || "The requested security audit could not be found."}</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="border-border text-foreground hover:bg-muted rounded-xl">
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  const directDepsCount = data.components.filter(c => c.depth === 0).length;
  const transitiveDepsCount = data.total - directDepsCount;
  const uniqueLicensesCount = new Set(data.components.map(c => c.license)).size;

  return (
    <div className="max-w-6xl mx-auto py-4 md:py-6 px-4 md:px-6 space-y-6 md:space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border pb-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 mb-0.5">
             <Link href="/dashboard/scans" className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center border border-border hover:bg-muted transition-all">
                <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
             </Link>
             <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{parseRepoName(data.scan.repo_url ?? '')}</h1>
          </div>
          <p className="text-[11px] text-zinc-500 font-medium pl-10">Supply Chain Audit</p>
          <div className="flex items-center gap-3 text-[10px] font-mono pl-10 mt-3">
            <span className="text-zinc-500">Audit ID:</span>
            <div className="flex items-center gap-1.5 group/id">
              <span className="text-muted-foreground font-bold">{shortId(scanId)}</span>
              <button onClick={copyIdToClipboard} className="text-zinc-600 hover:text-foreground transition-colors">
                {idCopied ? <CheckCircle2 className="h-2.5 w-2.5 text-[#ffffff]" /> : <Copy className="h-2.5 w-2.5" />}
              </button>
            </div>
            <Badge className="bg-[#ffffff]/10 text-[#ffffff] hover:bg-[#ffffff]/10 border border-[#ffffff]/20 rounded-md px-1.5 py-0 text-[8px] uppercase font-bold tracking-widest">
              Authenticated
            </Badge>
            {data.scan.trigger_type === 'webhook' && (
              <Badge className="bg-purple-500/10 text-purple-400 hover:bg-purple-500/10 border border-purple-500/20 rounded-md px-1.5 py-0 text-[8px] uppercase font-bold tracking-widest">
                Auto-Scan (Push)
              </Badge>
            )}
            {data.scan.commit_sha && (
              <span className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                <GitBranch className="h-3 w-3" /> {data.scan.branch} • {data.scan.commit_sha.substring(0, 7)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger disabled={generating} className="bg-[#ffffff] text-black hover:bg-[#e2e8f0] h-9 px-4 rounded-lg text-xs font-bold active:scale-95 transition-all flex items-center gap-2">
              {generating ? <CustomLoader size={14} /> : <Download className="h-3.5 w-3.5" />}
              Export Report
              <ChevronDown className="ml-0.5 h-3 w-3 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border text-foreground shadow-2xl p-1 w-52">
              <DropdownMenuItem onClick={() => handleExport("cyclonedx")} className="cursor-pointer focus:bg-muted py-2 px-2.5 rounded-md transition-colors text-[11px] font-semibold">
                <FileText className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                Download CycloneDX JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("spdx")} className="cursor-pointer focus:bg-muted py-2 px-2.5 rounded-md transition-colors text-[11px] font-semibold">
                <FileText className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                Download SPDX
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")} className="cursor-pointer focus:bg-muted py-2 px-2.5 rounded-md transition-colors text-[11px] font-semibold">
                <FileBarChart2 className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                Download PDF Report
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline"
            className="border-border text-foreground hover:bg-muted h-9 px-4 rounded-lg text-xs font-bold transition-all"
            onClick={() => setShowShareModal(true)}
          >
            <Share2 className="h-3.5 w-3.5 mr-2" />
            Secure Share
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {[
          { label: 'Inventory Size', value: data.total, icon: Package, text: 'text-foreground' },
          { label: 'Direct Library', value: directDepsCount, icon: Layers, text: 'text-foreground' },
          { label: 'Transitive', value: transitiveDepsCount, icon: Layers, text: 'text-foreground' },
          { label: 'License Spread', value: uniqueLicensesCount, icon: ShieldCheck, text: 'text-foreground' },
          { label: 'Active Threats', value: vulnData ? (vulnData.summary.critical + vulnData.summary.high + vulnData.summary.medium + vulnData.summary.low) : 0, icon: ShieldAlert, text: vulnData?.summary.critical || vulnData?.summary.high ? 'text-red-500' : 'text-foreground' },
        ].map((stat, i) => (
          <div key={i} className={cn("group relative rounded-xl border border-border bg-muted/20 p-4 transition-all hover:bg-muted/40")}>
            <div className="flex items-center gap-2 mb-3">
              <stat.icon className="h-3 w-3 text-zinc-500" />
              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-[0.15em]">{stat.label}</span>
            </div>
            <div className={cn("text-xl font-extrabold tracking-tight", stat.text)}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ECOSYSTEM TABS */}
      {data.ecosystems && data.ecosystems.length > 1 && (
        <div className="flex items-center gap-2.5 bg-muted/20 border border-border p-1 rounded-lg w-fit">
          {['All', ...data.ecosystems].map((eco) => (
            <button
              key={eco}
              onClick={() => setActiveEcosystem(eco)}
              className={cn(
                "px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                activeEcosystem === eco
                  ? "bg-muted text-foreground shadow-sm"
                  : "text-zinc-500 hover:text-foreground"
              )}
            >
              {eco !== 'All' && <EcoDot eco={eco} />}
              {eco}
              <span className="opacity-40 ml-1">
                ({eco === 'All' ? data.total : data.ecosystem_breakdown[eco]?.count || 0})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* TAB SWITCHER */}
      <div className="flex items-center gap-1.5 p-0.5 border-b border-border w-full overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('vulnerabilities')}
          className={cn(
            "px-5 py-2.5 rounded-t-lg text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 relative",
            activeTab === 'vulnerabilities' 
              ? "bg-muted text-foreground" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ShieldAlert className="h-3 w-3" />
          Vulnerabilities
        </button>
        <button
          onClick={() => setActiveTab('compliance')}
          className={cn(
            "px-5 py-2.5 rounded-t-lg text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 relative",
            activeTab === 'compliance' 
              ? "bg-muted text-foreground" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FileBarChart2 className="h-3 w-3" />
          Compliance
        </button>
        <button
          onClick={() => setActiveTab('bom')}
          className={cn(
            "px-5 py-2.5 rounded-t-lg text-[11px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 relative",
            activeTab === 'bom' 
              ? "bg-muted text-foreground" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="h-3 w-3" />
          Bill of Materials
        </button>
      </div>

      {activeTab === 'vulnerabilities' && vulnData && (
        <div className="space-y-4">
          {(() => {
            const fixableVulns = vulnData.grouped?.filter(v => v.clean_version) || [];
            const hasFixableVulns = fixableVulns.length > 0 && (data?.is_owner === true || data?.has_github_push_access === true);

            const fixedPackageNames = new Set<string>();
            createdPRs.forEach(pr => {
              if (pr.package_names) {
                pr.package_names.forEach(name => fixedPackageNames.add(name));
              }
            });

            const handleOpenFixModal = () => {
              setFixError(null);
              setFixStatus(null);
              setFixModalOpen(true);
            };

            const handleCreatePR = async () => {
              setFixLoading(true);
              setFixError(null);
              try {
                // Kick off the background job
                await createFixPR(scanId as string, {
                  vulnerabilities: fixableVulns.map(v => ({
                    package_name: v.component_name,
                    current_version: v.component_version,
                    fixed_version: v.clean_version,
                    cve_id: v.cves?.[0] || '',
                    ecosystem: v.ecosystem
                  }))
                });
                
                // Start polling
                const pollInterval = setInterval(async () => {
                  try {
                    const status = await getFixPRStatus(scanId as string);
                    setFixStatus(status);
                    
                    if (status.completed || status.error) {
                      clearInterval(pollInterval);
                      setFixLoading(false);
                      if (status.error) setFixError(status.error);
                      if (status.completed && status.pr_url) {
                        getFixPRs(scanId as string).then(res => setCreatedPRs(res.prs || [])).catch(console.error);
                      }
                    }
                  } catch (pollErr) {
                    clearInterval(pollInterval);
                    setFixLoading(false);
                    setFixError("Failed to check status. The PR might still be processing.");
                  }
                }, 2000);
              } catch (e: any) {
                setFixError(e.message);
                setFixLoading(false);
              }
            };

            return (
              <>
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-4">
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                Security Findings
              </h2>
              {hasFixableVulns && (
                <Button 
                  onClick={handleOpenFixModal}
                  className="bg-[#ffffff] hover:bg-[#ffffff]/90 text-black font-bold h-9 text-xs"
                >
                  <Zap className="h-3.5 w-3.5 mr-1.5 fill-black" /> Fix All with PR
                </Button>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap justify-end">
              <div className="px-2.5 py-1 bg-red-500/5 rounded-full flex items-center gap-1.5 border border-red-500/10">
                <div className="h-1 w-1 rounded-full bg-red-500" />
                <span className="text-[8px] font-bold text-red-400 uppercase tracking-widest">{vulnData.summary.critical} Critical</span>
              </div>
              <div className="px-2.5 py-1 bg-orange-500/5 rounded-full flex items-center gap-1.5 border border-orange-500/10">
                <div className="h-1 w-1 rounded-full bg-orange-500" />
                <span className="text-[8px] font-bold text-orange-400 uppercase tracking-widest">{vulnData.summary.high} High</span>
              </div>
              <div className="px-2.5 py-1 bg-yellow-500/5 rounded-full flex items-center gap-1.5 border border-yellow-500/10">
                <div className="h-1 w-1 rounded-full bg-yellow-500" />
                <span className="text-[8px] font-bold text-yellow-400 uppercase tracking-widest">{vulnData.summary.medium} Medium</span>
              </div>
              <div className="px-2.5 py-1 bg-zinc-500/5 rounded-full flex items-center gap-1.5 border border-zinc-500/10">
                <div className="h-1 w-1 rounded-full bg-zinc-500" />
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{vulnData.summary.low} Low</span>
              </div>
            </div>
          </div>

          {(vulnData.summary.critical + vulnData.summary.high + vulnData.summary.medium + vulnData.summary.low) === 0 ? (
            <div className="bg-[var(--green)]/5 border border-[var(--green)]/20 p-6 rounded-xl flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-[var(--green)]/10 flex items-center justify-center border border-[var(--green)]/20">
                <ShieldCheck className="h-5 w-5 text-[var(--green)]" />
              </div>
              <div>
                <p className="font-bold text-foreground text-[13px] mb-0.5">Authenticated Environment Clean</p>
                <p className="text-[11px] text-muted-foreground">No vulnerabilities detected matching the specified inventory baseline.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-background overflow-x-auto shadow-2xl">
              <Table>
                <TableHeader className="bg-muted/20">
                  <TableRow className="border-border">
                    <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-4 font-bold py-3">Component</TableHead>
                    <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-4 font-bold py-3">Version</TableHead>
                    <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-4 font-bold py-3">Reference</TableHead>
                    <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-4 font-bold text-center py-3">Severity</TableHead>
                    <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-4 font-bold py-3">Mitigation</TableHead>
                    <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-4 text-center font-bold py-3">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vulnData.grouped?.map((v, i) => (
                    <GroupedVulnRow key={i} v={v} fixedPackageNames={fixedPackageNames} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {createdPRs.length > 0 && (
            <div className="mt-8 space-y-4">
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-1">Fix PRs Created</h2>
              <div className="rounded-xl border border-border bg-background overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/20">
                    <TableRow className="border-border">
                      <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-4 font-bold py-3">PR</TableHead>
                      <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-4 font-bold py-3">Title</TableHead>
                      <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-4 font-bold py-3">Status</TableHead>
                      <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-4 font-bold py-3">Created</TableHead>
                      <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-4 font-bold text-right py-3"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {createdPRs.map(pr => (
                      <TableRow key={pr.id} className="border-border">
                        <TableCell className="px-4 py-3 font-mono text-[10px] text-muted-foreground">#{pr.pr_number}</TableCell>
                        <TableCell className="px-4 py-3 text-xs font-bold text-foreground">{pr.pr_title}</TableCell>
                        <TableCell className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{pr.status}</span>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-[10px] text-zinc-500">{new Date(pr.created_at).toLocaleString()}</TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          <a href={pr.pr_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-400 hover:text-blue-300">
                            View on GitHub →
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <Dialog open={fixModalOpen} onOpenChange={setFixModalOpen}>
            <DialogContent className="bg-card border-border text-foreground sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle className="text-zinc-100">Fix All Vulnerabilities</DialogTitle>
                <DialogDescription className="text-zinc-500 text-xs mt-1">
                  DEPTIC.io will analyze all dependencies, resolve them to clean versions, and open a GitHub Pull Request.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                {fixStatus?.completed && fixStatus?.pr_url ? (
                  <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col items-center justify-center gap-3 text-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-1" />
                    <div>
                      <p className="text-base font-bold text-emerald-400 mb-1">Pull Request created successfully</p>
                      <a href={fixStatus.pr_url} target="_blank" rel="noreferrer" className="text-sm font-bold text-blue-400 hover:text-blue-300 underline underline-offset-2">
                        View PR #{fixStatus.pr_number} on GitHub →
                      </a>
                    </div>
                  </div>
                ) : fixLoading || fixStatus ? (
                  <div className="space-y-6">
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="relative mb-4">
                        <CustomLoader size={40} className="text-[#ffffff] opacity-20" />
                        <CustomLoader size={40} className="text-[#ffffff] absolute inset-0 animation-delay-150" />
                      </div>
                      <p className="text-sm font-bold text-foreground">{fixStatus?.message || "Starting fix job..."}</p>
                      <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-2 font-bold">{fixStatus?.stage || "initializing"}</p>
                    </div>
                    
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-[#ffffff] h-1.5 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${fixStatus?.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500/80 p-4 rounded-xl flex gap-3 items-start">
                    <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
                    <p className="text-xs leading-relaxed">
                      <strong>Are you sure?</strong> This action will create a branch and open a PR in your GitHub repository. It will automatically patch all vulnerable packages to their safest available versions.
                    </p>
                  </div>
                )}

                {fixError && (
                  <div className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex gap-2">
                    <X className="h-4 w-4 shrink-0" />
                    {fixError}
                  </div>
                )}
              </div>

              {(!fixStatus?.completed && !fixLoading) && (
                <DialogFooter className="mt-2">
                  <Button variant="ghost" onClick={() => setFixModalOpen(false)} className="text-xs font-bold">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreatePR} 
                    className="bg-[#ffffff] hover:bg-[#ffffff]/90 text-black font-bold text-xs px-6"
                  >
                    Start Fix Job
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
          </>
          );
          })()}
        </div>
      )}

      {activeTab === 'compliance' && (
        <div className="space-y-4">
          {!complianceData ? (
             <div className="flex h-32 items-center justify-center border border-border rounded-xl bg-card">
               <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Compliance data unavailable</span>
             </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Score Card & Elements Checklist */}
                <div className="bg-card border border-border rounded-xl p-6 flex-1 flex flex-col shadow-xl">
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-6 pb-6 border-b border-border text-center sm:text-left">
                    <div className="relative shrink-0">
                       <svg className="w-20 h-20 transform -rotate-90">
                         <circle cx="40" cy="40" r="36" className="stroke-white/[0.05]" strokeWidth="6" fill="none" />
                         <circle cx="40" cy="40" r="36" 
                           className={cn(
                             "transition-all duration-1000 ease-out",
                             complianceData.ntia.score >= 95 ? "stroke-[var(--green)]" :
                             complianceData.ntia.score >= 75 ? "stroke-amber-500" : "stroke-red-500"
                           )}
                           strokeWidth="6" fill="none"
                           strokeDasharray="226.19"
                           strokeDashoffset={226.19 - (226.19 * complianceData.ntia.score) / 100}
                           strokeLinecap="round"
                         />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-xl font-extrabold text-foreground">{complianceData.ntia.score}</span>
                          <span className="text-[7px] text-zinc-500 font-bold uppercase tracking-widest">Score</span>
                       </div>
                    </div>
                    
                    <div className="flex-1 w-full sm:w-auto">
                      <h3 className="text-foreground font-bold text-sm mb-2">NTIA Minimum Elements</h3>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                        {(() => {
                          const status = getComplianceStatus(complianceData.ntia.score);
                          return (
                            <Badge variant="outline" className={cn(
                              "text-[9px] font-bold px-1.5 py-0 uppercase tracking-widest border",
                              status.color === 'green' ? "bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20" :
                              status.color === 'amber' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                              "bg-red-500/10 text-red-500 border-red-500/20"
                            )}>
                              {status.label}
                            </Badge>
                          );
                        })()}
                        <Badge variant="outline" className={cn(
                          "text-[9px] font-bold px-1.5 py-0 uppercase tracking-widest border",
                          complianceData.eu_cra_compliant ? "bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                        )}>
                          EU CRA {complianceData.eu_cra_compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {complianceData.ntia.elements.map((el, i) => (
                      <div key={i} className="flex flex-col gap-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
                          <div className={cn(
                            "flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest",
                            el.passed ? "text-[var(--green)]" : "text-red-500"
                          )}>
                            {el.passed ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                            <span className="truncate">{el.name}</span>
                          </div>
                          <span className={cn(
                            "text-[9px] sm:text-[10px] font-bold ml-5 sm:ml-0",
                            el.passed ? "text-[var(--green)]" : "text-red-500"
                          )}>
                            {el.coverage}% coverage
                          </span>
                        </div>
                        <div className="h-0.5 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-1000",
                              el.passed ? "bg-[var(--green)]" : "bg-red-500"
                            )}
                            style={{ width: `${el.coverage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                {complianceData.ntia.recommendations.length > 0 && (
                   <div className="bg-orange-500/5 border border-orange-500/10 rounded-xl p-6 flex-1 shadow-xl">
                      <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        <h3 className="text-foreground font-bold text-sm">Remediation Steps</h3>
                      </div>
                      <ul className="space-y-3">
                        {complianceData.ntia.recommendations.map((rec, i) => (
                           <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-2.5">
                             <div className="h-1 w-1 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                             <span>{rec}</span>
                           </li>
                        ))}
                      </ul>
                   </div>
                )}
              </div>

              {/* Get Badge Section */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-xl mt-6">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
                  <Shield className="h-5 w-5 text-indigo-500" />
                  <div>
                    <h3 className="text-foreground font-bold text-sm">Security Badge</h3>
                    <p className="text-xs text-muted-foreground">Embed a live compliance score in your repository README</p>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-1 space-y-4">
                    <div className="bg-[#000] p-4 rounded-lg border border-zinc-800 flex items-center justify-center h-24">
                      {data?.scan?.repo_name && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img 
                          src={`https://deptic-api.onrender.com/badge/github/${data.scan.repo_name}`} 
                          alt="Deptic badge" 
                          className="shadow-sm"
                        />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(`[![Deptic Security](https://deptic-api.onrender.com/badge/github/${data?.scan?.repo_name})](http://localhost:3000/dashboard)`);
                          showToast("Markdown copied to clipboard");
                        }}
                      >
                        <Copy className="h-3 w-3 mr-2" /> Copy Markdown
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs"
                        onClick={() => {
                          navigator.clipboard.writeText(`<a href="http://localhost:3000/dashboard"><img src="https://deptic-api.onrender.com/badge/github/${data?.scan?.repo_name}" alt="Deptic Security" /></a>`);
                          showToast("HTML copied to clipboard");
                        }}
                      >
                        <Copy className="h-3 w-3 mr-2" /> Copy HTML
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex-1 bg-muted/40 p-4 rounded-lg border border-border">
                    <h4 className="text-xs font-bold text-foreground mb-2">Automated Setup</h4>
                    <p className="text-[11px] text-muted-foreground mb-4">
                      We can automatically create a Pull Request to add this badge to your repository's README.md file.
                    </p>
                    
                    {badgeStatus ? (
                      <div className="space-y-3">
                        <div className={cn(
                          "p-3 rounded border text-xs flex items-start gap-2",
                          badgeStatus.status === 'already_exists' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                          badgeStatus.status === 'pr_created' ? "bg-green-500/10 border-green-500/20 text-green-400" :
                          "bg-red-500/10 border-red-500/20 text-red-400"
                        )}>
                          {badgeStatus.status === 'already_exists' ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : 
                           badgeStatus.status === 'pr_created' ? <Check className="h-4 w-4 shrink-0 mt-0.5" /> :
                           <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                          <div>
                            <div className="font-bold mb-1">
                              {badgeStatus.status === 'already_exists' ? 'Badge already in your README ✓' :
                               badgeStatus.status === 'pr_created' ? 'PR Created Successfully!' :
                               'Action Failed'}
                            </div>
                            <div>{badgeStatus.message}</div>
                            {badgeStatus.pr_url && (
                              <a href={badgeStatus.pr_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center mt-2 text-[#ffffff] hover:underline font-bold">
                                View PR on GitHub <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full text-xs"
                          onClick={() => setBadgeStatus(null)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        disabled={badgeLoading || (!data?.is_owner && !data?.has_github_push_access)}
                        onClick={async () => {
                          if (!data?.scan?.repo_name) return;
                          setBadgeLoading(true);
                          try {
                            const [owner, repo] = data.scan.repo_name.split('/');
                            const res = await addBadgeToReadme(owner, repo);
                            setBadgeStatus({
                              status: res.status,
                              message: res.status === 'pr_created' 
                                ? (res.readme_created ? "README.md was created and the badge was added." : "The badge was added to your existing README.md.")
                                : res.message || "",
                              pr_url: res.pr_url
                            });
                          } catch (err: any) {
                            setBadgeStatus({
                              status: 'error',
                              message: err.message
                            });
                          } finally {
                            setBadgeLoading(false);
                          }
                        }}
                        className="w-full bg-[#ffffff] hover:bg-[#ffffff]/90 text-black font-bold h-9 text-xs"
                      >
                        {badgeLoading ? (
                          <div className="h-4 w-4 border-2 border-black/20 border-t-black rounded-full animate-spin mr-2" />
                        ) : (
                          <GitPullRequest className="h-4 w-4 mr-2" />
                        )}
                        {badgeLoading ? "Creating PR..." : "Add to README via PR"}
                      </Button>
                    )}
                    
                    {!data?.is_owner && !data?.has_github_push_access && !badgeStatus && (
                      <p className="text-[10px] text-orange-400 mt-2 text-center">
                        You don't have push access to this repository.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'bom' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2 px-1">
              <Package className="h-3.5 w-3.5 text-zinc-600" />
              Bill of Materials
            </h2>
            <div className="relative w-[320px] group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-600 group-focus-within:text-[#ffffff] transition-colors" />
              <Input
                placeholder="Search library, license or version..."
                className="pl-9 bg-muted/40 border-border text-foreground h-9 rounded-lg focus:border-[#ffffff] focus:ring-0 text-xs transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* MANIFEST FILES LIST */}
          {data.manifest_files && data.manifest_files.length > 0 && (
            <div className="bg-muted/20 border border-border rounded-lg overflow-hidden">
              <button 
                onClick={() => toggleElement('manifests')}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Manifest Files Found ({data.manifest_files.length})</span>
                </div>
                <ChevronDown className={cn("h-3.5 w-3.5 text-zinc-600 transition-transform", expandedElements['manifests'] && "rotate-180")} />
              </button>
              {expandedElements['manifests'] && (
                <div className="p-3 pt-0 space-y-1.5 border-t border-border">
                  {data.manifest_files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1.5 px-2.5 bg-muted/40 rounded border border-border">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-3 w-3 text-zinc-600" />
                        <span className="text-[11px] text-foreground font-mono">{file.path}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-tighter bg-zinc-800 px-1.5 py-0.5 rounded">
                          {file.ecosystem}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-border bg-background overflow-x-auto shadow-2xl">
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow className="border-border">
                  <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-4 font-bold py-3">Component</TableHead>
                  <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-4 font-bold py-3">Release</TableHead>
                  <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-4 font-bold py-3">License</TableHead>
                  <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-4 font-bold py-3">Origin</TableHead>
                  <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-4 font-bold py-3">Manifest</TableHead>
                  <TableHead className="text-zinc-500 text-[9px] uppercase tracking-widest px-4 font-bold py-3 text-right">Depth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-white/[0.04]">
                {filteredComponents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-zinc-600 italic text-[11px]">
                      No components match your search.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredComponents.map((c) => (
                    <TableRow key={c.id} className="border-border hover:bg-muted/50 transition-colors">
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <EcoDot eco={c.ecosystem} />
                          <div>
                            <p className="font-bold text-foreground text-xs mb-0.5">{c.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <code className="text-[10px] text-muted-foreground bg-card border border-[var(--border-hover)] px-1.5 py-0.5 rounded font-mono font-bold">{c.version}</code>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <LicenseBadge license={c.license} />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-800 text-muted-foreground text-[8px] font-bold uppercase tracking-wider">
                          {c.ecosystem.toLowerCase()}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[100px] block" title={c.source_path}>
                          {c.source_path}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        {c.depth === 0 ? (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/25 uppercase">Direct</span>
                        ) : (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border uppercase">Transitive</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
           <div className="absolute inset-0 bg-[var(--lp-bg)]/80" onClick={() => setShowShareModal(false)} />
           <div className="relative bg-card border-border rounded-2xl w-full max-w-sm p-6 border animate-in zoom-in-95 duration-200">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#ffffff] to-transparent" />
              <h2 className="text-xl font-bold text-foreground mb-1.5 tracking-tight">Generate Secure Share Link</h2>
              <p className="text-zinc-500 text-[11px] mb-8 leading-relaxed font-medium">Create a cryptographic link for external compliance auditing. Access does not require authentication.</p>
              
              {!shareLink ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-1.5 block px-1">Label (Optional)</label>
                    <Input 
                      placeholder='e.g. "For DRDO Audit"' 
                      className="bg-muted/40 border-border text-foreground h-10 rounded-lg focus:border-[#ffffff] focus:ring-0 text-xs"
                      value={shareLabel}
                      onChange={(e) => setShareLabel(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-1.5 block px-1">Expires In</label>
                    <div className="relative group">
                      <select 
                        className="w-full h-10 bg-muted/40 border border-border rounded-lg px-3 text-xs font-bold text-foreground focus:outline-none focus:border-[#ffffff] appearance-none cursor-pointer pr-10"
                        value={shareExpires}
                        onChange={(e) => setShareExpires(Number(e.target.value))}
                      >
                        <option className="bg-card text-foreground" value={30}>30 Days</option>
                        <option className="bg-card text-foreground" value={60}>60 Days</option>
                        <option className="bg-card text-foreground" value={90}>90 Days</option>
                        <option className="bg-card text-foreground" value={180}>180 Days</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600 group-focus-within:text-[#ffffff] pointer-events-none transition-colors" />
                    </div>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <Button variant="ghost" className="flex-1 text-zinc-500 hover:text-foreground font-bold h-9 text-xs" onClick={() => setShowShareModal(false)}>Cancel</Button>
                    <Button className="flex-1 bg-[#ffffff] text-black hover:bg-[#e2e8f0] h-9 font-bold rounded-lg text-xs" onClick={handleCreateShare} disabled={sharing || !lastDepticId}>
                      {sharing && <CustomLoader size={14} className="mr-2" />}
                      Generate Link
                    </Button>
                  </div>
                  {!lastDepticId && (
                    <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg flex items-start gap-2.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[9px] text-amber-500/70 leading-relaxed font-medium">Generate an artifact (CycloneDX/SPDX) first to enable sharing.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-[#ffffff]/5 border border-[#ffffff]/10 p-4 rounded-xl text-[#ffffff] flex gap-3">
                    <Globe className="h-5 w-5 shrink-0 opacity-60" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5">Secure Link Active</p>
                      <p className="text-[9px] leading-relaxed opacity-70">This link works without login. Share with authorized auditors only.</p>
                    </div>
                  </div>
                  <div className="flex gap-2 relative group">
                    <Input readOnly value={shareLink} className="font-mono text-[9px] bg-muted/20 border-border h-10 pr-20 rounded-lg text-muted-foreground" />
                    <Button onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }} className="absolute right-0.5 top-0.5 h-9 w-16 bg-white text-black hover:bg-zinc-200 rounded-md text-[9px] font-bold uppercase tracking-widest">
                      {copied ? "Copied" : "Copy"}
                    </Button>
                  </div>
                  <Button variant="ghost" className="w-full text-zinc-600 hover:text-foreground h-10 font-bold uppercase tracking-widest text-[9px]" onClick={() => setShowShareModal(false)}>Close</Button>
                </div>
              )}
           </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-10 right-10 z-[200] bg-white text-black px-8 py-4 rounded-2xl shadow-3xl flex items-center gap-4 animate-in slide-in-from-bottom-10 duration-500 border border-border">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-extrabold tracking-tight">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

function GroupedVulnRow({ v, fixedPackageNames }: { v: any, fixedPackageNames: Set<string> }) {
  const [expanded, setExpanded] = useState(false);
  const multipleCVEs = v.cve_count > 1;

  return (
    <>
      <TableRow className={cn("border-border hover:bg-muted/50 transition-colors", expanded && "bg-muted/20")}>
        <TableCell className="px-4 py-3">
          <p className="font-bold text-zinc-100 text-xs mb-0.5">{v.component_name}</p>
        </TableCell>
        <TableCell className="px-4 py-3">
          <code className="text-[10px] text-muted-foreground bg-card border border-[var(--border-hover)] px-1.5 py-0.5 rounded font-mono font-bold">v{v.component_version}</code>
        </TableCell>
        <TableCell className="px-4 py-3">
          <div className="flex flex-col gap-1.5 items-start">
            <span className="text-[10px] font-mono text-[#ffffff] bg-[#ffffff]/5 px-2 py-0.5 rounded border border-[#ffffff]/10">
              {v.cves?.[0]}
            </span>
            {multipleCVEs && (
              <button 
                onClick={() => setExpanded(!expanded)}
                className="text-[9px] font-bold text-blue-400 hover:text-blue-300 bg-blue-400/10 px-1.5 py-0.5 rounded uppercase tracking-widest flex items-center gap-1 transition-colors"
              >
                +{v.cve_count - 1} more {expanded ? "▲" : "▼"}
              </button>
            )}
          </div>
        </TableCell>
        <TableCell className="px-4 py-3 text-center">
            <Badge 
              variant="outline" 
              className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest border-0",
                v.highest_severity === "CRITICAL" ? "bg-red-500/10 text-red-400" :
                v.highest_severity === "HIGH" ? "bg-orange-500/10 text-orange-400" :
                "bg-zinc-800 text-zinc-500"
              )}
            >
              {v.highest_severity}
            </Badge>
        </TableCell>
        <TableCell className="px-4 py-3">
          {v.clean_version ? (
            <div className="flex items-center gap-3 text-[#ffffff]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" />
                  <span className="text-[10px] font-bold">Patch to {v.clean_version} available</span>
                </div>
                {fixedPackageNames.has(v.component_name) ? (
                  <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded transition-colors uppercase tracking-widest">
                    Fixed in PR
                  </span>
                ) : null}
            </div>
          ) : (
            <span className="text-zinc-600 text-[9px] uppercase font-bold tracking-widest">Awaiting Fix</span>
          )}
        </TableCell>
        <TableCell className="px-4 py-3 max-w-[250px]">
          <p className="text-[10px] text-muted-foreground truncate" title={v.cves_detail?.[0]?.summary || ""}>
            {v.cves_detail?.[0]?.summary || "No description available"}
          </p>
        </TableCell>
      </TableRow>
      
      {expanded && multipleCVEs && (
        <TableRow className="border-b border-border bg-muted/50">
          <TableCell colSpan={6} className="p-0">
            <div className="pl-8 py-3 pr-4 space-y-2 max-h-[250px] overflow-y-auto">
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Additional Vulnerabilities</p>
              {v.cves_detail?.slice(1).map((detail: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 py-1.5 border-l-2 border-border pl-3">
                  <span className="text-[10px] font-mono text-foreground w-32">{detail.id}</span>
                  <span className={cn(
                    "text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-widest",
                    detail.severity === "CRITICAL" ? "text-red-400 bg-red-400/10" :
                    detail.severity === "HIGH" ? "text-orange-400 bg-orange-400/10" :
                    "text-muted-foreground bg-zinc-800"
                  )}>
                    {detail.severity}
                  </span>
                  <span className="text-[10px] text-zinc-500 flex-1 truncate">{detail.summary}</span>
                </div>
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
