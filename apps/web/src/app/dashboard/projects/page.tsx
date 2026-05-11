"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, GitFork, Package, ShieldAlert, ExternalLink, Loader2, Folder } from 'lucide-react';
import { listProjects, Project, ecosystemLabel, ecosystemColorClass, ntiaScoreColor, relativeTime, shortId } from '@/lib/api';
import { cn } from '@/lib/utils';

function EcoBadge({ eco, status }: { eco: string; status?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
      ecosystemColorClass(eco)
    )}>
      {ecosystemLabel(eco, status)}
    </span>
  );
}

function NtiaCircle({ score }: { score: number }) {
  const color = score === 100 ? '#22c55e' : score >= 60 ? '#f97316' : '#ef4444';
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative h-14 w-14 shrink-0 flex items-center justify-center">
      <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
        <circle cx="28" cy="28" r={r} stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="none" />
        <circle
          cx="28" cy="28" r={r}
          stroke={color} strokeWidth="4" fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <span className="absolute text-[11px] font-extrabold" style={{ color }}>{score}</span>
    </div>
  );
}

function VulnStrip({ crit, high, med, low }: { crit: number; high: number; med: number; low: number }) {
  const total = crit + high + med + low;
  if (total === 0) return (
    <div className="flex items-center gap-1 text-[10px] text-zinc-600 font-medium">
      <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" /> No vulnerabilities
    </div>
  );
  return (
    <div className="flex h-1.5 w-full rounded-full overflow-hidden gap-px">
      {crit > 0  && <div className="bg-red-500"    style={{ width: `${(crit / total) * 100}%` }} title={`${crit} Critical`} />}
      {high > 0  && <div className="bg-orange-500" style={{ width: `${(high / total) * 100}%` }} title={`${high} High`} />}
      {med > 0   && <div className="bg-amber-500"  style={{ width: `${(med  / total) * 100}%` }} title={`${med} Medium`} />}
      {low > 0   && <div className="bg-zinc-500"   style={{ width: `${(low  / total) * 100}%` }} title={`${low} Low`} />}
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const totalVulns = project.critical_cves + project.high_cves + project.medium_cves + project.low_cves;
  return (
    <div className="group rounded-xl border border-white/[0.05] bg-white/[0.01] hover:border-white/10 hover:bg-white/[0.025] transition-all duration-200 overflow-hidden flex flex-col">
      {/* Card body */}
      <div className="p-5 flex items-start gap-4 flex-1">
        {/* Repo icon + name */}
        <div className="h-10 w-10 rounded-lg bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shrink-0">
          <GitFork className="h-5 w-5 text-zinc-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <p className="font-bold text-white text-sm leading-tight truncate">{project.repo_name}</p>
              <p className="text-[10px] text-zinc-600 font-mono mt-0.5">#{shortId(project.latest_scan_id)}</p>
            </div>
            <EcoBadge eco={project.ecosystem} status={project.status} />
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {project.component_count.toLocaleString()} libs
            </span>
            {totalVulns > 0 && (
              <span className="flex items-center gap-1 text-orange-400 font-semibold">
                <ShieldAlert className="h-3 w-3" />
                {totalVulns} vuln{totalVulns > 1 ? 's' : ''}
              </span>
            )}
            <span className="text-zinc-600">{relativeTime(project.created_at)}</span>
          </div>
        </div>

        {/* NTIA score circle */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <NtiaCircle score={project.ntia_score} />
          <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-bold">NTIA</span>
        </div>
      </div>

      {/* Vuln strip + action */}
      <div className="border-t border-white/[0.04] px-5 py-3 flex items-center gap-4">
        <div className="flex-1">
          <VulnStrip
            crit={project.critical_cves}
            high={project.high_cves}
            med={project.medium_cves}
            low={project.low_cves}
          />
        </div>
        <Link
          href={`/dashboard/scans/${project.latest_scan_id}`}
          className="shrink-0 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#22c55e] hover:text-[#16a34a] transition-colors"
        >
          View Scan <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    listProjects()
      .then(res => { setProjects(res.projects || []); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const filtered = projects.filter(p =>
    p.repo_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.04] pb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Projects</h1>
          <p className="text-sm text-zinc-500">Scanned repositories grouped by GitHub URL.</p>
        </div>
        <Link
          href="/dashboard/projects/new"
          className="inline-flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-black text-xs font-bold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Connect Repository
        </Link>
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
        <input
          type="text"
          placeholder="Search by repository..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-white/[0.02] border border-white/[0.08] rounded-lg text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-[#22c55e]/40 transition-colors"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-[#22c55e]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 p-20 text-center flex flex-col items-center justify-center bg-white/[0.01]">
          <div className="h-16 w-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-5 border border-white/[0.05]">
            <Folder className="h-8 w-8 text-zinc-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {search ? 'No matching projects' : 'No projects yet'}
          </h3>
          <p className="text-sm text-zinc-500 max-w-sm mb-8">
            {search
              ? `No repositories match "${search}".`
              : 'Start a scan to see your repositories appear here as projects.'}
          </p>
          {!search && (
            <Link
              href="/dashboard/projects/new"
              className="inline-flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-black text-xs font-bold px-4 py-2.5 rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Connect Repository
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <ProjectCard key={p.latest_scan_id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
