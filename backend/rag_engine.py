import numpy as np
import faiss
from backend.openai_client import embed


def _candidate_to_text(candidate: dict) -> str:
    parts = []
    if candidate.get("summary"):
        parts.append(candidate["summary"])
    if candidate.get("skills"):
        parts.append("Skills: " + ", ".join(candidate["skills"]))
    for proj in candidate.get("projects", [])[:3]:
        parts.append(proj.get("description", ""))
    if candidate.get("companies"):
        parts.append("Experience at: " + ", ".join(candidate["companies"]))
    return " | ".join(filter(None, parts)) or candidate.get("raw_text", "")[:500]


def _jd_to_text(jd: dict) -> str:
    parts = []
    if jd.get("title"):
        parts.append(jd["title"])
    if jd.get("required_skills"):
        parts.append("Required: " + ", ".join(jd["required_skills"]))
    if jd.get("preferred_skills"):
        parts.append("Preferred: " + ", ".join(jd["preferred_skills"]))
    if jd.get("responsibilities"):
        parts.extend(jd["responsibilities"][:3])
    if jd.get("domains"):
        parts.append("Domain: " + ", ".join(jd["domains"]))
    return " | ".join(filter(None, parts))


def compute_rag_scores(jd: dict, candidates: list[dict]) -> list[float]:
    if not candidates:
        return []

    jd_text = _jd_to_text(jd)
    candidate_texts = [_candidate_to_text(c) for c in candidates]

    all_texts = [jd_text] + candidate_texts
    all_embeddings = embed(all_texts)

    jd_vec = np.array(all_embeddings[0], dtype="float32").reshape(1, -1)
    candidate_vecs = np.array(all_embeddings[1:], dtype="float32")

    faiss.normalize_L2(jd_vec)
    faiss.normalize_L2(candidate_vecs)

    scores = (candidate_vecs @ jd_vec.T).flatten()
    scores = np.clip(scores, 0, 1)
    return [round(float(s), 3) for s in scores]
