"use client"

import { useEffect, useState } from "react"
import { Briefcase, Users, CheckCircle2, TrendingUp, ArrowRight, Zap, AlertCircle } from "lucide-react"
import { MetricCard } from "@/components/shared/MetricCard"
import { scoreColor } from "@/lib/utils"
import Link from "next/link"
import { getRanked, getCandidates, type RankedCandidate } from "@/lib/api"

export default function Dashboard() {
  const [ranked, setRanked] = useState<RankedCandidate[]>([])
  const [totalCandidates, setTotalCandidates] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getRanked(), getCandidates()])
      .then(([r, c]) => {
        setRanked(r.ranked)
        setTotalCandidates(c.count)
      })
      .catch(() => setError("Could not connect to backend"))
      .finally(() => setLoading(false))
  }, [])

  const shortlisted = ranked.filter(r => r.status === "shortlisted").length
  const avgScore = ranked.length
    ? Math.round(ranked.reduce((a, r) => a + r.final_score * 100, 0) / ranked.length)
    : 0
  const top4 = ranked.slice(0, 4)

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2 font-medium">
          <span>Dashboard</span>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">Hiring pipeline intelligence for your active roles.</p>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error} — make sure the backend is running.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Total Candidates"
          value={loading ? "—" : totalCandidates}
          icon={Users}
          iconColor="text-blue-600"
        />
        <MetricCard
          label="Ranked"
          value={loading ? "—" : ranked.length}
          icon={Briefcase}
          iconColor="text-indigo-600"
        />
        <MetricCard
          label="Shortlisted"
          value={loading ? "—" : shortlisted}
          sub={ranked.length ? `of ${ranked.length}` : undefined}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
        />
        <MetricCard
          label="Avg. Match Score"
          value={loading ? "—" : `${avgScore}%`}
          icon={TrendingUp}
          iconColor="text-amber-600"
        />
      </div>

      {ranked.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white border-2 border-dashed border-zinc-200 rounded-xl">
          <Zap className="w-10 h-10 text-zinc-300 mb-3" />
          <p className="text-sm font-semibold text-zinc-400">No pipeline run yet</p>
          <p className="text-xs text-zinc-300 mt-1 mb-5">Upload a JD and resumes to get started</p>
          <Link
            href="/jobs"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Go to Jobs <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Top Candidates</h2>
            <Link href="/candidates" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {top4.map((r, i) => {
              const c = r.candidate
              const initials = c.name.split(" ").map(n => n[0]).join("").slice(0, 2)
              const pct = Math.round(r.final_score * 100)
              return (
                <Link key={c.filename} href="/candidates" className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 transition-colors group">
                  <span className="text-xs font-semibold text-zinc-300 w-4 shrink-0">#{i + 1}</span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-white">{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-800 group-hover:text-indigo-600 transition-colors">{c.name}</div>
                    <div className="text-xs text-zinc-400 truncate">{c.summary?.slice(0, 60) || c.email}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className={`text-sm font-semibold tabular-nums ${scoreColor(pct)}`}>{pct}%</div>
                      <div className="text-[10px] text-zinc-400">Final</div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {ranked.length > 0 && (
        <div className="mt-6 flex items-center gap-3 px-5 py-3.5 bg-indigo-50 border border-indigo-100 rounded-xl">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-indigo-900">Pipeline complete</span>
            <span className="text-sm text-indigo-600 ml-2">· {ranked.length} resumes scored with skill + RAG matching</span>
          </div>
          <Link href="/candidates" className="text-xs font-semibold text-indigo-700 flex items-center gap-1 hover:gap-1.5 transition-all">
            View rankings <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}
