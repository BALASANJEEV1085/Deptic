"use client";

import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { startScan, getScan } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();
  const [githubUrl, setGithubUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl) return;
    
    setLoading(true);
    setError(null);
    setStatusText("Initializing scan...");

    try {
      const projectId = "00000000-0000-0000-0000-000000000000";
      
      const { scan_id } = await startScan(githubUrl, projectId);
      setStatusText("Scanning repository dependencies...");

      const pollInterval = setInterval(async () => {
        try {
          const result = await getScan(scan_id);
          if (result.scan.status === "done") {
            clearInterval(pollInterval);
            router.push(`/dashboard/scans/${scan_id}`);
          } else if (result.scan.status === "failed") {
            clearInterval(pollInterval);
            setError("Scan failed. Please check if the repository is public and contains a valid package.json.");
            setLoading(false);
          }
        } catch (pollErr) {
          console.error("Polling error:", pollErr);
        }
      }, 2000);

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-gray-200 dark:border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">New Scan</CardTitle>
          <CardDescription>Enter a GitHub repository URL to generate an SBOM.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="github-url" className="text-sm font-medium leading-none">
                GitHub Repository URL
              </label>
              <div className="relative">
                <svg className="absolute left-3 top-3 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                <Input
                  id="github-url"
                  placeholder="https://github.com/your-org/your-repo"
                  className="pl-9"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-sm font-medium text-red-500 p-3 bg-red-50 dark:bg-red-900/20 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !githubUrl}>
              {loading ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {statusText}
                </div>
              ) : (
                "Start Scan"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
