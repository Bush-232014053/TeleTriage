-- =========================================================================
-- TeleTriage — Database Schema (PostgreSQL)
-- =========================================================================

CREATE TABLE IF NOT EXISTS patients (
    patient_id        SERIAL PRIMARY KEY,
    full_name         VARCHAR(120) NOT NULL,
    email             VARCHAR(120) UNIQUE,
    phone             VARCHAR(20) NOT NULL UNIQUE,
    date_of_birth     DATE,
    district          VARCHAR(80),
    password_hash     VARCHAR(255) NOT NULL,
    registration_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS doctors (
    doctor_id     SERIAL PRIMARY KEY,
    doctor_code   VARCHAR(30) NOT NULL UNIQUE,
    full_name     VARCHAR(120) NOT NULL,
    specialty     VARCHAR(80) NOT NULL,
    qualification VARCHAR(120),
    years_experience SMALLINT NOT NULL DEFAULT 0,
    password_hash VARCHAR(255) NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS qualification VARCHAR(120);
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS years_experience SMALLINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS admins (
    admin_id      SERIAL PRIMARY KEY,
    username      VARCHAR(60) NOT NULL UNIQUE,
    full_name     VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS symptom_submissions (
    submission_id   SERIAL PRIMARY KEY,
    patient_id      INT NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    chief_complaint TEXT NOT NULL,
    duration        VARCHAR(20) NOT NULL,
    pain_level      SMALLINT NOT NULL CHECK (pain_level BETWEEN 0 AND 10),
    body_location   VARCHAR(120),
    notes           TEXT,
    preferred_doctor_id INT NULL REFERENCES doctors(doctor_id),
    submitted_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE symptom_submissions ADD COLUMN IF NOT EXISTS preferred_doctor_id INT NULL REFERENCES doctors(doctor_id);

CREATE TABLE IF NOT EXISTS triage_results (
    triage_id          SERIAL PRIMARY KEY,
    submission_id      INT NOT NULL UNIQUE REFERENCES symptom_submissions(submission_id) ON DELETE CASCADE,
    severity_score     SMALLINT NOT NULL CHECK (severity_score BETWEEN 1 AND 5),
    urgency_label      VARCHAR(20) NOT NULL,
    assigned_specialty VARCHAR(80) NOT NULL,
    processed_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS queue_entries (
    queue_id            SERIAL PRIMARY KEY,
    patient_id          INT NOT NULL REFERENCES patients(patient_id),
    submission_id       INT NOT NULL REFERENCES symptom_submissions(submission_id),
    triage_id           INT NOT NULL REFERENCES triage_results(triage_id),
    duration_minutes    INT NOT NULL DEFAULT 10 CHECK (duration_minutes BETWEEN 10 AND 60),
    status              VARCHAR(20) NOT NULL DEFAULT 'Queued',
    assigned_doctor_id  INT NULL REFERENCES doctors(doctor_id),
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS duration_minutes INT NOT NULL DEFAULT 10;

CREATE TABLE IF NOT EXISTS payments (
    payment_id           SERIAL PRIMARY KEY,
    patient_id           INT NOT NULL REFERENCES patients(patient_id),
    submission_id        INT NOT NULL UNIQUE REFERENCES symptom_submissions(submission_id),
    bkash_payment_id     VARCHAR(100),
    bkash_transaction_id VARCHAR(100),
    payment_method       VARCHAR(20) NOT NULL DEFAULT 'bKash',
    duration_minutes     INT NOT NULL DEFAULT 10 CHECK (duration_minutes BETWEEN 10 AND 60),
    amount               DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
    status               VARCHAR(20) NOT NULL DEFAULT 'Pending',
    paid_at              TIMESTAMP NULL,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'bKash';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS duration_minutes INT NOT NULL DEFAULT 10;

CREATE TABLE IF NOT EXISTS refunds (
    refund_id        SERIAL PRIMARY KEY,
    payment_id       INT NOT NULL REFERENCES payments(payment_id),
    patient_id       INT NOT NULL REFERENCES patients(patient_id),
    queue_id         INT NULL REFERENCES queue_entries(queue_id),
    refund_amount    DECIMAL(10, 2) NOT NULL,
    gateway          VARCHAR(20) NOT NULL,
    refund_trx_id    VARCHAR(100),
    status           VARCHAR(20) NOT NULL DEFAULT 'Pending',
    reason           VARCHAR(255) DEFAULT 'Patient cancelled before consultation started',
    requested_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at     TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS doctor_interest_requests (
    request_id       SERIAL PRIMARY KEY,
    full_name        VARCHAR(120) NOT NULL,
    email            VARCHAR(120) NOT NULL,
    phone            VARCHAR(20) NOT NULL,
    specialty        VARCHAR(80) NOT NULL,
    registration_no  VARCHAR(60),
    message          TEXT,
    status           VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE doctor_interest_requests ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS case_archive (
    archive_id    SERIAL PRIMARY KEY,
    patient_id    INT NOT NULL REFERENCES patients(patient_id),
    submission_id INT NOT NULL REFERENCES symptom_submissions(submission_id),
    triage_id     INT NOT NULL REFERENCES triage_results(triage_id),
    completed_by  INT NULL REFERENCES doctors(doctor_id),
    completed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes         TEXT,
    diagnosis     TEXT,
    outcome       VARCHAR(40)
);

CREATE INDEX IF NOT EXISTS idx_queue_specialty_status ON queue_entries(status);
CREATE INDEX IF NOT EXISTS idx_triage_submission ON triage_results(submission_id);
CREATE INDEX IF NOT EXISTS idx_payments_bkash_id ON payments(bkash_payment_id);
