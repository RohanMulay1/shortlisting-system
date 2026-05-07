const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// HR-readable messages for common failure modes
function friendlyError(e: unknown, path: string): Error {
  if (e instanceof Error) {
    // Network error — backend unreachable or cold-starting
    if (e.name === "AbortError") {
      return new Error(
        "The request timed out. The backend may be warming up (this takes ~30 seconds on first use). Please wait a moment and try again."
      )
    }
    if (
      e.message.includes("Failed to fetch") ||
      e.message.includes("NetworkError") ||
      e.message.includes("Load failed")
    ) {
      return new Error(
        "Cannot reach the backend server. Check your internet connection, or wait 30 seconds if the server just woke up from sleep."
      )
    }
    return e
  }
  return new Error("An unexpected error occurred. Please refresh and try again.")
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 120000): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...init?.headers },
      ...init,
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      const detail = body.detail ?? res.statusText
      // Map HTTP status codes to HR-readable messages
      if (res.status === 400) throw new Error(`Missing required input: ${detail}`)
      if (res.status === 404) throw new Error(`Not found: ${detail}`)
      if (res.status === 429) throw new Error("Too many requests — please wait a minute and try again.")
      if (res.status >= 500) throw new Error(`Server error: ${detail}. Please try again in a few seconds.`)
      throw new Error(detail)
    }

    return res.json()
  } catch (e) {
    clearTimeout(timer)
    throw friendlyError(e, path)
  }
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

export interface QuestionResult {
  verdict: "Strong" | "Good" | "Weak" | "Not Addressed"
  summary: string
  score: number
}

export async function evaluateQualifier(
  candidate_filename: string,
  transcript: string
): Promise<{ results: QuestionResult[]; avg_score: number }> {
  return request("/api/qualifier/evaluate", {
    method: "POST",
    body: JSON.stringify({ candidate_filename, transcript }),
  }, 120000)
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

// ── Google Meet integration ───────────────────────────────────────────────────

export interface MeetMeeting {
  name: string        // "conferenceRecords/abc123"
  title: string
  start_time: string
}

export async function getMeetStatus(): Promise<{ connected: boolean }> {
  return request("/api/integrations/google-meet/status")
}

export async function getMeetAuthUrl(): Promise<{ url: string }> {
  return request("/api/integrations/google-meet/auth-url")
}

export async function getMeetMeetings(): Promise<{ meetings: MeetMeeting[] }> {
  return request("/api/integrations/google-meet/meetings")
}

export async function fetchMeetTranscript(
  conference_record_name: string,
  candidate_filename: string
): Promise<{ results: QuestionResult[]; avg_score: number; transcript: string }> {
  return request("/api/integrations/google-meet/fetch-transcript", {
    method: "POST",
    body: JSON.stringify({ conference_record_name, candidate_filename }),
  }, 60000)
}

export async function disconnectMeet(): Promise<void> {
  return request("/api/integrations/google-meet/disconnect", { method: "DELETE" })
}
