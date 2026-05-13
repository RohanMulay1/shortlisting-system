import json
from backend.openai_client import chat

def batch_semantic_skill_match(jd: dict, candidates: list[dict]) -> dict:
    """
    Uses an LLM to semantically match candidate skills against JD skills for all candidates at once.
    Returns: { filename: {"matched_required": [...], "matched_preferred": [...]} }
    """
    if not candidates:
        return {}

    req_skills = jd.get("required_skills", [])
    pref_skills = jd.get("preferred_skills", [])
    
    if not req_skills and not pref_skills:
        return {c["filename"]: {"matched_required": [], "matched_preferred": []} for c in candidates}

    # Construct candidate data for the prompt
    cand_data = {}
    for c in candidates:
        # Include summary and projects for better context mapping
        context = []
        if c.get("skills"):
            context.append("Skills: " + ", ".join(c["skills"]))
        if c.get("summary"):
            context.append("Summary: " + c["summary"])
        for p in c.get("projects", [])[:2]:
            context.append(f"Project: {p.get('description', '')}")
            
        cand_data[c["filename"]] = " | ".join(context)

    prompt = f"""You are an expert technical recruiter and AI.
Your task is to determine which required and preferred skills from the Job Description (JD) each candidate possesses.

JD Required Skills: {json.dumps(req_skills)}
JD Preferred Skills: {json.dumps(pref_skills)}

Candidates and their profiles (skills, summary, projects):
{json.dumps(cand_data, indent=2)}

Rules for matching:
1. Match if the candidate explicitly lists the skill.
2. Match if the candidate lists a specific tool/technology that falls under the JD skill category (e.g. if JD needs "Workflow Automation" and candidate has "n8n" or "Zapier", match it).
3. **Crucial:** If a JD skill is a broad category (e.g., "Machine Learning", "Software Engineering"), and the candidate has skills in its subfields (e.g., "Deep Learning", "Computer Vision", "ADAS") or uses related frameworks (e.g., "PyTorch", "TensorFlow"), YOU MUST match the broader JD category.
4. Be fair and semantically flexible. If a candidate's profile strongly implies the skill through their project descriptions (e.g., "data cleaning" implies "Data Preprocessing"), include it.
5. Return ONLY a valid JSON object. Keys must be candidate filenames. Values must be objects with "matched_required" and "matched_preferred" arrays containing the EXACT strings from the JD skills lists.

Analyze the candidate's profile step-by-step against each required and preferred skill. If a candidate has a sub-skill (like PyTorch or Computer Vision), they automatically get the parent skill (like Machine Learning). 

Example Output:
{{
  "candidate_1.pdf": {{
    "matched_required": ["Python", "machine learning"],
    "matched_preferred": ["C/C++"]
  }}
}}
"""

    raw_response = chat([
        {"role": "system", "content": "You are a precise JSON-generating assistant. Output only JSON."},
        {"role": "user", "content": prompt}
    ], temperature=0.1)

    try:
        if raw_response.startswith("```"):
            raw_response = raw_response.split("```")[1]
            if raw_response.startswith("json"):
                raw_response = raw_response[4:]
        parsed = json.loads(raw_response.strip())
        
        # Ensure all candidates are in the result with default empty lists
        for c in candidates:
            fn = c["filename"]
            if fn not in parsed:
                parsed[fn] = {"matched_required": [], "matched_preferred": []}
        return parsed
    except Exception as e:
        print(f"[scorer] LLM matching failed: {e}. Falling back to empty matches.")
        return {c["filename"]: {"matched_required": [], "matched_preferred": []} for c in candidates}


def compute_skill_score(jd: dict, candidate: dict, matched_req: list, matched_pref: list, weights: dict = None) -> dict:
    """
    Score = (Skill_Match * w1) + (Skill_Experience * w2) + (Total_Experience * w3) + (Bonus * w4)
    Default weights from BRD: 0.5, 0.3, 0.15, 0.05
    """
    if weights is None:
        weights = {"skill_match": 0.5, "skill_exp": 0.3, "total_exp": 0.15, "bonus": 0.05}

    required = jd.get("required_skills", [])
    preferred = jd.get("preferred_skills", [])
    skill_exp = {k.lower(): v for k, v in candidate.get("skill_experience", {}).items()}
    jd_exp_years = max(jd.get("experience_years", 1), 1)
    candidate_exp = candidate.get("total_years", 0)

    # Component 1: Skill Match (fraction of required skills found)
    if required:
        skill_match_ratio = len(matched_req) / len(required)
    else:
        skill_match_ratio = 1.0

    # Component 2: Skill Experience (avg years on matched skills, normalized)
    if matched_req:
        exp_values = []
        for skill in matched_req:
            best = 0.0
            # Check for substring match in skill_exp keys (lowercased)
            for k, v in skill_exp.items():
                if skill.lower() in k or k in skill.lower():
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
        bonus_score = len(matched_pref) / len(preferred)
    else:
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
        "matched_required": matched_req,
        "matched_preferred": matched_pref,
    }
