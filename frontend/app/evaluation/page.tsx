"use client"

import { useState, useEffect } from "react"
import { ScoreRing } from "@/components/shared/ScoreRing"
import { scoreColor } from "@/lib/utils"
import {
  CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  MessageSquare, Sparkles, AlertCircle, Users, Mic, FileText, Zap
} from "lucide-react"
import Link from "next/link"
import {
  getRanked, generateQualifier, evaluateQualifier, submitEvaluation,
  finalizePipeline, type RankedCandidate, type QuestionResult
} from "@/lib/api"

const VERDICT_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  "Strong":       { bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  "Good":         { bg: "bg-indigo-50",   text: "text-indigo-700",  dot: "bg-indigo-500" },
  "Weak":         { bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-500" },
  "Not Addressed":{ bg: "bg-red-50",      text: "text-red-600",     dot: "bg-red-400" },
}

export default function EvaluationPage() {
  const [candidates, setCandidates] = useState<RankedCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedIdx, setSelectedIdx] = useState(0)
  const [questions, setQuestions] = useState<Record<string, string[]>>({})
  const [loadingQ, setLoadingQ] = useState(false)

  // Transcript + evaluation state
  const [transcripts, setTranscripts] = useState<Record<string, string>>({})
  const [evaluating, setEvaluating] = useState(false)
  const [aiResults, setAiResults] = useState<Record<string, QuestionResult[]>>({})

  const [notes, setNotes] = useState<Record<string, string>>({})
  const [decisions, setDecisions] = useState<Record<string, "shortlisted" | "rejected" | null>>({})
  const [saving, setSaving] = useState(false)
  const [saveDone, setSaveDone] = useState<string | null>(null)

  useEffect(() => {
    getRanked()
      .then(r => setCandidates(r.ranked.slice(0, 20)))
      .catch(() => setError("Could not load candidates — run the pipeline first"))
      .finally(() => setLoading(false))
  }, [])

  const c = candidates[selectedIdx]

  useEffect(() => {
    if (!c) return
    const fn = c.candidate.filename
    if (questions[fn] !== undefined) return
    setLoadingQ(true)
    generateQualifier(fn)
      .then(res => setQuestions(prev => ({ ...prev, [fn]: res.questions })))
      .catch(() => setQuestions(prev => ({ ...prev, [fn]: [] })))
      .finally(() => setLoadingQ(false))
  }, [selectedIdx, candidates]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!loading && candidates.length === 0) {
    return (
      <div className="p-8 max-w-6xl mx-auto animate-in">
        <div className="mb-6">
          <div className="text-xs text-zinc-400 font-medium mb-2">HR Evaluation</div>
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Qualifier Evaluation</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-24 bg-white border-2 border-dashed border-zinc-200 rounded-xl text-zinc-400">
          <Users className="w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm font-semibold">No ranked candidates yet</p>
          <Link href="/jobs" className="mt-3 text-xs text-indigo-600 font-semibold">Run the pipeline first →</Link>
        </div>
      </div>
    )
  }

  if (!c) return null

  const fn = c.candidate.filename
  const cQuestions = questions[fn] ?? []
  const cResults = aiResults[fn]
  const skillPct = Math.round(c.skill_score * 100)
  const ragPct   = Math.round(c.rag_score * 100)
  const hrPct    = cResults
    ? Math.round((cResults.reduce((s, r) => s + r.score, 0) / Math.max(cResults.length, 1)) / 10 * 100)
    : Math.round(c.hr_score * 100)
  const computedFinal = Math.round(skillPct * 0.5 + ragPct * 0.3 + hrPct * 0.2)
  const initials = c.candidate.name.split(" ").map(n => n[0]).join("").slice(0, 2)
  const evaluated = Object.keys(decisions).filter(k => decisions[k] !== null).length

  const handleEvaluate = async () => {
    const transcript = transcripts[fn] ?? ""
    if (!transcript.trim()) { setError("Paste the interview transcript first."); return }
    setError(null)
    setEvaluating(true)
    try {
      const res = await evaluateQualifier(fn, transcript)
      setAiResults(prev => ({ ...prev, [fn]: res.results }))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Evaluation failed")
    } finally {
      setEvaluating(false)
    }
  }

  const handleSave = async (decision: "shortlisted" | "rejected") => {
    setSaving(true)
    try {
      const ratings = cResults ? cResults.map(r => r.score) : [c.hr_score * 10]
      await submitEvaluation({ candidate_filename: fn, ratings, notes: notes[fn] ?? "" })
      setDecisions(d => ({ ...d, [fn]: decision }))
      await finalizePipeline()
      setSaveDone(fn)
      setTimeout(() => setSaveDone(null), 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in">
      <div className="mb-6">
        <div className="text-xs text-zinc-400 font-medium mb-2">HR Evaluation</div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Qualifier Evaluation</h1>
            <p className="text-sm text-zinc-500 mt-1">{evaluated} of {candidates.length} evaluated</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500">{evaluated}/{candidates.length} evaluated</div>
            <div className="h-1.5 w-28 bg-zinc-200 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full transition-all"
                style={{ width: `${(evaluated / Math.max(candidates.length, 1)) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Candidate tabs */}
      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        {candidates.map((rc, i) => {
          const dec = decisions[rc.candidate.filename]
          return (
            <button key={rc.candidate.filename} onClick={() => setSelectedIdx(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all shrink-0 ${
                selectedIdx === i ? "bg-indigo-600 border-indigo-600 text-white"
                : dec === "shortlisted" ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : dec === "rejected"   ? "bg-red-50 border-red-200 text-red-600"
                : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
              <span className="max-w-[100px] truncate">{rc.candidate.name.split(" ")[0]}</span>
              {dec === "shortlisted" && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
              {dec === "rejected"    && <XCircle      className="w-3.5 h-3.5 shrink-0" />}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* LEFT */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Profile */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-white">{initials}</span>
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-900">{c.candidate.name}</h2>
                <p className="text-xs text-zinc-500">{c.candidate.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-zinc-50 rounded-lg p-2.5">
                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Experience</div>
                <div className="text-sm font-semibold text-zinc-800 mt-0.5">{c.candidate.total_years}y total</div>
              </div>
              <div className="bg-zinc-50 rounded-lg p-2.5">
                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Education</div>
                <div className="text-xs font-semibold text-zinc-800 mt-0.5 leading-tight">{c.candidate.education || "—"}</div>
              </div>
            </div>
            <div className="text-xs text-zinc-500 leading-relaxed mb-4 border-t border-zinc-100 pt-3">{c.candidate.summary}</div>
            {c.matched_required?.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5">Matched Required</div>
                <div className="flex flex-wrap gap-1">
                  {c.matched_required.map(s => (
                    <span key={s} className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Scores */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-4">Scores</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <ScoreRing score={skillPct} size={56} strokeWidth={5} showLabel={false} />
                <div className="text-[10px] text-zinc-400 mt-1">Skill</div>
              </div>
              <div className="text-center">
                <ScoreRing score={ragPct} size={56} strokeWidth={5} showLabel={false} />
                <div className="text-[10px] text-zinc-400 mt-1">RAG</div>
              </div>
              <div className="text-center">
                <ScoreRing score={hrPct} size={56} strokeWidth={5} showLabel={false} />
                <div className="text-[10px] text-zinc-400 mt-1">{cResults ? "Interview" : "HR Eval"}</div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white border border-zinc-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-zinc-400" />
              <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">HR Notes</div>
            </div>
            <textarea
              value={notes[fn] ?? ""}
              onChange={e => setNotes(n => ({ ...n, [fn]: e.target.value }))}
              placeholder="Add observations, red flags, or anything worth noting..."
              className="w-full h-24 text-xs text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder:text-zinc-400"
            />
          </div>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* Interview transcript input */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
              <Mic className="w-4 h-4 text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-900">Interview Recording</h3>
            </div>
            <div className="p-5 flex flex-col gap-3">
              {/* Fireflies placeholder */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50">
                <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-zinc-700">Connect Fireflies.ai</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Auto-import transcripts when your API key is configured</div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-500 shrink-0">Coming soon</span>
              </div>

              <div className="flex items-center gap-2 text-zinc-300">
                <div className="flex-1 h-px bg-zinc-200" />
                <span className="text-[11px] text-zinc-400 font-medium">or paste transcript</span>
                <div className="flex-1 h-px bg-zinc-200" />
              </div>

              <textarea
                value={transcripts[fn] ?? ""}
                onChange={e => setTranscripts(t => ({ ...t, [fn]: e.target.value }))}
                placeholder={"Paste the Fireflies transcript here...\n\nExample:\nInterviewer: Can you walk us through your ML experience?\nCandidate: Sure, I have 5 years working with PyTorch..."}
                className="w-full h-32 text-xs text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder:text-zinc-400 font-mono"
              />

              <button
                onClick={handleEvaluate}
                disabled={evaluating || !transcripts[fn]?.trim()}
                className="flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {evaluating ? (
                  <><Spinner />Analysing answers...</>
                ) : (
                  <><FileText className="w-4 h-4" />Auto-Evaluate Answers</>
                )}
              </button>
            </div>
          </div>

          {/* Qualifier questions + AI verdicts */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-zinc-900">AI Qualifier Questions</h3>
              {!loadingQ && cQuestions.length > 0 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">
                  {cQuestions.length} questions
                </span>
              )}
              {cResults && (
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  AI evaluated
                </span>
              )}
            </div>

            <div className="p-5 space-y-4">
              {loadingQ ? (
                <div className="flex flex-col items-center py-10 text-zinc-400">
                  <Spinner className="w-6 h-6 mb-3 text-indigo-400" />
                  <p className="text-sm">Generating questions...</p>
                </div>
              ) : cQuestions.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-zinc-400">
                  <AlertCircle className="w-6 h-6 mb-2 opacity-50" />
                  <p className="text-sm">No questions generated yet</p>
                </div>
              ) : (
                cQuestions.map((q, qi) => {
                  const result = cResults?.[qi]
                  const style = result ? (VERDICT_STYLE[result.verdict] ?? VERDICT_STYLE["Not Addressed"]) : null
                  return (
                    <div key={qi}>
                      <div className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px] font-bold text-indigo-600">{qi + 1}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-zinc-700 leading-relaxed">{q}</p>
                          {result ? (
                            <div className={`mt-2 flex items-start gap-2 px-3 py-2 rounded-lg ${style!.bg}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${style!.dot} shrink-0 mt-1.5`} />
                              <div className="flex-1 min-w-0">
                                <span className={`text-[11px] font-semibold ${style!.text}`}>{result.verdict}</span>
                                <p className={`text-[11px] mt-0.5 leading-relaxed ${style!.text} opacity-80`}>{result.summary}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-50 border border-dashed border-zinc-200">
                              <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />
                              <span className="text-[11px] text-zinc-400">Waiting for interview transcript</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {qi < cQuestions.length - 1 && <div className="ml-8 mt-4 border-t border-zinc-100" />}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Final score + decision */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h3 className="text-sm font-semibold text-zinc-900">Final Decision</h3>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-6 mb-5">
                <div className="flex flex-col items-center">
                  <ScoreRing score={computedFinal} size={80} strokeWidth={7} showLabel={false} />
                  <div className="mt-1.5 text-xs font-semibold text-zinc-500">Final Score</div>
                </div>
                <div className="flex-1 space-y-3">
                  <ScoreLine label="Skill Score × 0.5" value={skillPct} weight={0.5} color="bg-indigo-500" />
                  <ScoreLine label="RAG Score × 0.3"   value={ragPct}   weight={0.3} color="bg-blue-500" />
                  <ScoreLine label={`${cResults ? "Interview" : "HR Eval"} × 0.2`} value={hrPct} weight={0.2} color="bg-emerald-500" />
                  <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-900">Final</span>
                    <span className={`text-base font-bold tabular-nums ${scoreColor(computedFinal)}`}>{computedFinal}%</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => handleSave("shortlisted")} disabled={saving}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${
                    decisions[fn] === "shortlisted"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                  }`}>
                  <CheckCircle2 className="w-4 h-4" />
                  {saving ? "Saving..." : saveDone === fn ? "Saved!" : "Shortlist"}
                </button>
                <button onClick={() => handleSave("rejected")} disabled={saving}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${
                    decisions[fn] === "rejected"
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-zinc-50 text-zinc-600 border border-zinc-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                  }`}>
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button disabled={selectedIdx === 0} onClick={() => setSelectedIdx(i => i - 1)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" />Previous
            </button>
            <span className="text-xs text-zinc-400">{selectedIdx + 1} / {candidates.length}</span>
            <button disabled={selectedIdx === candidates.length - 1} onClick={() => setSelectedIdx(i => i + 1)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              Next<ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreLine({ label, value, weight, color }: { label: string; value: number; weight: number; color: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-zinc-600">{label}</span>
      </div>
      <span className={`font-semibold tabular-nums ${scoreColor(value)}`}>
        {value} → {Math.round(value * weight)}
      </span>
    </div>
  )
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin w-4 h-4 ${className ?? ""}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
