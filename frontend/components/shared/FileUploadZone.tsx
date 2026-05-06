"use client"

import { useState, useRef } from "react"
import { Upload, FileText, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileUploadZoneProps {
  label?: string
  accept?: string
  multiple?: boolean
  onFiles?: (files: File[]) => void
  compact?: boolean
}

export function FileUploadZone({
  label = "Drop files here or click to upload",
  accept = ".pdf,.txt",
  multiple = true,
  onFiles,
  compact = false,
}: FileUploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    const updated = multiple ? [...files, ...dropped] : dropped
    setFiles(updated)
    onFiles?.(updated)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const selected = Array.from(e.target.files)
    const updated = multiple ? [...files, ...selected] : selected
    setFiles(updated)
    onFiles?.(updated)
  }

  const removeFile = (i: number) => {
    const updated = files.filter((_, idx) => idx !== i)
    setFiles(updated)
    onFiles?.(updated)
  }

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
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 rounded-lg group">
              <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span className="text-xs text-zinc-700 truncate flex-1 font-medium">{f.name}</span>
              <span className="text-[10px] text-zinc-400">{(f.size / 1024).toFixed(0)} KB</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3.5 h-3.5 text-zinc-400 hover:text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
