import os
from pinecone import Pinecone
from backend.openai_client import embed

_pc: Pinecone | None = None
_idx = None


def _index():
    global _pc, _idx
    if _idx is None:
        _pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
        _idx = _pc.Index(os.environ["PINECONE_INDEX"])
    return _idx


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
    return " | ".join(filter(None, parts))


def compute_rag_scores(jd: dict, candidates: list[dict]) -> list[float]:
    if not candidates:
        return []

    jd_text = _jd_to_text(jd)
    candidate_texts = [_candidate_to_text(c) for c in candidates]

    # Embed JD + all candidates in one batch call
    all_embeddings = embed([jd_text] + candidate_texts)
    jd_vec = all_embeddings[0]
    cand_vecs = all_embeddings[1:]

    # Upsert candidate embeddings to Pinecone (idempotent by filename ID)
    vectors = [
        {
            "id": c["filename"],
            "values": vec,
            "metadata": {
                "name": c.get("name", ""),
                "email": c.get("email", ""),
                "filename": c["filename"],
                "total_years": float(c.get("total_years", 0)),
            },
        }
        for c, vec in zip(candidates, cand_vecs)
    ]
    for i in range(0, len(vectors), 100):
        _index().upsert(vectors=vectors[i : i + 100], namespace="resumes")

    # Query Pinecone with JD vector — fetch scores for all candidates
    results = _index().query(
        vector=jd_vec,
        top_k=len(candidates),
        namespace="resumes",
        include_values=False,
    )

    score_map = {m["id"]: m["score"] for m in results["matches"]}
    return [round(score_map.get(c["filename"], 0.0), 3) for c in candidates]


def delete_candidate(filename: str) -> None:
    _index().delete(ids=[filename], namespace="resumes")
