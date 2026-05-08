"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  LayoutDashboard, Briefcase, Users, ClipboardCheck,
  Settings, Zap, Plus, Trash2, ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getJD, resetSession } from "@/lib/api"

const NAV = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/jobs", icon: Briefcase, label: "Jobs" },
  { href: "/candidates", icon: Users, label: "Candidates" },
  { href: "/evaluation", icon: ClipboardCheck, label: "HR Evaluation" },
]

const BOTTOM_NAV = [
  { href: "/settings", icon: Settings, label: "Settings" },
]

export function Sidebar() {
  const path = usePathname()
  const router = useRouter()
  const [jdTitle, setJdTitle] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href)

  useEffect(() => {
    getJD()
      .then(r => setJdTitle(r.jd?.title ?? null))
      .catch(() => {})
  }, [path]) // re-fetch when route changes so it updates after JD is parsed

  const handleReset = async () => {
    if (!confirmReset) { setConfirmReset(true); return }
    await resetSession().catch(() => {})
    setJdTitle(null)
    setConfirmReset(false)
    router.push("/jobs")
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[224px] bg-zinc-950/80 backdrop-blur-xl flex flex-col z-40 border-r border-white/5">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white tracking-tight">ShortlistAI</span>
            <div className="text-[10px] text-zinc-500 font-medium leading-none mt-0.5">Hiring Intelligence</div>
          </div>
        </Link>
      </div>

      {/* Active job pill */}
      <div className="px-3 py-3 border-b border-white/5">
        {jdTitle ? (
          <div className="flex items-center gap-1.5">
            <Link
              href="/jobs"
              className="flex items-center gap-2 flex-1 min-w-0 px-2.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors group"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[11px] font-medium text-zinc-300 truncate flex-1">{jdTitle}</span>
              <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
            </Link>
            <button
              onClick={handleReset}
              title={confirmReset ? "Click again to confirm" : "Delete job & reset session"}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-lg transition-colors shrink-0",
                confirmReset
                  ? "bg-red-600 text-white"
                  : "text-zinc-600 hover:text-red-400 hover:bg-zinc-800"
              )}
              onBlur={() => setConfirmReset(false)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Link
            href="/jobs"
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-dashed border-zinc-700 hover:border-zinc-600 hover:bg-zinc-900 transition-colors group"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />
            <span className="text-[11px] font-medium text-zinc-600 group-hover:text-zinc-400">New Job</span>
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-2 mb-2">Navigation</div>
        {NAV.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 group",
              isActive(href)
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            )}
          >
            <Icon className={cn(
              "w-4 h-4 shrink-0 transition-colors",
              isActive(href) ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"
            )} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-white/5 pt-3">
        {BOTTOM_NAV.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 group",
              isActive(href)
                ? "bg-zinc-800 text-white"
                : "text-zinc-500 hover:text-white hover:bg-zinc-800"
            )}
          >
            <Icon className="w-4 h-4 shrink-0 text-zinc-500 group-hover:text-zinc-300" />
            {label}
          </Link>
        ))}

        {/* User */}
        <div className="flex items-center gap-2.5 px-2.5 py-2 mt-1 rounded-lg hover:bg-zinc-800 cursor-pointer transition-colors">
          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-semibold text-white">HR</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-zinc-300 truncate">HR Manager</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
