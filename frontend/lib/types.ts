export interface SkillScores {
  skillMatch: number      // 0-100
  skillExperience: number // 0-100
  totalExperience: number // 0-100
  bonus: number           // 0-100
  skillScore: number      // composite 0-100
}

export interface Candidate {
  id: string
  name: string
  email: string
  phone?: string
  currentRole: string
  totalYears: number
  skills: string[]
  matchedRequired: string[]
  matchedPreferred: string[]
  education: string
  companies: string[]
  summary: string
  scores: SkillScores & {
    ragScore: number   // 0-100
    hrScore: number    // 0-100
    finalScore: number // 0-100
  }
  status: "pending" | "shortlisted" | "rejected" | "reviewing"
  qualifierQuestions?: string[]
  hrNotes?: string
  filename: string
}

export interface Job {
  id: string
  title: string
  department: string
  location: string
  status: "active" | "closed" | "draft"
  requiredSkills: string[]
  preferredSkills: string[]
  experienceYears: number
  responsibilities: string[]
  domains: string[]
  education: string
  candidateCount: number
  shortlistedCount: number
  createdAt: string
  simplifiedJD?: string
}

export interface DashboardStats {
  activeJobs: number
  totalCandidates: number
  shortlisted: number
  avgScore: number
  processingTime: string
  thisWeek: number
}
