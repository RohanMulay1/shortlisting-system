import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import "./globals.css"
import { Sidebar } from "@/components/layout/Sidebar"

export const metadata: Metadata = {
  title: "ShortlistAI — Intelligent Candidate Shortlisting",
  description: "AI-powered candidate shortlisting engine",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="ml-[224px] flex-1 min-h-screen bg-zinc-50">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
