"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Box, ShieldAlert, FileCheck, GitPullRequest, Puzzle,
  CheckCircle2, Zap, Lock, BarChart3, Globe, GitMerge,
  ArrowRight
} from "lucide-react";

/* ── Feature Data ─────────────────────────────────────────────────────────── */
const FEATURES = [
  {
    id: "sbom",
    icon: Box,
    tag: "SBOM Generation",
    title: "Full-Stack Dependency Mapping",
    description:
      "Drop in a GitHub URL or scan locally — Deptic recursively resolves every direct and transitive dependency, from npm to Maven to Go modules. CycloneDX and SPDX outputs in seconds, not hours.",
    bullets: [
      "Multi-ecosystem: npm, pip, Maven, Go, Rust, Ruby, PHP",
      "Deep transitive resolution up to the leaf node",
      "CycloneDX + SPDX export in one click",
      "CI/CD integration with zero config",
    ],
    accentColor: "#ffffff",
  },
  {
    id: "cve",
    icon: ShieldAlert,
    tag: "CVE Detection",
    title: "Real-Time Vulnerability Intelligence",
    description:
      "Every component is matched against the NVD, GitHub Advisory Database, and OSV in real-time. Critical CVEs trigger instant push notifications and Slack alerts so your team can respond within minutes.",
    bullets: [
      "NVD, GHSA, and OSV cross-referencing",
      "Severity breakdown: Critical, High, Medium, Low",
      "Push notifications for critical CVEs",
      "Slack and Jira integration for workflow automation",
    ],
    accentColor: "#ffffff",
  },
  {
    id: "compliance",
    icon: FileCheck,
    tag: "Compliance",
    title: "NTIA & EU CRA Compliance Scoring",
    description:
      "Deptic scores every scan against the NTIA Minimum Elements and EU Cyber Resilience Act requirements. See exactly which fields are missing and get a clear path to 100% compliance.",
    bullets: [
      "NTIA score out of 100 for every scan",
      "EU CRA readiness assessment",
      "Field-level gap analysis with fix suggestions",
      "Downloadable PDF compliance reports",
    ],
    accentColor: "#ffffff",
  },
  {
    id: "fixpr",
    icon: GitPullRequest,
    tag: "Fix with PR",
    title: "One-Click Remediation PRs",
    description:
      "For every vulnerable dependency, Deptic identifies the minimum safe upgrade version and generates a pull request directly to your repository. Review, approve, merge — threat neutralized.",
    bullets: [
      "Automatic safe version detection",
      "PR generated directly in your GitHub repo",
      "Grouped updates to minimize breaking changes",
      "Before/after vulnerability diff in PR description",
    ],
    accentColor: "#ffffff",
  },
  {
    id: "integrations",
    icon: Puzzle,
    tag: "Integrations",
    title: "Fits Into Your Existing Workflow",
    description:
      "Deptic connects to the tools your team already uses. Auto-create Jira tickets for critical CVEs, post scan summaries to Slack, trigger scans on every push with GitHub webhooks, or scan locally with the CLI.",
    bullets: [
      "GitHub webhook for auto-scan on push",
      "Slack notifications with threat details",
      "Jira ticket creation for critical/high CVEs",
      "CLI scanner for local and CI/CD pipelines",
    ],
    accentColor: "#ffffff",
  },
];

/* ── Visual Cards ─────────────────────────────────────────────────────────── */
function SBOMVisual() {
  return (
    <div className="space-y-3">
      {[
        { file: "package.json", eco: "npm", abbr: "JS" },
        { file: "pom.xml", eco: "maven", abbr: "MV" },
        { file: "go.mod", eco: "go", abbr: "GO" },
        { file: "requirements.txt", eco: "pip", abbr: "PY" },
      ].map((m) => (
        <div key={m.file} className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-[10px] font-bold text-blue-400">
            {m.abbr}
          </div>
          <span className="text-[12px] text-zinc-400 font-mono flex-1">{m.file}</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/60" />
        </div>
      ))}
      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Output Formats</span>
        <div className="flex gap-2">
          {["CycloneDX", "SPDX", "PDF"].map(f => (
            <span key={f} className="text-[10px] px-2 py-1 rounded bg-white/5 text-zinc-400 font-mono">{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function CVEVisual() {
  return (
    <div className="space-y-2.5">
      {[
        { sev: "CRITICAL", pkg: "lodash@4.17.15", cve: "CVE-2021-23337", color: "#ef4444" },
        { sev: "HIGH", pkg: "axios@0.21.0", cve: "CVE-2021-3749", color: "#f97316" },
        { sev: "MEDIUM", pkg: "qs@6.5.2", cve: "CVE-2022-24999", color: "#f59e0b" },
        { sev: "LOW", pkg: "debug@3.1.0", cve: "CVE-2017-16137", color: "#6b7280" },
      ].map(v => (
        <div key={v.cve} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
          <span
            className="text-[9px] font-black px-1.5 py-0.5 rounded shrink-0"
            style={{ background: `${v.color}18`, color: v.color }}
          >
            {v.sev}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-zinc-300 font-medium truncate">{v.pkg}</p>
            <p className="text-[10px] text-zinc-600 font-mono">{v.cve}</p>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-2">
        <Zap className="w-3 h-3 text-red-400" />
        <span className="text-[10px] text-red-400/70">Push alert sent 2s ago</span>
      </div>
    </div>
  );
}

function ComplianceVisual() {
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-1">NTIA Score</p>
          <p className="text-3xl font-bold text-amber-400">92<span className="text-lg text-zinc-600">/100</span></p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
          COMPLIANT
        </span>
      </div>
      <div className="space-y-2.5 pt-2">
        {[
          { field: "Author Name", ok: true },
          { field: "Component Name", ok: true },
          { field: "Version String", ok: true },
          { field: "Unique Identifier", ok: true },
          { field: "Supplier Name", ok: false },
        ].map(f => (
          <div key={f.field} className="flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">{f.field}</span>
            {f.ok
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/60" />
              : <span className="text-[10px] text-amber-500/70 font-bold">MISSING</span>
            }
          </div>
        ))}
      </div>
    </div>
  );
}

function FixPRVisual() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
        <GitPullRequest className="w-4 h-4 text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-emerald-300 font-medium">fix: upgrade lodash 4.17.15 → 4.17.21</p>
          <p className="text-[10px] text-zinc-600">Resolves CVE-2021-23337 (CRITICAL)</p>
        </div>
      </div>
      <div className="rounded-lg bg-black/40 border border-zinc-800 p-3 font-mono text-[10px] leading-relaxed">
        <p className="text-red-400">- &quot;lodash&quot;: &quot;^4.17.15&quot;</p>
        <p className="text-emerald-400">+ &quot;lodash&quot;: &quot;^4.17.21&quot;</p>
        <p className="text-zinc-600 mt-2">{`// 1 file changed, 1 insertion(+), 1 deletion(-)`}</p>
      </div>
      <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
        <GitMerge className="w-4 h-4 text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-emerald-300 font-medium">fix: upgrade axios 0.21.0 → 0.21.4</p>
          <p className="text-[10px] text-zinc-600">Resolves CVE-2021-3749 (HIGH)</p>
        </div>
      </div>
    </div>
  );
}

function IntegrationsVisual() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { name: "GitHub", desc: "Webhook auto-scan on push", icon: Globe, color: "#8b5cf6" },
        { name: "Slack", desc: "Real-time threat alerts", icon: Zap, color: "#8b5cf6" },
        { name: "Jira", desc: "Auto ticket creation", icon: BarChart3, color: "#8b5cf6" },
        { name: "CLI", desc: "Local project scanning", icon: Lock, color: "#8b5cf6" },
      ].map(item => (
        <div key={item.name} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-violet-500/10">
            <item.icon className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-[12px] text-zinc-300 font-semibold">{item.name}</p>
            <p className="text-[10px] text-zinc-600">{item.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

const VISUALS: Record<string, React.ReactNode> = {
  sbom: <SBOMVisual />,
  cve: <CVEVisual />,
  compliance: <ComplianceVisual />,
  fixpr: <FixPRVisual />,
  integrations: <IntegrationsVisual />,
};

/* ── Intersection Observer hook ───────────────────────────────────────────── */
function useActiveStep(stepRefs: React.RefObject<(HTMLDivElement | null)[]>) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const refs = stepRefs.current;
    if (!refs) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the entry that is most visible
        let bestIndex = activeIndex;
        let bestRatio = 0;
        entries.forEach((entry) => {
          const idx = refs.indexOf(entry.target as HTMLDivElement);
          if (idx >= 0 && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            bestIndex = idx;
          }
        });
        if (bestRatio > 0) {
          setActiveIndex(bestIndex);
        }
      },
      {
        rootMargin: "-30% 0px -30% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    refs.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [stepRefs, activeIndex]);

  return activeIndex;
}

/* ── Main Component ───────────────────────────────────────────────────────── */
export function FeaturesScrollytelling() {
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeIndex = useActiveStep(stepRefs);
  const activeFeature = FEATURES[activeIndex];

  return (
    <section className="bg-[#0a0a0a] relative">
      {/* ── Section header ── */}
      <div className="text-center pt-24 pb-16 px-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
          Features
        </p>
        <h2 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight max-w-2xl mx-auto">
          Everything you need for supply chain security
        </h2>
      </div>

      {/* ── Desktop: Scrollytelling layout ── */}
      <div className="hidden lg:block max-w-6xl mx-auto px-8 lg:px-12">
        <div className="relative flex gap-16">
          {/* LEFT — Scrolling text steps */}
          <div className="w-1/2 relative">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              const isActive = i === activeIndex;
              return (
                <div
                  key={feature.id}
                  ref={(el) => { stepRefs.current[i] = el; }}
                  className="min-h-[80vh] flex items-center"
                  style={{ paddingBottom: i === FEATURES.length - 1 ? "20vh" : 0 }}
                >
                  <div
                    className="transition-opacity duration-500"
                    style={{ opacity: isActive ? 1 : 0.15 }}
                  >
                    {/* Tag */}
                    <div className="flex items-center gap-2.5 mb-5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: `${feature.accentColor}12` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: feature.accentColor }} />
                      </div>
                      <span
                        className="text-[10px] font-black uppercase tracking-[0.15em]"
                        style={{ color: feature.accentColor }}
                      >
                        {feature.tag}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-white text-2xl lg:text-3xl font-bold tracking-tight leading-tight mb-4">
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-zinc-500 text-sm leading-relaxed mb-6 max-w-md">
                      {feature.description}
                    </p>

                    {/* Bullets */}
                    <ul className="space-y-2.5">
                      {feature.bullets.map((b, j) => (
                        <li key={j} className="flex items-start gap-2.5">
                          <CheckCircle2
                            className="w-4 h-4 mt-0.5 shrink-0"
                            style={{ color: `${feature.accentColor}80` }}
                          />
                          <span className="text-[13px] text-zinc-400">{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT — Sticky visual card */}
          <div className="w-1/2">
            <div className="sticky top-[15vh] h-[70vh] flex items-center">
              <div className="w-full">
                <div
                  className="rounded-2xl border border-white/[0.06] bg-[#0c0c0e] overflow-hidden transition-all duration-500"
                >
                  {/* Card header */}
                  <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-500"
                      style={{ background: `${activeFeature.accentColor}12` }}
                    >
                      <activeFeature.icon
                        className="w-3.5 h-3.5 transition-colors duration-500"
                        style={{ color: activeFeature.accentColor }}
                      />
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.12em] transition-colors duration-500"
                      style={{ color: activeFeature.accentColor }}
                    >
                      {activeFeature.tag}
                    </span>
                  </div>

                  {/* Card body — visual changes based on active step */}
                  <div className="p-6 min-h-[320px] flex flex-col justify-center">
                    <div
                      key={activeFeature.id}
                      className="animate-fadeIn"
                    >
                      {VISUALS[activeFeature.id]}
                    </div>
                  </div>
                </div>

                {/* Step indicator removed as requested */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile: Stacked layout ── */}
      <div className="lg:hidden px-6 pb-20 space-y-20">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.id} className="space-y-6">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${feature.accentColor}12` }}
                >
                  <Icon className="w-4 h-4" style={{ color: feature.accentColor }} />
                </div>
                <span
                  className="text-[10px] font-black uppercase tracking-[0.15em]"
                  style={{ color: feature.accentColor }}
                >
                  {feature.tag}
                </span>
              </div>
              <h3 className="text-white text-2xl font-bold tracking-tight">{feature.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{feature.description}</p>
              <div className="rounded-2xl border border-white/[0.06] bg-[#0c0c0e] p-6">
                {VISUALS[feature.id]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fade-in animation keyframes */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </section>
  );
}
