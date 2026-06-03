"use client";

import React, { useRef, useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: "DM Sans, sans-serif",
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase" as const,
        letterSpacing: "0.08em",
        color: "#4a5068",
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function EcoBadge({ eco, status }: { eco: string; status?: string }) {
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
        display: "inline-flex",
        alignItems: "center",
        border: "1px solid #1e2230",
      }}
    >
      {eco}
    </span>
  );
}

function StatCard({
  label,
  value,
  delta,
  deltaColor = "#ffffff",
}: {
  label: string;
  value: string | number;
  delta?: string;
  deltaColor?: string;
}) {
  return (
    <div
      style={{
        background: "#0e1015",
        border: "1px solid #16191f",
        borderRadius: 8,
        padding: 20,
        display: "flex",
        flexDirection: "column" as const,
        gap: 8,
      }}
    >
      <SectionLabel>{label}</SectionLabel>
      <p
        style={{
          fontFamily: "var(--font-syne, Syne, sans-serif)",
          fontSize: 32,
          fontWeight: 700,
          color: "#e8ecf4",
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

export function DashboardMock() {
  const stats = {
    total_components: 14203,
    critical_cves: 3,
    ntia_compliant_scans: 12,
    non_compliant_scans: 3,
    clean_projects: 8,
    recent_scans: [
      { id: "1", repo_name: "facebook/react", ecosystem: "npm", critical_cves: 2, created_at: Date.now() - 3600000, status: "done" },
      { id: "2", repo_name: "django/django", ecosystem: "pip", critical_cves: 0, created_at: Date.now() - 86400000, status: "done" },
      { id: "3", repo_name: "gin-gonic/gin", ecosystem: "go", critical_cves: 0, created_at: Date.now() - 172800000, status: "done" },
      { id: "4", repo_name: "vuejs/vue", ecosystem: "npm", critical_cves: 1, created_at: Date.now() - 345600000, status: "done" },
    ],
  };

  const totalScans = stats.ntia_compliant_scans + stats.non_compliant_scans;
  const compliancePct = Math.round((stats.ntia_compliant_scans / totalScans) * 100);

  const maxCve = 15;
  const severityBars = [
    { label: "Critical", value: 3, color: "#ef4444" },
    { label: "High",     value: 12, color: "#f97316" },
    { label: "Medium",   value: 28, color: "#f59e0b" },
    { label: "Low",      value: 45, color: "#6b7280" },
  ];

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [containerHeight, setContainerHeight] = useState<number | 'auto'>('auto');

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current && contentRef.current) {
        const parentWidth = containerRef.current.clientWidth;
        const targetWidth = 950; // Fixed desktop width for the mock
        if (parentWidth < targetWidth && parentWidth > 0) {
          const newScale = parentWidth / targetWidth;
          setScale(newScale);
          setContainerHeight(contentRef.current.offsetHeight * newScale);
        } else {
          setScale(1);
          setContainerHeight('auto');
        }
      }
    };

    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    // Initial calculation
    setTimeout(updateScale, 0);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ height: containerHeight, overflow: 'hidden' }}>
      <div 
        ref={contentRef}
        style={{
          width: 950,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          display: "flex", 
          flexDirection: "column", 
          gap: 32, 
          textAlign: "left"
        }}
      >
      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-0.5">Dashboard</h1>
          <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold">
            Overview & Metrics
          </p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard
          label="Total Components"
          value={stats.total_components.toLocaleString()}
          delta={`Across ${totalScans} scans`}
          deltaColor="#6b7280"
        />
        <StatCard
          label="Critical CVEs"
          value={stats.critical_cves}
          delta="Needs action"
          deltaColor="#ef4444"
        />
        <StatCard
          label="NTIA Compliant"
          value={`${stats.ntia_compliant_scans}/${totalScans}`}
          delta={`${compliancePct}% compliance rate`}
          deltaColor="#f59e0b"
        />
        <StatCard
          label="Clean Projects"
          value={stats.clean_projects}
          delta="No critical CVEs"
          deltaColor="#ffffff"
        />
      </div>

      {/* ── Two-col ── */}
      <div className="grid grid-cols-[1.5fr_1fr] gap-6">
        {/* Recent Scans */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <SectionLabel>Recent Scans</SectionLabel>
          </div>

          <div className="border border-[#16191f] bg-[#0e1015] rounded-xl overflow-hidden" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="border-b border-[#1e2230]">
                  <th className="p-3 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Repository</th>
                  <th className="p-3 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Ecosystem</th>
                  <th className="p-3 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">CVEs</th>
                  <th className="p-3 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_scans.map((scan, idx) => (
                  <tr key={scan.id} className={idx !== stats.recent_scans.length - 1 ? "border-b border-[#16191f]" : ""}>
                    <td className="p-3">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffffff" }} />
                        <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 13, fontWeight: 500, color: "#e8ecf4" }}>
                          {scan.repo_name}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <EcoBadge eco={scan.ecosystem} />
                    </td>
                    <td className="p-3">
                      <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 13, color: scan.critical_cves > 0 ? "#ef4444" : "#6b7280" }}>
                        {scan.critical_cves > 0 ? `${scan.critical_cves}C` : "—"}
                      </span>
                    </td>
                    <td className="p-3">
                      <span style={{ fontFamily: "DM Mono, monospace", fontSize: 12, color: "#6b7280" }}>
                        {idx === 0 ? "1h ago" : idx === 1 ? "1d ago" : idx === 2 ? "2d ago" : "4d ago"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, justifyContent: "space-between", height: "100%" }}>
          {/* Security bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <SectionLabel>Vulnerability Breakdown</SectionLabel>
            </div>
            <div
              style={{
                background: "#0e1015",
                border: "1px solid #16191f",
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
                        color: "#4a5068",
                      }}
                    >
                      {b.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "DM Mono, monospace",
                        fontSize: 12,
                        color: b.value > 0 ? b.color : "#374151",
                      }}
                    >
                      {b.value}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      background: "#16191f",
                      borderRadius: 2,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 2,
                        background: b.value > 0 ? b.color : "#1e2230",
                        width: `${Math.max((b.value / maxCve) * 100, 4)}%`,
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
                background: "#0e1015",
                border: "1px solid #16191f",
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
                    color: "#6b7280",
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
                    color: compliancePct >= 75 ? "#f59e0b" : "#ef4444",
                  }}
                >
                  {compliancePct}%
                </span>
              </div>

              <div
                style={{
                  height: 6,
                  background: "#16191f",
                  borderRadius: 3,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 3,
                    background: compliancePct >= 75 ? "#f59e0b" : "#ef4444",
                    width: `${compliancePct}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
