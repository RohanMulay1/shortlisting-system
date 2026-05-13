def compute_skill_score(jd: dict, candidate: dict, weights: dict = None) -> dict:
    """
    Score = (Skill_Match * w1) + (Skill_Experience * w2) + (Total_Experience * w3) + (Bonus * w4)
    Default weights from BRD: 0.5, 0.3, 0.15, 0.05
    """
    if weights is None:
        weights = {"skill_match": 0.5, "skill_exp": 0.3, "total_exp": 0.15, "bonus": 0.05}

    required = [s.lower() for s in jd.get("required_skills", [])]
    preferred = [s.lower() for s in jd.get("preferred_skills", [])]
    candidate_skills = [s.lower() for s in candidate.get("skills", [])]
    skill_exp = {k.lower(): v for k, v in candidate.get("skill_experience", {}).items()}
    jd_exp_years = max(jd.get("experience_years", 1), 1)
    candidate_exp = candidate.get("total_years", 0)

    # Component 1: Skill Match (fraction of required skills found)
    if required:
        matched_required = []
        # Common synonyms/aliases to handle variations
        synonyms = {
            "machine learning": ["ml", "machine-learning"],
            "deep learning": ["dl", "deep-learning", "neural networks", "cnn", "rnn", "lstm"],
            "data preprocessing": ["data cleaning", "data preparation", "data processing", "feature scaling", "normalization"],
            "feature engineering": ["feature extraction", "feature selection", "dimensionality reduction"],
            "natural language processing": ["nlp", "text mining", "large language models", "llm"],
            "computer vision": ["cv", "image processing", "object detection", "perception"],
        }
        
        for s in required:
            found = False
            s_words = set(s.split())
            aliases = synonyms.get(s, [])
            
            for cs in candidate_skills:
                # 1. Exact or substring match
                if s in cs or cs in s:
                    found = True
                    break
                
                # 2. Alias match
                if any(alias in cs or cs in alias for alias in aliases):
                    found = True
                    break
                
                # 3. Word-set overlap for multi-word skills
                cs_words = set(cs.split())
                if len(s_words) > 1 and len(s_words & cs_words) / len(s_words) >= 0.6:
                    found = True
                    break
            
            if found:
                matched_required.append(s)
        
        skill_match_ratio = len(matched_required) / len(required)
    else:
        matched_required = []
        skill_match_ratio = 1.0

    # Component 2: Skill Experience (avg years on matched skills, normalized)
    if matched_required:
        exp_values = []
        for skill in matched_required:
            best = 0.0
            for k, v in skill_exp.items():
                if skill in k or k in skill:
                    best = max(best, float(v))
            exp_values.append(best)
        avg_skill_exp = sum(exp_values) / len(exp_values)
        skill_exp_score = min(avg_skill_exp / max(jd_exp_years, 1), 1.0)
    else:
        skill_exp_score = 0.0

    # Component 3: Total Experience (normalized against JD requirement)
    total_exp_score = min(candidate_exp / jd_exp_years, 1.0)

    # Component 4: Bonus (preferred skills match)
    if preferred:
        matched_preferred = []
        for s in preferred:
            found = False
            s_words = set(s.split())
            aliases = synonyms.get(s, [])
            
            for cs in candidate_skills:
                if s in cs or cs in s:
                    found = True
                    break
                if any(alias in cs or cs in alias for alias in aliases):
                    found = True
                    break
                cs_words = set(cs.split())
                if len(s_words) > 1 and len(s_words & cs_words) / len(s_words) >= 0.6:
                    found = True
                    break
            if found:
                matched_preferred.append(s)
        
        bonus_score = len(matched_preferred) / len(preferred)
    else:
        matched_preferred = []
        bonus_score = 0.0

    final = (
        skill_match_ratio * weights["skill_match"] +
        skill_exp_score * weights["skill_exp"] +
        total_exp_score * weights["total_exp"] +
        bonus_score * weights["bonus"]
    )

    return {
        "skill_match": round(skill_match_ratio, 3),
        "skill_exp": round(skill_exp_score, 3),
        "total_exp": round(total_exp_score, 3),
        "bonus": round(bonus_score, 3),
        "skill_score": round(final, 3),
        "matched_required": matched_required,
        "matched_preferred": matched_preferred if preferred else [],
    }
