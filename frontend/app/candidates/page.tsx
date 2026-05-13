"use client"

import { useState, useEffect } from "react"
import { ScoreRing } from "@/components/shared/ScoreRing"
import { ScoreBar } from "@/components/shared/ScoreBar"
import { scoreColor } from "@/lib/utils"
import { SlidersHorizontal, ChevronDown, ChevronUp, ChevronsUpDown, Users, ArrowRight, AlertCircle, Download, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { getRanked, getShortlist, type RankedCandidate } from "@/lib/api"

const STATUS_FILTERS = ["all", "shortlisted", "pending", "rejected"] as const

type SortCol = "final" | "skill" | "rag" | "hr"

export default function CandidatesPage() {
  const [ranked, setRanked] = useState<RankedCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [topN, setTopN] = useState(20)
  const [threshold, setThreshold] = useState(0)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [sortCol, setSortCol] = useState<SortCol>("final")
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc")
  const [stale, setStale] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    getRanked()
      .then(r => {
        setRanked(r.ranked)
        const lastRun = parseInt(localStorage.getItem("lastPipelineRun") ?? "0")
        const lastUp = parseInt(localStorage.getItem("lastUpload") ?? "0")
        if (lastUp > lastRun && r.ranked.length > 0) setStale(true)
      })
      .catch(() => setError("Could not load candidates"))
      .finally(() => setLoading(false))
  }, [])

  const scoreFor = (r: RankedCandidate, col: SortCol) =>
    col === "final" ? r.final_score : col === "skill" ? r.skill_score : col === "rag" ? r.rag_score : r.hr_score

  const filtered = ranked
    .filter(r => statusFilter === "all" || r.status === statusFilter)
    .filter(r => Math.round(r.final_score * 100) >= threshold)
    .sort((a, b) => sortDir === "desc" ? scoreFor(b, sortCol) - scoreFor(a, sortCol) : scoreFor(a, sortCol) - scoreFor(b, sortCol))
    .slice(0, topN)

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === "desc" ? "asc" : "desc")
    else { setSortCol(col); setSortDir("desc") }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const { shortlist } = await getShortlist()
      const headers = ["Rank", "Name", "Email", "Years", "Final%", "Skill%", "RAG%", "HR%", "Matched Required", "Status", "Notes"]
      const rows = shortlist.map(r => [
        r.rank, r.name, r.email, r.total_years,
        Math.round(r.final_score * 100), Math.round(r.skill_score * 100),
        Math.round(r.rag_score * 100), Math.round(r.hr_score * 100),
        r.matched_required, r.status, r.hr_notes,
      ])
      const csv = [headers, ...rows].map(row => row.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")
      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = url; a.download = "shortlist.csv"; a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ } finally { setExporting(false) }
  }

  const toggle = (filename: string) => setExpanded(prev => prev === filename ? null : filename)

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in">
      <div className="mb-6">
        <div className="text-xs text-zinc-400 font-medium mb-2">Candidates</div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Ranked Shortlist</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {loading ? "Loading..." : `Showing ${filtered.length} candidates — Final = (Skill × 0.5) + (RAG × 0.3) + (HR × 0.2)`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} disabled={exporting || ranked.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 transition-colors">
              <Download className="w-4 h-4" />{exporting ? "Exporting..." : "Export CSV"}
            </button>
            <button onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
              <SlidersHorizontal className="w-4 h-4" />Filters
              {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {stale && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">Resumes were uploaded after the last pipeline run — scores may be outdated.</span>
          <Link href="/jobs" className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2">Re-run pipeline →</Link>
        </div>
      )}

      {showFilters && (
        <div className="mb-5 bg-white border border-zinc-200 rounded-xl p-4 flex flex-wrap gap-6 animate-in">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Status</label>
            <div className="flex gap-1.5">
              {STATUS_FILTERS.map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg capitalize transition-colors ${
                    statusFilter === s ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {ranked.length > 10 && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Top N</label>
              <input type="range" min={1} max={Math.max(ranked.length, 1)} value={topN}
                onChange={e => setTopN(+e.target.value)} className="w-32 accent-indigo-600" />
              <span className="text-xs text-zinc-500 font-mono">Top {topN}</span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Min Score</label>
            <input type="range" min={0} max={100} value={threshold}
              onChange={e => setThreshold(+e.target.value)} className="w-32 accent-indigo-600" />
            <span className="text-xs text-zinc-500 font-mono">≥ {threshold}%</span>
          </div>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[2rem_1fr_7rem_7rem_7rem_7rem_6rem] gap-x-3 px-5 py-3 border-b border-zinc-100 bg-zinc-50">
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">#</div>
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Candidate</div>
          <SortHeader label="Final"  col="final" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
          <SortHeader label="Skill"  col="skill" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
          <SortHeader label="RAG"    col="rag"   sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
          <SortHeader label="HR"     col="hr"    sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} />
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-center">Status</div>
        </div>

        <div className="divide-y divide-zinc-50">
          {filtered.map((r, i) => (
            <CandidateRow
              key={r.candidate.filename}
              ranked={r}
              rank={i + 1}
              expanded={expanded === r.candidate.filename}
              onToggle={() => toggle(r.candidate.filename)}
            />
          ))}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <Users className="w-8 h-8 mb-2 opacity-50" />
              {ranked.length === 0 ? (
                <>
                  <p className="text-sm font-medium">No pipeline run yet</p>
                  <Link href="/jobs" className="mt-3 flex items-center gap-1 text-xs text-indigo-600 font-semibold">
                    Go to Jobs <ArrowRight className="w-3 h-3" />
                  </Link>
                </>
              ) : (
                <p className="text-sm font-medium">No candidates match current filters</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SortHeader({ label, col, sortCol, sortDir, onSort }: {
  label: string; col: SortCol; sortCol: SortCol; sortDir: "desc" | "asc"; onSort: (c: SortCol) => void
}) {
  const active = sortCol === col
  return (
    <button onClick={() => onSort(col)}
      className="flex items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors hover:text-zinc-600 group"
      style={{ color: active ? "#4f46e5" : undefined }}>
      {label}
      {active
        ? (sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)
        : <ChevronsUpDown className="w-3 h-3 opacity-30 group-hover:opacity-60" />}
    </button>
  )
}

function statusColor(status?: string) {
  switch (status) {
    case "shortlisted": return "bg-emerald-50 text-emerald-700 border-emerald-200"
    case "rejected": return "bg-red-50 text-red-600 border-red-200"
    case "reviewing": return "bg-amber-50 text-amber-700 border-amber-200"
    default: return "bg-zinc-100 text-zinc-500 border-zinc-200"
  }
}

function CandidateRow({ ranked: r, rank, expanded, onToggle }: {
  ranked: RankedCandidate
  rank: number
  expanded: boolean
  onToggle: () => void
}) {
  const c = r.candidate
  const finalPct = Math.round(r.final_score * 100)
  const skillPct = Math.round(r.skill_score * 100)
  const ragPct = Math.round(r.rag_score * 100)
  const hrPct = Math.round(r.hr_score * 100)
  const initials = c.name.split(" ").map(n => n[0]).join("").slice(0, 2)

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full grid grid-cols-[2rem_1fr_7rem_7rem_7rem_7rem_6rem] gap-x-3 px-5 py-3.5 hover:bg-zinc-50 transition-colors text-left group"
      >
        <span className="text-xs font-semibold text-zinc-300 self-center">{rank}</span>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-white">{initials}</span>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-zinc-800 truncate group-hover:text-indigo-600 transition-colors">{c.name}</div>
            <div className="text-xs text-zinc-400 truncate">{c.summary?.slice(0, 50) || c.email}</div>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <ScoreRing score={finalPct} size={48} strokeWidth={5} showLabel={false} />
        </div>
        <div className={`text-sm font-semibold text-center self-center tabular-nums ${scoreColor(skillPct)}`}>{skillPct}%</div>
        <div className={`text-sm font-semibold text-center self-center tabular-nums ${scoreColor(ragPct)}`}>{ragPct}%</div>
        <div className={`text-sm font-semibold text-center self-center tabular-nums ${hrPct > 0 ? scoreColor(hrPct) : "text-zinc-300"}`}>
          {hrPct > 0 ? `${hrPct}%` : "—"}
        </div>
        <div className="flex items-center justify-center">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${statusColor(r.status)}`}>
            {r.status || "pending"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-zinc-100 bg-zinc-50/60 animate-in">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            <div className="bg-white border border-zinc-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Score Breakdown</div>
              <div className="flex items-center gap-4 mb-4">
                <ScoreRing score={finalPct} size={64} label="Final" />
                <div className="flex-1 space-y-2">
                  <ScoreBar label="Skill" value={skillPct} weight="×0.5" compact />
                  <ScoreBar label="RAG" value={ragPct} weight="×0.3" compact />
                  <ScoreBar label="HR Eval" value={hrPct} weight="×0.2" compact />
                </div>
              </div>
              <div className="border-t border-zinc-100 pt-3 space-y-3">
                <div>
                  <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Experience</div>
                  <div className="text-sm text-zinc-600">{c.total_years} years total</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Education</div>
                  <div className="text-xs text-zinc-400 leading-relaxed">{c.education}</div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Skills & Profile</div>
              <div className="space-y-3">
                {r.matched_required?.length > 0 && (
                  <div>
                    <div className="text-[10px] text-zinc-400 mb-1.5">Matched Required</div>
                    <div className="flex flex-wrap gap-1">
                      {r.matched_required.map(s => (
                        <span key={s} className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                {r.matched_preferred?.length > 0 && (
                  <div>
                    <div className="text-[10px] text-zinc-400 mb-1.5">Matched Preferred</div>
                    <div className="flex flex-wrap gap-1">
                      {r.matched_preferred.map(s => (
                        <span key={s} className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="text-xs text-zinc-500 leading-relaxed pt-1 border-t border-zinc-100">{c.summary}</div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {c.skills?.slice(0, 8).map(s => (
                    <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 border border-zinc-200">{s}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col gap-3">
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Quick Actions</div>
              <Link
                href={`/evaluation?candidate=${encodeURIComponent(c.filename)}`}
                className="flex items-center justify-between px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <span>HR Evaluation</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="mt-auto pt-2 border-t border-zinc-100 text-xs text-zinc-400 space-y-1">
                <div className="flex justify-between"><span>Email:</span><span className="text-zinc-600 truncate ml-2">{c.email}</span></div>
                {c.companies?.length > 0 && (
                  <div className="flex justify-between"><span>Companies:</span><span className="text-zinc-600 truncate ml-2">{c.companies.slice(0, 2).join(", ")}</span></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
