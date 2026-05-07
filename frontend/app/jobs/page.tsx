"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileUploadZone } from "@/components/shared/FileUploadZone"
import { Play, CheckCircle2, Sparkles, ChevronDown, ChevronUp, Briefcase, AlertCircle, AlertTriangle } from "lucide-react"
import { parseJD, getJD, uploadResumes, runPipeline, getCandidates, type ParsedJD } from "@/lib/api"

interface UploadResult {
  added: number
  skipped: number
  total: number
}

export default function JobsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("paste")
  const [pasteText, setPasteText] = useState("")
  const [jdFile, setJdFile] = useState<File | null>(null)
  const [resumeFiles, setResumeFiles] = useState<File[]>([])
  const [existingFilenames, setExistingFilenames] = useState<string[]>([])
  const [parsedJD, setParsedJD] = useState<ParsedJD | null>(null)
  const [simplified, setSimplified] = useState<string | null>(null)
  const [showSimplified, setShowSimplified] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [running, setRunning] = useState(false)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Restore existing session state on mount so a page reload doesn't wipe the UI
  useEffect(() => {
    getJD()
      .then(r => {
        if (r.jd) { setParsedJD(r.jd); setSimplified(r.simplified) }
      })
      .catch(() => {})
    getCandidates()
      .then(r => {
        const names = r.candidates.map(c => c.filename)
        setExistingFilenames(names)
        if (names.length > 0) setUploadResult({ added: 0, skipped: 0, total: r.count })
      })
      .catch(() => {})
  }, [])

  const handleParseJD = async () => {
    setError(null)
    let text = pasteText.trim()
    if (activeTab === "upload" && jdFile) {
      text = await jdFile.text()
    }
    if (!text) { setError("Please provide a job description"); return }
    setParsing(true)
    try {
      const res = await parseJD(text)
      setParsedJD(res.jd)
      setSimplified(res.simplified)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to parse JD")
    } finally {
      setParsing(false)
    }
  }

  const handleUploadResumes = async () => {
    if (!resumeFiles.length) { setError("Select at least one resume"); return }
    setError(null)
    setUploading(true)
    const prevCount = existingFilenames.length
    try {
      const res = await uploadResumes(resumeFiles)
      const added = res.count - prevCount
      const skipped = resumeFiles.length - added
      setUploadResult({ added: Math.max(added, 0), skipped: Math.max(skipped, 0), total: res.count })
      // update existing filenames so subsequent uploads show correct duplicate state
      setExistingFilenames(res.candidates.map(c => c.filename))
      setResumeFiles([])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handleRunPipeline = async () => {
    setError(null)
    setRunning(true)
    try {
      await runPipeline({ top_n: 10 })
      router.push("/candidates")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Pipeline failed")
      setRunning(false)
    }
  }

  const canRun = parsedJD !== null && (uploadResult !== null || existingFilenames.length > 0)

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in">
      <div className="mb-8">
        <div className="text-xs text-zinc-400 font-medium mb-2">Jobs</div>
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Job Description Manager</h1>
        <p className="text-sm text-zinc-500 mt-1">Upload or paste a JD to extract requirements and run the shortlisting pipeline.</p>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Inputs */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* JD Input */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900">Job Description</h2>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex bg-zinc-100 rounded-lg p-0.5">
                {(["paste", "upload"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all capitalize ${
                      activeTab === tab ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    {tab === "upload" ? "Upload File" : "Paste Text"}
                  </button>
                ))}
              </div>

              {activeTab === "paste" ? (
                <textarea
                  placeholder="Paste your job description here..."
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  className="w-full h-40 text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder:text-zinc-400"
                />
              ) : (
                <FileUploadZone
                  label="Drop JD (.txt) here or click to browse"
                  accept=".txt"
                  multiple={false}
                  compact
                  onFiles={files => { if (files[0]) setJdFile(files[0]) }}
                />
              )}

              <button
                onClick={handleParseJD}
                disabled={parsing}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {parsing ? (
                  <><Spinner />Parsing...</>
                ) : parsedJD ? (
                  <><CheckCircle2 className="w-4 h-4" />JD Parsed — Re-parse</>
                ) : (
                  <><Sparkles className="w-4 h-4" />Parse & Analyze JD</>
                )}
              </button>
            </div>
          </div>

          {/* Resume Upload */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900">Upload Resumes</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">PDF or TXT — batch upload, duplicates skipped automatically</p>
                </div>
                {existingFilenames.length > 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                    {existingFilenames.length} on server
                  </span>
                )}
              </div>
            </div>
            <div className="p-5 flex flex-col gap-3">
              <FileUploadZone
                label="Drop resumes here or click to browse"
                accept=".pdf,.txt"
                multiple
                compact
                existingFilenames={existingFilenames}
                onFiles={files => setResumeFiles(files)}
              />

              {/* Upload result summary */}
              {uploadResult && (
                <div className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium ${
                  uploadResult.skipped > 0
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-emerald-50 border-emerald-200 text-emerald-800"
                }`}>
                  {uploadResult.skipped > 0
                    ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    : <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                  <div>
                    <span>{uploadResult.added} new resume{uploadResult.added !== 1 ? "s" : ""} added</span>
                    {uploadResult.skipped > 0 && (
                      <span className="ml-1 text-amber-600">· {uploadResult.skipped} duplicate{uploadResult.skipped !== 1 ? "s" : ""} skipped</span>
                    )}
                    <span className="ml-1 text-zinc-500">({uploadResult.total} total on server)</span>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <button
                  onClick={handleUploadResumes}
                  disabled={uploading || resumeFiles.length === 0}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {uploading ? (
                    <><Spinner />Parsing resumes...</>
                  ) : (
                    `Upload ${resumeFiles.length > 0 ? `${resumeFiles.length} File${resumeFiles.length !== 1 ? "s" : ""}` : "Resumes"}`
                  )}
                </button>
                {uploading && (
                  <p className="text-xs text-center text-zinc-400">
                    Each resume is parsed by AI — allow ~2s per file
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Run Pipeline */}
          {canRun && (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleRunPipeline}
                disabled={running}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white disabled:opacity-70"
              >
                {running ? (
                  <><Spinner />Running pipeline...</>
                ) : (
                  <><Play className="w-4 h-4" />Run Candidate Match & Rank</>
                )}
              </button>
              {running && (
                <p className="text-xs text-center text-zinc-400">
                  Scoring resumes and computing matches — this takes 10–30 seconds
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right: Parsed JD display */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {parsedJD ? (
            <>
              <div className="bg-white border border-zinc-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-zinc-900">{parsedJD.title || "Parsed JD"}</h2>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{parsedJD.experience_years}+ years exp · {parsedJD.education}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-zinc-900 mb-4">Extracted Requirements</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Required Skills</div>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedJD.required_skills.map(s => (
                        <span key={s} className="text-xs font-medium px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Preferred Skills</div>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedJD.preferred_skills.map(s => (
                        <span key={s} className="text-xs font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {parsedJD.responsibilities?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-100">
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Responsibilities</div>
                    <ul className="space-y-1.5">
                      {parsedJD.responsibilities.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
                          <div className="w-1 h-1 rounded-full bg-indigo-400 shrink-0 mt-2" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {parsedJD.nice_to_have?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-100">
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Nice to Have</div>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedJD.nice_to_have.map(s => (
                        <span key={s} className="text-xs font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 border border-zinc-200">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {simplified && (
                <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowSimplified(!showSimplified)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <h3 className="text-sm font-semibold text-zinc-900">Simplified JD Preview</h3>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">AI Generated</span>
                    </div>
                    {showSimplified ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                  </button>
                  {showSimplified && (
                    <div className="px-5 pb-5 border-t border-zinc-100">
                      <div className="prose prose-sm mt-4 text-zinc-600 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                        {simplified}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-white border-2 border-dashed border-zinc-200 rounded-xl">
              <Briefcase className="w-8 h-8 text-zinc-300 mb-3" />
              <p className="text-sm font-medium text-zinc-400">No JD parsed yet</p>
              <p className="text-xs text-zinc-300 mt-1">Paste or upload a job description to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
