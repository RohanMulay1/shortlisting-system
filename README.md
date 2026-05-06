# Intelligent Hybrid Candidate Shortlisting System

An AI-powered candidate shortlisting engine combining skill-based scoring, RAG semantic matching, and HR qualifier evaluation.

## Features

- **JD Parsing** — Extract required/preferred skills, experience, responsibilities from any JD
- **Resume Parsing** — Batch process PDF resumes using AI
- **Skill Scoring** — Deterministic scoring formula (Skill Match + Skill Experience + Total Experience + Bonus)
- **RAG Matching** — Semantic similarity using OpenAI embeddings + FAISS
- **Qualifier Questions** — AI-generated targeted interview questions per candidate
- **HR Evaluation** — Rate qualifier answers, compute final scores
- **Configurable Weights** — Adjust scoring weights via sidebar sliders
- **Export** — Download shortlist as CSV

## Scoring Formula

```
Skill Score = (Skill Match * 0.5) + (Skill Experience * 0.3) + (Total Experience * 0.15) + (Bonus * 0.05)
Final Score = (Skill Score * 0.5) + (RAG Score * 0.3) + (HR Evaluation * 0.2)
```

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env
# Add your OPENAI_API_KEY to .env
streamlit run app.py
```

## Requirements

- Python 3.11+
- OpenAI API key

## Workflow

1. **Upload JD** — Paste or upload job description
2. **Upload Resumes** — Upload PDF/TXT resumes in batch
3. **Rankings** — View AI-ranked candidates with full score breakdown
4. **HR Evaluation** — Generate qualifier questions, rate candidates, download final shortlist
