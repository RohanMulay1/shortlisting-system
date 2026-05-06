import { Briefcase, Users, CheckCircle2, TrendingUp, Clock, ArrowRight, Zap } from "lucide-react"
import { MetricCard } from "@/components/shared/MetricCard"
import { mockStats, mockCandidates, mockJobs } from "@/lib/mock-data"
import { statusColor, scoreColor } from "@/lib/utils"
import Link from "next/link"

export default function Dashboard() {
  const topCandidates = mockCandidates.slice(0, 4)

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2 font-medium">
          <span>Dashboard</span>
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">Hiring pipeline intelligence for your active roles.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          label="Active Jobs"
          value={mockStats.activeJobs}
          icon={Briefcase}
          iconColor="text-indigo-600"
          trend={{ value: "2 new this week", positive: true }}
        />
        <MetricCard
          label="Total Candidates"
          value={mockStats.totalCandidates}
          icon={Users}
          iconColor="text-blue-600"
          trend={{ value: `${mockStats.thisWeek} this week`, positive: true }}
        />
        <MetricCard
          label="Shortlisted"
          value={mockStats.shortlisted}
          sub={`of ${mockStats.totalCandidates}`}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
        />
        <MetricCard
          label="Avg. Match Score"
          value={`${mockStats.avgScore}%`}
          icon={TrendingUp}
          iconColor="text-amber-600"
          trend={{ value: "+4% vs last batch", positive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Jobs */}
        <div className="lg:col-span-1 bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Active Jobs</h2>
            <Link href="/jobs" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {mockJobs.map((job) => (
              <Link key={job.id} href="/jobs" className="flex items-start gap-3 px-5 py-3.5 hover:bg-zinc-50 transition-colors group">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 mt-0.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-800 truncate group-hover:text-indigo-600 transition-colors">
                    {job.title}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">{job.department} · {job.location}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                      job.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      job.status === "draft" ? "bg-zinc-100 text-zinc-500 border-zinc-200" :
                      "bg-red-50 text-red-600 border-red-200"
                    }`}>
                      {job.status}
                    </span>
                    <span className="text-[11px] text-zinc-400">{job.candidateCount} candidates</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top Candidates */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900">Top Candidates</h2>
            <Link href="/candidates" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {topCandidates.map((c, i) => (
              <Link key={c.id} href="/candidates" className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 transition-colors group">
                <span className="text-xs font-semibold text-zinc-300 w-4 shrink-0">#{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-white">
                    {c.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-800 group-hover:text-indigo-600 transition-colors">{c.name}</div>
                  <div className="text-xs text-zinc-400 truncate">{c.currentRole}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className={`text-sm font-semibold tabular-nums ${scoreColor(c.scores.finalScore)}`}>
                      {c.scores.finalScore}%
                    </div>
                    <div className="text-[10px] text-zinc-400">Final</div>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusColor(c.status)}`}>
                    {c.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Processing Banner */}
      <div className="mt-6 flex items-center gap-3 px-5 py-3.5 bg-indigo-50 border border-indigo-100 rounded-xl">
        <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
          <Zap className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-medium text-indigo-900">Pipeline processed in {mockStats.processingTime}</span>
          <span className="text-sm text-indigo-600 ml-2">· {mockStats.totalCandidates} resumes scored with skill + RAG matching</span>
        </div>
        <Link href="/candidates" className="text-xs font-semibold text-indigo-700 flex items-center gap-1 hover:gap-1.5 transition-all">
          View rankings <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
