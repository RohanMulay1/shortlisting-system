"use client"

import { useState, useRef } from "react"
import { Upload, FileText, X, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadZoneProps {
  label?: string
  accept?: string
  multiple?: boolean
  onFiles?: (files: File[]) => void
  compact?: boolean
  existingFilenames?: string[]
}

export function FileUploadZone({
  label = "Drop files here or click to upload",
  accept = ".pdf,.txt",
  multiple = true,
  onFiles,
  compact = false,
  existingFilenames = [],
}: FileUploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const isDuplicate = (f: File) => existingFilenames.includes(f.name)

  const merge = (incoming: File[]) => {
    const existing = multiple ? files : []
    const seen = new Set(existing.map(f => f.name))
    // deduplicate within the current selection (same filename chosen twice)
    const deduped = incoming.filter(f => {
      if (seen.has(f.name)) return false
      seen.add(f.name)
      return true
    })
    return [...existing, ...deduped]
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const updated = merge(Array.from(e.dataTransfer.files))
    setFiles(updated)
    onFiles?.(updated)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const updated = merge(Array.from(e.target.files))
    setFiles(updated)
    onFiles?.(updated)
    // reset input so the same file can be re-added after removal
    e.target.value = ""
  }

  const removeFile = (i: number) => {
    const updated = files.filter((_, idx) => idx !== i)
    setFiles(updated)
    onFiles?.(updated)
  }

  const dupCount = files.filter(isDuplicate).length
  const newCount = files.length - dupCount

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-2 text-center",
          compact ? "p-5" : "p-10",
          dragging
            ? "border-indigo-400 bg-indigo-50"
            : "border-zinc-200 bg-zinc-50 hover:border-indigo-300 hover:bg-indigo-50/40"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={handleChange}
        />
        <div className={cn(
          "rounded-full flex items-center justify-center",
          compact ? "w-8 h-8 bg-indigo-100" : "w-12 h-12 bg-indigo-100",
          dragging && "bg-indigo-200"
        )}>
          <Upload className={cn("text-indigo-600", compact ? "w-4 h-4" : "w-5 h-5")} />
        </div>
        <div>
          <p className={cn("font-medium text-zinc-700", compact ? "text-sm" : "text-sm")}>{label}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{accept.toUpperCase().replace(/\./g, "").replace(/,/g, " · ")} files supported</p>
        </div>
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {dupCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {dupCount} duplicate{dupCount > 1 ? "s" : ""} already uploaded — will be skipped.
              {newCount > 0 && <span className="ml-1 text-zinc-500">({newCount} new)</span>}
            </div>
          )}
          {files.map((f, i) => {
            const dup = isDuplicate(f)
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 border rounded-lg group transition-colors",
                  dup
                    ? "bg-amber-50 border-amber-200"
                    : "bg-white border-zinc-200"
                )}
              >
                <FileText className={cn("w-3.5 h-3.5 shrink-0", dup ? "text-amber-500" : "text-indigo-500")} />
                <span className={cn("text-xs truncate flex-1 font-medium", dup ? "text-amber-700" : "text-zinc-700")}>
                  {f.name}
                </span>
                {dup ? (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-600 shrink-0">
                    duplicate
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-400">{(f.size / 1024).toFixed(0)} KB</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5 text-zinc-400 hover:text-red-500" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
