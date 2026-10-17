"""
Reply-language support for student-facing AI output.

The app sends the user's chosen UI language in the Accept-Language header. Only the
free-text parts of AI replies follow it; data-producing prompts (skill extraction,
ESCO mapping, enums the UI parses) stay in English.
"""
from typing import Optional

from fastapi import Request

DEFAULT_LANGUAGE = "en"

# code -> (English name, native name)
SUPPORTED_LANGUAGES = {
    "en": ("English", "English"),
    "hi": ("Hindi", "हिन्दी"),
    "mr": ("Marathi", "मराठी"),
    "ta": ("Tamil", "தமிழ்"),
    "te": ("Telugu", "తెలుగు"),
    "kn": ("Kannada", "ಕನ್ನಡ"),
}


def normalize_language(value: Optional[str]) -> str:
    """Returns the first supported language in an Accept-Language style value, else English."""
    if not value:
        return DEFAULT_LANGUAGE
    for part in value.split(","):
        code = part.split(";")[0].strip().lower().split("-")[0]
        if code in SUPPORTED_LANGUAGES:
            return code
    return DEFAULT_LANGUAGE


def get_request_language(request: Optional[Request]) -> str:
    if request is None:
        return DEFAULT_LANGUAGE
    return normalize_language(request.headers.get("accept-language"))


def language_instruction(code: Optional[str]) -> str:
    """Prompt suffix telling the model which language to write in. Empty for English."""
    code = normalize_language(code)
    if code == DEFAULT_LANGUAGE:
        return ""
    english, native = SUPPORTED_LANGUAGES[code]
    return (
        f"\n\nRESPONSE LANGUAGE: Write all explanatory text for the student in {english} ({native}), "
        f"using the {english} script. Keep code, technical terms, skill names, course titles, "
        "company names and SkillSetu feature names in English. "
        "Keep JSON keys and any fixed enum values exactly as specified in English."
    )
