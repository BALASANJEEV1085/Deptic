"use client";

import { useEffect, useState, useMemo } from "react";
import { getAllVulnerabilities, Vulnerability } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ShieldCheck, ShieldAlert, Filter } from "lucide-react";
import Link from "next/link";

export default function VulnerabilitiesPage() {
  const [vulns, setVulns] = useState<Vulnerability[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string>("All");

  useEffect(() => {
    getAllVulnerabilities()
      .then((res) => {
        setVulns(res.vulnerabilities || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const filteredVulns = useMemo(() => {
    if (!vulns) return [];
    if (severityFilter === "All") return vulns;
    return vulns.filter((v) => v.severity === severityFilter);
  }, [vulns, severityFilter]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !vulns) {
    return (
      <div className="p-8">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-md border border-red-200 dark:border-red-800">
          <h2 className="font-semibold text-lg mb-1">Failed to load vulnerabilities</h2>
          <p>{error || "Unknown error occurred"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-red-500" />
            Vulnerabilities
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            All detected CVEs across your projects
          </p>
        </div>
      </div>

      {vulns.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border border-dashed border-gray-300 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-950">
          <ShieldCheck className="h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">All clear — no vulnerabilities detected</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Your projects are currently safe and up to date.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-sm border-gray-200 dark:border-gray-800 rounded-md bg-white dark:bg-gray-950 text-gray-900 dark:text-white py-1.5 pl-3 pr-8 focus:ring-primary focus:border-primary"
            >
              <option value="All">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden bg-white dark:bg-gray-950">
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-gray-900/50">
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>CVE ID</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Found On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVulns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-gray-500">
                      No vulnerabilities found for this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVulns.map((v, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-gray-900 dark:text-white">
                        {v.project_name || "Unknown"}
                      </TableCell>
                      <TableCell className="font-medium">{v.component_name}</TableCell>
                      <TableCell className="font-mono text-xs">{v.component_version}</TableCell>
                      <TableCell className="font-mono text-xs" title={v.summary}>
                        {v.cve_id}
                      </TableCell>
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
                      <TableCell>
                        <Link href={`/dashboard/scans/${v.scan_id}`} className="text-primary hover:underline text-sm">
                          View Scan
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
