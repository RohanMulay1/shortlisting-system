"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Briefcase, Users, ClipboardCheck,
  Settings, Zap, ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"

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

  const isActive = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href)

  return (
    <aside className="fixed left-0 top-0 h-screen w-[224px] bg-zinc-950 flex flex-col z-40 border-r border-zinc-800">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-zinc-800/60">
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
      <div className="px-3 py-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-zinc-900 cursor-pointer hover:bg-zinc-800 transition-colors group">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-[11px] font-medium text-zinc-300 truncate flex-1">Sr. ML Engineer</span>
          <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
        </div>
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
      <div className="px-3 pb-4 space-y-0.5 border-t border-zinc-800/60 pt-3">
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
            <div className="text-[10px] text-zinc-600 truncate">rohanm1307@gmail.com</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
