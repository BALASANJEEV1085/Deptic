"use client"

import * as React from 'react'
import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

export function H1({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1 
      className={cn("font-heading text-4xl font-bold tracking-tight text-white border-b border-[var(--lp-border)] pb-5 mb-8", className)} 
      {...props}
    >
      {children}
    </h1>
  )
}

export function H2({ children, id, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 
      id={id}
      className={cn("font-heading text-2xl font-semibold text-white mt-12 mb-4 scroll-m-20", className)} 
      {...props}
    >
      {children}
    </h2>
  )
}

export function H3({ children, id, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 
      id={id}
      className={cn("text-lg font-semibold text-white mt-8 mb-3 scroll-m-20", className)} 
      {...props}
    >
      {children}
    </h3>
  )
}

export function H4({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h4 
      className={cn("text-sm font-semibold uppercase tracking-widest text-[var(--lp-text-muted)] mt-6 mb-2", className)} 
      {...props}
    >
      {children}
    </h4>
  )
}

export function P({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p 
      className={cn("text-base text-[var(--lp-text-muted)] leading-[1.8] mb-4", className)} 
      {...props}
    >
      {children}
    </p>
  )
}

export function A({ children, className, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a 
      className={cn("text-white underline decoration-[#888888] hover:decoration-white transition-colors cursor-pointer", className)} 
      {...props}
    >
      {children}
    </a>
  )
}

export function Ul({ children, className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul 
      className={cn("list-disc list-outside pl-6 text-[var(--lp-text-muted)] mb-4 space-y-2", className)} 
      {...props}
    >
      {children}
    </ul>
  )
}

export function Ol({ children, className, ...props }: React.HTMLAttributes<HTMLOListElement>) {
  return (
    <ol 
      className={cn("list-decimal list-outside pl-6 text-[var(--lp-text-muted)] mb-4 space-y-2", className)} 
      {...props}
    >
      {children}
    </ol>
  )
}

export function Li({ children, className, ...props }: React.HTMLAttributes<HTMLLIElement>) {
  return (
    <li className={cn("text-base leading-[1.8]", className)} {...props}>
      {children}
    </li>
  )
}

export function InlineCode({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <code 
      className={cn("font-mono text-xs bg-[var(--lp-surface-2)] border border-[var(--lp-border)] rounded px-1.5 py-0.5 text-white", className)} 
      {...props}
    >
      {children}
    </code>
  )
}

export function CodeBlock({ children, language, className }: { children: string, language?: string, className?: string }) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn("relative group mb-6 rounded-lg border border-[var(--lp-border)] bg-[#0d0d0d] overflow-hidden", className)}>
      {language && (
        <div className="absolute top-0 right-0 px-3 py-1.5 text-[10px] uppercase font-mono text-[var(--lp-text-muted)]">
          {language}
        </div>
      )}
      <button 
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-md bg-[var(--lp-surface-2)] text-[var(--lp-text-muted)] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <pre className="p-5 font-mono text-[13px] text-[#e2e8f0] overflow-x-auto">
        <code>{children}</code>
      </pre>
    </div>
  )
}

export function Callout({ children, type = "info", className }: { children: React.ReactNode, type?: "info" | "warning" | "danger", className?: string }) {
  const borderColors = {
    info: "border-l-[#333333]",
    warning: "border-l-[#555555]",
    danger: "border-l-[#444444]", // Requirements specific
  }

  return (
    <div className={cn(`bg-[var(--lp-surface)] border-l-4 ${borderColors[type]} p-5 mb-6`, className)}>
      {children}
    </div>
  )
}

export function Table({ children, className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto mb-6">
      <table className={cn("w-full border-collapse border border-[var(--lp-border)] text-left", className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function Th({ children, className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th 
      className={cn("bg-[var(--lp-surface-2)] px-4 py-3 text-xs uppercase tracking-wider text-white border border-[var(--lp-border)] font-semibold", className)} 
      {...props}
    >
      {children}
    </th>
  )
}

export function Td({ children, className, ...props }: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td 
      className={cn("px-4 py-3 text-sm text-[var(--lp-text-muted)] border border-[var(--lp-border)]", className)} 
      {...props}
    >
      {children}
    </td>
  )
}

export function Tr({ children, className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr 
      className={cn("bg-[#000000] [&:nth-child(even)]:bg-[var(--lp-surface)]", className)} 
      {...props}
    >
      {children}
    </tr>
  )
}

export function StepIndicator({ step, children, className }: { step: number, children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("flex gap-4 mt-8 mb-4 items-start", className)}>
      <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-[var(--lp-surface-2)] border border-[var(--lp-border-2)] text-xs font-semibold text-white">
        {step}
      </div>
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}
