"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { startScan, getScan } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, ShieldCheck, Zap, Lock, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function NewProjectPage() {
  const router = useRouter();
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup interval on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl) return;
    
    setLoading(true);
    setError(null);
    setStatusText("Authenticating integration...");

    try {
      // For now, use a dummy project ID as we are mostly working with a single default project
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

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="mb-10">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center text-xs font-medium text-zinc-500 hover:text-zinc-200 transition-colors mb-6 group"
        >
          <ChevronLeft className="mr-1 h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Integrate Repository</h1>
        <p className="text-zinc-500 text-sm">Connect a GitHub repository to begin supply chain analysis and compliance auditing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
        <div className="md:col-span-3">
          <Card className="bg-card border-white/5 shadow-2xl rounded-2xl overflow-hidden relative border">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-30" />
            <CardHeader className="pb-8 pt-10">
              <CardTitle className="text-xl font-bold text-white">Repository Details</CardTitle>
              <CardDescription className="text-zinc-500 text-xs">Enter the URL of the repository you wish to scan.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8 pb-4">
                <div className="space-y-3">
                  <label htmlFor="github-url" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block px-1">
                    GitHub URL
                  </label>
                  <div className="relative group">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                    <Input
                      id="github-url"
                      placeholder="https://github.com/organization/repository"
                      className="pl-12 bg-white/[0.02] border-white/10 text-white h-12 rounded-xl focus:ring-indigo-500/40 transition-all text-sm"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      disabled={loading}
                      required
                      autoComplete="off"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-xl animate-in shake duration-500">
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
                    "w-full h-12 rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)] active:scale-[0.98]",
                    loading ? "bg-white/5 text-zinc-500 cursor-not-allowed border-white/5" : "bg-white text-black hover:bg-zinc-200"
                  )} 
                  disabled={loading || !githubUrl}
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                      <span className="text-xs uppercase tracking-widest">{statusText}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                      Analyze Supply Chain <ArrowRight className="h-4 w-4 ml-1" />
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-8 py-4">
           <div className="space-y-6">
              <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">What happens next?</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                   <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shrink-0">
                     <ShieldCheck className="h-4 w-4 text-indigo-400" />
                   </div>
                   <div>
                     <p className="text-xs font-bold text-zinc-200 mb-1">Manifest Detection</p>
                     <p className="text-[11px] text-zinc-500 leading-relaxed">Our engine automatically identifies package.json, requirements.txt, or pyproject.toml files.</p>
                   </div>
                </div>

                <div className="flex items-start gap-4">
                   <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shrink-0">
                     <Zap className="h-4 w-4 text-purple-400" />
                   </div>
                   <div>
                     <p className="text-xs font-bold text-zinc-200 mb-1">Vulnerability Mapping</p>
                     <p className="text-[11px] text-zinc-500 leading-relaxed">Components are matched against the Global Vulnerability Database to identify known CVEs.</p>
                   </div>
                </div>

                <div className="flex items-start gap-4">
                   <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                     <Lock className="h-4 w-4 text-emerald-400" />
                   </div>
                   <div>
                     <p className="text-xs font-bold text-zinc-200 mb-1">Compliance Audit</p>
                     <p className="text-[11px] text-zinc-500 leading-relaxed">An NTIA-compliant SBOM is generated, verifying supplier names, versions, and dependencies.</p>
                   </div>
                </div>
              </div>
           </div>

           <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] text-[10px] text-zinc-600 leading-relaxed">
             Integration requires read-only access to repository contents. Ensure your GitHub App permissions are correctly configured.
           </div>
        </div>
      </div>
    </div>
  );
}
