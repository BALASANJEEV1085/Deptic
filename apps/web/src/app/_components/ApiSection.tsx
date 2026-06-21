"use client";

import React, { useState } from 'react';
import { Terminal, Copy, Check, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function CodeSnippet({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="relative rounded-xl bg-[#0a0a0a] border border-white/10 overflow-hidden mt-3">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#111]">
        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{lang}</span>
        <CopyButton text={code} />
      </div>
      <pre className="text-[13px] text-emerald-400 p-5 overflow-x-auto font-mono leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

export function ApiSection() {
  const [platform, setPlatform] = useState<'windows' | 'mac'>('windows');

  const installSnippet = `npm install -g deptic-scan`;

  const windowsSnippet = `# Navigate to your project folder
cd C:\\Users\\you\\projects\\my-app

# Run the scanner
deptic-scan`;

  const macSnippet = `# Navigate to your project folder
cd ~/projects/my-app

# Run the scanner
deptic-scan`;

  return (
    <section id="api" className="py-24 bg-[#0a0a0a] border-t border-white/5">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4">
            API & CLI Integration
          </p>
          <h2 className="text-white text-3xl md:text-4xl font-bold tracking-tight">
            Scan directly from your terminal
          </h2>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111] overflow-hidden p-6 md:p-10 space-y-10">
          
          <div className="space-y-3">
            <h3 className="text-white text-lg font-bold flex items-center gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-black text-xs font-bold">1</span>
              Install the scanner (one time only)
            </h3>
            <CodeSnippet code={installSnippet} lang="npm" />
          </div>

          <div className="space-y-3">
            <h3 className="text-white text-lg font-bold flex items-center gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-black text-xs font-bold">2</span>
              Navigate to your project & run
            </h3>
            <div className="flex gap-1.5 p-1 rounded-lg bg-black/50 border border-white/10 w-fit mb-4">
              <button
                onClick={() => setPlatform('windows')}
                className={cn(
                  "px-4 py-2 rounded-md text-xs font-bold transition-all",
                  platform === 'windows'
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Windows PowerShell
              </button>
              <button
                onClick={() => setPlatform('mac')}
                className={cn(
                  "px-4 py-2 rounded-md text-xs font-bold transition-all",
                  platform === 'mac'
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                Mac / Linux
              </button>
            </div>
            <CodeSnippet
              code={platform === 'windows' ? windowsSnippet : macSnippet}
              lang={platform === 'windows' ? 'powershell' : 'bash'}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-white text-lg font-bold flex items-center gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-black text-xs font-bold">3</span>
              Enter your API key when prompted
            </h3>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
              The scanner will ask for your API key, then automatically detect manifest files 
              (<code className="text-zinc-300">package.json</code>, <code className="text-zinc-300">requirements.txt</code>, 
              <code className="text-zinc-300">pom.xml</code>, <code className="text-zinc-300">go.mod</code>, etc.) 
              and send them for analysis.
            </p>
            
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mt-4 max-w-2xl">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-500/90 leading-relaxed">
                Each API key is <strong className="text-amber-500 font-bold">single-use</strong> — it works for exactly one scan and is permanently consumed. Generate a new key for each scan.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
