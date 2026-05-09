"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPublicShare } from "@/lib/api";
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, FileJson, Package, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function PublicSharePage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPublicShare(token)
      .then(setData)
      .catch(err => {
        if (err.message === "Expired") {
          setError("expired");
        } else {
          setError("failed");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-800 rounded mb-4"></div>
          <div className="text-sm text-gray-500">Loading SBOM Report...</div>
        </div>
      </div>
    );
  }

  if (error === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center p-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm max-w-md w-full">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Link Expired</h1>
          <p className="text-gray-500 dark:text-gray-400">
            This secure share link has expired and is no longer accessible. Please request a new link from the project owner.
          </p>
          <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
            Powered by SBOM.io
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Failed to load SBOM report. The link may be invalid.
      </div>
    );
  }

  const { compliance, vulnerability_summary, components, vulnerabilities } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl tracking-tight text-primary">SBOM.io</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">SBOM Compliance Report</h1>
            <p className="text-gray-500 text-lg">{data.label}</p>
          </div>
          <div className="text-sm text-gray-500 space-y-1 md:text-right">
            <p>Project: <span className="font-medium text-gray-900 dark:text-white">{data.repo_name}</span></p>
            <p>Generated: <span className="font-medium">{new Date(data.generated_at).toLocaleString()}</span></p>
            <p>SHA-256: <span className="font-mono bg-gray-100 dark:bg-gray-900 px-1 rounded">{data.sha256.substring(0, 16)}...</span></p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* NTIA Checklist */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">NTIA Minimum Elements</h2>
            <ul className="space-y-3">
              {[
                { key: 'has_supplier_name', label: 'Supplier Name' },
                { key: 'has_component_names', label: 'Component Names' },
                { key: 'has_versions', label: 'Versions' },
                { key: 'has_unique_ids', label: 'Unique Identifiers' },
                { key: 'has_dependency_relationships', label: 'Dependency Relationships' },
                { key: 'has_author', label: 'Author of SBOM' },
                { key: 'has_timestamp', label: 'Timestamp' }
              ].map(item => (
                <li key={item.key} className="flex items-center gap-2 text-sm">
                  {compliance[item.key] ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                  )}
                  <span className={compliance[item.key] ? "text-gray-700 dark:text-gray-300" : "text-gray-400"}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <FileJson className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Format: </span>
                <Badge variant="outline">{data.format === 'cyclonedx' ? 'CycloneDX' : 'SPDX'} {data.spec_version}</Badge>
              </div>
            </div>
          </div>

          {/* Vuln Summary */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">Security Posture</h2>
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[120px] p-4 rounded-md border border-red-100 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30">
                  <div className="text-red-600 dark:text-red-400 text-sm font-medium mb-1">Critical</div>
                  <div className="text-3xl font-bold text-red-700 dark:text-red-500">{vulnerability_summary.critical}</div>
                </div>
                <div className="flex-1 min-w-[120px] p-4 rounded-md border border-orange-100 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-900/30">
                  <div className="text-orange-600 dark:text-orange-400 text-sm font-medium mb-1">High</div>
                  <div className="text-3xl font-bold text-orange-700 dark:text-orange-500">{vulnerability_summary.high}</div>
                </div>
                <div className="flex-1 min-w-[120px] p-4 rounded-md border border-yellow-100 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-900/30">
                  <div className="text-yellow-600 dark:text-yellow-400 text-sm font-medium mb-1">Medium</div>
                  <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-500">{vulnerability_summary.medium}</div>
                </div>
                <div className="flex-1 min-w-[120px] p-4 rounded-md border border-green-100 bg-green-50 dark:bg-green-900/10 dark:border-green-900/30">
                  <div className="text-green-600 dark:text-green-400 text-sm font-medium mb-1">Low</div>
                  <div className="text-3xl font-bold text-green-700 dark:text-green-500">{vulnerability_summary.low}</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Total Components</h2>
                <p className="text-sm text-gray-500">Detected in package manifests</p>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-8 w-8 text-primary opacity-20" />
                <span className="text-4xl font-bold tracking-tight text-primary">{data.component_count}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Components Table */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Component Inventory</h2>
          <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden bg-white dark:bg-gray-900 max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <TableHead>Package Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Ecosystem</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {components.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center h-24">No components found.</TableCell></TableRow>
                ) : components.map((c: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium text-gray-900 dark:text-white">{c.Name}</TableCell>
                    <TableCell className="font-mono text-xs">{c.Version}</TableCell>
                    <TableCell><Badge variant="secondary" className="font-normal">{c.License || 'Unknown'}</Badge></TableCell>
                    <TableCell className="capitalize text-gray-500">{c.Ecosystem}</TableCell>
                    <TableCell>
                      {c.Depth === 0 ? <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Direct</Badge> : <span className="text-gray-500 text-sm">Transitive</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Vulnerabilities Table */}
        {vulnerabilities.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight text-red-600 dark:text-red-400 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Active Vulnerabilities
            </h2>
            <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden bg-white dark:bg-gray-900">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                  <TableRow>
                    <TableHead>CVE ID</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Fix Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vulnerabilities.map((v: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">{v.cve_id}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={
                            v.severity === 'CRITICAL' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200' :
                            v.severity === 'HIGH' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200' :
                            v.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200' :
                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          }
                        >
                          {v.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-xs">{v.component_name} @ {v.component_version}</TableCell>
                      <TableCell className="text-sm max-w-md truncate" title={v.summary}>{v.summary}</TableCell>
                      <TableCell className="font-mono text-xs text-green-600 dark:text-green-400">{v.fixed_version || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-12 pb-4 text-center border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck className="h-4 w-4" />
            Verified by SBOM.io
          </div>
          <p>Not logged in — read only access</p>
        </div>
      </div>
    </div>
  );
}
