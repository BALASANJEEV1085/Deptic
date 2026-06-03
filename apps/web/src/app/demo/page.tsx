'use client';

import React, { useState, useRef } from 'react';
import { Navbar } from '../_components/Navbar';
import {
  Search, CheckCircle2, Package, GitMerge,
  ShieldAlert, FileText, AlertTriangle, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

/* ── Preset repos & Mock Data ────────────────────────────────────────────── */
const repos = [
  { id: 'react',  name: 'facebook/react',  type: 'npm', url: 'https://github.com/facebook/react'  },
  { id: 'django', name: 'django/django',    type: 'pip', url: 'https://github.com/django/django'   },
  { id: 'gin',    name: 'gin-gonic/gin',    type: 'go',  url: 'https://github.com/gin-gonic/gin'  },
];

const mockResults: Record<string, any> = {
  react: {
    scan: {
      repo_name: 'facebook/react',
      ecosystem: 'npm',
      component_count: 1443,
      critical_cves: 2,
      high_cves: 5,
      ntia_score: 82,
    },
    vulns: [
      { component_name: 'terser', component_version: '4.8.0', cve_id: 'CVE-2022-25856', severity: 'HIGH', fixed_version: '4.8.1' },
      { component_name: 'minimist', component_version: '1.2.5', cve_id: 'CVE-2021-44906', severity: 'HIGH', fixed_version: '1.2.6' },
      { component_name: 'json5', component_version: '1.0.1', cve_id: 'CVE-2022-46175', severity: 'HIGH', fixed_version: '1.0.2' },
      { component_name: 'marked', component_version: '0.3.9', cve_id: 'CVE-2022-21648', severity: 'CRITICAL', fixed_version: '4.0.10' },
      { component_name: 'trim-newlines', component_version: '3.0.0', cve_id: 'CVE-2021-33623', severity: 'CRITICAL', fixed_version: '3.0.1' },
      { component_name: 'loader-utils', component_version: '1.4.0', cve_id: 'CVE-2022-37601', severity: 'HIGH', fixed_version: '1.4.1' },
      { component_name: 'nth-check', component_version: '1.0.2', cve_id: 'CVE-2021-3803', severity: 'HIGH', fixed_version: '2.0.1' },
    ]
  },
  django: {
    scan: {
      repo_name: 'django/django',
      ecosystem: 'pip',
      component_count: 32,
      critical_cves: 0,
      high_cves: 1,
      ntia_score: 95,
    },
    vulns: [
      { component_name: 'sqlparse', component_version: '0.4.3', cve_id: 'CVE-2023-30608', severity: 'HIGH', fixed_version: '0.4.4' },
    ]
  },
  gin: {
    scan: {
      repo_name: 'gin-gonic/gin',
      ecosystem: 'go',
      component_count: 24,
      critical_cves: 0,
      high_cves: 0,
      ntia_score: 100,
    },
    vulns: []
  }
};

const SCAN_STEPS = [
  { label: 'Detect',  desc: 'Discovering packages',     Icon: Package     },
  { label: 'Scan',    desc: 'Resolving dependencies',   Icon: GitMerge    },
  { label: 'Analyze', desc: 'Checking vulnerabilities', Icon: ShieldAlert },
  { label: 'Report',  desc: 'Generating DEPTIC',          Icon: FileText    },
];

function severityColor(s: string) {
  switch (s?.toUpperCase()) {
    case 'CRITICAL': return 'text-red-500';
    case 'HIGH':     return 'text-orange-400';
    case 'MEDIUM':   return 'text-yellow-400';
    default:         return 'text-blue-400';
  }
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function DemoPage() {
  const [selectedRepo, setSelectedRepo] = useState('react');
  const [isScanning,   setIsScanning]   = useState(false);
  const [scanStep,     setScanStep]     = useState(-1);
  const [scannedData,  setScannedData]  = useState<Record<string, any>>({});
  const [activeTab,    setActiveTab]    = useState('VULNERABILITIES');

  const stepRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = () => {
    stepRef.current.forEach(clearTimeout);
    stepRef.current = [];
  };

  const handleScan = () => {
    clearTimers();
    setIsScanning(true);
    setActiveTab('VULNERABILITIES');
    setScanStep(0);

    // Simulated scan sequence (UI feels identical to real scan)
    stepRef.current = [
      setTimeout(() => setScanStep(1), 1500),
      setTimeout(() => setScanStep(2), 3500),
      setTimeout(() => setScanStep(3), 5500),
      setTimeout(() => {
        setScanStep(4);
        setIsScanning(false);
        const data = mockResults[selectedRepo];
        setScannedData(prev => ({ ...prev, [selectedRepo]: data }));
      }, 7000),
    ];
  };

  const repo = repos.find(r => r.id === selectedRepo)!;
  const currentData = scannedData[selectedRepo];
  const hasResult = !!currentData;
  const scan = currentData?.scan;
  const vulns = currentData?.vulns || [];

  const stats = scan ? [
    { label: 'COMPONENTS',   value: scan.component_count ?? '—'                          },
    { label: 'CRITICAL CVEs',value: scan.critical_cves   ?? 0,  isThreat: true           },
    { label: 'HIGH CVEs',    value: scan.high_cves        ?? 0,  isThreat: true           },
    { label: 'NTIA SCORE',   value: scan.ntia_score != null ? `${scan.ntia_score}%` : '—' },
    { label: 'ECOSYSTEM',    value: scan.ecosystem ?? repo.type                           },
  ] : [];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      <Navbar />

      <main className="flex-1 w-full max-w-[1100px] mx-auto px-4 md:px-8 pt-12 pb-10
                       flex flex-col lg:flex-row items-center justify-center
                       gap-8 lg:gap-6 min-h-[calc(100vh-80px)]">

        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div className="w-full lg:w-[280px] flex-shrink-0 flex flex-col lg:pr-4">
          <span className="font-mono text-white/70 uppercase text-[10px] font-semibold tracking-wider mb-3">
            Live demo
          </span>
          <h2
            className="text-2xl md:text-[28px] font-bold tracking-[-1px] leading-[1.1] mb-3"
            style={{ fontFamily: 'var(--font-syne, Syne)' }}
          >
            See exactly what's inside any repository
          </h2>
          <p className="text-white/55 text-xs leading-relaxed mb-6">
            Run a live supply-chain audit on any of the preset repositories — powered by the same engine as the dashboard.
          </p>

          <div className="flex flex-col gap-3">
            {[
              'Full dependency tree — direct and transitive',
              'CVE vulnerability detection per component',
              'NTIA compliance score with element breakdown',
            ].map((v: string, i: number) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-white" />
                <span className="text-xs font-medium leading-snug text-white/90">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column ────────────────────────────────────────────────── */}
        <div className="flex-1 w-full flex flex-col justify-center max-w-[760px]">

          {/* Controls bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4 items-center
                          justify-between bg-[#111] p-1.5 rounded-xl border border-white/5">
            <div className="flex gap-1 overflow-x-auto w-full sm:w-auto">
              {repos.map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    if (isScanning) return;
                    setSelectedRepo(r.id);
                    setActiveTab('VULNERABILITIES');
                  }}
                  disabled={isScanning}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors
                    ${selectedRepo === r.id ? 'bg-white/10 text-white' : 'bg-transparent text-white/50 hover:text-white/80'}
                    ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {r.name} <span className="opacity-40 ml-0.5">({r.type})</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleScan}
              disabled={isScanning}
              className={`px-5 py-2 mr-0.5 text-sm font-semibold rounded-lg transition-all whitespace-nowrap
                ${isScanning
                  ? 'bg-white/20 text-white/50 cursor-not-allowed'
                  : 'bg-white hover:bg-gray-200 active:scale-95 text-black'}`}
            >
              {isScanning ? 'Scanning…' : hasResult ? 'Scan Again' : 'Start Scan'}
            </button>
          </div>

          {/* Mockup box */}
          <div
            className="relative w-full rounded-[14px] bg-[#0c0d12] border border-white/5
                       overflow-hidden flex flex-col h-[440px]"
            style={{ boxShadow: '0 30px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}
          >
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-[rgba(255,255,255,0.04)]
                            to-transparent pointer-events-none z-0" />

            {/* Browser chrome */}
            <div className="relative z-10 h-10 border-b border-white/5
                            flex items-center px-4 gap-3 bg-[#111218] flex-shrink-0">
              <div className="flex gap-1.5">
                {[0,1,2].map(i => <div key={i} className="w-2.5 h-2.5 rounded-full bg-white/10" />)}
              </div>
              <div className="flex-1 max-w-xs mx-auto bg-black/40 rounded h-6
                              flex items-center px-3 justify-center
                              text-[11px] text-white/35 font-mono truncate">
                app.sbom.io/dashboard/scans/{repo.id}
              </div>
            </div>

            {/* Body */}
            <div className="relative z-10 flex flex-col flex-1 p-4 md:p-6 overflow-y-auto">

              {/* ── Scanning ── */}
              {isScanning && (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <p className="font-mono text-[10px] text-white/30 tracking-[0.12em] uppercase mb-1">
                    Analyzing Repository
                  </p>
                  <p className="font-mono text-xs text-white/70 mb-10">{repo.name}</p>

                  <div className="flex items-center">
                    {SCAN_STEPS.map((step, i) => {
                      const isDone   = scanStep > i;
                      const isActive = scanStep === i;
                      return (
                        <React.Fragment key={step.label}>
                          <div className="flex flex-col items-center gap-2 w-20">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center
                                            border-2 transition-all duration-500
                                            ${isDone
                                              ? 'bg-white/15 border-white'
                                              : isActive
                                                ? 'bg-white/10 border-white shadow-[0_0_14px_rgba(255,255,255,0.25)]'
                                                : 'bg-[#0e1015] border-[#1a1d26]'}`}>
                              {isDone
                                ? <CheckCircle2 size={14} className="text-white" />
                                : <step.Icon size={13} className={isActive ? 'text-white' : 'text-white/20'} />
                              }
                            </div>
                            <p className={`text-[9px] font-bold uppercase tracking-wider transition-colors
                                          ${isDone ? 'text-white/25' : isActive ? 'text-white' : 'text-white/20'}`}>
                              {step.label}
                            </p>
                            <p className="text-[8px] text-white/20 text-center">{step.desc}</p>
                          </div>
                          {i < SCAN_STEPS.length - 1 && (
                            <div className={`w-5 h-px mb-8 transition-all duration-500
                                            ${isDone ? 'bg-white' : 'bg-white/10'}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Empty ── */}
              {!isScanning && !hasResult && (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center
                                  justify-center mb-4 text-white/25">
                    <Search size={22} />
                  </div>
                  <h3 className="text-sm font-bold mb-2">Ready to Audit</h3>
                  <p className="text-white/35 text-xs max-w-xs leading-relaxed">
                    Select a repository preset and click "Start Scan" to run a live supply-chain audit.
                  </p>
                </div>
              )}

              {/* ── Results ── */}
              {!isScanning && hasResult && scan && (
                <div className="flex flex-col h-full">

                  {/* Header */}
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <h3 className="text-sm font-bold" style={{ fontFamily: 'var(--font-syne,Syne)' }}>
                        {scan.repo_name ?? repo.name}
                      </h3>
                      <p className="text-[11px] text-white/35 mt-0.5">
                        Supply Chain Audit · {scan.ecosystem ?? repo.type}
                      </p>
                    </div>
                    <div className="bg-white/10 border border-white/20
                                    text-white text-[10px] font-bold px-2.5 py-1
                                    rounded uppercase tracking-wider">
                      Complete
                    </div>
                  </div>

                  {/* Stat cards */}
                  <div className="grid grid-cols-5 gap-3 mb-5 pb-5 border-b border-white/5">
                    {stats.map((s, i) => (
                      <div key={i} className="flex flex-col gap-1">
                        <span className="text-[9px] font-bold text-white/25 tracking-widest">{s.label}</span>
                        <span className={`text-lg font-light tracking-tight
                                         ${s.isThreat && Number(s.value) > 0 ? 'text-red-400' : 'text-white'}`}>
                          {s.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center gap-5 border-b border-white/5 mb-4 pb-1.5">
                    {['VULNERABILITIES', 'BILL OF MATERIALS'].map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`text-[10px] font-bold tracking-wider pb-1.5 whitespace-nowrap transition-colors
                          ${activeTab === tab
                            ? 'text-white border-b border-white'
                            : 'text-white/30 hover:text-white/55'}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Tab body */}
                  <div className="flex-1 overflow-auto">
                    {activeTab === 'VULNERABILITIES' && (
                      <div className="min-w-[560px]">
                        <div className="grid grid-cols-12 gap-3 py-2 border-b border-white/5
                                        text-[9px] font-bold text-white/25 tracking-widest">
                          <div className="col-span-3">COMPONENT</div>
                          <div className="col-span-2">VERSION</div>
                          <div className="col-span-3">CVE ID</div>
                          <div className="col-span-2">SEVERITY</div>
                          <div className="col-span-2">FIX</div>
                        </div>

                        {vulns.length > 0 ? (
                          <>
                            {vulns.slice(0, 12).map((v: any, i: number) => (
                              <div key={i} className="grid grid-cols-12 gap-3 py-2.5
                                                      border-b border-white/5 text-[11px] items-center">
                                <div className="col-span-3 font-mono text-white/75 truncate">{v.component_name}</div>
                                <div className="col-span-2 text-white/45 truncate">{v.component_version}</div>
                                <div className="col-span-3 text-white/45 truncate">{v.cve_id}</div>
                                <div className={`col-span-2 font-bold ${severityColor(v.severity)}`}>{v.severity}</div>
                                <div className="col-span-2 text-white/45 truncate">{v.fixed_version || '—'}</div>
                              </div>
                            ))}
                          </>
                        ) : (
                          <div className="py-8 text-center text-white/25 text-xs">
                            No known vulnerabilities detected — great news!
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'BILL OF MATERIALS' && (
                      <div className="py-10 text-center text-white/25 text-xs space-y-2">
                        <p>Full BOM is available in the dashboard.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {hasResult && !isScanning && (
            <p className="text-center text-[11px] text-white/25 mt-3">
              Select a different preset or click "Scan Again" to re-run.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
