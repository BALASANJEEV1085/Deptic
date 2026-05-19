"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2, FileBarChart2 } from "lucide-react";
import {
  listScans,
  Scan,
  getCompliance,
  ComplianceResponse,
  shortId,
  relativeTime,
  ecosystemLabel,
  downloadPDFReport,
} from "@/lib/api";
import { cn, getComplianceStatus } from "@/lib/utils";

type ReportRow = Scan & {
  compliance?: ComplianceResponse | null;
  compLoading: boolean;
};

/* ── Helpers ──────────────────────────────────────────────────────────── */
function EcoBadge({ eco }: { eco: string }) {
  return (
    <span
      style={{
        background: "#16191f",
        color: "#6b7280",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 4,
        border: "1px solid #1e2230",
        display: "inline-block",
      }}
    >
      {ecosystemLabel(eco)}
    </span>
  );
}

function NtiaScore({ score, loading }: { score?: number; loading: boolean }) {
  if (loading)
    return <Loader2 size={14} color="#374151" className="animate-spin" />;
  if (score === undefined)
    return (
      <span style={{ fontFamily: "DM Mono, monospace", fontSize: 12, color: "#374151" }}>
        N/A
      </span>
    );
  const s = getComplianceStatus(score);
  const color =
    s.color === "green" ? "#22c55e" : s.color === "amber" ? "#f59e0b" : "#ef4444";
  return (
    <span
      style={{
        fontFamily: "var(--font-syne, Syne, sans-serif)",
        fontSize: 16,
        fontWeight: 700,
        color,
      }}
    >
      {score}
    </span>
  );
}

function StatusBadge({
  score,
  loading,
}: {
  score?: number;
  loading: boolean;
}) {
  if (loading)
    return <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#374151" }}>—</span>;
  if (score === undefined)
    return <span style={{ fontFamily: "DM Mono, monospace", fontSize: 11, color: "#374151" }}>N/A</span>;

  if (score >= 95) {
    return (
      <span
        style={{
          fontFamily: "DM Sans, sans-serif",
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.04em",
          color: "#22c55e",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span
          style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }}
        />
        Compliant
      </span>
    );
  }
  if (score >= 75) {
    return (
      <span
        style={{
          fontFamily: "DM Sans, sans-serif",
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase" as const,
          letterSpacing: "0.04em",
          color: "#f59e0b",
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span
          style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }}
        />
        Partial
      </span>
    );
  }
  return (
    <span
      style={{
        fontFamily: "DM Sans, sans-serif",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase" as const,
        letterSpacing: "0.04em",
        color: "#ef4444",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      <span
        style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", flexShrink: 0 }}
      />
      Non-Compliant
    </span>
  );
}

/* ── Skeleton ── */
function SkeletonRow() {
  return (
    <tr>
      {[160, 80, 70, 60, 50, 90, 80].map((w, i) => (
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
export default function ReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "compliant" | "non-compliant">("all");
  const [pdfLoading, setPdfLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    listScans().then(async (res) => {
      const rows: ReportRow[] = res.scans.map((s) => ({ ...s, compLoading: true }));
      setReports(rows);
      setLoading(false);

      for (const row of rows) {
        if (row.status === "done") {
          try {
            const comp = await getCompliance(row.id);
            setReports((cur) =>
              cur.map((r) =>
                r.id === row.id ? { ...r, compliance: comp, compLoading: false } : r
              )
            );
          } catch {
            setReports((cur) =>
              cur.map((r) =>
                r.id === row.id ? { ...r, compliance: null, compLoading: false } : r
              )
            );
          }
        } else {
          setReports((cur) =>
            cur.map((r) =>
              r.id === row.id ? { ...r, compLoading: false } : r
            )
          );
        }
      }
    }).catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const handlePDF = async (id: string) => {
    setPdfLoading((p) => ({ ...p, [id]: true }));
    try {
      await downloadPDFReport(id);
    } catch (e) {
      console.error(e);
    } finally {
      setPdfLoading((p) => ({ ...p, [id]: false }));
    }
  };

  const filteredReports = reports.filter((r) => {
    const repoName = (r.repo_name || r.id).toLowerCase();
    if (!repoName.includes(searchQuery.toLowerCase())) return false;
    const score = r.compliance?.ntia.score;
    if (filter === "compliant") return (score ?? 0) >= 95;
    if (filter === "non-compliant")
      return r.compliance != null && (score ?? 0) < 95;
    return true;
  });

  const filterTabs = [
    { key: "all", label: "All" },
    { key: "compliant", label: "Compliant" },
    { key: "non-compliant", label: "Non-Compliant" },
  ] as const;

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
          Compliance Reports
        </h1>
        <p
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 14,
            color: "#6b7280",
            margin: 0,
          }}
        >
          NTIA EO14028 compliance reports for your repositories.
        </p>
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#374151",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Search by repository…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              height: 34,
              paddingLeft: 34,
              paddingRight: 12,
              background: "#0e1015",
              border: "1px solid #16191f",
              borderRadius: 6,
              fontFamily: "DM Sans, sans-serif",
              fontSize: 13,
              color: "#e8ecf4",
              outline: "none",
              transition: "border-color 0.15s ease",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#22c55e")}
            onBlur={(e) => (e.target.style.borderColor = "#16191f")}
          />
        </div>

        {/* Filter tabs */}
        <div
          style={{
            display: "flex",
            gap: 2,
            background: "#0e1015",
            border: "1px solid #16191f",
            borderRadius: 6,
            padding: 3,
          }}
        >
          {filterTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              style={{
                padding: "5px 12px",
                borderRadius: 4,
                fontFamily: "DM Sans, sans-serif",
                fontSize: 12,
                fontWeight: 500,
                background: filter === t.key ? "#16191f" : "transparent",
                color: filter === t.key ? "#e8ecf4" : "#6b7280",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
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
                <th>Date</th>
                <th>Ecosystem</th>
                <th>Components</th>
                <th style={{ textAlign: "center" }}>NTIA Score</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: "64px 16px",
                      color: "#374151",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <FileBarChart2 size={32} color="#1e2230" />
                      <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 13 }}>
                        {searchQuery
                          ? `No reports matching "${searchQuery}"`
                          : "No reports found."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const score = report.compliance?.ntia.score;
                  return (
                    <tr key={report.id}>
                      <td>
                        <p
                          style={{
                            fontFamily: "DM Sans, sans-serif",
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#e8ecf4",
                            margin: "0 0 2px",
                          }}
                        >
                          {report.repo_name || "—"}
                        </p>
                        <span
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontSize: 10,
                            color: "#374151",
                          }}
                        >
                          #{shortId(report.id)}
                        </span>
                      </td>

                      <td>
                        <span
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontSize: 12,
                            color: "#6b7280",
                          }}
                          title={new Date(report.created_at).toLocaleString()}
                        >
                          {relativeTime(report.created_at)}
                        </span>
                      </td>

                      <td>
                        <EcoBadge eco={report.ecosystem || ""} />
                      </td>

                      <td>
                        <span
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontSize: 13,
                            color: "#c9d1e0",
                          }}
                        >
                          {(report.component_count ?? 0).toLocaleString()}
                        </span>
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <NtiaScore score={score} loading={report.compLoading} />
                      </td>

                      <td>
                        <StatusBadge score={score} loading={report.compLoading} />
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: 12,
                          }}
                        >
                          <Link
                            href={`/dashboard/scans/${report.id}?tab=compliance`}
                            style={{
                              fontFamily: "DM Sans, sans-serif",
                              fontSize: 13,
                              fontWeight: 500,
                              color: "#22c55e",
                              textDecoration: "none",
                            }}
                          >
                            View
                          </Link>
                          {report.status === "done" && (
                            <>
                              <span
                                style={{
                                  fontFamily: "DM Mono, monospace",
                                  fontSize: 12,
                                  color: "#374151",
                                }}
                              >
                                ·
                              </span>
                              <button
                                onClick={() => handlePDF(report.id)}
                                disabled={pdfLoading[report.id]}
                                style={{
                                  fontFamily: "DM Sans, sans-serif",
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: pdfLoading[report.id] ? "#374151" : "#6b7280",
                                  background: "none",
                                  border: "none",
                                  cursor: pdfLoading[report.id] ? "not-allowed" : "pointer",
                                  padding: 0,
                                  transition: "color 0.15s ease",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                {pdfLoading[report.id] ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : null}
                                PDF
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
