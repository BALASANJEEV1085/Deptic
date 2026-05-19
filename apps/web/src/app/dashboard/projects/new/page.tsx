"use client";

import * as React from "react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { startScan, getScan, listScans } from "@/lib/api";
import {
  CheckCircle2,
  XCircle,
  Package,
  GitMerge,
  ShieldAlert,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ── Scan steps ─────────────────────────────────────────────────────────── */
const SCAN_STEPS = [
  { label: "Detect",  desc: "Discovering packages",      Icon: Package },
  { label: "Scan",   desc: "Resolving dependencies",     Icon: GitMerge },
  { label: "Analyze", desc: "Checking vulnerabilities",  Icon: ShieldAlert },
  { label: "Report", desc: "Generating SBOM",            Icon: FileText },
] as const;

/* ── Step indicator ─────────────────────────────────────────────────────── */
function StepIndicators({ scanStep }: { scanStep: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        marginTop: 24,
      }}
    >
      {SCAN_STEPS.map((step, i) => {
        const isDone = scanStep > i;
        const isActive = scanStep === i;
        const isPending = scanStep < i;
        return (
          <React.Fragment key={step.label}>
            <div
              style={{
                display: "flex",
                flexDirection: "column" as const,
                alignItems: "center",
                gap: 6,
              }}
            >
              {/* Dot */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isDone
                    ? "rgba(34,197,94,0.15)"
                    : isActive
                    ? "rgba(34,197,94,0.08)"
                    : "#0e1015",
                  border: `2px solid ${
                    isDone || isActive ? "#22c55e" : "#16191f"
                  }`,
                  transition: "all 0.3s ease",
                }}
              >
                {isDone ? (
                  <CheckCircle2 size={14} color="#22c55e" />
                ) : (
                  <step.Icon
                    size={12}
                    color={isActive ? "#22c55e" : "#374151"}
                  />
                )}
              </div>
              {/* Label */}
              <span
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  color: isDone
                    ? "#6b7280"
                    : isActive
                    ? "#22c55e"
                    : "#374151",
                  transition: "color 0.3s ease",
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector */}
            {i < SCAN_STEPS.length - 1 && (
              <div
                style={{
                  width: 40,
                  height: 2,
                  background: isDone ? "#22c55e" : "#16191f",
                  marginBottom: 18,
                  transition: "background 0.3s ease",
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function NewProjectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUrl = searchParams.get("url") || "";
  const [githubUrl, setGithubUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentUrls, setRecentUrls] = useState<string[]>([]);
  const [scanStep, setScanStep] = useState<number>(-1);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    listScans()
      .then((res) => {
        const urls = Array.from(
          new Set(res.scans.map((s) => s.repo_url).filter(Boolean))
        ) as string[];
        setRecentUrls(urls.slice(0, 5));
      })
      .catch((err) => console.error("Failed to fetch recent scans:", err));

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const isValidUrl = useMemo(() => {
    if (!githubUrl) return null;
    const regex = /^https:\/\/github\.com\/[^/]+\/[^/]+$/;
    return regex.test(githubUrl.split("?")[0].replace(/\/$/, ""));
  }, [githubUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubUrl || !isValidUrl) return;

    setLoading(true);
    setError(null);
    setScanStep(0);

    const stepTimers = [
      setTimeout(() => setScanStep(1), 4000),
      setTimeout(() => setScanStep(2), 9000),
      setTimeout(() => setScanStep(3), 14000),
    ];

    try {
      const projectId = "00000000-0000-0000-0000-000000000000";
      const { scan_id } = await startScan(githubUrl, projectId);

      pollIntervalRef.current = setInterval(async () => {
        try {
          const result = await getScan(scan_id);
          if (result.scan.status === "done") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            stepTimers.forEach(clearTimeout);
            setScanStep(4);
            router.push(`/dashboard/scans/${scan_id}`);
          } else if (result.scan.status === "failed") {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            stepTimers.forEach(clearTimeout);
            setScanStep(-1);
            setError(
              "Analysis failed. Please check if the repository is public and contains a valid manifest."
            );
            setLoading(false);
          }
        } catch (pollErr) {
          console.error("Polling error:", pollErr);
        }
      }, 3000);
    } catch (err: any) {
      stepTimers.forEach(clearTimeout);
      setScanStep(-1);
      setError(err.message || "Failed to initiate scan.");
      setLoading(false);
    }
  };

  const getRepoDisplay = (url: string) => {
    try {
      const parts = url.replace(/\/$/, "").split("/");
      if (parts.length >= 2) {
        const name = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
        return name.length > 30 ? name.substring(0, 27) + "…" : name;
      }
      return url;
    } catch {
      return url;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
        padding: "40px 20px",
      }}
    >
      {/* Scanning overlay */}
      {loading && scanStep >= 0 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(9,11,15,0.96)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column" as const,
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#374151",
              marginBottom: 4,
            }}
          >
            Analyzing Repository
          </p>
          <p
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: 14,
              color: "#e8ecf4",
              marginBottom: 8,
            }}
          >
            {githubUrl.replace("https://github.com/", "")}
          </p>

          {/* Full step stepper */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 0,
            }}
          >
            {SCAN_STEPS.map((step, i) => {
              const isDone = scanStep > i;
              const isActive = scanStep === i;
              return (
                <React.Fragment key={step.label}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column" as const,
                      alignItems: "center",
                      gap: 8,
                      width: 100,
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: isDone
                          ? "rgba(34,197,94,0.15)"
                          : isActive
                          ? "rgba(34,197,94,0.08)"
                          : "#0e1015",
                        border: `2px solid ${
                          isDone || isActive ? "#22c55e" : "#16191f"
                        }`,
                        transition: "all 0.5s ease",
                        boxShadow:
                          isActive
                            ? "0 0 20px rgba(34,197,94,0.2)"
                            : "none",
                      }}
                    >
                      {isDone ? (
                        <CheckCircle2 size={20} color="#22c55e" />
                      ) : (
                        <step.Icon
                          size={18}
                          color={isActive ? "#22c55e" : "#374151"}
                        />
                      )}
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p
                        style={{
                          fontFamily: "DM Sans, sans-serif",
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: "uppercase" as const,
                          letterSpacing: "0.06em",
                          color: isDone
                            ? "#6b7280"
                            : isActive
                            ? "#22c55e"
                            : "#374151",
                          margin: "0 0 2px",
                          transition: "color 0.3s ease",
                        }}
                      >
                        {step.label}
                      </p>
                      <p
                        style={{
                          fontFamily: "DM Sans, sans-serif",
                          fontSize: 10,
                          color: "#374151",
                          margin: 0,
                        }}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </div>

                  {i < SCAN_STEPS.length - 1 && (
                    <div
                      style={{
                        width: 32,
                        height: 2,
                        background: isDone ? "#22c55e" : "#16191f",
                        marginBottom: 32,
                        transition: "background 0.5s ease",
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <p
            style={{
              fontFamily: "DM Mono, monospace",
              fontSize: 11,
              color: "#374151",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginTop: 16,
              animation: "pulse 1.5s ease infinite",
            }}
          >
            {SCAN_STEPS[Math.min(scanStep, 3)]?.desc}…
          </p>
        </div>
      )}

      {/* Form area */}
      <div style={{ width: "100%", maxWidth: 560 }}>
        {/* Back link */}
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "DM Sans, sans-serif",
            fontSize: 13,
            fontWeight: 500,
            color: "#6b7280",
            textDecoration: "none",
            marginBottom: 32,
            transition: "color 0.15s ease",
          }}
        >
          ← Dashboard
        </Link>

        {/* Title */}
        <h1
          style={{
            fontFamily: "var(--font-syne, Syne, sans-serif)",
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            color: "#e8ecf4",
            margin: "0 0 8px",
          }}
        >
          Analyze Repository
        </h1>
        <p
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 14,
            color: "#6b7280",
            margin: "0 0 32px",
          }}
        >
          Enter a public GitHub repository URL to generate an SBOM and security report.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* URL input */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            {/* GitHub icon */}
            <svg
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: isValidUrl ? "#22c55e" : "#374151",
                transition: "color 0.15s ease",
                pointerEvents: "none",
              }}
              width="18"
              height="18"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>

            <input
              id="github-url"
              type="text"
              placeholder="https://github.com/organization/repository"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              disabled={loading}
              required
              autoComplete="off"
              style={{
                width: "100%",
                height: 48,
                paddingLeft: 44,
                paddingRight: 44,
                background: "#090b0f",
                border: `1px solid ${
                  isValidUrl === false
                    ? "#ef4444"
                    : isValidUrl === true
                    ? "#22c55e"
                    : "#16191f"
                }`,
                borderRadius: 6,
                fontFamily: "DM Mono, monospace",
                fontSize: 14,
                color: "#e8ecf4",
                outline: "none",
                transition: "border-color 0.15s ease",
                opacity: loading ? 0.5 : 1,
              }}
            />

            {/* Validity icon */}
            <div
              style={{
                position: "absolute",
                right: 14,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
              }}
            >
              {isValidUrl === true && (
                <CheckCircle2 size={16} color="#22c55e" />
              )}
              {isValidUrl === false && <XCircle size={16} color="#ef4444" />}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "12px 16px",
                background: "rgba(239,68,68,0.05)",
                border: "1px solid rgba(239,68,68,0.15)",
                borderRadius: 6,
                marginBottom: 12,
              }}
            >
              <p
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 13,
                  color: "#ef4444",
                  margin: 0,
                }}
              >
                {error}
              </p>
            </div>
          )}

          {/* CTA Button */}
          <button
            type="submit"
            disabled={loading || !githubUrl || isValidUrl === false}
            style={{
              width: "100%",
              height: 48,
              background:
                loading || !githubUrl || isValidUrl === false
                  ? "#16191f"
                  : "#22c55e",
              color:
                loading || !githubUrl || isValidUrl === false
                  ? "#374151"
                  : "#000",
              border: "none",
              borderRadius: 6,
              fontFamily: "DM Sans, sans-serif",
              fontSize: 15,
              fontWeight: 600,
              cursor:
                loading || !githubUrl || isValidUrl === false
                  ? "not-allowed"
                  : "pointer",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {loading ? "Analyzing…" : "Analyze Supply Chain →"}
          </button>
        </form>

        {/* Step indicators below button */}
        {!loading && (
          <StepIndicators scanStep={-1} />
        )}

        {/* Recent repositories */}
        {recentUrls.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#4a5068",
                marginBottom: 10,
              }}
            >
              Recent
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {recentUrls.map((url) => (
                <button
                  key={url}
                  onClick={() => setGithubUrl(url)}
                  style={{
                    padding: "4px 10px",
                    background: "#0e1015",
                    border: "1px solid #16191f",
                    borderRadius: 4,
                    fontFamily: "DM Mono, monospace",
                    fontSize: 11,
                    color: "#6b7280",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    maxWidth: 200,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={url}
                >
                  {getRepoDisplay(url)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
