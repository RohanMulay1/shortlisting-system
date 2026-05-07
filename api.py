import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

from backend.jd_processor import parse_jd, generate_simplified_jd
from backend.resume_parser import extract_text_from_pdf, parse_resume
from backend.scorer import compute_skill_score
from backend.rag_engine import compute_rag_scores
from backend.ranker import rank_candidates, select_top_n
from backend.qualifier import generate_questions, evaluate_answers
from backend import state
from fastapi.responses import RedirectResponse

state.init_db()

app = FastAPI(title="Shortlisting System API", version="1.0.0")

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ─────────────────────────────────────────────────

class JDParseRequest(BaseModel):
    text: str

class PipelineRunRequest(BaseModel):
    top_n: int = 10
    threshold: float = 0.0
    weights: Optional[dict] = None

class QualifierRequest(BaseModel):
    candidate_filename: str

class QualifierEvaluateRequest(BaseModel):
    candidate_filename: str
    transcript: str  # raw text or Fireflies JSON stringified — placeholder until webhook is wired

class EvaluationSubmitRequest(BaseModel):
    candidate_filename: str
    ratings: list[float]
    notes: str = ""


# ── JD ────────────────────────────────────────────────────────────────────────

@app.post("/api/jd/parse")
async def api_parse_jd(req: JDParseRequest):
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="JD text is required")
    parsed = parse_jd(req.text)
    simplified = generate_simplified_jd(parsed)
    state.save("jd_parsed", parsed)
    state.save("jd_raw", req.text)
    state.save("jd_simplified", simplified)
    # Reset downstream state on new JD
    state.save("candidates", [])
    state.save("skill_scores", [])
    state.save("rag_scores", [])
    state.save("ranked", [])
    state.save("hr_evaluations", {})
    state.save("qualifier_questions", {})
    return {"jd": parsed, "simplified": simplified}


@app.get("/api/jd")
async def api_get_jd():
    jd = state.load("jd_parsed")
    if not jd:
        return {"jd": None, "simplified": None}
    return {"jd": jd, "simplified": state.load("jd_simplified")}


# ── Resumes ───────────────────────────────────────────────────────────────────

@app.post("/api/resumes/upload")
async def api_upload_resumes(files: list[UploadFile] = File(...)):
    jd = state.load("jd_parsed")
    if not jd:
        raise HTTPException(status_code=400, detail="Parse a JD first before uploading resumes")

    existing = state.load("candidates", [])
    existing_names = {c.get("filename") for c in existing}
    new_candidates = list(existing)

    for f in files:
        if f.filename in existing_names:
            continue
        raw = await f.read()
        if f.filename.lower().endswith(".pdf"):
            text = extract_text_from_pdf(raw)
        else:
            text = raw.decode("utf-8", errors="ignore")
        candidate = parse_resume(text, filename=f.filename)
        new_candidates.append(candidate)

    state.save("candidates", new_candidates)
    state.save("skill_scores", [])
    state.save("rag_scores", [])
    state.save("ranked", [])
    return {"candidates": _safe_candidates(new_candidates), "count": len(new_candidates)}


@app.get("/api/candidates")
async def api_get_candidates():
    candidates = state.load("candidates", [])
    return {"candidates": _safe_candidates(candidates), "count": len(candidates)}


@app.delete("/api/candidates")
async def api_clear_candidates():
    state.save("candidates", [])
    state.save("skill_scores", [])
    state.save("rag_scores", [])
    state.save("ranked", [])
    return {"ok": True}


# ── Pipeline ──────────────────────────────────────────────────────────────────

@app.post("/api/pipeline/run")
async def api_run_pipeline(req: PipelineRunRequest):
    jd = state.load("jd_parsed")
    candidates = state.load("candidates", [])
    if not jd:
        raise HTTPException(status_code=400, detail="No JD parsed")
    if not candidates:
        raise HTTPException(status_code=400, detail="No resumes uploaded")

    weights = req.weights or {"skill_match": 0.5, "skill_exp": 0.3, "total_exp": 0.15, "bonus": 0.05}
    skill_scores = [compute_skill_score(jd, c, weights) for c in candidates]
    rag_scores = compute_rag_scores(jd, candidates)

    hr_scores_map = state.load("hr_evaluations", {})
    hr_scores = []
    for c in candidates:
        key = c.get("filename", c.get("name", ""))
        ev = hr_scores_map.get(key, {})
        hr_scores.append(ev.get("hr_score_normalized", 0.0))

    final_weights = {"skill": 0.5, "rag": 0.3, "hr": 0.2}
    ranked = rank_candidates(candidates, skill_scores, rag_scores, hr_scores, final_weights)
    top = select_top_n(ranked, n=req.top_n, threshold=req.threshold)

    state.save("skill_scores", skill_scores)
    state.save("rag_scores", rag_scores)
    state.save("ranked", ranked)

    return {"ranked": _safe_ranked(ranked), "top": _safe_ranked(top)}


@app.get("/api/ranked")
async def api_get_ranked():
    ranked = state.load("ranked", [])
    return {"ranked": _safe_ranked(ranked)}


@app.post("/api/pipeline/finalize")
async def api_finalize_pipeline():
    candidates = state.load("candidates", [])
    skill_scores = state.load("skill_scores", [])
    rag_scores = state.load("rag_scores", [])
    hr_scores_map = state.load("hr_evaluations", {})

    if not candidates or not skill_scores:
        raise HTTPException(status_code=400, detail="Run the pipeline first")

    hr_scores = []
    for c in candidates:
        key = c.get("filename", c.get("name", ""))
        ev = hr_scores_map.get(key, {})
        hr_scores.append(ev.get("hr_score_normalized", 0.0))

    final_weights = {"skill": 0.5, "rag": 0.3, "hr": 0.2}
    ranked = rank_candidates(candidates, skill_scores, rag_scores, hr_scores, final_weights)
    state.save("ranked", ranked)
    state.save("hr_scores", hr_scores)
    return {"ranked": _safe_ranked(ranked)}


@app.get("/api/shortlist")
async def api_get_shortlist():
    ranked = state.load("ranked", [])
    hr_evals = state.load("hr_evaluations", {})
    rows = []
    for r in ranked:
        c = r["candidate"]
        key = c.get("filename", c.get("name", ""))
        ev = hr_evals.get(key, {})
        rows.append({
            "rank": r["rank"],
            "name": c.get("name", ""),
            "email": c.get("email", ""),
            "total_years": c.get("total_years", 0),
            "final_score": r["final_score"],
            "skill_score": r["skill_score"],
            "rag_score": r["rag_score"],
            "hr_score": r["hr_score"],
            "matched_required": ", ".join(r.get("matched_required", [])),
            "matched_preferred": ", ".join(r.get("matched_preferred", [])),
            "hr_notes": ev.get("notes", ""),
            "status": r.get("status", "pending"),
        })
    return {"shortlist": rows}


# ── Qualifier ─────────────────────────────────────────────────────────────────

@app.post("/api/qualifier/generate")
async def api_generate_qualifier(req: QualifierRequest):
    jd = state.load("jd_parsed")
    candidates = state.load("candidates", [])
    if not jd:
        raise HTTPException(status_code=400, detail="No JD parsed")

    candidate = next((c for c in candidates if c.get("filename") == req.candidate_filename), None)
    if not candidate:
        raise HTTPException(status_code=404, detail=f"Candidate '{req.candidate_filename}' not found")

    cache = state.load("qualifier_questions", {})
    if req.candidate_filename in cache:
        return {"questions": cache[req.candidate_filename]}

    ranked = state.load("ranked", [])
    matched = next((r.get("matched_required", []) for r in ranked if r["candidate"].get("filename") == req.candidate_filename), [])
    c_with_match = dict(candidate)
    c_with_match["matched_required"] = matched

    questions = generate_questions(jd, c_with_match)
    cache[req.candidate_filename] = questions
    state.save("qualifier_questions", cache)
    return {"questions": questions}


@app.post("/api/qualifier/evaluate")
async def api_evaluate_qualifier(req: QualifierEvaluateRequest):
    """Evaluate a candidate's interview answers against their qualifier questions.

    Accepts plain transcript text or a Fireflies JSON string.
    Placeholder: Fireflies webhook will POST directly to this endpoint once wired.
    """
    cache = state.load("qualifier_questions", {})
    questions = cache.get(req.candidate_filename)
    if not questions:
        raise HTTPException(status_code=400, detail="Generate qualifier questions first")

    # If transcript looks like JSON (Fireflies payload), parse it
    transcript_payload = req.transcript
    try:
        transcript_payload = __import__("json").loads(req.transcript)
    except Exception:
        pass  # treat as plain text

    results = evaluate_answers(questions, transcript_payload)

    # Persist scores so finalize_pipeline can pick them up
    hr_evals = state.load("hr_evaluations", {})
    scores = [r["score"] for r in results]
    avg = sum(scores) / len(scores) if scores else 0
    existing = hr_evals.get(req.candidate_filename, {})
    hr_evals[req.candidate_filename] = {
        **existing,
        "ai_evaluation": results,
        "avg_rating": avg,
        "hr_score_normalized": round(avg / 10, 3),
    }
    state.save("hr_evaluations", hr_evals)
    return {"results": results, "avg_score": round(avg, 2)}


# ── Evaluation ────────────────────────────────────────────────────────────────

@app.post("/api/evaluation/submit")
async def api_submit_evaluation(req: EvaluationSubmitRequest):
    hr_evals = state.load("hr_evaluations", {})
    avg = sum(req.ratings) / len(req.ratings) if req.ratings else 0
    hr_evals[req.candidate_filename] = {
        **{f"q{i}": r for i, r in enumerate(req.ratings)},
        "notes": req.notes,
        "avg_rating": avg,
        "hr_score_normalized": round(avg / 10, 3),
    }
    state.save("hr_evaluations", hr_evals)
    return {"ok": True, "avg_rating": avg, "hr_score_normalized": round(avg / 10, 3)}


@app.get("/api/evaluation")
async def api_get_evaluations():
    return {"evaluations": state.load("hr_evaluations", {})}


# ── Session ───────────────────────────────────────────────────────────────────

@app.delete("/api/session/reset")
async def api_reset():
    state.clear_all()
    return {"ok": True}


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/debug/pinecone")
async def debug_pinecone():
    import os
    key = os.getenv("PINECONE_API_KEY", "")
    index_name = os.getenv("PINECONE_INDEX", "")
    try:
        from pinecone import Pinecone
        pc = Pinecone(api_key=key)
        existing = [i.name for i in pc.list_indexes()]
        if index_name not in existing:
            return {"ok": False, "index": index_name, "existing_indexes": existing, "error": "index not found in this project", "key_prefix": key[:12]}
        idx = pc.Index(index_name)
        stats = idx.describe_index_stats()
        return {"ok": True, "index": index_name, "total_vectors": stats.total_vector_count, "existing_indexes": existing, "key_prefix": key[:12]}
    except Exception as e:
        return {"ok": False, "index": index_name, "error": str(e), "key_prefix": key[:12]}


# ── Google Meet integration ───────────────────────────────────────────────────

def _meet_redirect_uri() -> str:
    backend = os.getenv("RENDER_EXTERNAL_URL", "https://shortlisting-system.onrender.com")
    return f"{backend}/api/integrations/google-meet/callback"

def _frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "https://shortlisting-system.vercel.app")


@app.get("/api/integrations/google-meet/status")
async def meet_status():
    tokens = state.load("google_meet_tokens")
    return {"connected": tokens is not None}


@app.get("/api/integrations/google-meet/auth-url")
async def meet_auth_url():
    if not os.getenv("GOOGLE_CLIENT_ID"):
        raise HTTPException(status_code=503, detail="Google Meet integration not configured — add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Render env vars")
    from backend.google_meet import get_auth_url
    url = get_auth_url(_meet_redirect_uri())
    return {"url": url}


@app.get("/api/integrations/google-meet/callback")
async def meet_callback(code: str = "", error: str = ""):
    frontend = _frontend_url()
    if error or not code:
        return RedirectResponse(f"{frontend}/evaluation?meet_error=access_denied")
    try:
        from backend.google_meet import exchange_code
        tokens = exchange_code(code, _meet_redirect_uri())
        state.save("google_meet_tokens", tokens)
        return RedirectResponse(f"{frontend}/evaluation?meet_connected=true")
    except Exception as e:
        return RedirectResponse(f"{frontend}/evaluation?meet_error=auth_failed")


@app.get("/api/integrations/google-meet/meetings")
async def meet_list_meetings():
    tokens = state.load("google_meet_tokens")
    if not tokens:
        raise HTTPException(status_code=401, detail="Google Meet not connected")
    try:
        from backend.google_meet import list_meetings
        return {"meetings": list_meetings(tokens)}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Google Meet API error: {e}")


class MeetTranscriptRequest(BaseModel):
    conference_record_name: str  # e.g. "conferenceRecords/abc123"
    candidate_filename: str


@app.post("/api/integrations/google-meet/fetch-transcript")
async def meet_fetch_transcript(req: MeetTranscriptRequest):
    tokens = state.load("google_meet_tokens")
    if not tokens:
        raise HTTPException(status_code=401, detail="Google Meet not connected")

    cache = state.load("qualifier_questions", {})
    questions = cache.get(req.candidate_filename)
    if not questions:
        raise HTTPException(status_code=400, detail="Generate qualifier questions first")

    try:
        from backend.google_meet import get_transcript_text
        transcript = get_transcript_text(tokens, req.conference_record_name)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch transcript: {e}")

    if not transcript.strip():
        raise HTTPException(status_code=404, detail="No transcript found for this meeting. Make sure transcription was enabled.")

    results = evaluate_answers(questions, transcript)

    hr_evals = state.load("hr_evaluations", {})
    scores = [r["score"] for r in results]
    avg = sum(scores) / len(scores) if scores else 0
    existing = hr_evals.get(req.candidate_filename, {})
    hr_evals[req.candidate_filename] = {
        **existing,
        "ai_evaluation": results,
        "avg_rating": avg,
        "hr_score_normalized": round(avg / 10, 3),
    }
    state.save("hr_evaluations", hr_evals)
    return {"results": results, "avg_score": round(avg, 2), "transcript": transcript}


@app.delete("/api/integrations/google-meet/disconnect")
async def meet_disconnect():
    state.save("google_meet_tokens", None)
    return {"ok": True}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _safe_candidates(candidates: list) -> list:
    return [{k: v for k, v in c.items() if k != "raw_text"} for c in candidates]


def _safe_ranked(ranked: list) -> list:
    result = []
    for r in ranked:
        entry = dict(r)
        if "candidate" in entry:
            entry["candidate"] = {k: v for k, v in entry["candidate"].items() if k != "raw_text"}
        result.append(entry)
    return result
