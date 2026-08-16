"""
TeleTriage — rule-based triage microservice (Python).

Exposes a single scoring endpoint that the Node.js backend calls over
HTTP after a patient submits their symptom form. Kept deliberately simple
(no ML, no database) so it's easy to explain and extend for the SRS's
"rule-based keyword-matching algorithm" requirement (FR-12, FR-13).

Run locally:
    pip install -r requirements.txt
    python app.py
Service listens on port 6000 by default (matches TRIAGE_SERVICE_URL in the
Node backend's .env.example).
"""
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

from rules import score_symptoms

app = Flask(__name__)
CORS(app)


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/score", methods=["POST"])
def score():
    body = request.get_json(silent=True) or {}

    complaint = body.get("complaint", "")
    duration = body.get("duration", "")
    pain = body.get("pain", 0)
    body_location = body.get("body_location")

    if not complaint or not duration:
        return jsonify({"error": "complaint and duration are required."}), 400

    result = score_symptoms(complaint, duration, pain, body_location)
    return jsonify(result), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 6000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug)
