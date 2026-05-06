import json
from backend.openai_client import chat

_SYSTEM = """You are a senior HR specialist. Generate exactly 5 targeted qualifier questions to screen a candidate for a specific role.
Questions should probe: technical depth, practical experience, problem-solving ability, and domain knowledge.
Make questions specific to the candidate's background and the job requirements.
Return ONLY a JSON array of 5 strings. No numbering, no explanation, no markdown."""


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
