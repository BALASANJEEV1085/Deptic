"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getScanShareLinks, revokeShareLink } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { CustomLoader } from "@/components/custom-loader";

export default function ScanSharesPage() {
  const params = useParams();
  const scanId = params.scanId as string;
  
  const [shares, setShares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchShares = async () => {
    try {
      setLoading(true);
      const data = await getScanShareLinks(scanId);
      setShares(data.shares);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (scanId) {
      fetchShares();
    }
  }, [scanId]);

  const handleRevoke = async (depticId: string, token: string) => {
    if (!confirm("Are you sure you want to revoke this link? It will immediately stop working.")) return;
    
    try {
      await revokeShareLink(depticId, token);
      setShares(shares.filter(s => s.token !== token));
    } catch (err: any) {
      alert("Failed to revoke link: " + err.message);
    }
  };

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-foreground">Active Share Links</h1>
          <p className="text-gray-500 mt-2">
            Manage public access links generated for DEPTICs belonging to this scan.
          </p>
        </div>
      </div>

      <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden bg-white dark:bg-gray-950 shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status / Expires</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Link</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                  <CustomLoader size={24} className="mx-auto mb-2" />
                  Loading shares...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-red-500">
                  {error}
                </TableCell>
              </TableRow>
            ) : shares.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                  No share links generated yet for this scan. Generate an DEPTIC and share it to see links here.
                </TableCell>
              </TableRow>
            ) : (
              shares.map((share) => (
                <TableRow key={share.token}>
                  <TableCell className="font-medium text-gray-900 dark:text-foreground">
                    {share.label || <span className="text-gray-400 italic">Unnamed</span>}
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
                    {new Date(share.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {share.is_expired ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {new Date(share.expires_at).toLocaleDateString()}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{share.view_count}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => copyLink(share.url, share.token)}>
                        {copiedId === share.token ? <CheckCircle2 className="h-3 w-3 mr-2 text-green-500" /> : <Copy className="h-3 w-3 mr-2" />}
                        {copiedId === share.token ? "Copied" : "Copy"}
                      </Button>
                      <a href={share.url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-primary">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRevoke(share.deptic_id, share.token)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
