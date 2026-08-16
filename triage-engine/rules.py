"""
TeleTriage — rule-based triage scoring rules.

This intentionally mirrors js/triage-engine.js from the frontend prototype
exactly (same keywords, same base severities, same adjustments) so the
score a patient previews in the browser matches what the server computes.
The server's result here is the ONLY authoritative one — the browser's
copy is for a snappy preview, never trusted for the real record.

Severity scale: 1 = Critical/Urgent ... 5 = Non-urgent.
"""

# Each rule: keywords to look for in the complaint text (case-insensitive),
# the specialty it routes to, and the base severity it starts a case at.
KEYWORD_RULES = [
    {
        "keywords": ["chest pain", "can't breathe", "cannot breathe", "difficulty breathing", "shortness of breath"],
        "specialty": "Cardiology",
        "base": 1,
    },
    {
        "keywords": ["stroke", "face drooping", "slurred speech", "one side numb", "seizure", "unconscious"],
        "specialty": "Neurology",
        "base": 1,
    },
    {
        "keywords": ["severe bleeding", "heavy bleeding", "broken bone", "fracture", "head injury"],
        "specialty": "Emergency Medicine",
        "base": 1,
    },
    {
        "keywords": ["high fever", "fever", "vomiting", "diarrhea", "dehydration"],
        "specialty": "General Medicine",
        "base": 3,
    },
    {
        "keywords": ["joint pain", "back pain", "muscle pain", "arthritis", "swelling"],
        "specialty": "Rheumatology",
        "base": 3,
    },
    {
        "keywords": ["rash", "itching", "skin"],
        "specialty": "Dermatology",
        "base": 4,
    },
    {
        "keywords": ["cough", "cold", "sore throat", "headache", "fatigue"],
        "specialty": "General Medicine",
        "base": 4,
    },
]

DEFAULT_SPECIALTY = "General Medicine"
DEFAULT_BASE = 3

# Kept for reference / backward compatibility — if some future client still
# sends one of these exact old enum values, the keyword matcher below
# handles every one of them too (each key contains one of the trigger
# words), so this dict is no longer read directly.
DURATION_ADJUSTMENTS = {
    "sudden": -1,       # < 1 hour
    "today": -1,
    "1-3-days": 0,
    "1-2-weeks": 1,
    "chronic": 1,       # 1 month+
}


def match_complaint(text):
    t = (text or "").lower()
    for rule in KEYWORD_RULES:
        if any(keyword in t for keyword in rule["keywords"]):
            return rule["specialty"], rule["base"]
    return DEFAULT_SPECIALTY, DEFAULT_BASE


def duration_adjustment(duration):
    """
    The symptom form's Duration field is a free-text input with datalist
    suggestions ("Less than 24 hours", "1-3 days", "1 week or more") —
    not a fixed dropdown — so a patient can type anything. Rather than an
    exact-match lookup (which would silently fall back to 0 for anything
    that isn't spelled exactly like the old enum), we match on keywords,
    checked most-urgent-first. This is a strict superset of the old exact
    values: "sudden"/"today" still hit the first branch, "1-3-days" and
    "1-2-weeks" still hit "day"/"week", and "chronic" still hits the last
    branch — so nothing that worked before stops working.
    """
    d = (duration or "").strip().lower()

    if any(kw in d for kw in ("sudden", "hour", "today", "just started", "<24", "< 24")):
        return -1
    if any(kw in d for kw in ("month", "year", "chronic", "long")):
        return 1
    if "week" in d:
        return 1
    if "day" in d:
        return 0

    return 0  # unrecognized text — no adjustment either way


def pain_adjustment(pain):
    try:
        p = float(pain)
    except (TypeError, ValueError):
        p = 0
    if p >= 8:
        return -1
    if p <= 3:
        return 1
    return 0


def clamp(score):
    return max(1, min(5, score))


def label_for(score):
    if score <= 2:
        return "Urgent"
    if score == 3:
        return "Moderate"
    return "Non-Urgent"


def score_symptoms(complaint, duration, pain, body_location=None):
    """
    Returns a dict: { severity_score, urgency_label, specialty }
    Field names are snake_case to match the Node backend's expectations.
    """
    specialty, base = match_complaint(complaint)
    severity = base + duration_adjustment(duration) + pain_adjustment(pain)
    severity = clamp(severity)

    return {
        "severity_score": severity,
        "urgency_label": label_for(severity),
        "specialty": specialty,
    }
