"use client";

import * as React from "react";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { listScans, Scan } from '@/lib/api';

export default function ScansHistoryPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    listScans().then(res => {
      setScans(res.scans);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const filteredScans = scans.filter(s => s.id.includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Scan History</h1>
          <p className="mt-2 text-sm text-zinc-500">View all past SBOM scans generated across your projects.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-600" />
            <Input
              placeholder="Search by Scan ID..."
              className="pl-9 bg-white/[0.02] border-white/10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="border border-white/5 rounded-2xl overflow-hidden bg-card shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-white/[0.02] text-zinc-500 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Scan ID</th>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Project ID</th>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest">Date Created</th>
                  <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-zinc-600">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-500" />
                      Loading history...
                    </td>
                  </tr>
                ) : filteredScans.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-zinc-600 italic">
                      No scans found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredScans.map((scan) => (
                    <tr key={scan.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="px-6 py-5 font-mono text-xs text-white">{scan.id}</td>
                      <td className="px-6 py-5">
                        <Badge variant={scan.status === 'done' ? 'default' : scan.status === 'failed' ? 'destructive' : 'secondary'} className="capitalize bg-indigo-500/10 text-indigo-400 border-0">
                          {scan.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-5 font-mono text-xs text-zinc-500">{scan.project_id}</td>
                      <td className="px-6 py-5 text-zinc-400 text-xs">
                        {new Date(scan.created_at).toLocaleDateString()} at {new Date(scan.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link href={`/dashboard/scans/${scan.id}`}>
                          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-white/5">View Report</Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
