import os
import numpy as np
from backend.openai_client import embed

_idx = None


def _index():
    global _idx
    if _idx is None:
        from pinecone import Pinecone, ServerlessSpec
        pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
        name = os.environ["PINECONE_INDEX"]
        existing = {i.name: i for i in pc.list_indexes()}
        if name not in existing:
            pc.create_index(
                name=name,
                dimension=1536,
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1"),
            )
        else:
            # If index exists but has wrong dimension, use a suffixed name
            idx_info = existing[name]
            if getattr(idx_info, "dimension", 1536) != 1536:
                name = f"{name}-1536"
                if name not in existing:
                    pc.create_index(
                        name=name,
                        dimension=1536,
                        metric="cosine",
                        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
                    )
        _idx = pc.Index(name)
    return _idx


def _candidate_to_text(candidate: dict) -> str:
    parts = []
    if candidate.get("name"):
        parts.append(f"Candidate: {candidate['name']}")
    if candidate.get("summary"):
        parts.append(f"Profile Summary: {candidate['summary']}")
    if candidate.get("skills"):
        parts.append("Key Skills and Expertise: " + ", ".join(candidate["skills"]))
    
    # Include all projects
    for proj in candidate.get("projects", []):
        parts.append(f"Project '{proj.get('name')}': {proj.get('description')}")
    
    if candidate.get("companies"):
        parts.append("Work History at: " + ", ".join(candidate["companies"]))
    
    if candidate.get("education"):
        parts.append(f"Education: {candidate['education']}")

    # Crucial: include a chunk of raw text for deep semantic context
    if candidate.get("raw_text"):
        parts.append(f"Full Resume Context: {candidate['raw_text'][:2000]}")
    
    return "\n".join(filter(None, parts))


def _jd_to_text(jd: dict) -> str:
    parts = []
    if jd.get("title"):
        parts.append(f"Job Role: {jd['title']}")
    if jd.get("required_skills"):
        parts.append("Core Required Skills: " + ", ".join(jd["required_skills"]))
    if jd.get("preferred_skills"):
        parts.append("Preferred/Bonus Skills: " + ", ".join(jd["preferred_skills"]))
    if jd.get("experience_years"):
        parts.append(f"Experience Required: {jd['experience_years']}+ years")
    if jd.get("responsibilities"):
        parts.append("Key Responsibilities: " + " ".join(jd["responsibilities"]))
    
    # If we had the raw JD text, we would include it here. 
    # For now, we use the parsed fields to construct a descriptive prompt.
    return "\n".join(filter(None, parts))


def _cosine_fallback(jd_vec: list, cand_vecs: list) -> list[float]:
    """Numpy cosine similarity — used when Pinecone is unavailable."""
    jv = np.array(jd_vec, dtype="float32")
    cv = np.array(cand_vecs, dtype="float32")
    jv /= np.linalg.norm(jv) + 1e-10
    cv /= np.linalg.norm(cv, axis=1, keepdims=True) + 1e-10
    scores = cv @ jv
    return [round(float(np.clip(s, 0, 1)), 3) for s in scores]


def compute_rag_scores(jd: dict, candidates: list[dict]) -> list[float]:
    if not candidates:
        return []

    jd_text = _jd_to_text(jd)
    candidate_texts = [_candidate_to_text(c) for c in candidates]

    all_embeddings = embed([jd_text] + candidate_texts)
    jd_vec = all_embeddings[0]
    cand_vecs = all_embeddings[1:]

    try:
        idx = _index()

        # Upsert candidate embeddings (idempotent — filename is the ID)
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
            idx.upsert(vectors=vectors[i : i + 100], namespace="resumes")

        # Query with JD vector — Pinecone v3 returns attribute-based response
        results = idx.query(
            vector=jd_vec,
            top_k=len(candidates),
            namespace="resumes",
            include_values=False,
        )

        # v3 SDK: results.matches is a list of ScoredVector objects with .id / .score
        score_map = {m.id: m.score for m in results.matches}
        return [round(float(np.clip(score_map.get(c["filename"], 0.0), 0, 1)), 3) for c in candidates]

    except Exception as e:
        # Pinecone unavailable or misconfigured — fall back to in-process cosine
        print(f"[rag_engine] Pinecone error ({e}), falling back to numpy cosine")
        return _cosine_fallback(jd_vec, cand_vecs)


def delete_candidate(filename: str) -> None:
    try:
        _index().delete(ids=[filename], namespace="resumes")
    except Exception:
        pass
