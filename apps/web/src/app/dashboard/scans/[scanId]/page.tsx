"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { getScan, GetScanResponse, getScanVulnerabilities, ScanVulnerabilitiesResponse } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, Download, Package, Layers, ShieldCheck, ShieldAlert, Share2, Copy, CheckCircle2, ChevronDown } from "lucide-react";
import { generateSBOM, createShareLink } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ScanResultsPage() {
  const params = useParams();
  const scanId = params.scanId as string;

  const [data, setData] = useState<GetScanResponse | null>(null);
  const [vulnData, setVulnData] = useState<ScanVulnerabilitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [generating, setGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLabel, setShareLabel] = useState("");
  const [shareExpires, setShareExpires] = useState(30);
  const [shareLink, setShareLink] = useState("");
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Last generated SBOM tracking for sharing
  const [lastSbomId, setLastSbomId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExport = async (format: "cyclonedx" | "spdx") => {
    try {
      setGenerating(true);
      const res = await generateSBOM(scanId, format);
      setLastSbomId(res.sbom_id);
      
      // Auto-download
      const link = document.createElement("a");
      link.href = res.download_url;
      link.setAttribute("download", "");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast("SBOM downloaded successfully");
    } catch (err: any) {
      alert("Failed to export SBOM: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateShare = async () => {
    if (!lastSbomId) {
      alert("Please export an SBOM first to share it.");
      return;
    }
    try {
      setSharing(true);
      const res = await createShareLink(lastSbomId, shareLabel, shareExpires);
      setShareLink(res.share_url);
    } catch (err: any) {
      alert("Failed to create share link: " + err.message);
    } finally {
      setSharing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!scanId) return;
    
    Promise.all([
      getScan(scanId),
      getScanVulnerabilities(scanId).catch(err => {
        console.error("Failed to load vulns", err);
        return { summary: { critical: 0, high: 0, medium: 0, low: 0 }, vulnerabilities: [] };
      })
    ])
      .then(([scanRes, vulnRes]) => {
        setData(scanRes);
        setVulnData(vulnRes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [scanId]);

  const filteredComponents = useMemo(() => {
    if (!data?.components) return [];
    if (!searchQuery) return data.components;
    const lowerQuery = searchQuery.toLowerCase();
    return data.components.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.license.toLowerCase().includes(lowerQuery)
    );
  }, [data?.components, searchQuery]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md border border-red-200 dark:border-red-800">
          <h2 className="font-semibold text-lg mb-1">Failed to load scan</h2>
          <p>{error || "Unknown error occurred"}</p>
        </div>
      </div>
    );
  }

  const directDepsCount = data.components.filter(c => c.depth === 0).length;
  const transitiveDepsCount = data.total - directDepsCount;
  
  const uniqueLicenses = new Set(data.components.map(c => c.license));
  const licensesCount = uniqueLicenses.size;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Scan Results
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Scan ID: <span className="font-mono text-xs">{scanId}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={generating} variant="outline" className="flex items-center gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {generating ? "Generating SBOM..." : "Export SBOM"}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => handleExport("cyclonedx")} className="cursor-pointer">
                Download CycloneDX JSON (.json)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("spdx")} className="cursor-pointer">
                Download SPDX (.spdx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary hover:text-primary/80 hover:bg-primary/10 flex items-center gap-2"
            onClick={() => setShowShareModal(true)}
          >
            <Share2 className="h-4 w-4" />
            Share with auditor
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Components</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total}</div>
          </CardContent>
        </Card>
        
        <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Direct Deps</CardTitle>
            <Layers className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{directDepsCount}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Transitive Deps</CardTitle>
            <Layers className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transitiveDepsCount}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Licenses Found</CardTitle>
            <ShieldCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{licensesCount}</div>
          </CardContent>
        </Card>

        <Card className={`border-gray-200 dark:border-gray-800 shadow-sm ${vulnData?.summary.critical ? 'bg-red-50/50 dark:bg-red-900/10' : 'bg-green-50/50 dark:bg-green-900/10'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Critical CVEs</CardTitle>
            {vulnData?.summary.critical ? (
              <ShieldAlert className="h-4 w-4 text-red-500" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${vulnData?.summary.critical ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {vulnData?.summary.critical || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">Dependencies</h2>
        <div className="flex items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search components or licenses..."
              className="pl-9 bg-white dark:bg-gray-950"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden bg-white dark:bg-gray-950">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
              <TableRow>
                <TableHead>Package Name</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Depth</TableHead>
                <TableHead>Ecosystem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredComponents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                    No components found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredComponents.map((c) => (
                  <TableRow 
                    key={c.id}
                    className={c.depth === 0 ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}
                  >
                    <TableCell className="font-medium text-gray-900 dark:text-white">
                      {c.name}
                      {c.depth > 0 && <span className="ml-2 text-xs text-gray-400 font-normal">via {c.parent_name}</span>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{c.version}</TableCell>
                    <TableCell>
                      <Badge variant={c.license === 'Unknown' ? 'destructive' : 'secondary'} className="font-normal">
                        {c.license}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.depth === 0 ? (
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 border-0">Direct</Badge>
                      ) : (
                        <span className="text-gray-500">Level {c.depth}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-500 capitalize">{c.ecosystem}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {vulnData && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">Vulnerabilities</h2>
          </div>
          
          {(vulnData.summary.critical + vulnData.summary.high + vulnData.summary.medium + vulnData.summary.low) === 0 ? (
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-md border border-green-200 dark:border-green-800 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5" />
              <span className="font-medium">✓ No vulnerabilities found — this project is clean</span>
            </div>
          ) : (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                Critical {vulnData.summary.critical}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 rounded-full text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                High {vulnData.summary.high}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                Medium {vulnData.summary.medium}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-800 dark:bg-gray-800 dark:text-green-400 rounded-full text-sm font-medium border border-transparent dark:border-gray-700">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                Low {vulnData.summary.low}
              </div>
            </div>
          )}

          {vulnData.vulnerabilities.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden bg-white dark:bg-gray-950">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                  <TableRow>
                    <TableHead>Package</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>CVE ID</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Fix Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vulnData.vulnerabilities.map((v, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-gray-900 dark:text-white">{v.component_name}</TableCell>
                      <TableCell className="font-mono text-xs">{v.component_version}</TableCell>
                      <TableCell className="font-mono text-xs">{v.cve_id}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={
                            v.severity === 'CRITICAL' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/30' :
                            v.severity === 'HIGH' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800/30' :
                            v.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/30' :
                            'bg-green-100 text-green-800 dark:bg-gray-800 dark:text-green-400 border-green-200 dark:border-gray-700'
                          }
                        >
                          {v.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate text-sm" title={v.summary}>{v.summary}</TableCell>
                      <TableCell>
                        {v.fixed_version ? (
                          <span className="text-green-600 dark:text-green-400 font-mono text-xs font-medium">
                            {v.fixed_version}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-md shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          {toastMessage}
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-800">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Share SBOM</h2>
            
            {!shareLink ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Label (optional)
                  </label>
                  <Input 
                    placeholder='e.g. "For DRDO Audit Q1 2026"' 
                    value={shareLabel}
                    onChange={(e) => setShareLabel(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Expires in
                  </label>
                  <select 
                    className="w-full text-sm border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-gray-950 text-gray-900 dark:text-white py-2 pl-3 pr-8 focus:ring-primary focus:border-primary"
                    value={shareExpires}
                    onChange={(e) => setShareExpires(Number(e.target.value))}
                  >
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                    <option value={180}>180 days</option>
                  </select>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setShowShareModal(false)}>Cancel</Button>
                  <Button onClick={handleCreateShare} disabled={sharing || !lastSbomId}>
                    {sharing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generate Share Link
                  </Button>
                </div>
                {!lastSbomId && (
                  <p className="text-xs text-orange-500 mt-2 text-center">
                    You must Export the SBOM first before sharing it.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-900/20 p-3 rounded-md flex gap-2">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  Success! This link works without login — share it with any auditor.
                </p>
                <div className="flex gap-2">
                  <Input readOnly value={shareLink} className="font-mono text-xs" />
                  <Button variant="outline" onClick={copyToClipboard} className="shrink-0 w-24">
                    {copied ? <CheckCircle2 className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <div className="pt-2 flex justify-end">
                  <Button onClick={() => {
                    setShowShareModal(false);
                    setShareLink("");
                  }}>Close</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
