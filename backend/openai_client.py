import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

_client = None

def get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not set in environment or .env file")
        _client = OpenAI(api_key=api_key)
    return _client


def chat(messages: list, temperature: float = 0.2, model: str = "gpt-4o-mini") -> str:
    client = get_client()
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
    )
    return response.choices[0].message.content.strip()


def embed(texts: list[str]) -> list[list[float]]:
    client = get_client()
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
    )
    return [item.embedding for item in response.data]
