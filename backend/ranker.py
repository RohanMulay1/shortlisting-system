def rank_candidates(
    candidates: list[dict],
    skill_scores: list[dict],
    rag_scores: list[float],
    hr_scores: list[float] = None,
    final_weights: dict = None,
) -> list[dict]:
    """
    Final Score = (Skill_Score * 0.5) + (RAG_Score * 0.3) + (HR_Eval * 0.2)
    """
    if final_weights is None:
        final_weights = {"skill": 0.5, "rag": 0.3, "hr": 0.2}

    if hr_scores is None:
        hr_scores = [0.0] * len(candidates)

    ranked = []
    for i, candidate in enumerate(candidates):
        ss = skill_scores[i] if i < len(skill_scores) else {}
        rs = rag_scores[i] if i < len(rag_scores) else 0.0
        hr = hr_scores[i] if i < len(hr_scores) else 0.0

        skill_val = ss.get("skill_score", 0.0)

        # If HR score provided, use full formula; else use skill+RAG only (renormalized)
        if any(h > 0 for h in hr_scores):
            final = (
                skill_val * final_weights["skill"] +
                rs * final_weights["rag"] +
                hr * final_weights["hr"]
            )
        else:
            w_skill = final_weights["skill"] / (final_weights["skill"] + final_weights["rag"])
            w_rag = final_weights["rag"] / (final_weights["skill"] + final_weights["rag"])
            final = skill_val * w_skill + rs * w_rag

        ranked.append({
            "rank": 0,
            "candidate": candidate,
            "skill_score": round(skill_val, 3),
            "skill_match": round(ss.get("skill_match", 0), 3),
            "skill_exp_score": round(ss.get("skill_exp", 0), 3),
            "total_exp_score": round(ss.get("total_exp", 0), 3),
            "bonus_score": round(ss.get("bonus", 0), 3),
            "matched_required": ss.get("matched_required", []),
            "matched_preferred": ss.get("matched_preferred", []),
            "rag_score": round(rs, 3),
            "hr_score": round(hr, 3),
            "final_score": round(final, 3),
        })

    ranked.sort(key=lambda x: x["final_score"], reverse=True)
    for i, r in enumerate(ranked):
        r["rank"] = i + 1
    return ranked


def select_top_n(ranked: list[dict], n: int = 10, threshold: float = 0.0) -> list[dict]:
    filtered = [r for r in ranked if r["final_score"] >= threshold]
    return filtered[:n]
