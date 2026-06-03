"use client";

import { useEffect, useState, useMemo } from "react";
import { useWorkspace } from "@/lib/contexts/workspace-context";
import Link from "next/link";
import { Search, ScanSearch, Copy, Check, ChevronDown } from "lucide-react";
import {
  listScans,
  Scan,
  ecosystemLabel,
  relativeTime,
  shortId,
  downloadPDFReport,
} from "@/lib/api";
import { cn, getComplianceStatus } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ── Helpers ──────────────────────────────────────────────────────────── */
function StatusDot({ status }: { status: string }) {
  const color =
    status === "done" ? "#ffffff" : status === "failed" ? "#ef4444" : "#f59e0b";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "DM Sans, sans-serif",
        fontSize: 13,
        color,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
        }}
        className={status === "running" ? "status-dot-running" : ""}
      />
      {status === "done" ? "Done" : status === "failed" ? "Failed" : "Running"}
    </span>
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
        border: "1px solid #1e2230",
        display: "inline-block",
      }}
    >
      {ecosystemLabel(eco, status)}
    </span>
  );
}

function SeverityCompact({
  crit, high, med, low,
}: {
  crit: number; high: number; med: number; low: number;
}) {
  const total = crit + high + med + low;
  if (total === 0)
    return (
      <span
        style={{ fontFamily: "DM Mono, monospace", fontSize: 12, color: "#374151" }}
      >
        —
      </span>
    );
  const parts: string[] = [];
  if (crit > 0) parts.push(`${crit}C`);
  if (high > 0) parts.push(`${high}H`);
  if (med > 0)  parts.push(`${med}M`);
  if (low > 0)  parts.push(`${low}L`);
  return (
    <span
      style={{
        fontFamily: "DM Mono, monospace",
        fontSize: 12,
        color: crit > 0 ? "#ef4444" : high > 0 ? "#f97316" : "#f59e0b",
      }}
    >
      {parts.join(" ")}
    </span>
  );
}

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
      className="group/copy"
    >
      <span
        style={{ fontFamily: "DM Mono, monospace", fontSize: 10, color: "#374151" }}
      >
        {shortId(id)}
      </span>
      <button
        onClick={copy}
        style={{
          opacity: 0,
          color: "#374151",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
          display: "flex",
        }}
        className="group-hover/copy:opacity-100 transition-opacity"
      >
        {copied ? (
          <Check size={10} color="#ffffff" />
        ) : (
          <Copy size={10} />
        )}
      </button>
    </span>
  );
}

function NtiaCell({ score, status }: { score?: number; status: string }) {
  if (status !== "done")
    return (
      <span style={{ fontFamily: "DM Mono, monospace", fontSize: 12, color: "#374151" }}>
        —
      </span>
    );
  if (score === undefined)
    return (
      <span style={{ fontFamily: "DM Mono, monospace", fontSize: 12, color: "#374151" }}>
        N/A
      </span>
    );
  const s = getComplianceStatus(score);
  const color =
    s.color === "green" ? "#ffffff" : s.color === "amber" ? "#f59e0b" : "#ef4444";
  return (
    <span
      style={{
        fontFamily: "DM Mono, monospace",
        fontSize: 12,
        fontWeight: 500,
        color,
      }}
    >
      {score}%
    </span>
  );
}

/* ── Skeleton ── */
function SkeletonRow() {
  return (
    <tr>
      {[140, 80, 70, 60, 90, 60, 80, 50].map((w, i) => (
        <td key={i} style={{ padding: "0 16px", height: 44 }}>
          <div
            className="skeleton"
            style={{
              height: 10,
              width: w,
              background: "#16191f",
              borderRadius: 4,
            }}
          />
        </td>
      ))}
    </tr>
  );
}

/* ── FilterDropdown ── */
function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
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
          minWidth: 130,
          justifyContent: "space-between",
          outline: "none",
          transition: "border-color 0.15s ease",
        }}
      >
        {value === "All" ? label : value}
        <ChevronDown size={13} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        style={{
          background: "#0e1015",
          border: "1px solid #16191f",
          padding: 4,
          minWidth: 130,
        }}
      >
        {options.map((o) => (
          <DropdownMenuItem
            key={o}
            onClick={() => onChange(o)}
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 13,
              color: value === o ? "#ffffff" : "#c9d1e0",
              padding: "6px 10px",
              cursor: "pointer",
              borderRadius: 4,
            }}
          >
            {o}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function ScansPage() {
  const { activeWorkspace } = useWorkspace();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [ecoFilter, setEcoFilter] = useState("All");

  useEffect(() => {
    setLoading(true);
    listScans()
      .then((res) => {
        setScans(res.scans || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [activeWorkspace?.id]);

  const ecosystems = useMemo(
    () => ["All", ...Array.from(new Set(scans.map((s) => s.ecosystem || "unknown")))],
    [scans]
  );

  const filtered = useMemo(
    () =>
      scans.filter((s) => {
        const name = (s.repo_name || s.id).toLowerCase();
        if (!name.includes(search.toLowerCase())) return false;
        if (statusFilter !== "All" && s.status !== statusFilter.toLowerCase())
          return false;
        if (
          ecoFilter !== "All" &&
          (s.ecosystem || "unknown").toLowerCase() !== ecoFilter.toLowerCase()
        )
          return false;
        return true;
      }),
    [scans, search, statusFilter, ecoFilter]
  );

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
          Scan History
        </h1>
        <p
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 14,
            color: "#6b7280",
            margin: 0,
          }}
        >
          All DEPTIC scans across your repositories.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
            placeholder="Search repository…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            onFocus={(e) => (e.target.style.borderColor = "#ffffff")}
            onBlur={(e) => (e.target.style.borderColor = "#16191f")}
          />
        </div>

        <FilterDropdown
          label="All Statuses"
          options={["All", "done", "failed", "running"]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <FilterDropdown
          label="All Ecosystems"
          options={ecosystems}
          value={ecoFilter}
          onChange={setEcoFilter}
        />

        <span
          style={{
            fontFamily: "DM Mono, monospace",
            fontSize: 11,
            color: "#374151",
            marginLeft: "auto",
          }}
        >
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
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
                <th>Ecosystem</th>
                <th>Status</th>
                <th>Components</th>
                <th>Severity</th>
                <th>NTIA</th>
                <th>Date</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: "64px 16px",
                      color: "#374151",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <ScanSearch size={32} color="#1e2230" />
                      <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: 13 }}>
                        {search ? `No scans matching "${search}"` : "No scans found."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((scan) => (
                  <tr key={scan.id}>
                    <td>
                      <div>
                        <p
                          style={{
                            fontFamily: "DM Sans, sans-serif",
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#e8ecf4",
                            margin: "0 0 2px",
                          }}
                        >
                          {scan.repo_name || "—"}
                        </p>
                        <CopyId id={scan.id} />
                      </div>
                    </td>
                    <td>
                      <EcoBadge eco={scan.ecosystem || ""} status={scan.status} />
                    </td>
                    <td>
                      <StatusDot status={scan.status} />
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: "DM Mono, monospace",
                          fontSize: 13,
                          color: "#c9d1e0",
                        }}
                      >
                        {(scan.component_count ?? 0).toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <SeverityCompact
                        crit={scan.critical_cves ?? 0}
                        high={scan.high_cves ?? 0}
                        med={scan.medium_cves ?? 0}
                        low={scan.low_cves ?? 0}
                      />
                    </td>
                    <td>
                      <NtiaCell score={scan.ntia_score} status={scan.status} />
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: "DM Mono, monospace",
                          fontSize: 12,
                          color: "#6b7280",
                        }}
                        title={new Date(scan.created_at).toLocaleString()}
                      >
                        {relativeTime(scan.created_at)}
                      </span>
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
                          href={`/dashboard/scans/${scan.id}`}
                          style={{
                            fontFamily: "DM Sans, sans-serif",
                            fontSize: 13,
                            fontWeight: 500,
                            color: "#ffffff",
                            textDecoration: "none",
                          }}
                        >
                          View →
                        </Link>
                        {scan.status === "done" && (
                          <button
                            onClick={() => downloadPDFReport(scan.id)}
                            style={{
                              fontFamily: "DM Sans, sans-serif",
                              fontSize: 13,
                              fontWeight: 500,
                              color: "#6b7280",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              transition: "color 0.15s ease",
                            }}
                          >
                            PDF
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
