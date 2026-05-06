"use client"

import { scoreColor } from "@/lib/utils"

interface ScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
  label?: string
  showLabel?: boolean
}

export function ScoreRing({ score, size = 72, strokeWidth = 6, label, showLabel = true }: ScoreRingProps) {
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(score, 100) / 100) * circumference
  const cx = size / 2
  const cy = size / 2

  const trackColor = "#e4e4e7"
  const fillColor =
    score >= 80 ? "#10b981" :
    score >= 65 ? "#4f46e5" :
    score >= 50 ? "#f59e0b" : "#ef4444"

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none" stroke={trackColor} strokeWidth={strokeWidth}
        />
        <circle
          cx={cx} cy={cy} r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text
          x={cx} y={cy + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size < 60 ? 13 : 16}
          fontWeight="600"
          fontFamily="var(--font-geist-sans)"
          fill="#18181b"
        >
          {score}
        </text>
      </svg>
      {showLabel && label && (
        <span className="text-[11px] text-zinc-500 font-medium">{label}</span>
      )}
    </div>
  )
}
