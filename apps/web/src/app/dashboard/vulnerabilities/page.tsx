"use client";

import { useEffect, useState, useMemo } from "react";
import { useWorkspace } from "@/lib/contexts/workspace-context";
import { getAllVulnerabilities, Vulnerability, shortId } from "@/lib/api";
import { ShieldCheck, ChevronDown, ExternalLink } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ── Severity helpers ─────────────────────────────────────────────────── */
function severityColor(sev: string): string {
  switch (sev) {
    case "CRITICAL": return "#ef4444";
    case "HIGH":     return "#f97316";
    case "MEDIUM":   return "#f59e0b";
    default:         return "#6b7280";
  }
}

/* ── Skeleton ─────────────────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr>
      {[160, 120, 100, 90, 70, 80, 60].map((w, i) => (
        <td key={i} style={{ padding: "0 16px", height: 44 }}>
          <div
            className="skeleton"
            style={{ height: 10, width: w, background: "#16191f", borderRadius: 4 }}
          />
        </td>
      ))}
    </tr>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function VulnerabilitiesPage() {
  const { activeWorkspace } = useWorkspace();
  const [vulns, setVulns] = useState<Vulnerability[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState("All");

  useEffect(() => {
    setLoading(true);
    getAllVulnerabilities()
      .then((res) => {
        setVulns(res.vulnerabilities || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [activeWorkspace?.id]);

  const summary = useMemo(() => {
    if (!vulns) return { critical: 0, high: 0, medium: 0, low: 0, total: 0 };
    return {
      critical: vulns.filter((v) => v.severity === "CRITICAL").length,
      high:     vulns.filter((v) => v.severity === "HIGH").length,
      medium:   vulns.filter((v) => v.severity === "MEDIUM").length,
      low:      vulns.filter((v) => v.severity === "LOW").length,
      total:    vulns.length,
    };
  }, [vulns]);

  const repos = useMemo(() => {
    if (!vulns) return 0;
    return new Set(vulns.map((v) => v.project_name || v.scan_id)).size;
  }, [vulns]);

  const filtered = useMemo(() => {
    if (!vulns) return [];
    if (severityFilter === "All") return vulns;
    return vulns.filter((v) => v.severity === severityFilter);
  }, [vulns, severityFilter]);

  if (error) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: "center",
          color: "#ef4444",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h1
          style={{
            fontFamily: "var(--font-syne, Syne, sans-serif)",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "#e8ecf4",
            margin: "0 0 4px",
          }}
        >
          Vulnerabilities
        </h1>
        {/* Summary bar */}
        {!loading && vulns && (
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 13,
              color: "#6b7280",
              margin: 0,
            }}
          >
            {summary.total} vulnerabilities across {repos} repositories{" "}
            <span style={{ color: "#374151", margin: "0 4px" }}>·</span>
            <span style={{ color: summary.critical > 0 ? "#ef4444" : "#374151" }}>
              {summary.critical} Critical
            </span>{" "}
            <span style={{ color: "#374151", margin: "0 4px" }}>·</span>
            <span style={{ color: summary.high > 0 ? "#f97316" : "#374151" }}>
              {summary.high} High
            </span>{" "}
            <span style={{ color: "#374151", margin: "0 4px" }}>·</span>
            <span style={{ color: summary.medium > 0 ? "#f59e0b" : "#374151" }}>
              {summary.medium} Medium
            </span>{" "}
            <span style={{ color: "#374151", margin: "0 4px" }}>·</span>
            <span style={{ color: "#374151" }}>{summary.low} Low</span>
          </p>
        )}
      </div>

      {/* Filter row */}
      {!loading && vulns && vulns.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <DropdownMenu>
            <DropdownMenuTrigger
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 12px",
                height: 34,
                background: "#0e1015",
                border: "1px solid #16191f",
                borderRadius: 6,
                fontFamily: "DM Sans, sans-serif",
                fontSize: 13,
                color: "#6b7280",
                cursor: "pointer",
                minWidth: 150,
                justifyContent: "space-between",
                outline: "none",
              }}
            >
              {severityFilter === "All" ? "All Severities" : severityFilter}
              <ChevronDown size={13} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              style={{
                background: "#0e1015",
                border: "1px solid #16191f",
                padding: 4,
                minWidth: 150,
              }}
            >
              {["All", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  style={{
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 13,
                    color: severityFilter === s ? "#22c55e" : "#c9d1e0",
                    padding: "6px 10px",
                    cursor: "pointer",
                    borderRadius: 4,
                  }}
                >
                  {s === "All" ? "All Severities" : s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Empty / zero state */}
      {!loading && (!vulns || vulns.length === 0) && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 20px",
            border: "1px solid #16191f",
            borderRadius: 8,
            gap: 12,
          }}
        >
          <ShieldCheck size={40} color="#22c55e" style={{ opacity: 0.3 }} />
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: 15, color: "#e8ecf4", margin: 0 }}>
            No vulnerabilities detected
          </p>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: 13, color: "#6b7280", margin: 0 }}>
            Zero CVEs across your supply chain.
          </p>
        </div>
      )}

      {/* Table */}
      {(loading || (vulns && vulns.length > 0)) && (
        <div
          style={{
            background: "#0e1015",
            border: "1px solid #16191f",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table className="ds-table">
              <thead>
                <tr>
                  <th>Repository</th>
                  <th>Package</th>
                  <th>Version</th>
                  <th>CVE ID</th>
                  <th>Severity</th>
                  <th>Fix Available</th>
                  <th style={{ textAlign: "right" }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: "center",
                        padding: "48px 16px",
                        fontFamily: "DM Sans, sans-serif",
                        fontSize: 13,
                        color: "#374151",
                      }}
                    >
                      No results for severity &ldquo;{severityFilter}&rdquo;
                    </td>
                  </tr>
                ) : (
                  filtered.map((v, i) => (
                    <tr key={i}>
                      {/* Repository */}
                      <td>
                        <div>
                          <p
                            style={{
                              fontFamily: "DM Sans, sans-serif",
                              fontSize: 13,
                              fontWeight: 500,
                              color: "#e8ecf4",
                              margin: "0 0 2px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 160,
                            }}
                          >
                            {v.project_name || "Unknown"}
                          </p>
                          {v.scan_id && (
                            <span
                              style={{
                                fontFamily: "DM Mono, monospace",
                                fontSize: 10,
                                color: "#374151",
                              }}
                            >
                              #{shortId(v.scan_id)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Package */}
                      <td>
                        <span
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontSize: 13,
                            color: "#c9d1e0",
                          }}
                        >
                          {v.component_name}
                        </span>
                      </td>

                      {/* Version */}
                      <td>
                        <span
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontSize: 12,
                            color: "#6b7280",
                          }}
                        >
                          {v.component_version}
                        </span>
                      </td>

                      {/* CVE */}
                      <td>
                        <a
                          href={`https://nvd.nist.gov/vuln/detail/${v.cve_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontSize: 12,
                            color: "#3b82f6",
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {v.cve_id}
                          <ExternalLink size={10} />
                        </a>
                      </td>

                      {/* Severity */}
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontFamily: "DM Sans, sans-serif",
                            fontSize: 13,
                            fontWeight: 500,
                            color: severityColor(v.severity),
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: severityColor(v.severity),
                              flexShrink: 0,
                            }}
                          />
                          {v.severity}
                        </span>
                      </td>

                      {/* Fix */}
                      <td>
                        {v.fixed_version ? (
                          <span
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontSize: 12,
                              color: "#22c55e",
                            }}
                          >
                            → v{v.fixed_version}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontFamily: "DM Mono, monospace",
                              fontSize: 12,
                              color: "#374151",
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>

                      {/* Inspect */}
                      <td style={{ textAlign: "right" }}>
                        {v.scan_id && (
                          <Link
                            href={`/dashboard/scans/${v.scan_id}`}
                            style={{
                              fontFamily: "DM Sans, sans-serif",
                              fontSize: 13,
                              fontWeight: 500,
                              color: "#22c55e",
                              textDecoration: "none",
                            }}
                          >
                            View →
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
