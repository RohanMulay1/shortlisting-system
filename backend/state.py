import os
from supabase import create_client, Client

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(
            os.environ["SUPABASE_URL"],
            os.environ["SUPABASE_SERVICE_KEY"],
        )
    return _client


def init_db():
    pass  # Table is created once in Supabase (see SQL below)


def save(key: str, value) -> None:
    _get_client().table("app_state").upsert({"key": key, "value": value}).execute()


def load(key: str, default=None):
    res = _get_client().table("app_state").select("value").eq("key", key).execute()
    if res.data:
        return res.data[0]["value"]
    return default


def clear_all() -> None:
    # Delete Pinecone vectors for all candidates before wiping Supabase state
    try:
        candidates = load("candidates", [])
        if candidates:
            from backend.rag_engine import delete_candidate
            for c in candidates:
                delete_candidate(c.get("filename", ""))
    except Exception:
        pass
    _get_client().table("app_state").delete().neq("key", "").execute()
