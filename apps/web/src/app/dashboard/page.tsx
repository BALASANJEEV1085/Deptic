"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/lib/contexts/workspace-context";
import {
  getDashboardStats,
  getOnboardingStatus,
  DashboardStats,
  OnboardingStatus,
  ecosystemLabel,
  relativeTime,
} from "@/lib/api";
import { ArrowRight, BookOpen, GitBranch, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { CustomLoader } from "@/components/custom-loader";

/* ── Tiny helpers ─────────────────────────────────────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: "DM Sans, sans-serif",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase" as const,
        letterSpacing: "0.08em",
        color: "var(--text-tertiary)",
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function EcoBadge({ eco, status }: { eco: string; status?: string }) {
  const label = ecosystemLabel(eco, status);
  return (
    <span
      style={{
        background: "var(--border)",
        color: "var(--text-secondary)",
        fontFamily: "DM Sans, sans-serif",
        fontSize: 11,
        fontWeight: 500,
        padding: "2px 8px",
        borderRadius: 4,
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid var(--border-hover)",
      }}
    >
      {label}
    </span>
  );
}

/* ── Stat Card ──────────────────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  delta,
  deltaColor = "var(--green)",
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaColor?: string;
}) {
  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 20,
        display: "flex",
        flexDirection: "column" as const,
        gap: 8,
        transition: "border-color 0.15s ease",
      }}
    >
      <SectionLabel>{label}</SectionLabel>
      <p
        style={{
          fontFamily: "var(--font-syne, Syne, sans-serif)",
          fontSize: 32,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.5px",
          margin: 0,
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>
      {delta && (
        <p
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 11,
            color: deltaColor,
            margin: 0,
          }}
        >
          {delta}
        </p>
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { activeWorkspace } = useWorkspace();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [prefs, setPrefs] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getDashboardStats(),
      getOnboardingStatus().catch(() => null),
    ])
      .then(([data, onboarding]) => {
        setStats(data);
        setPrefs(onboarding);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load stats", err);
        setLoading(false);
      });
  }, [activeWorkspace?.id]);

  const useCases = (prefs?.use_case || "").split(",").filter(Boolean);
  const showComplianceFirst = useCases.includes("compliance");
  const showRepoCta = useCases.includes("ci_cd");
  const showGettingStarted = stats?.total_scans === 0;

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          flexDirection: "column" as const,
          gap: 12,
        }}
      >
        <CustomLoader size={45} className="text-[#ffffff]" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ padding: 32, color: "var(--text-secondary)", textAlign: "center" }}>
        Failed to load dashboard statistics.
      </div>
    );
  }

  const totalScans = stats.ntia_compliant_scans + stats.non_compliant_scans;
  const compliancePct =
    totalScans === 0
      ? 0
      : Math.round((stats.ntia_compliant_scans / totalScans) * 100);

  const maxCve = Math.max(
    stats.critical_cves,
    stats.high_cves,
    stats.medium_cves,
    stats.low_cves,
    1
  );

  const severityBars = [
    { label: "Critical", value: stats.critical_cves, color: "#ef4444" },
    { label: "High",     value: stats.high_cves,     color: "#f97316" },
    { label: "Medium",   value: stats.medium_cves,   color: "#f59e0b" },
    { label: "Low",      value: stats.low_cves,       color: "var(--text-secondary)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-0.5">Dashboard</h1>
          <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold">
            Overview & Metrics
          </p>
        </div>
      </div>

      {/* ── Personalized CTAs ── */}
      {(showGettingStarted || showRepoCta) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {showGettingStarted && (
            <div className="rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 p-5 flex items-start gap-4">
              <BookOpen className="h-5 w-5 text-[var(--green)] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-foreground mb-1">Getting started with Deptic</p>
                <p className="text-xs text-muted-foreground mb-3">New to SBOM scanning? Start with a public repo or try our quick-start guide.</p>
                <Link href="/docs/quick-start" className="text-xs font-bold text-[var(--green)] hover:underline">
                  Read the quick-start guide →
                </Link>
              </div>
            </div>
          )}
          {showRepoCta && (
            <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
              <GitBranch className="h-5 w-5 text-[var(--green)] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground mb-1">Connect your first repo</p>
                <p className="text-xs text-muted-foreground mb-3">Enable auto-scan on push to catch vulnerabilities in CI/CD.</p>
                <Link
                  href="/dashboard/projects"
                  className="inline-flex items-center gap-1.5 bg-[var(--green)] hover:bg-[var(--green)]/90 text-black text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Go to Projects <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Stat cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
        }}
      >
        <StatCard
          label="Total Components"
          value={stats.total_components.toLocaleString()}
          delta={`Across ${totalScans} scans`}
          deltaColor="var(--text-secondary)"
        />
        <StatCard
          label="Critical CVEs"
          value={stats.critical_cves}
          delta={stats.critical_cves > 0 ? "Needs action" : "All clear"}
          deltaColor={stats.critical_cves > 0 ? "#ef4444" : "#ffffff"}
        />
        <StatCard
          label="NTIA Compliant"
          value={`${stats.ntia_compliant_scans}/${totalScans}`}
          delta={`${compliancePct}% compliance rate`}
          deltaColor={compliancePct === 100 ? "#ffffff" : "#f59e0b"}
        />
        <StatCard
          label="Clean Projects"
          value={stats.clean_projects}
          delta="No critical CVEs"
          deltaColor="#ffffff"
        />
      </div>

      {/* ── Compliance overview (prioritized for compliance use case) ── */}
      {showComplianceFirst && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--green)]" />
            <SectionLabel>Compliance Overview</SectionLabel>
          </div>
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                {stats.ntia_compliant_scans} of {totalScans} scans NTIA compliant
              </p>
              <span style={{ fontFamily: "var(--font-syne, Syne, sans-serif)", fontSize: 24, fontWeight: 700, color: compliancePct === 100 ? "var(--green)" : compliancePct >= 75 ? "#f59e0b" : "#ef4444" }}>
                {compliancePct}%
              </span>
            </div>
            <div style={{ height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, background: compliancePct === 100 ? "var(--green)" : compliancePct >= 75 ? "#f59e0b" : "#ef4444", width: `${compliancePct}%`, transition: "width 0.6s ease" }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Two-col ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
        className="lg-grid-2"
      >
        {/* Recent Scans */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <SectionLabel>Recent Scans</SectionLabel>
            <Link
              href="/dashboard/scans"
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--text-active)",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 4,
                transition: "opacity 0.15s ease",
              }}
            >
              View all <ArrowRight size={12} />
            </Link>
          </div>

          <div className="ds-table-wrap border border-[var(--border)] bg-[var(--card)] rounded-xl overflow-hidden" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {(stats.recent_scans?.length ?? 0) === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "var(--text-label)",
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 13,
                }}
              >
                No scans yet.
              </div>
            ) : (
              <table className="ds-table">
                <thead>
                  <tr>
                    <th>Repository</th>
                    <th>Ecosystem</th>
                    <th>CVEs</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats.recent_scans ?? []).slice(0, 11).map((scan) => (
                    <tr
                      key={scan.id}
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        (window.location.href = `/dashboard/scans/${scan.id}`)
                      }
                    >
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              flexShrink: 0,
                              background:
                                scan.status === "done"
                                  ? "#ffffff"
                                  : scan.status === "failed"
                                  ? "#ef4444"
                                  : "#f59e0b",
                            }}
                            className={
                              scan.status === "running" ? "status-dot-running" : ""
                            }
                          />
                          <span
                            style={{
                              fontFamily: "DM Sans, sans-serif",
                              fontSize: 13,
                              fontWeight: 500,
                              color: "var(--text-primary)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 160,
                            }}
                          >
                            {scan.repo_name}
                          </span>
                        </div>
                      </td>
                      <td>
                        <EcoBadge eco={scan.ecosystem} status={scan.status} />
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: "DM Sans, sans-serif",
                            fontSize: 13,
                            color:
                              scan.critical_cves > 0 ? "#ef4444" : "var(--text-secondary)",
                          }}
                        >
                          {scan.critical_cves > 0
                            ? `${scan.critical_cves}C`
                            : "—"}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontSize: 12,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {relativeTime(scan.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, justifyContent: "space-between", height: "100%" }}>
          {/* Security bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <SectionLabel>Vulnerability Breakdown</SectionLabel>
              <Link
                href="/dashboard/vulnerabilities"
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-active)",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                View <ArrowRight size={12} />
              </Link>
            </div>
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 20,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {severityBars.map((b) => (
                <div key={b.label}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "DM Sans, sans-serif",
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--text-tertiary)",
                      }}
                    >
                      {b.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 12,
                        color: b.value > 0 ? b.color : "var(--text-label)",
                      }}
                    >
                      {b.value}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      background: "var(--border)",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 2,
                        background: b.value > 0 ? b.color : "var(--border-hover)",
                        width: b.value === 0 ? "2%" : `${Math.max((b.value / maxCve) * 100, 4)}%`,
                        transition: "width 0.6s ease",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionLabel>NTIA Compliance</SectionLabel>
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  marginBottom: 12,
                }}
              >
                <p
                  style={{
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    margin: 0,
                  }}
                >
                  {stats.ntia_compliant_scans} of {totalScans} scans compliant
                </p>
                <span
                  style={{
                    fontFamily: "var(--font-syne, Syne, sans-serif)",
                    fontSize: 24,
                    fontWeight: 700,
                    color:
                      compliancePct === 100
                        ? "#ffffff"
                        : compliancePct >= 75
                        ? "#f59e0b"
                        : "#ef4444",
                  }}
                >
                  {compliancePct}%
                </span>
              </div>

              <div
                style={{
                  height: 6,
                  background: "var(--border)",
                  borderRadius: 3,
                  overflow: "hidden",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 3,
                    background:
                      compliancePct === 100
                        ? "#ffffff"
                        : compliancePct >= 75
                        ? "#f59e0b"
                        : "#ef4444",
                    width: `${compliancePct}%`,
                    transition: "width 0.6s ease",
                  }}
                />
              </div>

              {/* Non-compliant list */}
              {stats.non_compliant_scans > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {(stats.recent_scans ?? [])
                    .filter((s: { ntia_score: number }) => s.ntia_score < 100)
                    .slice(0, 3)
                    .map((s: { id: string; repo_name: string; ntia_score: number }) => (
                      <Link
                        key={s.id}
                        href={`/dashboard/scans/${s.id}?tab=compliance`}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "8px 12px",
                          borderRadius: 6,
                          background: "var(--bg)",
                          border: "1px solid var(--border)",
                          textDecoration: "none",
                          transition: "border-color 0.15s ease",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "DM Sans, sans-serif",
                            fontSize: 13,
                            color: "var(--table-cell)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {s.repo_name}
                        </span>
                        <span
                          style={{
                            fontFamily: "DM Mono, monospace",
                            fontSize: 12,
                            color: s.ntia_score >= 75 ? "#f59e0b" : "#ef4444",
                            flexShrink: 0,
                            marginLeft: 8,
                          }}
                        >
                          {s.ntia_score}%
                        </span>
                      </Link>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* responsive style hack */}
      <style>{`
        @media (max-width: 900px) {
          .lg-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
