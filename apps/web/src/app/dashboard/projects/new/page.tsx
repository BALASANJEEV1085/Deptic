"use client";

import * as React from "react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { startScan, getScan, listScans, Scan } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, ShieldCheck, Zap, Lock, ChevronLeft, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function NewProjectPage() {
  const router = useRouter();
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const [recentUrls, setRecentUrls] = useState<string[]>([]);
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Fetch recent repos
    listScans().then(res => {
      const urls = Array.from(new Set(res.scans.map(s => s.repo_url).filter(Boolean))) as string[];
      setRecentUrls(urls.slice(0, 5));
    }).catch(err => console.error("Failed to fetch recent scans:", err));

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const isValidUrl = useMemo(() => {
    if (!githubUrl) return null;
    const regex = /^https:\/\/github\.com\/[^/]+\/[^/]+$/;
    return regex.test(githubUrl.split('?')[0].replace(/\/$/, ''));
  }, [githubUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl || !isValidUrl) return;
    
    setLoading(true);
    setError(null);
    setStatusText("Authenticating integration...");

    try {
      const projectId = "00000000-0000-0000-0000-000000000000";
      const { scan_id } = await startScan(githubUrl, projectId);
      setStatusText("Scanning repository...");

      pollIntervalRef.current = setInterval(async () => {
        try {
          const result = await getScan(scan_id);
          if (result.scan.status === "done") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            router.push(`/dashboard/scans/${scan_id}`);
          } else if (result.scan.status === "failed") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            setError("Analysis failed. Please check if the repository is public and contains a valid manifest.");
            setLoading(false);
          }
        } catch (pollErr) {
          console.error("Polling error:", pollErr);
        }
      }, 3000);

    } catch (err: any) {
      setError(err.message || "Failed to initiate scan.");
      setLoading(false);
    }
  };

  const getRepoDisplay = (url: string) => {
    try {
      const parts = url.replace(/\/$/, '').split('/');
      if (parts.length >= 2) {
        const name = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
        return name.length > 30 ? name.substring(0, 27) + "..." : name;
      }
      return url;
    } catch {
      return url;
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-6">
      <div className="mb-10">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center text-xs font-medium text-zinc-500 hover:text-[#22c55e] transition-colors mb-6 group"
        >
          <ChevronLeft className="mr-1 h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Integrate Repository</h1>
        <p className="text-zinc-500 text-sm">Connect a GitHub repository to begin supply chain analysis and compliance auditing.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
        <div className="lg:col-span-3 space-y-8">
          <Card className="bg-card border-white/5 shadow-2xl rounded-2xl overflow-hidden relative border">
            {/* Top border green gradient */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#22c55e] to-transparent opacity-80" />
            
            <CardHeader className="pb-8 pt-10 px-8">
              <CardTitle className="text-xl font-bold text-white">Repository Details</CardTitle>
              <CardDescription className="text-zinc-500 text-xs">Enter the URL of the repository you wish to scan.</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-10">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                  <label htmlFor="github-url" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block px-1">
                    GitHub URL
                  </label>
                  <div className="relative group">
                    <svg className={cn(
                      "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
                      isValidUrl ? "text-[#22c55e]" : "text-zinc-600 group-focus-within:text-[#22c55e]"
                    )} fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                    <Input
                      id="github-url"
                      placeholder="https://github.com/organization/repository"
                      className={cn(
                        "pl-12 pr-10 bg-white/[0.02] border-[#252836] text-white h-12 rounded-xl transition-all text-sm",
                        "focus:border-[#22c55e] focus:ring-0 focus:shadow-[0_0_0_2px_rgba(34,197,94,0.15)] outline-none"
                      )}
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      disabled={loading}
                      required
                      autoComplete="off"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                      {isValidUrl === true && <CheckCircle2 className="h-4 w-4 text-[#22c55e]" />}
                      {isValidUrl === false && <XCircle className="h-4 w-4 text-red-500" />}
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
                    <ShieldCheck className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="text-[11px] font-medium text-red-400">
                      <p className="font-bold uppercase tracking-wider mb-1">Integration Error</p>
                      {error}
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className={cn(
                    "w-full h-12 rounded-xl font-semibold transition-all active:scale-[0.98] text-sm uppercase tracking-widest",
                    loading 
                      ? "bg-white/5 text-zinc-500 cursor-not-allowed border-white/5" 
                      : "bg-[#22c55e] text-black hover:bg-[#16a34a] border-none"
                  )} 
                  disabled={loading || !githubUrl || isValidUrl === false}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin text-black" />
                      <span>{statusText}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      Analyze Supply Chain <ArrowRight className="h-4 w-4 ml-1" />
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {recentUrls.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] px-1">Recent Repositories</h3>
              <div className="flex flex-wrap gap-2">
                {recentUrls.map((url) => (
                  <button
                    key={url}
                    onClick={() => setGithubUrl(url)}
                    className="px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02] text-[11px] text-zinc-400 hover:text-[#22c55e] hover:border-[#22c55e]/30 transition-all truncate max-w-[200px]"
                    title={url}
                  >
                    {getRepoDisplay(url)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-8 py-4">
           <div className="space-y-6">
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">How it works</h2>
              
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                   <div className="h-9 w-9 rounded-lg bg-[#22c55e]/10 flex items-center justify-center border border-[#22c55e]/20 shrink-0">
                     <ShieldCheck className="h-4 w-4 text-[#22c55e]" />
                   </div>
                   <div>
                     <p className="text-[13px] font-bold text-zinc-200 mb-1">Manifest Detection</p>
                     <p className="text-xs text-zinc-500 leading-relaxed">Our engine automatically identifies package.json, requirements.txt, or pyproject.toml files.</p>
                   </div>
                </div>

                <div className="flex items-start gap-4">
                   <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
                     <Zap className="h-4 w-4 text-red-500" />
                   </div>
                   <div>
                     <p className="text-[13px] font-bold text-zinc-200 mb-1">Vulnerability Mapping</p>
                     <p className="text-xs text-zinc-500 leading-relaxed">Components are matched against the Global Vulnerability Database to identify known CVEs.</p>
                   </div>
                </div>

                <div className="flex items-start gap-4">
                   <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
                     <Lock className="h-4 w-4 text-blue-500" />
                   </div>
                   <div>
                     <p className="text-[13px] font-bold text-zinc-200 mb-1">Compliance Audit</p>
                     <p className="text-xs text-zinc-500 leading-relaxed">An NTIA-compliant SBOM is generated, verifying supplier names, versions, and dependencies.</p>
                   </div>
                </div>
              </div>
           </div>

           <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] text-[11px] text-zinc-500 leading-relaxed">
             <span className="text-zinc-400 font-bold block mb-1 uppercase tracking-wider text-[10px]">Permission Notice</span>
             Integration requires read-only access to repository contents. Ensure your GitHub App permissions are correctly configured for public access.
           </div>
        </div>
      </div>
    </div>
  );
}
