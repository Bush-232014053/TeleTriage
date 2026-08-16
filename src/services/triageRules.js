// Local rule-based triage scorer — mirrors triage-engine/rules.py exactly.
// Used as a fallback when the Python microservice is cold-starting or unreachable.

const KEYWORD_RULES = [
  {
    keywords: ['chest pain', "can't breathe", 'cannot breathe', 'difficulty breathing', 'shortness of breath'],
    specialty: 'Cardiology',
    base: 1,
  },
  {
    keywords: ['stroke', 'face drooping', 'slurred speech', 'one side numb', 'seizure', 'unconscious'],
    specialty: 'Neurology',
    base: 1,
  },
  {
    keywords: ['severe bleeding', 'heavy bleeding', 'broken bone', 'fracture', 'head injury'],
    specialty: 'Emergency Medicine',
    base: 1,
  },
  {
    keywords: ['high fever', 'fever', 'vomiting', 'diarrhea', 'dehydration'],
    specialty: 'General Medicine',
    base: 3,
  },
  {
    keywords: ['joint pain', 'back pain', 'muscle pain', 'arthritis', 'swelling'],
    specialty: 'Rheumatology',
    base: 3,
  },
  {
    keywords: ['rash', 'itching', 'skin'],
    specialty: 'Dermatology',
    base: 4,
  },
  {
    keywords: ['cough', 'cold', 'sore throat', 'headache', 'fatigue'],
    specialty: 'General Medicine',
    base: 4,
  },
];

const DEFAULT_SPECIALTY = 'General Medicine';
const DEFAULT_BASE = 3;

function matchComplaint(text) {
  const t = (text || '').toLowerCase();
  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((keyword) => t.includes(keyword))) {
      return { specialty: rule.specialty, base: rule.base };
    }
  }
  return { specialty: DEFAULT_SPECIALTY, base: DEFAULT_BASE };
}

function durationAdjustment(duration) {
  const d = (duration || '').trim().toLowerCase();
  if (['sudden', 'hour', 'today', 'just started', '<24', '< 24'].some((kw) => d.includes(kw))) return -1;
  if (['month', 'year', 'chronic', 'long'].some((kw) => d.includes(kw))) return 1;
  if (d.includes('week')) return 1;
  if (d.includes('day')) return 0;
  return 0;
}

function painAdjustment(pain) {
  const p = Number(pain);
  if (Number.isNaN(p)) return 0;
  if (p >= 8) return -1;
  if (p <= 3) return 1;
  return 0;
}

function clamp(score) {
  return Math.max(1, Math.min(5, score));
}

function labelFor(score) {
  if (score <= 2) return 'Urgent';
  if (score === 3) return 'Moderate';
  return 'Non-Urgent';
}

function scoreSymptoms({ complaint, duration, pain }) {
  const { specialty, base } = matchComplaint(complaint);
  const severity = clamp(base + durationAdjustment(duration) + painAdjustment(pain));
  return {
    severity_score: severity,
    urgency_label: labelFor(severity),
    specialty,
  };
}

module.exports = { scoreSymptoms };
