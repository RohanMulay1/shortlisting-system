import json
from backend.openai_client import chat

_SYSTEM = """You are a senior HR specialist. Generate exactly 5 targeted qualifier questions to screen a candidate for a specific role.
Questions should probe: technical depth, practical experience, problem-solving ability, and domain knowledge.
Make questions specific to the candidate's background and the job requirements.
Return ONLY a JSON array of 5 strings. No numbering, no explanation, no markdown."""

_EVAL_SYSTEM = """You are a senior HR specialist evaluating a candidate's interview answers.
You will be given qualifier questions and a transcript of the interview.
For each question, find what the candidate said (if anything) and evaluate their answer.

Return ONLY a JSON array with one object per question:
[
  {
    "verdict": "Strong" | "Good" | "Weak" | "Not Addressed",
    "summary": "One sentence summarising what the candidate said or did not say.",
    "score": 0-10
  }
]

Scoring guide: Strong = 8-10, Good = 6-7, Weak = 3-5, Not Addressed = 0-2.
Be concise. The summary must be plain English readable by a non-technical HR manager."""


def generate_questions(jd: dict, candidate: dict) -> list[str]:
    jd_summary = {
        "title": jd.get("title", ""),
        "required_skills": jd.get("required_skills", []),
        "experience_years": jd.get("experience_years", 0),
        "responsibilities": jd.get("responsibilities", [])[:3],
        "domains": jd.get("domains", []),
    }
    candidate_summary = {
        "name": candidate.get("name", ""),
        "skills": candidate.get("skills", []),
        "total_years": candidate.get("total_years", 0),
        "matched_skills": candidate.get("matched_required", []),
        "summary": candidate.get("summary", ""),
    }

    raw = chat([
        {"role": "system", "content": _SYSTEM},
        {"role": "user", "content": (
            f"Job: {json.dumps(jd_summary)}\n\n"
            f"Candidate: {json.dumps(candidate_summary)}\n\n"
            "Generate 5 qualifier questions."
        )},
    ])

    try:
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        questions = json.loads(raw.strip())
        if isinstance(questions, list):
            return [str(q) for q in questions[:5]]
    except (json.JSONDecodeError, ValueError):
        pass

    lines = [l.strip().lstrip("0123456789.-) ") for l in raw.split("\n") if l.strip()]
    return lines[:5] if lines else ["No questions generated"]


def extract_transcript_text(payload) -> str:
    """Accept raw string, Fireflies JSON, or Google Meet transcript entries list."""
    if isinstance(payload, str):
        return payload

    # Google Meet API: list of transcript entry dicts with "text" key
    if isinstance(payload, list):
        lines = []
        for entry in payload:
            text = entry.get("text", "").strip()
            if text:
                speaker = entry.get("speaker", "Participant")
                lines.append(f"{speaker}: {text}")
        return "\n".join(lines)

    if isinstance(payload, dict):
        # Fireflies v2 webhook / API response shape
        sentences = payload.get("sentences") or []
        if sentences:
            return "\n".join(
                f"{s.get('speaker_name', 'Speaker')}: {s.get('text', '')}"
                for s in sentences
            )
        return (
            payload.get("transcript")
            or payload.get("summary", {}).get("overview", "")
            or ""
        )

    return str(payload)


def evaluate_answers(questions: list[str], transcript_payload) -> list[dict]:
    """Score each question against the interview transcript.

    Returns a list of {verdict, summary, score} dicts, one per question.
    Placeholder: when Fireflies API is wired, pass the raw JSON here directly.
    """
    transcript = extract_transcript_text(transcript_payload)
    if not transcript.strip():
        return [{"verdict": "Not Addressed", "summary": "No transcript provided.", "score": 0}
                for _ in questions]

    prompt = (
        f"Interview transcript:\n{transcript[:6000]}\n\n"
        f"Qualifier questions:\n"
        + "\n".join(f"{i+1}. {q}" for i, q in enumerate(questions))
    )

    raw = chat([
        {"role": "system", "content": _EVAL_SYSTEM},
        {"role": "user", "content": prompt},
    ])

    try:
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        results = json.loads(raw.strip())
        if isinstance(results, list):
            out = []
            for item in results[:len(questions)]:
                out.append({
                    "verdict": item.get("verdict", "Not Addressed"),
                    "summary": item.get("summary", ""),
                    "score": max(0, min(10, int(item.get("score", 0)))),
                })
            # pad if GPT returned fewer items than questions
            while len(out) < len(questions):
                out.append({"verdict": "Not Addressed", "summary": "Could not evaluate.", "score": 0})
            return out
    except (json.JSONDecodeError, ValueError, TypeError):
        pass

    return [{"verdict": "Not Addressed", "summary": "Evaluation failed.", "score": 0}
            for _ in questions]
