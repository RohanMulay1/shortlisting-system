"use client"

import { useState } from "react"
import { mockCandidates } from "@/lib/mock-data"
import { ScoreRing } from "@/components/shared/ScoreRing"
import { ScoreBar } from "@/components/shared/ScoreBar"
import { scoreColor, statusColor } from "@/lib/utils"
import { SlidersHorizontal, ChevronDown, ChevronUp, Users, ArrowRight } from "lucide-react"
import Link from "next/link"
import type { Candidate } from "@/lib/types"

const STATUS_FILTERS = ["all", "shortlisted", "reviewing", "pending", "rejected"] as const

export default function CandidatesPage() {
  const [topN, setTopN] = useState(8)
  const [threshold, setThreshold] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const filtered = mockCandidates
    .filter(c => statusFilter === "all" || c.status === statusFilter)
    .filter(c => c.scores.finalScore >= threshold)
    .slice(0, topN)

  const toggle = (id: string) => setExpanded(prev => prev === id ? null : id)

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in">
      {/* Header */}
      <div className="mb-6">
        <div className="text-xs text-zinc-400 font-medium mb-2">Candidates</div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Ranked Shortlist</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Showing {filtered.length} candidates — ranked by Final Score = (Skill × 0.5) + (RAG × 0.3) + (HR × 0.2)
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="mb-5 bg-white border border-zinc-200 rounded-xl p-4 flex flex-wrap gap-6 animate-in">
          {/* Status Filter */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</label>
            <div className="flex gap-1.5">
              {STATUS_FILTERS.map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize transition-colors ${
                    statusFilter === s
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Top N */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Top N</label>
            <input
              type="range" min={1} max={mockCandidates.length} value={topN}
              onChange={e => setTopN(+e.target.value)}
              className="w-32 accent-indigo-600"
            />
            <span className="text-xs text-zinc-500 font-mono">Top {topN}</span>
          </div>

          {/* Min Score */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Min Score</label>
            <input
              type="range" min={0} max={100} value={threshold}
              onChange={e => setThreshold(+e.target.value)}
              className="w-32 accent-indigo-600"
            />
            <span className="text-xs text-zinc-500 font-mono">≥ {threshold}%</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        {/* Column Headers */}
        <div className="grid grid-cols-[2rem_1fr_7rem_7rem_7rem_7rem_6rem] gap-x-3 px-5 py-3 border-b border-zinc-100 bg-zinc-50">
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">#</div>
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Candidate</div>
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-center">Final</div>
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-center">Skill</div>
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-center">RAG</div>
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-center">HR</div>
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-center">Status</div>
        </div>

        <div className="divide-y divide-zinc-50">
          {filtered.map((c, i) => (
            <CandidateRow
              key={c.id}
              candidate={c}
              rank={i + 1}
              expanded={expanded === c.id}
              onToggle={() => toggle(c.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <Users className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">No candidates match current filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CandidateRow({ candidate: c, rank, expanded, onToggle }: {
  candidate: Candidate
  rank: number
  expanded: boolean
  onToggle: () => void
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-[2rem_1fr_7rem_7rem_7rem_7rem_6rem] gap-x-3 px-5 py-3.5 hover:bg-zinc-50 transition-colors text-left group"
      >
        <span className="text-xs font-semibold text-zinc-300 self-center">{rank}</span>

        {/* Candidate info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-white">
              {c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-zinc-800 truncate group-hover:text-indigo-600 transition-colors">
              {c.name}
            </div>
            <div className="text-xs text-zinc-400 truncate">{c.currentRole}</div>
          </div>
        </div>

        {/* Final Score */}
        <div className="flex items-center justify-center">
          <ScoreRing score={c.scores.finalScore} size={48} strokeWidth={5} showLabel={false} />
        </div>

        {/* Skill */}
        <div className={`text-sm font-semibold text-center self-center tabular-nums ${scoreColor(c.scores.skillScore)}`}>
          {c.scores.skillScore}%
        </div>

        {/* RAG */}
        <div className={`text-sm font-semibold text-center self-center tabular-nums ${scoreColor(c.scores.ragScore)}`}>
          {c.scores.ragScore}%
        </div>

        {/* HR */}
        <div className={`text-sm font-semibold text-center self-center tabular-nums ${
          c.scores.hrScore > 0 ? scoreColor(c.scores.hrScore) : "text-zinc-300"
        }`}>
          {c.scores.hrScore > 0 ? `${c.scores.hrScore}%` : "—"}
        </div>

        {/* Status */}
        <div className="flex items-center justify-center">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${statusColor(c.status)}`}>
            {c.status}
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-zinc-100 bg-zinc-50/60 animate-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {/* Score Breakdown */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Score Breakdown</div>
              <div className="flex items-center gap-4 mb-4">
                <ScoreRing score={c.scores.finalScore} size={64} label="Final" />
                <div className="flex-1 space-y-2">
                  <ScoreBar label="Skill" value={c.scores.skillScore} weight="×0.5" compact />
                  <ScoreBar label="RAG" value={c.scores.ragScore} weight="×0.3" compact />
                  <ScoreBar label="HR Eval" value={c.scores.hrScore} weight="×0.2" compact />
                </div>
              </div>
              <div className="border-t border-zinc-100 pt-3 space-y-1.5">
                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Skill Breakdown</div>
                <ScoreBar label="Skill Match" value={c.scores.skillMatch} weight="×0.5" compact />
                <ScoreBar label="Skill Exp" value={c.scores.skillExperience} weight="×0.3" compact />
                <ScoreBar label="Total Exp" value={c.scores.totalExperience} weight="×0.15" compact />
                <ScoreBar label="Bonus" value={c.scores.bonus} weight="×0.05" compact />
              </div>
            </div>

            {/* Skills */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Skills & Profile</div>
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] text-zinc-400 mb-1.5">Matched Required</div>
                  <div className="flex flex-wrap gap-1">
                    {c.matchedRequired.map(s => (
                      <span key={s} className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">{s}</span>
                    ))}
                  </div>
                </div>
                {c.matchedPreferred.length > 0 && (
                  <div>
                    <div className="text-[10px] text-zinc-400 mb-1.5">Matched Preferred</div>
                    <div className="flex flex-wrap gap-1">
                      {c.matchedPreferred.map(s => (
                        <span key={s} className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-xs text-zinc-500 leading-relaxed pt-1 border-t border-zinc-100">
                  {c.summary}
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500 pt-1">
                  <span className="font-semibold text-zinc-700">{c.totalYears}y exp</span>
                  <span>·</span>
                  <span>{c.education}</span>
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col gap-3">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Quick Actions</div>
              <Link
                href="/evaluation"
                className="flex items-center justify-between px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <span>HR Evaluation</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button className="flex items-center justify-between px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold rounded-lg border border-emerald-200 transition-colors">
                <span>Shortlist</span>
                <span>✓</span>
              </button>
              <button className="flex items-center justify-between px-3 py-2.5 bg-zinc-50 hover:bg-red-50 text-zinc-600 hover:text-red-600 text-sm font-medium rounded-lg border border-zinc-200 hover:border-red-200 transition-colors">
                <span>Reject</span>
                <span>✕</span>
              </button>
              <div className="mt-auto pt-2 border-t border-zinc-100 text-xs text-zinc-400">
                <div className="flex justify-between"><span>Companies:</span><span className="text-zinc-600">{c.companies.join(", ")}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
