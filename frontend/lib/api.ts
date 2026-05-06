const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? res.statusText)
  }
  return res.json()
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ParsedJD {
  title: string
  required_skills: string[]
  preferred_skills: string[]
  experience_years: number
  education: string
  responsibilities: string[]
  nice_to_have: string[]
}

export interface Candidate {
  filename: string
  name: string
  email: string
  phone: string
  total_years: number
  skills: string[]
  skill_experience: Record<string, number>
  education: string
  projects: { name: string; description: string }[]
  companies: string[]
  summary: string
}

export interface RankedCandidate {
  rank: number
  candidate: Candidate
  final_score: number
  skill_score: number
  rag_score: number
  hr_score: number
  matched_required: string[]
  matched_preferred: string[]
  status?: string
}

export interface ShortlistRow {
  rank: number
  name: string
  email: string
  total_years: number
  final_score: number
  skill_score: number
  rag_score: number
  hr_score: number
  matched_required: string
  matched_preferred: string
  hr_notes: string
  status: string
}

export interface PipelineOpts {
  top_n?: number
  threshold?: number
  weights?: Record<string, number>
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function parseJD(text: string): Promise<{ jd: ParsedJD; simplified: string }> {
  return request("/api/jd/parse", {
    method: "POST",
    body: JSON.stringify({ text }),
  })
}

export async function getJD(): Promise<{ jd: ParsedJD | null; simplified: string | null }> {
  return request("/api/jd")
}

export async function uploadResumes(files: File[]): Promise<{ candidates: Candidate[]; count: number }> {
  const form = new FormData()
  files.forEach((f) => form.append("files", f))
  return request("/api/resumes/upload", {
    method: "POST",
    headers: {},
    body: form,
  })
}

export async function getCandidates(): Promise<{ candidates: Candidate[]; count: number }> {
  return request("/api/candidates")
}

export async function clearCandidates(): Promise<void> {
  return request("/api/candidates", { method: "DELETE" })
}

export async function runPipeline(opts: PipelineOpts = {}): Promise<{ ranked: RankedCandidate[]; top: RankedCandidate[] }> {
  return request("/api/pipeline/run", {
    method: "POST",
    body: JSON.stringify({ top_n: 10, threshold: 0.0, ...opts }),
  })
}

export async function getRanked(): Promise<{ ranked: RankedCandidate[] }> {
  return request("/api/ranked")
}

export async function finalizePipeline(): Promise<{ ranked: RankedCandidate[] }> {
  return request("/api/pipeline/finalize", { method: "POST", body: "{}" })
}

export async function getShortlist(): Promise<{ shortlist: ShortlistRow[] }> {
  return request("/api/shortlist")
}

export async function generateQualifier(candidate_filename: string): Promise<{ questions: string[] }> {
  return request("/api/qualifier/generate", {
    method: "POST",
    body: JSON.stringify({ candidate_filename }),
  })
}

export async function submitEvaluation(data: {
  candidate_filename: string
  ratings: number[]
  notes?: string
}): Promise<{ ok: boolean; avg_rating: number; hr_score_normalized: number }> {
  return request("/api/evaluation/submit", {
    method: "POST",
    body: JSON.stringify({ notes: "", ...data }),
  })
}

export async function getEvaluations(): Promise<{ evaluations: Record<string, unknown> }> {
  return request("/api/evaluation")
}

export async function resetSession(): Promise<void> {
  return request("/api/session/reset", { method: "DELETE" })
}
