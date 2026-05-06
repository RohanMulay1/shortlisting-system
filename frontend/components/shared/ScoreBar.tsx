import { cn, scoreBg } from "@/lib/utils"

interface ScoreBarProps {
  label: string
  value: number
  max?: number
  weight?: string
  compact?: boolean
}

export function ScoreBar({ label, value, max = 100, weight, compact = false }: ScoreBarProps) {
  const pct = Math.min((value / max) * 100, 100)

  return (
    <div className={cn("flex flex-col gap-1", compact ? "gap-0.5" : "gap-1")}>
      <div className="flex items-center justify-between">
        <span className={cn("text-zinc-600 font-medium", compact ? "text-[11px]" : "text-xs")}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          {weight && (
            <span className="text-[10px] text-zinc-400 font-mono">{weight}</span>
          )}
          <span className={cn("font-semibold tabular-nums", compact ? "text-[11px]" : "text-xs",
            value >= 80 ? "text-emerald-600" : value >= 65 ? "text-indigo-600" : value >= 50 ? "text-amber-600" : "text-red-500"
          )}>
            {value}
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", scoreBg(value))}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
