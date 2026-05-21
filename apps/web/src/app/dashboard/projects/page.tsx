"use client";

import { useEffect, useState, useCallback } from 'react';
import { Search, Loader2, Lock, Globe, Star, GitBranch, AlertCircle, RefreshCw, ArrowUpDown, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { listGitHubRepos } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  stargazers_count: number;
  language: string | null;
  default_branch: string;
  pushed_at: string;
  updated_at: string;
  fork: boolean;
}

// ── GitHub SVG icon ────────────────────────────────────────────────────────

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
  );
}

// ── Language colours ───────────────────────────────────────────────────────

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6', JavaScript: '#f1e05a', Python: '#3572A5',
  Go: '#00ADD8', Java: '#b07219', Rust: '#dea584', Ruby: '#701516',
  'C++': '#f34b7d', C: '#555555', 'C#': '#178600', PHP: '#4F5D95',
  Swift: '#ffac45', Kotlin: '#A97BFF', Dart: '#00B4AB', HTML: '#e34c26',
  CSS: '#563d7c', Shell: '#89e051', Vue: '#41b883', Scala: '#c22d40',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ── Repository Row ─────────────────────────────────────────────────────────

function RepoRow({ repo, onScan }: { repo: GitHubRepo; onScan: (url: string) => void }) {
  const [owner, name] = repo.full_name.split('/');
  const dotColor = repo.language ? (LANG_COLORS[repo.language] ?? '#8b949e') : null;

  return (
    <tr className="group border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      {/* Repo name */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
            <GitHubIcon className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-zinc-500">{owner}/</span>
              <span className="text-[13px] font-semibold text-white leading-tight">{name}</span>
              {repo.private ? (
                <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-widest text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded border border-white/5">
                  <Lock className="h-2 w-2" /> Private
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-widest text-sky-400 bg-sky-400/10 px-1.5 py-0.5 rounded border border-sky-400/20">
                  <Globe className="h-2 w-2" /> Public
                </span>
              )}
              {repo.fork && (
                <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-600 bg-zinc-800/50 px-1.5 py-0.5 rounded border border-white/5">Fork</span>
              )}
            </div>
            {repo.description && (
              <p className="text-[10px] text-zinc-600 truncate max-w-[340px] mt-0.5 leading-relaxed">{repo.description}</p>
            )}
          </div>
        </div>
      </td>

      {/* Language */}
      <td className="px-4 py-3.5 hidden lg:table-cell">
        {repo.language ? (
          <span className="flex items-center gap-1.5 text-[11px] text-zinc-400 whitespace-nowrap">
            <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor! }} />
            {repo.language}
          </span>
        ) : (
          <span className="text-[10px] text-zinc-700">—</span>
        )}
      </td>

      {/* Stars */}
      <td className="px-4 py-3.5 hidden xl:table-cell">
        {repo.stargazers_count > 0 ? (
          <span className="flex items-center gap-1 text-[11px] text-zinc-500">
            <Star className="h-3 w-3" />
            {repo.stargazers_count.toLocaleString()}
          </span>
        ) : (
          <span className="text-[10px] text-zinc-700">—</span>
        )}
      </td>

      {/* Branch */}
      <td className="px-4 py-3.5 hidden xl:table-cell">
        <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
          <GitBranch className="h-3 w-3 shrink-0" />
          {repo.default_branch}
        </span>
      </td>

      {/* Last push */}
      <td className="px-4 py-3.5 hidden md:table-cell">
        <span className="text-[11px] text-zinc-500 whitespace-nowrap">
          {timeAgo(repo.pushed_at)}
        </span>
      </td>

      {/* Action */}
      <td className="px-5 py-3.5 text-right">
        <button
          onClick={() => onScan(repo.html_url)}
          className="inline-flex items-center gap-1.5 bg-[#22c55e]/10 hover:bg-[#22c55e]/20 border border-[#22c55e]/20 hover:border-[#22c55e]/40 text-[#22c55e] text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all whitespace-nowrap group-hover:border-[#22c55e]/40"
        >
          Scan <ChevronRight className="h-2.5 w-2.5" />
        </button>
      </td>
    </tr>
  );
}

// ── Not Connected ──────────────────────────────────────────────────────────

function NotConnected({ onConnect, loading }: { onConnect: () => void; loading: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] text-center">
      {/* Outer ring glow */}
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-[#22c55e]/10 blur-2xl scale-150" />
        <div className="relative h-24 w-24 rounded-2xl bg-gradient-to-br from-white/[0.05] to-white/[0.01] border border-white/[0.08] flex items-center justify-center shadow-2xl">
          <GitHubIcon className="h-12 w-12 text-zinc-300" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Connect your GitHub account</h2>
      <p className="text-sm text-zinc-500 max-w-sm mb-8 leading-relaxed">
        Browse all your repositories, scan for vulnerabilities, and generate SBOM reports — all in one place.
      </p>

      {/* Feature list */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10 max-w-2xl w-full">
        {[
          { title: 'All repositories', desc: 'Public and private repos from your account' },
          { title: 'SBOM generation', desc: 'Automated software bill of materials' },
          { title: 'NTIA compliance', desc: 'EO 14028 compliance scoring per scan' },
        ].map(f => (
          <div key={f.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left">
            <p className="text-xs font-bold text-white mb-1">{f.title}</p>
            <p className="text-[10px] text-zinc-600 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onConnect}
        disabled={loading}
        className="inline-flex items-center gap-3 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-60 text-black font-bold text-[11px] px-8 py-3 rounded-xl transition-all uppercase tracking-widest"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitHubIcon className="h-4 w-4" />}
        Authorize with GitHub
      </button>
      <p className="text-[10px] text-zinc-700 mt-4">Read-only access · No write permissions</p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

type FilterTab = 'all' | 'public' | 'private' | 'forked';
type SortKey = 'pushed' | 'name' | 'stars';

export default function ProjectsPage() {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [status, setStatus] = useState<'loading' | 'connected' | 'not_connected' | 'error'>('loading');
  const [connectingOAuth, setConnectingOAuth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<FilterTab>('all');
  const [sort, setSort] = useState<SortKey>('pushed');
  const router = useRouter();

  const fetchRepos = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setStatus('not_connected'); return; }

      const data = await listGitHubRepos();
      setRepos(data.repositories as GitHubRepo[]);
      setStatus('connected');
    } catch (e: any) {
      if (e.message && (e.message.includes("GitHub not connected") || e.message.includes("401") || e.message.includes("Bad credentials"))) {
        setStatus('not_connected');
      } else {
        setError(e.message || 'Unknown error');
        setStatus('error');
      }
    }
  }, []);

  useEffect(() => { fetchRepos(); }, [fetchRepos]);


  const handleConnect = useCallback(async () => {
    setConnectingOAuth(true);
    const supabase = createClient();
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/dashboard/projects`,
        scopes: 'repo read:user read:org',
        queryParams: { prompt: 'consent' },
      },
    });
    if (e) { setError(e.message); setConnectingOAuth(false); }
  }, []);

  const handleScan = useCallback((url: string) => {
    router.push(`/dashboard/projects/new?url=${encodeURIComponent(url)}`);
  }, [router]);

  // Filter + sort
  const visible = repos
    .filter(r => {
      if (tab === 'public') return !r.private && !r.fork;
      if (tab === 'private') return r.private;
      if (tab === 'forked') return r.fork;
      return true;
    })
    .filter(r =>
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (r.description ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'stars') return b.stargazers_count - a.stargazers_count;
      return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
    });

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all',     label: 'All',     count: repos.length },
    { key: 'public',  label: 'Public',  count: repos.filter(r => !r.private && !r.fork).length },
    { key: 'private', label: 'Private', count: repos.filter(r => r.private).length },
    { key: 'forked',  label: 'Forked',  count: repos.filter(r => r.fork).length },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-0">

      {/* ── Page header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.04] pb-5 mb-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-0.5">Projects</h1>
          <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-bold">
            {status === 'connected' ? `${visible.length} of ${repos.length} repositories` : 'GitHub repositories'}
          </p>
        </div>
        {status === 'connected' && (
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRepos}
              className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-300 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] px-3 py-1.5 rounded-lg transition-all"
            >
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          </div>
        )}
      </div>

      {/* ── Loading ── */}
      {status === 'loading' && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-[#22c55e]" />
        </div>
      )}

      {/* ── Not connected ── */}
      {status === 'not_connected' && (
        <NotConnected onConnect={handleConnect} loading={connectingOAuth} />
      )}

      {/* ── Error ── */}
      {status === 'error' && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
          <div className="h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-red-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm mb-1">Failed to load repositories</p>
            <p className="text-xs text-zinc-500 max-w-xs">{error}</p>
          </div>
          <button onClick={fetchRepos} className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-[10px] font-bold px-4 py-2 rounded-lg transition-all uppercase tracking-widest">
            <RefreshCw className="h-3 w-3" /> Try Again
          </button>
        </div>
      )}

      {/* ── Connected: toolbar + table ── */}
      {status === 'connected' && (
        <div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-4 border-b border-white/[0.04]">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] rounded-lg p-1 shrink-0">
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all',
                    tab === t.key
                      ? 'bg-white/[0.08] text-white'
                      : 'text-zinc-600 hover:text-zinc-400'
                  )}
                >
                  {t.label}
                  <span className={cn(
                    'text-[8px] font-bold px-1 rounded',
                    tab === t.key ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-white/5 text-zinc-600'
                  )}>{t.count}</span>
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
              <input
                type="text"
                placeholder="Search repositories…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-white/[0.02] border border-white/[0.07] rounded-lg text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-[#22c55e]/30 focus:bg-white/[0.03] transition-all"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1 ml-auto shrink-0">
              <ArrowUpDown className="h-3 w-3 text-zinc-600" />
              <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mr-1">Sort:</span>
              {(['pushed', 'name', 'stars'] as SortKey[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className={cn(
                    'px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest rounded transition-all',
                    sort === s
                      ? 'bg-white/[0.08] text-white border border-white/10'
                      : 'text-zinc-600 hover:text-zinc-400'
                  )}
                >
                  {s === 'pushed' ? 'Recent' : s === 'name' ? 'Name' : 'Stars'}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/[0.06] rounded-xl mt-4 bg-white/[0.005]">
              <GitHubIcon className="h-10 w-10 text-zinc-700 mb-3" />
              <p className="text-zinc-500 text-sm">
                {search ? `No repositories match "${search}"` : `No ${tab === 'all' ? '' : tab} repositories found.`}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/[0.06] overflow-hidden mt-4 shadow-2xl">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="px-5 py-2.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500">Repository</th>
                    <th className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500 hidden lg:table-cell">Language</th>
                    <th className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500 hidden xl:table-cell">Stars</th>
                    <th className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500 hidden xl:table-cell">Branch</th>
                    <th className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500 hidden md:table-cell">Last Push</th>
                    <th className="px-5 py-2.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {visible.map(repo => (
                    <RepoRow key={repo.id} repo={repo} onScan={handleScan} />
                  ))}
                </tbody>
              </table>

              {/* Table footer */}
              <div className="px-5 py-2.5 border-t border-white/[0.04] bg-white/[0.01] flex items-center justify-between">
                <p className="text-[10px] text-zinc-700">
                  Showing <span className="text-zinc-500 font-semibold">{visible.length}</span> of <span className="text-zinc-500 font-semibold">{repos.length}</span> repositories
                </p>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                  <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">GitHub Connected</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
