-- =========================================================================
-- TeleTriage — Database Schema (MySQL Version)
-- Updated for Flexible Duration (10-60 Mins) & Refund System
-- =========================================================================

-- 1. Patients Table -------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
    patient_id        INT AUTO_INCREMENT PRIMARY KEY,
    full_name         VARCHAR(120) NOT NULL,
    email             VARCHAR(120) UNIQUE,
    phone             VARCHAR(20) NOT NULL UNIQUE,
    date_of_birth     DATE,
    district          VARCHAR(80),
    password_hash     VARCHAR(255) NOT NULL,
    registration_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2. Doctors Table --------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id     INT AUTO_INCREMENT PRIMARY KEY,
    doctor_code   VARCHAR(30) NOT NULL UNIQUE,
    full_name     VARCHAR(120) NOT NULL,
    specialty     VARCHAR(80) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Admins Table ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    admin_id      INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(60) NOT NULL UNIQUE,
    full_name     VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Symptom Submissions --------------------------------------------------
CREATE TABLE IF NOT EXISTS symptom_submissions (
    submission_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id    INT NOT NULL,
    chief_complaint TEXT NOT NULL,
    duration      VARCHAR(20) NOT NULL,
    pain_level    TINYINT NOT NULL CHECK (pain_level BETWEEN 0 AND 10),
    body_location VARCHAR(120),
    notes         TEXT,
    submitted_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- 5. Triage Results -------------------------------------------------------
CREATE TABLE IF NOT EXISTS triage_results (
    triage_id          INT AUTO_INCREMENT PRIMARY KEY,
    submission_id      INT NOT NULL,
    severity_score     TINYINT NOT NULL CHECK (severity_score BETWEEN 1 AND 5),
    urgency_label      VARCHAR(20) NOT NULL,
    assigned_specialty VARCHAR(80) NOT NULL,
    processed_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES symptom_submissions(submission_id) ON DELETE CASCADE
);

-- 6. Priority Queue (Updated with Consultation Duration) -----------------
CREATE TABLE IF NOT EXISTS queue_entries (
    queue_id            INT AUTO_INCREMENT PRIMARY KEY,
    patient_id          INT NOT NULL,
    submission_id       INT NOT NULL,
    triage_id           INT NOT NULL,
    duration_minutes    INT NOT NULL DEFAULT 10 CHECK (duration_minutes BETWEEN 10 AND 60), -- ১০ থেকে ৬০ মিনিট
    status              VARCHAR(20) NOT NULL DEFAULT 'Queued', -- Queued|Under Review|Consulting|Completed|Missed|Cancelled
    assigned_doctor_id  INT NULL,
    estimated_wait_mins INT DEFAULT 0,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (submission_id) REFERENCES symptom_submissions(submission_id),
    FOREIGN KEY (triage_id) REFERENCES triage_results(triage_id),
    FOREIGN KEY (assigned_doctor_id) REFERENCES doctors(doctor_id)
);

-- 7. Payments Table (Updated for bKash & SSLCommerz) ---------------------
CREATE TABLE IF NOT EXISTS payments (
    payment_id           INT AUTO_INCREMENT PRIMARY KEY,
    patient_id           INT NOT NULL,
    submission_id        INT NOT NULL UNIQUE,
    gateway_trx_id       VARCHAR(100), -- Transaction ID from bKash or SSLCommerz
    amount               DECIMAL(10,2) NOT NULL DEFAULT 100.00,
    payment_method       ENUM('bKash', 'SSLCommerz') NOT NULL DEFAULT 'bKash',
    status               ENUM('Pending', 'Success', 'Failed', 'Refunded') NOT NULL DEFAULT 'Pending',
    paid_at              TIMESTAMP NULL,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (submission_id) REFERENCES symptom_submissions(submission_id)
);

-- 8. Refund Management Table (For No-Show / Missed Appointments) ---------
CREATE TABLE IF NOT EXISTS refunds (
    refund_id        INT AUTO_INCREMENT PRIMARY KEY,
    payment_id       INT NOT NULL,
    patient_id       INT NOT NULL,
    queue_id         INT NOT NULL,
    refund_amount    DECIMAL(10,2) NOT NULL,
    gateway          ENUM('bKash', 'SSLCommerz') NOT NULL,
    refund_trx_id    VARCHAR(100) NULL,
    status           ENUM('Pending', 'Approved', 'Completed', 'Rejected') DEFAULT 'Pending',
    reason           VARCHAR(255) DEFAULT 'Patient No-Show / Missed Appointment Window',
    requested_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at     TIMESTAMP NULL,
    FOREIGN KEY (payment_id) REFERENCES payments(payment_id),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (queue_id) REFERENCES queue_entries(queue_id)
);

-- 9. Case Archive ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_archive (
    archive_id    INT AUTO_INCREMENT PRIMARY KEY,
    patient_id    INT NOT NULL,
    submission_id INT NOT NULL,
    triage_id     INT NOT NULL,
    completed_by  INT NULL,
    completed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes         TEXT,
    diagnosis     TEXT,
    outcome       VARCHAR(40),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (submission_id) REFERENCES symptom_submissions(submission_id),
    FOREIGN KEY (triage_id) REFERENCES triage_results(triage_id),
    FOREIGN KEY (completed_by) REFERENCES doctors(doctor_id)
);

