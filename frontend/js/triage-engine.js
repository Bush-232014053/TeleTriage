/* ==========================================================================
   TeleTriage — rule-based triage engine
   Severity scale: 1 = Critical/Urgent ... 5 = Non-urgent
   (matches the Figma "Severity scale" bar: 5·Non-urgent ... 1·Critical)
   This is a simple, transparent, explainable rule engine — intentionally
   NOT a black-box ML model, so a reviewing doctor can see exactly why a
   case was scored the way it was. Swap KEYWORD_RULES below to extend it.
   ========================================================================== */

const TriageEngine = (() => {

  // Each rule: keywords to look for in the complaint text (case-insensitive),
  // the specialty it routes to, and the base severity it starts a case at.
  const KEYWORD_RULES = [
    { keywords: ["chest pain", "can't breathe", "cannot breathe", "difficulty breathing", "shortness of breath"],
      specialty: "Cardiology", base: 1 },
    { keywords: ["stroke", "face drooping", "slurred speech", "one side numb", "seizure", "unconscious"],
      specialty: "Neurology", base: 1 },
    { keywords: ["severe bleeding", "heavy bleeding", "broken bone", "fracture", "head injury"],
      specialty: "Emergency Medicine", base: 1 },
    { keywords: ["high fever", "fever", "vomiting", "diarrhea", "dehydration"],
      specialty: "General Medicine", base: 3 },
    { keywords: ["joint pain", "back pain", "muscle pain", "arthritis", "swelling"],
      specialty: "Rheumatology", base: 3 },
    { keywords: ["rash", "itching", "skin"],
      specialty: "Dermatology", base: 4 },
    { keywords: ["cough", "cold", "sore throat", "headache", "fatigue"],
      specialty: "General Medicine", base: 4 },
  ];

  const DEFAULT_SPECIALTY = "General Medicine";
  const DEFAULT_BASE = 3;

  function matchComplaint(text) {
    const t = (text || "").toLowerCase();
    for (const rule of KEYWORD_RULES) {
      if (rule.keywords.some(k => t.includes(k))) {
        return { specialty: rule.specialty, base: rule.base };
      }
    }
    return { specialty: DEFAULT_SPECIALTY, base: DEFAULT_BASE };
  }

  function durationAdjustment(duration) {
    switch (duration) {
      case "sudden":        // < 1 hour
      case "today":         return -1;
      case "1-3-days":      return 0;
      case "1-2-weeks":     return 1;
      case "chronic":       return 1; // 1 month+
      default:              return 0;
    }
  }

  function painAdjustment(pain) {
    const p = Number(pain) || 0;
    if (p >= 8) return -1;
    if (p <= 3) return 1;
    return 0;
  }

  function clamp(score) {
    return Math.min(5, Math.max(1, score));
  }

  function labelFor(score) {
    if (score <= 2) return { text: "Urgent",     class: "urgent" };
    if (score === 3) return { text: "Moderate",   class: "moderate" };
    return               { text: "Non-urgent", class: "non-urgent" };
  }

  /**
   * @param {Object} input
   * @param {string} input.complaint   free-text chief complaint
   * @param {string} input.duration    one of: sudden|today|1-3-days|1-2-weeks|chronic
   * @param {number} input.pain        0-10
   * @param {string} input.bodyLocation optional, not scored yet — reserved for future rules
   */
  function score(input) {
    const { specialty, base } = matchComplaint(input.complaint);
    let severity = base + durationAdjustment(input.duration) + painAdjustment(input.pain);
    severity = clamp(severity);
    const label = labelFor(severity);
    return {
      severityScore: severity,   // 1 (critical) .. 5 (non-urgent)
      painLevel: Number(input.pain) || 0,
      specialty,
      label: label.text,         // "Urgent" | "Moderate" | "Non-urgent"
      cssClass: label.class,
    };
  }

  return { score, KEYWORD_RULES };
})();
