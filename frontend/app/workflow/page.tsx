"use client"

import { useState } from "react"
import {
  Upload, Brain, FileText, Search, Trophy, Filter,
  Video, Radio, Zap, Download, Users, Cpu,
  CheckCircle2, GitMerge, Layers, DatabaseZap,
  MessageSquare, Eye, PenLine, Star, AlertCircle,
  ChevronDown, ChevronUp, ArrowDown
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────

type Actor = "hr" | "system" | "ai-mini" | "ai-full" | "bot" | "output" | "future"

interface StepNode {
  id: string
  actor: Actor
  icon: React.ElementType
  title: string
  subtitle: string
  fr?: string
  isNew?: boolean
  isFuture?: boolean
  details?: string[]
  output?: string
}

interface Phase {
  id: number
  label: string
  sublabel?: string
  accentColor: string
  steps: "parallel-input" | "parallel-scoring" | StepNode[]
}

// ── Actor styles ────────────────────────────────────────────────────────────

const actorStyle: Record<Actor, { bg: string; border: string; icon: string; pill: string; dot: string }> = {
  hr:       { bg: "bg-amber-50",   border: "border-amber-200",   icon: "text-amber-600",   pill: "bg-amber-100 text-amber-700 border-amber-200",   dot: "bg-amber-400" },
  system:   { bg: "bg-indigo-50",  border: "border-indigo-200",  icon: "text-indigo-600",  pill: "bg-indigo-100 text-indigo-700 border-indigo-200",  dot: "bg-indigo-500" },
  "ai-mini":{ bg: "bg-violet-50",  border: "border-violet-200",  icon: "text-violet-600",  pill: "bg-violet-100 text-violet-700 border-violet-200",  dot: "bg-violet-500" },
  "ai-full":{ bg: "bg-purple-50",  border: "border-purple-200",  icon: "text-purple-600",  pill: "bg-purple-100 text-purple-700 border-purple-200",  dot: "bg-purple-500" },
  bot:      { bg: "bg-rose-50",    border: "border-rose-200",    icon: "text-rose-600",    pill: "bg-rose-100 text-rose-600 border-rose-200",        dot: "bg-rose-400" },
  output:   { bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-600", pill: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  future:   { bg: "bg-zinc-50",    border: "border-zinc-200 border-dashed", icon: "text-zinc-400", pill: "bg-zinc-100 text-zinc-500 border-zinc-200", dot: "bg-zinc-300" },
}

const actorLabel: Record<Actor, string> = {
  hr: "HR / Recruiter",
  system: "System",
  "ai-mini": "GPT-4o-mini",
  "ai-full": "GPT-4o",
  bot: "Meeting Bot",
  output: "Output",
  future: "Planned",
}

// ── Legend ──────────────────────────────────────────────────────────────────

const LEGEND: { actor: Actor; label: string }[] = [
  { actor: "hr",       label: "HR Action" },
  { actor: "system",   label: "System / Computation" },
  { actor: "ai-mini",  label: "GPT-4o-mini (fast)" },
  { actor: "ai-full",  label: "GPT-4o (deep reasoning)" },
  { actor: "bot",      label: "Meeting Bot / External API" },
  { actor: "output",   label: "Output / Artifact" },
  { actor: "future",   label: "Planned (Vector DB + Supabase)" },
]

// ── Parallel sections data ──────────────────────────────────────────────────

const INPUT_LEFT: StepNode[] = [
  { id: "upload-jd",   actor: "hr",      icon: Upload,   title: "Upload Job Description", subtitle: "Paste text or upload PDF/TXT", fr: "FR1", output: "Raw JD text" },
  { id: "jd-parser",   actor: "ai-mini", icon: Brain,    title: "JD Parser", subtitle: "Extracts required skills, preferred skills, experience, responsibilities, domains", fr: "FR1–2", output: "Structured JD JSON" },
  { id: "simplified",  actor: "ai-mini", icon: FileText,  title: "Simplified JD Generation", subtitle: "Produces human-readable layman JD for sharing", fr: "FR2", output: "Simplified JD text" },
]

const INPUT_RIGHT: StepNode[] = [
  { id: "upload-cv",   actor: "hr",      icon: Upload,   title: "Upload Resumes (Batch)", subtitle: "Multiple PDF or TXT files", fr: "FR3", output: "Raw resume files" },
  { id: "cv-extract",  actor: "system",  icon: Layers,   title: "PDF Text Extraction", subtitle: "pdfplumber extracts raw text with layout preservation", output: "Plain text per resume" },
  { id: "cv-parser",   actor: "ai-mini", icon: Brain,    title: "Resume Parser", subtitle: "Extracts skills, experience per skill, total years, projects, companies", fr: "FR3", output: "Candidate profile JSON" },
]

const SCORING_LEFT: StepNode[] = [
  { id: "skill-score", actor: "system", icon: Cpu, title: "Deterministic Skill Scoring", subtitle: "FR4 formula applied per candidate", fr: "FR4", output: "Skill score 0–100", details: ["Skill Match × 0.50", "Skill Experience × 0.30", "Total Experience × 0.15", "Bonus (preferred) × 0.05"] },
]

const SCORING_RIGHT: StepNode[] = [
  { id: "rag-score", actor: "ai-mini", icon: Search, title: "RAG Semantic Matching", subtitle: "OpenAI text-embedding-3-small + FAISS cosine similarity", fr: "FR5", output: "RAG score 0–100", details: ["Embed JD text", "Embed each candidate profile", "Compute cosine similarity", "Normalize to 0–100"] },
]

// ── Full phase definition ────────────────────────────────────────────────────

const SERIAL_STEPS: StepNode[] = [
  // Ranking
  { id: "ranking",     actor: "system", icon: Trophy,   title: "Combined Ranking", subtitle: "Deterministic + RAG scores merged and sorted descending", fr: "FR6", output: "Ranked candidate list" },
  { id: "top-n",       actor: "system", icon: Filter,   title: "Top N Selection", subtitle: "Configurable top-N filter or minimum score threshold", fr: "FR7", output: "Shortlisted pool" },
  // Qualifier
  { id: "qualifier",   actor: "ai-mini",icon: MessageSquare, title: "Qualifier Question Generation", subtitle: "5 targeted questions per candidate based on JD skills, experience, domain", fr: "FR8", output: "Q&A set per candidate" },
  // Interview pipeline — NEW
  { id: "interview",   actor: "hr",     icon: Video,    title: "HR Conducts Interview", subtitle: "Google Meet session using the AI-generated qualifier questions", fr: "FR12", isNew: true, output: "Live interview session" },
  { id: "transcript",  actor: "bot",    icon: Radio,    title: "Transcript Capture", subtitle: "Meeting Bot (Recall.ai webhook or Google Drive API) captures audio with speaker diarization", fr: "FR12", isNew: true, output: "Raw JSON transcript {speaker, text, timestamp}" },
  { id: "extraction",  actor: "ai-mini",icon: GitMerge, title: "Agentic Q&A Extraction", subtitle: "Intent-maps spoken dialogue to qualifier questions, discards small talk and noise", fr: "FR13", isNew: true, output: '[{actual_question_asked, candidate_answer}]', details: ["Filter out greetings and small talk", "Map paraphrased questions by intent", "Produce strict JSON array"] },
  { id: "ai-eval",     actor: "ai-full",icon: Star,     title: "AI Answer Evaluation", subtitle: "GPT-4o grades each answer against JD required skills — outputs score + 1-sentence justification", fr: "FR14", isNew: true, output: '[{score: 0–100, justification: string}]', details: ["Grade against JD skill requirements", "1-sentence justification per answer", "Average scores → HR Evaluation variable"] },
  { id: "hitl",        actor: "hr",     icon: PenLine,  title: "HR HITL Review & Override", subtitle: "HR sees AI score, justification, and exact transcript snippet — can override any score", fr: "FR15", isNew: true, output: "Confirmed HR evaluation score" },
  // Final scoring
  { id: "final-score", actor: "system", icon: Cpu,      title: "Final Score Computation", subtitle: "Weighted formula combining all three scoring dimensions", fr: "FR10", output: "Final score 0–100", details: ["Skill Score × 0.50", "RAG Score × 0.30", "HR Evaluation × 0.20"] },
  { id: "output",      actor: "output", icon: Download, title: "Final Shortlist & Export", subtitle: "Ranked shortlist with full score breakdown, downloadable as CSV", fr: "FR11", output: "CSV + dashboard view" },
  // Future
  { id: "future",      actor: "future", icon: DatabaseZap, title: "Vector DB + Supabase", subtitle: "Planned: migrate FAISS embeddings to pgvector in Supabase for persistence and scale", isFuture: true },
]

// ── Sub-components ──────────────────────────────────────────────────────────

function Node({ node, expanded, onToggle }: { node: StepNode; expanded: boolean; onToggle: () => void }) {
  const s = actorStyle[node.actor]
  const Icon = node.icon

  return (
    <div className={cn("rounded-xl border transition-all", s.bg, s.border, node.isFuture && "opacity-60")}>
      <button onClick={onToggle} className="w-full flex items-start gap-3 p-3.5 text-left">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", s.bg, "border", s.border)}>
          <Icon className={cn("w-4 h-4", s.icon)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-zinc-900">{node.title}</span>
            {node.fr && (
              <span className="text-[10px] font-mono text-zinc-400">{node.fr}</span>
            )}
            {node.isNew && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">NEW</span>
            )}
            {node.isFuture && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-400 text-white">PLANNED</span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{node.subtitle}</p>
        </div>
        <div className="shrink-0 mt-1">
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-100 pt-3 space-y-2">
          {node.details && (
            <div className="space-y-1">
              {node.details.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-zinc-600">
                  <div className={cn("w-1 h-1 rounded-full shrink-0", s.dot)} />
                  {d}
                </div>
              ))}
            </div>
          )}
          {node.output && (
            <div className={cn("flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-mono", s.border, s.bg)}>
              <span className="text-zinc-400">→</span>
              <span className={cn("font-medium", s.icon)}>{node.output}</span>
            </div>
          )}
          <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-semibold", s.pill, "border")}>
            <div className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
            {actorLabel[node.actor]}
          </div>
        </div>
      )}
    </div>
  )
}

function Connector({ label, color = "bg-zinc-200" }: { label?: string; color?: string }) {
  return (
    <div className="flex flex-col items-center py-0.5">
      <div className={cn("w-px h-5", color)} />
      {label && (
        <span className="text-[10px] font-mono text-zinc-400 bg-white border border-zinc-200 px-2 py-0.5 rounded-full my-0.5">
          {label}
        </span>
      )}
      <ArrowDown className="w-3 h-3 text-zinc-300" />
    </div>
  )
}

function MergeSVG({ color = "#cbd5e1" }: { color?: string }) {
  return (
    <div className="flex justify-center w-full my-1">
      <svg viewBox="0 0 300 44" className="w-full max-w-lg h-11" preserveAspectRatio="none">
        <path d={`M 50,0 C 50,32 150,32 150,44`} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d={`M 250,0 C 250,32 150,32 150,44`} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <polygon points="147,40 150,46 153,40" fill={color} />
      </svg>
    </div>
  )
}

function SplitSVG({ color = "#cbd5e1" }: { color?: string }) {
  return (
    <div className="flex justify-center w-full my-1">
      <svg viewBox="0 0 300 44" className="w-full max-w-lg h-11" preserveAspectRatio="none">
        <path d={`M 150,0 C 150,12 50,12 50,44`} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d={`M 150,0 C 150,12 250,12 250,44`} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <polygon points="47,40 50,46 53,40" fill={color} />
        <polygon points="247,40 250,46 253,40" fill={color} />
      </svg>
    </div>
  )
}

function PhaseTag({ label, isNew }: { label: string; isNew?: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-3">
      <div className="flex-1 h-px bg-zinc-200" />
      <span className={cn(
        "text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border",
        isNew
          ? "bg-rose-50 text-rose-600 border-rose-200"
          : "bg-zinc-100 text-zinc-500 border-zinc-200"
      )}>
        {label}
        {isNew && <span className="ml-1.5 text-[9px] font-black bg-rose-500 text-white px-1 py-0.5 rounded">NEW</span>}
      </span>
      <div className="flex-1 h-px bg-zinc-200" />
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function WorkflowPage() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  const allNodes = [...INPUT_LEFT, ...INPUT_RIGHT, ...SCORING_LEFT, ...SCORING_RIGHT, ...SERIAL_STEPS]

  const expandAll = () => {
    const all: Record<string, boolean> = {}
    allNodes.forEach(n => { all[n.id] = true })
    setExpanded(all)
  }
  const collapseAll = () => setExpanded({})

  return (
    <div className="p-8 max-w-4xl mx-auto animate-in">
      {/* Header */}
      <div className="mb-8">
        <div className="text-xs text-zinc-400 font-medium mb-2">Workflow</div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">System Workflow Diagram</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Full pipeline — Original BRD (FR1–FR11) + Interview Evaluation Addendum (FR12–FR15)
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={expandAll} className="text-xs px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors">
              Expand all
            </button>
            <button onClick={collapseAll} className="text-xs px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors">
              Collapse all
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-8 p-4 bg-white border border-zinc-200 rounded-xl">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest self-center mr-1">Legend</span>
        {LEGEND.map(({ actor, label }) => {
          const s = actorStyle[actor]
          return (
            <div key={actor} className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-medium", s.pill, "border")}>
              <div className={cn("w-2 h-2 rounded-full", s.dot)} />
              {label}
            </div>
          )
        })}
      </div>

      {/* ── Diagram ── */}
      <div className="space-y-0">

        {/* ══ PHASE 1: INPUT (Parallel) ══ */}
        <PhaseTag label="Phase 1 — Input (Parallel)" />

        <div className="grid grid-cols-2 gap-4">
          {/* JD Column */}
          <div className="space-y-2">
            <div className="text-center text-[10px] font-semibold text-zinc-400 uppercase tracking-widest pb-1 border-b border-zinc-100">
              Job Description Stream
            </div>
            {INPUT_LEFT.map((node, i) => (
              <div key={node.id}>
                <Node node={node} expanded={!!expanded[node.id]} onToggle={() => toggle(node.id)} />
                {i < INPUT_LEFT.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="w-px h-4 bg-zinc-200" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Resume Column */}
          <div className="space-y-2">
            <div className="text-center text-[10px] font-semibold text-zinc-400 uppercase tracking-widest pb-1 border-b border-zinc-100">
              Resume Stream
            </div>
            {INPUT_RIGHT.map((node, i) => (
              <div key={node.id}>
                <Node node={node} expanded={!!expanded[node.id]} onToggle={() => toggle(node.id)} />
                {i < INPUT_RIGHT.length - 1 && (
                  <div className="flex justify-center py-1">
                    <div className="w-px h-4 bg-zinc-200" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Merge arrow */}
        <MergeSVG />

        {/* ══ PHASE 2: SCORING (Parallel) ══ */}
        <PhaseTag label="Phase 2 — Scoring (Parallel)" />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-center text-[10px] font-semibold text-zinc-400 uppercase tracking-widest pb-1 border-b border-zinc-100">
              Deterministic Score
            </div>
            {SCORING_LEFT.map(node => (
              <Node key={node.id} node={node} expanded={!!expanded[node.id]} onToggle={() => toggle(node.id)} />
            ))}
          </div>
          <div className="space-y-2">
            <div className="text-center text-[10px] font-semibold text-zinc-400 uppercase tracking-widest pb-1 border-b border-zinc-100">
              Semantic Score
            </div>
            {SCORING_RIGHT.map(node => (
              <Node key={node.id} node={node} expanded={!!expanded[node.id]} onToggle={() => toggle(node.id)} />
            ))}
          </div>
        </div>

        {/* Merge arrow */}
        <MergeSVG />

        {/* ══ PHASE 3-6: SERIAL PIPELINE ══ */}

        {/* Ranking */}
        <PhaseTag label="Phase 3 — Ranking & Selection" />
        <div className="space-y-2 max-w-xl mx-auto">
          {SERIAL_STEPS.slice(0, 2).map((node, i) => (
            <div key={node.id}>
              <Node node={node} expanded={!!expanded[node.id]} onToggle={() => toggle(node.id)} />
              {i === 0 && <Connector />}
            </div>
          ))}
        </div>

        <Connector label="top-N candidates selected" />

        {/* Qualifier */}
        <PhaseTag label="Phase 4 — Qualifier Generation" />
        <div className="max-w-xl mx-auto">
          <Node node={SERIAL_STEPS[2]} expanded={!!expanded[SERIAL_STEPS[2].id]} onToggle={() => toggle(SERIAL_STEPS[2].id)} />
        </div>

        <Connector label="HR schedules interview" />

        {/* Interview Pipeline — NEW */}
        <PhaseTag label="Phase 5 — Automated Interview Evaluation" isNew />

        <div className="space-y-2 max-w-xl mx-auto">
          {SERIAL_STEPS.slice(3, 9).map((node, i, arr) => (
            <div key={node.id}>
              <Node node={node} expanded={!!expanded[node.id]} onToggle={() => toggle(node.id)} />
              {i < arr.length - 1 && (
                <Connector
                  label={
                    i === 0 ? "call ends → webhook fired" :
                    i === 1 ? "raw JSON transcript" :
                    i === 2 ? "structured Q&A array" :
                    i === 3 ? "AI scores + justifications" :
                    i === 4 ? "confirmed HR score" :
                    undefined
                  }
                  color={node.isNew ? "bg-rose-200" : "bg-zinc-200"}
                />
              )}
            </div>
          ))}
        </div>

        <Connector label="HR evaluation score ready" />

        {/* Final scoring */}
        <PhaseTag label="Phase 6 — Final Scoring & Output" />
        <div className="space-y-2 max-w-xl mx-auto">
          {SERIAL_STEPS.slice(9).map((node, i, arr) => (
            <div key={node.id}>
              <Node node={node} expanded={!!expanded[node.id]} onToggle={() => toggle(node.id)} />
              {i < arr.length - 1 && <Connector />}
            </div>
          ))}
        </div>

        {/* Formula summary */}
        <div className="mt-8 max-w-xl mx-auto bg-zinc-950 rounded-xl p-5">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">Final Score Formula (FR10)</div>
          <div className="font-mono text-sm text-emerald-400 space-y-1">
            <div><span className="text-zinc-500">Final Score =</span></div>
            <div className="pl-4"><span className="text-indigo-400">Skill Score</span> <span className="text-zinc-400">× 0.50</span></div>
            <div className="pl-4 text-zinc-600">+</div>
            <div className="pl-4"><span className="text-violet-400">RAG Score</span> <span className="text-zinc-400">× 0.30</span></div>
            <div className="pl-4 text-zinc-600">+</div>
            <div className="pl-4"><span className="text-rose-400">HR Evaluation</span> <span className="text-zinc-400">× 0.20</span></div>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800 text-[11px] text-zinc-500">
            HR Evaluation is now the <span className="text-rose-400 font-medium">AI-graded interview score</span>, averaged across qualifier questions, with HITL override capability (FR14–15).
          </div>
        </div>

      </div>

      {/* Assessment */}
      <div className="mt-10 space-y-3">
        <h2 className="text-base font-semibold text-zinc-900">PRD Assessment</h2>

        <div className="space-y-2">
          {[
            { type: "good", text: "Model split is correct — gpt-4o-mini for extraction (speed, cost) + gpt-4o for grading (reasoning depth). Don't swap these." },
            { type: "good", text: "Agentic extraction step (FR13) before evaluation (FR14) is architecturally sound — separating noise from signal prevents contaminating the grader." },
            { type: "good", text: "HITL override (FR15) is essential for enterprise trust. The 1-sentence justification per score is the right unit of explainability." },
            { type: "good", text: "Intent-mapping in FR13 correctly acknowledges HR will paraphrase questions naturally — the extraction prompt must match semantics, not exact wording." },
            { type: "warn", text: "FR12 has two ingestion paths (Recall.ai webhook vs Google Drive API). Pick one. Recall.ai is near-real-time; Drive API can lag 30min–24h. Mixing both adds complexity without benefit for MVP." },
            { type: "warn", text: "FR14 averages all question scores equally. Consider weighting by JD skill importance — a question about a critical required skill should outweigh a question about a preferred skill." },
            { type: "warn", text: "Out of Scope still lists 'Interview scheduling' — but FR12 implies the interview happens. Clarify: scheduling is still out of scope, only automated post-call transcript ingestion is in scope." },
            { type: "gap",  text: "Missing: Webhook failure handling. What happens if the bot fails to join the call or the webhook is dropped? Need retry logic + HR alert fallback (manual transcript upload)." },
            { type: "gap",  text: "Missing: Transcript retention policy. Interview audio/video is personal data — GDPR/DPDP compliance requires explicit storage duration and deletion policy." },
            { type: "future", text: "Vector DB + Supabase: When added, replace FAISS in-memory with pgvector in Supabase. Embeddings become persistent, searchable across historical candidates — enables cross-role matching." },
          ].map((item, i) => (
            <div key={i} className={cn(
              "flex gap-3 p-3 rounded-lg border text-sm",
              item.type === "good"   && "bg-emerald-50 border-emerald-200 text-emerald-800",
              item.type === "warn"   && "bg-amber-50 border-amber-200 text-amber-800",
              item.type === "gap"    && "bg-red-50 border-red-200 text-red-800",
              item.type === "future" && "bg-zinc-50 border-zinc-200 text-zinc-600",
            )}>
              <span className="shrink-0 mt-0.5">
                {item.type === "good"   && "✓"}
                {item.type === "warn"   && "⚠"}
                {item.type === "gap"    && "✗"}
                {item.type === "future" && "→"}
              </span>
              {item.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
