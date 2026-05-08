import json
import fitz  # PyMuPDF
from backend.openai_client import chat

_PARSE_SYSTEM = """You are an expert resume parser. Extract structured information and return ONLY valid JSON with this exact structure:
{
  "name": "Candidate Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "total_years": 5,
  "skills": ["Python", "SQL", "Machine Learning"],
  "skill_experience": {
    "Python": 4,
    "SQL": 3,
    "Machine Learning": 2
  },
  "education": "Bachelor's in Computer Science",
  "projects": [
    {"name": "Project A", "description": "Built X using Y, achieved Z"}
  ],
  "companies": ["Company A", "Company B"],
  "summary": "Two-sentence summary of candidate profile"
}
Rules:
- total_years: SUM the duration of ALL roles (full-time, part-time, internships). Add each role's months, convert to years (float rounded to 1 decimal). Never report only the most recent role. Example: if someone has 3 roles of 6 months each, total_years = 1.5.
- For "Present" end dates, use the current date to calculate duration.
- Include ALL companies where the candidate worked, even short internships.
- skill_experience: estimated years using that skill across all roles (integer or float)
- If information is missing, use empty string/list/dict or 0
- Return ONLY the JSON object, no markdown, no explanation
"""


def extract_text_from_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    return "\n".join(page.get_text() for page in doc)


def parse_resume(text: str, filename: str = "") -> dict:
    truncated = text[:6000]
    raw = chat([
        {"role": "system", "content": _PARSE_SYSTEM},
        {"role": "user", "content": f"Parse this resume:\n\n{truncated}"},
    ])
    try:
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw.strip())
    except json.JSONDecodeError:
        parsed = {
            "name": filename or "Unknown",
            "email": "",
            "phone": "",
            "total_years": 0,
            "skills": [],
            "skill_experience": {},
            "education": "",
            "projects": [],
            "companies": [],
            "summary": "",
        }
    parsed["raw_text"] = text
    parsed["filename"] = filename
    return parsed
