import json
from backend.openai_client import chat

_PARSE_SYSTEM = """You are an expert HR analyst. Parse the job description and return ONLY valid JSON with this exact structure:
{
  "title": "Job title",
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill3", "skill4"],
  "experience_years": 3,
  "responsibilities": ["responsibility1", "responsibility2"],
  "tools": ["tool1", "tool2"],
  "domains": ["domain1"],
  "education": "Bachelor's degree or equivalent"
}
Rules:
- required_skills: must-have technical/functional skills
- preferred_skills: nice-to-have skills
- experience_years: minimum years required (integer)
- Return ONLY the JSON object, no markdown, no explanation
"""

_SIMPLIFY_SYSTEM = """You are an HR communications specialist. Generate a concise, friendly simplified job description from the structured JD data provided.
Include: Role summary, Key responsibilities (3-5 bullets), Must-have skills, Nice-to-have skills, Ideal candidate profile.
Keep it under 300 words. Write in plain language a non-technical person can understand.
Do NOT use markdown formatting. No ** bold markers, no # headings, no bullet dashes — use plain text with section titles on their own lines."""


def parse_jd(text: str) -> dict:
    raw = chat([
        {"role": "system", "content": _PARSE_SYSTEM},
        {"role": "user", "content": f"Parse this job description:\n\n{text}"},
    ])
    try:
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        return {
            "title": "Unknown",
            "required_skills": [],
            "preferred_skills": [],
            "experience_years": 0,
            "responsibilities": [],
            "tools": [],
            "domains": [],
            "education": "",
        }


def generate_simplified_jd(parsed: dict) -> str:
    import re
    text = chat([
        {"role": "system", "content": _SIMPLIFY_SYSTEM},
        {"role": "user", "content": f"Generate simplified JD from:\n{json.dumps(parsed, indent=2)}"},
    ])
    # Strip any markdown bold/italic markers GPT adds despite instructions
    text = re.sub(r'\*{1,3}(.*?)\*{1,3}', r'\1', text)
    text = re.sub(r'^#{1,6}\s*', '', text, flags=re.MULTILINE)
    return text
