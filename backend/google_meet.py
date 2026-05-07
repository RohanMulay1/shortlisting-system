"""Google Meet API integration.

OAuth flow:
  1. Frontend calls GET /api/integrations/google-meet/auth-url
  2. HR clicks link → Google consent screen
  3. Google redirects to GET /api/integrations/google-meet/callback?code=...
  4. Backend stores tokens in Supabase, redirects HR back to /evaluation

Transcript flow (after connecting):
  1. GET /api/integrations/google-meet/meetings  → list recent meetings
  2. POST /api/integrations/google-meet/fetch-transcript {conference_record_name}
     → returns plain transcript text ready for evaluate_answers()

Prerequisites:
  - Google Cloud project with Meet API enabled
  - OAuth 2.0 client (Web application type)
  - Authorized redirect URI: https://shortlisting-system.onrender.com/api/integrations/google-meet/callback
  - Env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, FRONTEND_URL
"""

import os
import requests as _requests
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request as GoogleRequest

SCOPES = ["https://www.googleapis.com/auth/meetings.space.readonly"]
MEET_API = "https://meet.googleapis.com/v2"
TOKEN_URI = "https://oauth2.googleapis.com/token"
AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth"


def _client_config() -> dict:
    return {
        "client_id": os.environ["GOOGLE_CLIENT_ID"],
        "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
        "token_uri": TOKEN_URI,
        "auth_uri": AUTH_URI,
    }


def get_auth_url(redirect_uri: str) -> str:
    cfg = _client_config()
    params = {
        "client_id": cfg["client_id"],
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{AUTH_URI}?{query}"


def exchange_code(code: str, redirect_uri: str) -> dict:
    """Exchange OAuth authorization code for tokens. Returns token dict to store in Supabase."""
    cfg = _client_config()
    r = _requests.post(TOKEN_URI, data={
        "code": code,
        "client_id": cfg["client_id"],
        "client_secret": cfg["client_secret"],
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    })
    r.raise_for_status()
    data = r.json()
    return {
        "access_token": data["access_token"],
        "refresh_token": data.get("refresh_token", ""),
        "client_id": cfg["client_id"],
        "client_secret": cfg["client_secret"],
        "token_uri": TOKEN_URI,
        "scopes": SCOPES,
    }


def _get_creds(token_data: dict) -> Credentials:
    creds = Credentials(
        token=token_data["access_token"],
        refresh_token=token_data.get("refresh_token"),
        token_uri=token_data.get("token_uri", TOKEN_URI),
        client_id=token_data["client_id"],
        client_secret=token_data["client_secret"],
        scopes=token_data.get("scopes", SCOPES),
    )
    if creds.expired and creds.refresh_token:
        creds.refresh(GoogleRequest())
        token_data["access_token"] = creds.token
    return creds


def _auth_header(token_data: dict) -> dict:
    creds = _get_creds(token_data)
    return {"Authorization": f"Bearer {creds.token}"}


def list_meetings(token_data: dict) -> list[dict]:
    """Return recent conference records (most recent 20)."""
    headers = _auth_header(token_data)
    r = _requests.get(
        f"{MEET_API}/conferenceRecords",
        headers=headers,
        params={"pageSize": 20, "orderBy": "startTime desc"},
    )
    r.raise_for_status()
    records = r.json().get("conferenceRecords", [])
    return [
        {
            "name": rec["name"],
            "title": rec.get("space", {}).get("displayName") or _fmt_time(rec.get("startTime", "")),
            "start_time": rec.get("startTime", ""),
        }
        for rec in records
    ]


def get_transcript_text(token_data: dict, conference_record_name: str) -> str:
    """Fetch transcript entries for a conference record and return as plain text."""
    headers = _auth_header(token_data)

    # 1. List transcripts for this meeting
    r = _requests.get(f"{MEET_API}/{conference_record_name}/transcripts", headers=headers)
    r.raise_for_status()
    transcripts = r.json().get("transcripts", [])
    if not transcripts:
        return ""

    # 2. Get entries for the first (most recent) transcript
    transcript_name = transcripts[0]["name"]
    r = _requests.get(f"{MEET_API}/{transcript_name}/entries", headers=headers)
    r.raise_for_status()
    entries = r.json().get("transcriptEntries", [])

    # 3. Resolve participant display names in one pass
    participant_cache: dict[str, str] = {}
    lines = []
    for entry in entries:
        text = entry.get("text", "").strip()
        if not text:
            continue
        participant_ref = entry.get("participant", "")
        if participant_ref and participant_ref not in participant_cache:
            try:
                pr = _requests.get(f"{MEET_API}/{participant_ref}", headers=headers)
                name = pr.json().get("signedinUser", {}).get("displayName", "Participant")
            except Exception:
                name = "Participant"
            participant_cache[participant_ref] = name
        speaker = participant_cache.get(participant_ref, "Participant")
        lines.append(f"{speaker}: {text}")

    return "\n".join(lines)


def _fmt_time(iso: str) -> str:
    """Format ISO timestamp to readable label, e.g. '2024-05-07 14:30'."""
    try:
        return iso[:16].replace("T", " ")
    except Exception:
        return iso
