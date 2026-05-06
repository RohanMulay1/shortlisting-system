import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600"
  if (score >= 65) return "text-indigo-600"
  if (score >= 50) return "text-amber-600"
  return "text-red-500"
}

export function scoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500"
  if (score >= 65) return "bg-indigo-500"
  if (score >= 50) return "bg-amber-500"
  return "bg-red-500"
}

export function scoreLabel(score: number): string {
  if (score >= 80) return "Excellent"
  if (score >= 65) return "Good"
  if (score >= 50) return "Fair"
  return "Poor"
}

export function statusColor(status: string) {
  switch (status) {
    case "shortlisted": return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "reviewing": return "bg-indigo-50 text-indigo-700 border-indigo-200"
    case "rejected": return "bg-red-50 text-red-600 border-red-200"
    default: return "bg-zinc-100 text-zinc-600 border-zinc-200"
  }
}
