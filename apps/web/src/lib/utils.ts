import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getComplianceStatus(score: number): { label: string; color: string } {
  if (score >= 95) return { label: 'COMPLIANT', color: 'green' }
  if (score >= 75) return { label: 'PARTIALLY COMPLIANT', color: 'amber' }
  return { label: 'NON-COMPLIANT', color: 'red' }
}
