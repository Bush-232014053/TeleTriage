// Consultation pricing: 100 BDT per 10-minute block (10–60 min).
const FEE_PER_10_MIN = Number(process.env.FEE_PER_10_MIN || 100);
const ALLOWED_DURATIONS = [10, 20, 30, 45, 60];

function normalizeDurationMinutes(minutes) {
  const value = Number(minutes);
  if (!ALLOWED_DURATIONS.includes(value)) {
    const error = new Error(`durationMinutes must be one of: ${ALLOWED_DURATIONS.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }
  return value;
}

function calculateConsultationFee(durationMinutes) {
  const duration = normalizeDurationMinutes(durationMinutes);
  return (duration / 10) * FEE_PER_10_MIN;
}

function pricingInfo() {
  return {
    feePer10Min: FEE_PER_10_MIN,
    minMinutes: 10,
    maxMinutes: 60,
    allowedDurations: ALLOWED_DURATIONS,
    examples: ALLOWED_DURATIONS.map((d) => ({
      durationMinutes: d,
      fee: calculateConsultationFee(d),
    })),
  };
}

module.exports = {
  FEE_PER_10_MIN,
  ALLOWED_DURATIONS,
  normalizeDurationMinutes,
  calculateConsultationFee,
  pricingInfo,
};
