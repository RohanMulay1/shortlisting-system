"use client"

import { useState } from "react"
import { FileUploadZone } from "@/components/shared/FileUploadZone"
import { mockJob } from "@/lib/mock-data"
import { Play, CheckCircle2, Sparkles, ChevronDown, ChevronUp, Plus, Briefcase } from "lucide-react"

export default function JobsPage() {
  const [jdParsed, setJdParsed] = useState(true)
  const [showSimplified, setShowSimplified] = useState(false)
  const [running, setRunning] = useState(false)
  const [ran, setRan] = useState(false)
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload")
  const job = mockJob

  const runPipeline = () => {
    setRunning(true)
    setTimeout(() => { setRunning(false); setRan(true) }, 1800)
  }

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in">
      {/* Header */}
      <div className="mb-8">
        <div className="text-xs text-zinc-400 font-medium mb-2">Jobs</div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Job Description Manager</h1>
            <p className="text-sm text-zinc-500 mt-1">Upload or paste a JD to extract requirements and run the shortlisting pipeline.</p>
          </div>
          <button className="flex items-center gap-2 px-3.5 py-2 bg-white border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors">
            <Plus className="w-4 h-4" />
            New Job
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Upload */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900">Upload Job Description</h2>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {/* Tabs */}
              <div className="flex bg-zinc-100 rounded-lg p-0.5">
                {(["upload", "paste"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all capitalize ${
                      activeTab === tab
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-500 hover:text-zinc-700"
                    }`}
                  >
                    {tab === "upload" ? "Upload File" : "Paste Text"}
                  </button>
                ))}
              </div>

              {activeTab === "upload" ? (
                <FileUploadZone
                  label="Drop JD here or click to browse"
                  accept=".pdf,.txt"
                  multiple={false}
                  compact
                  onFiles={(files) => { if (files.length) setJdParsed(true) }}
                />
              ) : (
                <textarea
                  placeholder="Paste your job description here..."
                  className="w-full h-36 text-sm text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 placeholder:text-zinc-400"
                />
              )}

              <button
                onClick={() => setJdParsed(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Parse & Analyze JD
              </button>
            </div>
          </div>

          {/* Upload Resumes */}
          <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-900">Upload Resumes</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Batch upload all candidate resumes</p>
            </div>
            <div className="p-5">
              <FileUploadZone
                label="Drop resumes here or click to browse"
                accept=".pdf,.txt"
                multiple
                compact
              />
            </div>
          </div>

          {/* Action Bar */}
          {jdParsed && (
            <button
              onClick={runPipeline}
              disabled={running}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white disabled:opacity-70"
            >
              {running ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Running pipeline...
                </>
              ) : ran ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Pipeline Complete — View Rankings
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Candidate Match & Rank
                </>
              )}
            </button>
          )}
        </div>

        {/* Right: Parsed JD */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          {jdParsed ? (
            <>
              {/* JD Header Card */}
              <div className="bg-white border border-zinc-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <Briefcase className="w-4.5 h-4.5 text-indigo-600 w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold text-zinc-900">{job.title}</h2>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{job.department} · {job.location} · {job.experienceYears}+ years exp</p>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="bg-white border border-zinc-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-zinc-900 mb-4">Extracted Requirements</h3>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Required Skills</div>
                    <div className="flex flex-wrap gap-1.5">
                      {job.requiredSkills.map(s => (
                        <span key={s} className="text-xs font-medium px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Preferred Skills</div>
                    <div className="flex flex-wrap gap-1.5">
                      {job.preferredSkills.map(s => (
                        <span key={s} className="text-xs font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-100">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Responsibilities</div>
                  <ul className="space-y-1.5">
                    {job.responsibilities.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-600">
                        <div className="w-1 h-1 rounded-full bg-indigo-400 shrink-0 mt-2" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-zinc-100">
                  <div className="bg-zinc-50 rounded-lg p-3">
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Experience</div>
                    <div className="text-sm font-semibold text-zinc-800 mt-0.5">{job.experienceYears}+ years</div>
                  </div>
                  <div className="bg-zinc-50 rounded-lg p-3">
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Domain</div>
                    <div className="text-sm font-semibold text-zinc-800 mt-0.5">{job.domains[0]}</div>
                  </div>
                  <div className="bg-zinc-50 rounded-lg p-3">
                    <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Education</div>
                    <div className="text-xs font-semibold text-zinc-800 mt-0.5 leading-tight">{job.education.split(" ").slice(0, 3).join(" ")}</div>
                  </div>
                </div>
              </div>

              {/* Simplified JD */}
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
                      {job.simplifiedJD}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-white border-2 border-dashed border-zinc-200 rounded-xl">
              <Briefcase className="w-8 h-8 text-zinc-300 mb-3" />
              <p className="text-sm font-medium text-zinc-400">No JD parsed yet</p>
              <p className="text-xs text-zinc-300 mt-1">Upload or paste a job description to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
