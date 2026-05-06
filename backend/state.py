import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "shortlisting.db")


def _get_conn():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = _get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE,
            value TEXT,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def save(key: str, value):
    conn = _get_conn()
    conn.execute(
        "INSERT OR REPLACE INTO sessions (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
        (key, json.dumps(value))
    )
    conn.commit()
    conn.close()


def load(key: str, default=None):
    conn = _get_conn()
    row = conn.execute("SELECT value FROM sessions WHERE key = ?", (key,)).fetchone()
    conn.close()
    if row:
        return json.loads(row["value"])
    return default


def clear_all():
    conn = _get_conn()
    conn.execute("DELETE FROM sessions")
    conn.commit()
    conn.close()
