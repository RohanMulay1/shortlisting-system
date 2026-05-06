import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface MetricCardProps {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  iconColor?: string
  trend?: { value: string; positive: boolean }
}

export function MetricCard({ label, value, sub, icon: Icon, iconColor = "text-indigo-600", trend }: MetricCardProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col gap-3 hover:border-zinc-300 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500 font-medium">{label}</span>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-zinc-50", iconColor.replace("text-", "bg-").replace("600", "50"))}>
          <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-semibold text-zinc-900 tabular-nums">{value}</span>
        {sub && <span className="text-sm text-zinc-400 mb-0.5">{sub}</span>}
      </div>
      {trend && (
        <div className={cn("flex items-center gap-1 text-xs font-medium", trend.positive ? "text-emerald-600" : "text-red-500")}>
          <span>{trend.positive ? "↑" : "↓"}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  )
}
