/* English ↔ Bangla — works on every page via data-i18n + auto phrase map */
const TeleTriageI18n = (() => {
  const STORAGE_KEY = 'teletriage_lang';

  const PHRASES = {
    // Shared nav & UI
    Dashboard: 'ড্যাশবোর্ড',
    'Symptom Form': 'লক্ষণ ফর্ম',
    'Triage Result': 'ট্রায়াজ ফলাফল',
    'Matched Doctors': 'মিলিত ডাক্তার',
    Payment: 'পেমেন্ট',
    Profile: 'প্রোফাইল',
    'Log Out': 'লগ আউট',
    Patient: 'রোগী',
    Doctor: 'ডাক্তার',
    Specialist: 'বিশেষজ্ঞ',
    'EN | বাং': 'EN | বাং',

    // Auth
    'Patient Registration': 'রোগী নিবন্ধন',
    'Patient Log In': 'রোগী লগ ইন',
    'Doctor Log In': 'ডাক্তার লগ ইন',
    'Welcome back!': 'আবার স্বাগতম!',
    'Full Name': 'পুরো নাম',
    'E-mail Address': 'ইমেইল ঠিকানা',
    'Phone Number': 'ফোন নম্বর',
    Password: 'পাসওয়ার্ড',
    'Confirm Password': 'পাসওয়ার্ড নিশ্চিত করুন',
    Register: 'নিবন্ধন করুন',
    'Log In': 'লগ ইন',
    'Forgot password?': 'পাসওয়ার্ড ভুলে গেছেন?',
    'Authorized Doctor Portal Access': 'অনুমোদিত ডাক্তার পোর্টাল',
    'Doctor ID/ Registration No.': 'ডাক্তার আইডি / রেজিস্ট্রেশন নং',

    // Home
    "I'm a Patient": 'আমি রোগী',
    "I'm a Doctor": 'আমি ডাক্তার',
    'Join as Doctor': 'ডাক্তার হিসেবে যোগ দিন',
    '1. Fill Form': '১. ফর্ম পূরণ',
    'Describe your symptoms in detail': 'আপনার লক্ষণ বিস্তারিত লিখুন',
    '2. Get Priority': '২. অগ্রাধিকার পান',
    'Auto severity score (1–5)': 'স্বয়ংক্রিয় গুরুত্ব স্কোর (১–৫)',
    '3. Pay & Consult': '৩. পেমেন্ট ও পরামর্শ',
    'Pay via bKash / SSLCommerz': 'bKash / SSLCommerz দিয়ে পেমেন্ট',

    'Describe your chief symptom.....': 'আপনার প্রধান লক্ষণ লিখুন...',
    'e.g., sudden, 1-3 days': 'যেমন: হঠাৎ, ১–৩ দিন',
    'e.g., Chest, Back': 'যেমন: বুক, পিঠ',
    'Any additional details or medical history......': 'অতিরিক্ত তথ্য বা রোগের ইতিহাস...',
    'Symptom Details': 'লক্ষণের বিবরণ',
    'Symptom Submission': 'লক্ষণ জমা',
    'Chief Complaint:': 'প্রধান সমস্যা:',
    'Duration:': 'কতদিন ধরে:',
    'Body Location:': 'শরীরের অংশ:',
    'Pain Level:': 'ব্যথার মাত্রা:',
    'Additional Notes:': 'অতিরিক্ত তথ্য:',
    'Save Draft': 'খসড়া সংরক্ষণ',
    Continue: 'এগিয়ে যান',
    'Sudden / Less than 24h': 'হঠাৎ / ২৪ ঘণ্টার কম',
    'Head / Neck': 'মাথা / ঘাড়',
    'Chest / Back': 'বুক / পিঠ',
    Abdomen: 'পেট',
    'Arms / Legs': 'হাত / পা',
    'Submit Symptoms': 'লক্ষণ জমা দিন',
    Sudden: 'হঠাৎ',
    'Less than 24h': '২৪ ঘণ্টার কম',
    Today: 'আজ',
    '1-3 days': '১–৩ দিন',
    '1-2 weeks': '১–২ সপ্তাহ',
    'Chronic (1 month+)': 'দীর্ঘমেয়াদি (১ মাস+)',

    // Triage
    'Your triage result': 'আপনার ট্রায়াজ ফলাফল',
    'Severity score': 'গুরুত্ব স্কোর',
    'Pain level': 'ব্যথার মাত্রা',
    Speciality: 'বিশেষত্ব',
    Urgent: 'জরুরি',
    'Your case': 'আপনার কেস',
    'Severity scale': 'গুরুত্বের স্কেল',
    '5- Non-urgent': '৫ — জরুরি নয়',
    '1- Critical': '১ — অতি জরুরি',
    'Proceed to Payment': 'পেমেন্টে যান',

    // Payment
    'Checkout & Payment': 'চেকআউট ও পেমেন্ট',
    'Consultation Duration (10–60 minutes)': 'পরামর্শের সময় (১০–৬০ মিনিট)',
    'Fee = 100 BDT per 10-minute block': 'ফি = প্রতি ১০ মিনিটে ১০০ টাকা',
    'Appointment Summary': 'অ্যাপয়েন্টমেন্ট সারাংশ',
    'Selected Duration:': 'নির্বাচিত সময়:',
    'Time Slot:': 'সময় স্লট:',
    'Total Fee:': 'মোট ফি:',
    'Priority Queue': 'অগ্রাধিকার লাইন',
    'Select Payment Method': 'পেমেন্ট পদ্ধতি নির্বাচন',
    bKash: 'bKash',
    SSLCommerz: 'SSLCommerz',
    'Pay Now & Confirm Booking': 'এখনই পেমেন্ট ও বুকিং নিশ্চিত করুন',
    '10 minutes — 100 BDT': '১০ মিনিট — ১০০ টাকা',
    '20 minutes — 200 BDT': '২০ মিনিট — ২০০ টাকা',
    '30 minutes — 300 BDT': '৩০ মিনিট — ৩০০ টাকা',
    '45 minutes — 450 BDT': '৪৫ মিনিট — ৪৫০ টাকা',
    '60 minutes — 600 BDT (maximum)': '৬০ মিনিট — ৬০০ টাকা (সর্বোচ্চ)',

    // Payment success/fail
    'Payment Successful!': 'পেমেন্ট সফল!',
    'Your transaction has been completed successfully': 'আপনার লেনদেন সফলভাবে সম্পন্ন হয়েছে',
    'Transaction ID:': 'লেনদেন আইডি:',
    'Gateway:': 'গেটওয়ে:',
    'Amount Paid:': 'পরিশোধিত পরিমাণ:',
    'Date & Time:': 'তারিখ ও সময়:',
    'Routing Type:': 'রাউটিং ধরন:',
    'Live Priority Queue': 'লাইভ অগ্রাধিকার লাইন',
    'Go to Patient Dashboard': 'রোগী ড্যাশবোর্ডে যান',
    'Download Receipt': 'রসিদ ডাউনলোড',
    'Payment Failed!': 'পেমেন্ট ব্যর্থ!',
    "We couldn't process your payment. Please try again.": 'পেমেন্ট প্রক্রিয়া করা যায়নি। আবার চেষ্টা করুন।',
    'Status: Transaction Cancelled': 'স্ট্যাটাস: লেনদেন বাতিল',
    'Amount Due:': 'বকেয়া:',
    'Retry payment': 'আবার পেমেন্ট করুন',
    'Choose Other Gateway': 'অন্য গেটওয়ে বেছে নিন',

    // Patient dashboard
    Queued: 'লাইনে',
    'Under Review': 'পর্যালোচনাধীন',
    Consulting: 'পরামর্শ চলছে',
    Completed: 'সম্পন্ন',
    'View Consultation Status': 'পরামর্শের অবস্থা দেখুন',
    'Cancel & Request Refund': 'বাতিল ও রিফান্ড চান',
    'Refund available only while waiting in queue.': 'শুধু লাইনে অপেক্ষার সময় রিফান্ড পাওয়া যাবে।',
    'Triage Summary': 'ট্রায়াজ সারাংশ',
    'Queue Status': 'লাইনের অবস্থা',
    'In Consultation': 'পরামর্শ চলছে',
    'Est. Wait: Active Now': 'আনু. অপেক্ষা: এখনই',
    'Payment Status': 'পেমেন্ট স্ট্যাটাস',
    'Payment Verified (SSLCommerz)': 'পেমেন্ট যাচাই হয়েছে',
    'Assigned Medical Specialist': 'নির্ধারিত বিশেষজ্ঞ',
    'Available Today': 'আজ উপলব্ধ',
    'Submitted Chief Complaint': 'জমা দেওয়া প্রধান সমস্যা',

    // Doctor dashboard
    'Live Urgent Queue': 'লাইভ জরুরি লাইন',
    'Fixed Appointments': 'নির্ধারিত অ্যাপয়েন্টমেন্ট',
    'Case History': 'কেস ইতিহাস',
    'Welcome, Doctor': 'স্বাগতম, ডাক্তার',
    'Welcome,': 'স্বাগতম,',
    "Today's Appointments": 'আজকের অ্যাপয়েন্টমেন্ট',
    'Currently Consulting': 'বর্তমানে পরামর্শ',
    'Completed Today': 'আজ সম্পন্ন',
    'Priority Queue': 'অগ্রাধিকার লাইন',
    'See all': 'সব দেখুন',
    'Loading queue…': 'লাইন লোড হচ্ছে…',
    "Today's Scheduled Appointments": 'আজকের নির্ধারিত অ্যাপয়েন্টমেন্ট',
    'PATIENT ID': 'রোগী আইডি',
    SEVERITY: 'গুরুত্ব',
    WAIT: 'অপেক্ষা',
    ACTION: 'অ্যাকশন',
    DETAILS: 'বিবরণ',
    TIME: 'সময়',
    View: 'দেখুন',
    'Live Patient Triage Queue': 'লাইভ রোগী ট্রায়াজ লাইন',
    'Real-time prioritized patient stream for your specialty.': 'আপনার বিশেষত্বের জন্য রিয়েল-টাইম অগ্রাধিকার লাইন।',
    'Live Sync': 'লাইভ সিঙ্ক',
    Critical: 'অতি জরুরি',
    Moderate: 'মাঝারি',
    Low: 'কম',
    'Total Active': 'মোট সক্রিয়',
    'All Statuses': 'সব স্ট্যাটাস',
    'Search by patient ID, name, or status…': 'রোগী আইডি, নাম বা স্ট্যাটাস দিয়ে খুঁজুন...',
    'SEVERITY SCORE': 'গুরুত্ব স্কোর',
    'QUICK ACTION': 'দ্রুত অ্যাকশন',
    STATUS: 'স্ট্যাটাস',

    // Doctor schedule
    'Doctor Schedule Management': 'ডাক্তারের সময়সূচি',
    'Configure availability, consultation slots, and booking rules.': 'উপলব্ধতা, স্লট ও বুকিং নিয়ম সেট করুন।',
    'Save Changes': 'পরিবর্তন সংরক্ষণ',
    'Weekly Working Days': 'সাপ্তাহিক কর্মদিবস',
    'Avg. Slot Time': 'গড় স্লট সময়',
    'Max Daily Patients': 'দৈনিক সর্বোচ্চ রোগী',
    'Chamber Mode': 'চেম্বার মোড',
    'Active & Ready': 'সক্রিয় ও প্রস্তুত',
    'Weekly Availability & Shifts': 'সাপ্তাহিক উপলব্ধতা ও শিফট',
    'Auto-Sync Active': 'অটো-সিঙ্ক সক্রিয়',
    Sunday: 'রবিবার',
    Monday: 'সোমবার',
    Tuesday: 'মঙ্গলবার',
    Wednesday: 'বুধবার',
    Thursday: 'বৃহস্পতিবার',
    Friday: 'শুক্রবার',
    Saturday: 'শনিবার',
    'Morning Shift': 'সকাল শিফট',
    'Booking Rules & Buffers': 'বুকিং নিয়ম',
    'Consultation Duration': 'পরামর্শের সময়',

    // Doctor match
    'Your Detected Problem & Best-Fit Doctors': 'সনাক্ত সমস্যা ও উপযুক্ত ডাক্তার',
    'We analyzed your symptoms and ranked specialists by fit and availability.': 'আপনার লক্ষণ বিশ্লেষণ করে উপযুক্ত ডাক্তার দেখানো হয়েছে।',
    'Detected Problem': 'সনাক্ত সমস্যা',
    'Chief complaint': 'প্রধান সমস্যা',
    'Urgency': 'জরুরিতা',
    'Specialty needed': 'প্রয়োজনীয় বিশেষত্ব',
    'Recommended Doctors': 'সুপারিশকৃত ডাক্তার',
    'No active doctors found for this specialty right now.': 'এই বিশেষত্বে এখন কোনো সক্রিয় ডাক্তার নেই।',
    'Continue to Payment': 'পেমেন্টে এগিয়ে যান',

    // Doctor join
    'Why Doctors Choose TeleTriage': 'ডাক্তাররা কেন TeleTriage বেছে নেন',
    'Apply to Join TeleTriage': 'TeleTriage-এ যোগ দিন',
    'Submit Interest Application': 'আগ্রহের আবেদন জমা দিন',
    'Doctor Login': 'ডাক্তার লগ ইন',
    'Already registered? Log in here': 'ইতিমধ্যে নিবন্ধিত? এখানে লগ ইন করুন',
    Cardiology: 'হৃদরোগ',
    Neurology: 'স্নায়ুবিদ্যা',
    'Emergency Medicine': 'জরুরি চিকিৎসা',
    'General Medicine': 'সাধারণ চিকিৎসা',
    Rheumatology: 'বাত রোগ',
    Dermatology: 'চর্মরোগ',
    Other: 'অন্যান্য',
    'Select Specialty': 'বিশেষত্ব নির্বাচন',

    // Profiles
    'Personal Information': 'ব্যক্তিগত তথ্য',
    Age: 'বয়স',
    Gender: 'লিঙ্গ',
    Male: 'পুরুষ',
    Female: 'মহিলা',
    'Blood Group': 'রক্তের গ্রুপ',
    'Emergency & Medical Information': 'জরুরি ও চিকিৎসা তথ্য',
    'Known Allergies': 'পরিচিত অ্যালার্জি',
    'Chronic Illnesses': 'দীর্ঘমেয়াদি রোগ',
    Cancel: 'বাতিল',
    'Save Changes': 'পরিবর্তন সংরক্ষণ',
    'Doctor Profile': 'ডাক্তার প্রোফাইল',
    'Professional Information': 'পেশাগত তথ্য',
    'Contact & Chamber Info': 'যোগাযোগ ও চেম্বার',
    'Update Profile': 'প্রোফাইল আপডেট',

    // Case history
    'Patient Case History': 'রোগীর কেস ইতিহাস',
    'Export History': 'ইতিহাস এক্সপোর্ট',
    'Completed Cases': 'সম্পন্ন কেস',
    'Follow-ups Pending': 'অপেক্ষমাণ ফলো-আপ',
    'Hospital Referrals': 'হাসপাতাল রেফার',
    'Avg. Resolution Time': 'গড় সমাধান সময়',
    'View Record': 'রেকর্ড দেখুন',
    DIAGNOSIS: 'রোগ নির্ণয়',
    OUTCOME: 'ফলাফল',

    // Appointment
    'Book Consultation Slot': 'পরামর্শের স্লট বুক করুন',
    'Book Appointment': 'অ্যাপয়েন্টমেন্ট বুক',
    'Select Consultation Duration (10 to 60 Mins):': 'পরামর্শের সময় (১০–৬০ মিনিট):',
    'Select Available Time Slot:': 'উপলব্ধ সময় স্লট:',
    'Total Consultation Fee:': 'মোট পরামর্শ ফি:',
    'Proceed to Payment': 'পেমেন্টে যান',
    'Slot Selected!': 'স্লট নির্বাচিত!',
    'Go to Payment Gateway (bKash / SSLCommerz)': 'পেমেন্ট গেটওয়েতে যান',

    // Breadcrumbs partials
    'Symptom Submission': 'লক্ষণ জমা',
    'Consultation Payment': 'পরামর্শ পেমেন্ট',

    // —— Extended coverage (all pages + JS strings) ——
    Schedule: 'সময়সূচি',
    'Patient Login': 'রোগী লগ ইন',
    'Log in here': 'এখানে লগ ইন করুন',
    'Already registered?': 'ইতিমধ্যে নিবন্ধিত?',
    'Focus on clinical work — we handle triage scoring, queue ordering, and payment collection before patients reach you.':
      'ক্লিনিক্যাল কাজে মন দিন — ট্রায়াজ, লাইন ও পেমেন্ট আমরা সামলে নিই।',
    'Priority Queue, Not Chaos': 'অগ্রাধিকার লাইন, বিশৃঙ্খলা নয়',
    'Patients arrive pre-sorted by AI severity (1–5). Critical cases surface first — you never dig through a random waiting room.':
      'রোগী AI গুরুত্ব (১–৫) অনুযায়ী আগে থেকেই সাজানো থাকে। জরুরি কেস প্রথমে আসে।',
    'Payment Already Collected': 'পেমেন্ট আগেই সংগ্রহ',
    'Consultation fees are paid via bKash/SSLCommerz before a patient enters your queue. No billing disputes at the door.':
      'আপনার লাইনে আসার আগেই bKash/SSLCommerz-এ ফি পরিশোধ হয়। বিল নিয়ে ঝামেলা নেই।',
    'Privacy by Design': 'গোপনীয়তা নিশ্চিত',
    'You see anonymized patient IDs and full triage summaries — aligned with telemedicine privacy requirements.':
      'আপনি anonymized রোগী ID ও পূর্ণ ট্রায়াজ সারাংশ দেখেন — টেলিমেডিসিন গোপনীয়তা মেনে।',
    'Rich Case Context': 'সম্পূর্ণ কেস তথ্য',
    'Chief complaint, pain level, duration, specialty routing, and past case history — all on one screen.':
      'প্রধান সমস্যা, ব্যথা, সময়কাল, বিশেষত্ব ও অতীত কেস — এক স্ক্রিনে।',
    'Live Dashboard': 'লাইভ ড্যাশবোর্ড',
    'Track critical/urgent counts, active consultations, and completed cases today from your doctor dashboard.':
      'জরুরি সংখ্যা, সক্রিয় পরামর্শ ও আজকের সম্পন্ন কেস ট্র্যাক করুন।',
    'Flexible Consult Length': 'নমনীয় পরামর্শ সময়',
    'Patients choose 10–60 minute slots. Queue wait estimates adjust automatically based on booked duration.':
      'রোগী ১০–৬০ মিনিট স্লট বেছে নেয়। লাইনের অপেক্ষা স্বয়ংক্রিয়ভাবে হিসাব হয়।',
    'Doctors are verified and onboarded by our admin team. Submit your interest below.':
      'ডাক্তারদের অ্যাডমিন যাচাই করে। নিচে আগ্রহ জানান।',
    'Full Name (Dr. ...)': 'পুরো নাম (ডাঃ ...)',
    'Professional Email': 'পেশাদার ইমেইল',
    'Phone (01XXXXXXXXX)': 'ফোন (01XXXXXXXXX)',
    'BMDC / Registration No. (optional)': 'BMDC / রেজিস্ট্রেশন নং (ঐচ্ছিক)',
    'Why do you want to join TeleTriage? (optional)': 'কেন TeleTriage-এ যোগ দিতে চান? (ঐচ্ছিক)',
    'Real-time prioritized patient stream based on AI triage severity.':
      'AI ট্রায়াজ গুরুত্ব অনুযায়ী রিয়েল-টাইম অগ্রাধিকার লাইন।',
    'Moderate / Low': 'মাঝারি / কম',
    'Start Review': 'পর্যালোচনা শুরু',
    'Queue is empty.': 'লাইন খালি।',
    'Failed to load queue.': 'লাইন লোড ব্যর্থ।',
    'Could not update case status.': 'কেস স্ট্যাটাস আপডেট হয়নি।',
    'No patients in queue right now.': 'এখন লাইনে কোনো রোগী নেই।',
    PAYMENT: 'পেমেন্ট',
    Patient: 'রোগী',
    Patients: 'রোগী',
    'In Line': 'লাইনে',
    mins: 'মিনিট',
    'Archive of resolved triage assessments, diagnosis logs, and medical records.':
      'সমাধান হওয়া ট্রায়াজ, রোগ নির্ণয় ও রেকর্ডের সংগ্রহশালা।',
    'All Outcome Statuses': 'সব ফলাফল স্ট্যাটাস',
    'Completed / Discharged': 'সম্পন্ন / ছুটি দেওয়া',
    'Referred to Specialist': 'বিশেষজ্ঞে রেফার',
    'Follow-up Required': 'ফলো-আপ প্রয়োজন',
    'Search by patient name, ID, or diagnosis...': 'রোগীর নাম, ID বা রোগ নির্ণয় দিয়ে খুঁজুন...',
    PATIENT: 'রোগী',
    'INITIAL TRIAGE': 'প্রাথমিক ট্রায়াজ',
    'DIAGNOSIS SUMMARY': 'রোগ নির্ণয় সারাংশ',
    'Update your professional information and consultation settings.':
      'পেশাগত তথ্য ও পরামর্শ সেটিংস আপডেট করুন।',
    'Doctor Name': 'ডাক্তারের নাম',
    Specialization: 'বিশেষত্ব',
    'Consultation Fee (BDT)': 'পরামর্শ ফি (টাকা)',
    'Email Address': 'ইমেইল ঠিকানা',
    'Hospital / Chamber Address': 'হাসপাতাল / চেম্বার ঠিকানা',
    'BMDC Registration No.': 'BMDC রেজিস্ট্রেশন নং',
    'Years of Experience': 'অভিজ্ঞতার বছর',
    'Emergency Contact Name': 'জরুরি যোগাযোগের নাম',
    'Emergency Contact Phone': 'জরুরি যোগাযোগের ফোন',
    'Medical History Summary': 'চিকিৎসা ইতিহাস সারাংশ',
    'Assigned by AI Triage Engine': 'AI ট্রায়াজ ইঞ্জিন দ্বারা নির্ধারিত',
    '10 Minutes (Standard - 100 BDT)': '১০ মিনিট (১০০ টাকা)',
    '20 Minutes (200 BDT)': '২০ মিনিট (২০০ টাকা)',
    '30 Minutes (300 BDT)': '৩০ মিনিট (৩০০ টাকা)',
    '45 Minutes (450 BDT)': '৪৫ মিনিট (৪৫০ টাকা)',
    '60 Minutes (600 BDT)': '৬০ মিনিট (৬০০ টাকা)',
    'Your consultation with': 'আপনার পরামর্শ',
    'is scheduled for': 'নির্ধারিত সময়',
    'Total Fee:': 'মোট ফি:',
    'View Matched Doctors': 'মিলিত ডাক্তার দেখুন',
    'Best Match': 'সেরা মিল',
    'Active cases:': 'সক্রিয় কেস:',
    ' fit': ' মিল',
    doctor: 'ডাক্তার',
    doctors: 'ডাক্তার',
    'No triage submission found. Please submit your symptoms first.':
      'কোনো ট্রায়াজ জমা নেই। আগে লক্ষণ জমা দিন।',
    'Could not load matched doctors.': 'ডাক্তার তালিকা লোড হয়নি।',
    'Redirecting to payment gateway...': 'পেমেন্ট গেটওয়েতে নিয়ে যাওয়া হচ্ছে...',
    'Pay Now & Confirm Booking': 'এখনই পেমেন্ট ও বুকিং নিশ্চিত করুন',
    'Sandbox mode': 'স্যান্ডবক্স মোড',
    'test payments only': 'শুধু পরীক্ষামূলক পেমেন্ট',
    Refund: 'রিফান্ড',
    Submitting: 'জমা হচ্ছে',
    'Submission failed. Please try again.': 'জমা ব্যর্থ। আবার চেষ্টা করুন।',
    'Refund unavailable — payment not confirmed yet.': 'রিফান্ড unavailable — পেমেন্ট নিশ্চিত হয়নি।',
    'Refund only available while waiting in queue (before doctor review).':
      'শুধু লাইনে অপেক্ষার সময় রিফান্ড (ডাক্তার পর্যালোচনার আগে)।',
    'Your case is being reviewed. Please wait for updates from your doctor.':
      'আপনার কেস পর্যালোচনাধীন। ডাক্তারের আপডেটের জন্য অপেক্ষা করুন।',
    'Please log in first.': 'আগে লগ ইন করুন।',
    'No triage submission found. Please complete the symptom form first.':
      'ট্রায়াজ জমা নেই। আগে লক্ষণ ফর্ম পূরণ করুন।',
    'Server not responding. Please check backend status.':
      'সার্ভার সাড়া দিচ্ছে না। ব্যাকএন্ড চেক করুন।',
    'Redirecting to patient login…': 'রোগী লগ ইন-এ নিয়ে যাওয়া হচ্ছে…',
    'Redirecting…': 'নিয়ে যাওয়া হচ্ছে…',
    'Fixed Appointment Slot': 'নির্ধারিত অ্যাপয়েন্টমেন্ট স্লট',
    '5 Days / Wk': '৫ দিন / সপ্তাহ',
    '15 Mins / Patient': '১৫ মিনিট / রোগী',
    '20 Patients': '২০ রোগী',
    '15 Minutes / Patient': '১৫ মিনিট / রোগী',
    'Configure availability, consultation slots, and automated booking limits.':
      'উপলব্ধতা, স্লট ও স্বয়ংক্রিয় বুকিং সীমা সেট করুন।',
    'Specialty:': 'বিশেষত্ব:',
    'Cardiologist & Medical Officer': 'হৃদরোগ বিশেষজ্ঞ ও মেডিকেল অফিসার',
    'Est. Wait:': 'আনু. অপেক্ষা:',
    'Case #': 'কেস #',
    Severity: 'গুরুত্ব',
    'Non-urgent': 'জরুরি নয়',
    'Non-Urgent': 'জরুরি নয়',
    'Proceed to Payment Gateway': 'পেমেন্ট গেটওয়েতে যান',
    '10 Mins': '১০ মিনিট',
    Paid: 'পরিশোধিত',
    Success: 'সফল',
    Pending: 'অপেক্ষমাণ',
    Failed: 'ব্যর্থ',
    'Profile updated successfully!': 'প্রোফাইল সফলভাবে আপডেট!',
    'Patient Profile updated successfully!': 'রোগী প্রোফাইল আপডেট হয়েছে!',
    'Doctor Profile updated successfully!': 'ডাক্তার প্রোফাইল আপডেট হয়েছে!',
    'Could not process cancellation.': 'বাতিল প্রক্রিয়া করা যায়নি।',
    'Active Case': 'সক্রিয় কেস',
    ' min consultation': ' মিনিট পরামর্শ',
    Specialist: 'বিশেষজ্ঞ',
    'Redirecting to': 'নিয়ে যাওয়া হচ্ছে',
    'patient login': 'রোগী লগ ইন',
    'Why are you cancelling? (Optional)': 'কেন বাতিল করছেন? (ঐচ্ছিক)',
    'Full refund applies only while you are still in the queue.': 'পূর্ণ রিফান্ড শুধু লাইনে থাকা অবস্থায়।',
    'Cancel consultation and request a full refund?': 'পরামর্শ বাতিল ও পূর্ণ রিফান্ড চান?',
    'Submitting...': 'জমা হচ্ছে...',
    'Referred to ER': 'জরুরি বিভাগে রেফার',
    'Follow-up Set': 'ফলো-আপ নির্ধারিত',
    ' Cases': ' কেস',
    'Patient ID:': 'রোগী আইডি:',
    DATE: 'তারিখ',
    'Choose This Doctor': 'এই ডাক্তার বেছে নিন',
    Selected: 'নির্বাচিত',
    'Please select a doctor before continuing to payment.': 'পেমেন্টের আগে একজন ডাক্তার বেছে নিন।',
    'Please select a doctor on the Matched Doctors page first.': 'আগে মিলিত ডাক্তার পেঘ이지 থেকে ডাক্তার বেছে নিন।',
    'You selected:': 'আপনি বেছে নিয়েছেন:',
    'years experience': 'বছর অভিজ্ঞতা',
    'Could not select doctor.': 'ডাক্তার নির্বাচন হয়নি।',
  };

  const T = {
    en: {
      'page.home.title': 'TeleTriage — Telemedicine Triage System',
      'home.headline': 'Welcome to the Telemedicine<br>Triage System',
      'home.subtitle': 'Submit your symptoms from home, check your priority level, and join the digital live line before traveling to the clinic',
      'home.btn.patient': "I'm a Patient",
      'home.btn.doctor': "I'm a Doctor",
      'home.btn.joinDoctor': 'Join as Doctor',
      'home.step1.title': '1. Fill Form',
      'home.step1.desc': 'Describe your symptoms in detail',
      'home.step2.title': '2. Get Priority',
      'home.step2.desc': 'Auto severity score (1–5)',
      'home.step3.title': '3. Pay & Consult',
      'home.step3.desc': 'Pay via bKash / SSLCommerz',
      'page.register.title': 'Patient Registration — TeleTriage',
      'register.heading': 'Patient Registration',
      'register.fullName': 'Full Name',
      'register.email': 'E-mail Address',
      'register.phone': 'Phone Number',
      'register.password': 'Password',
      'register.confirmPassword': 'Confirm Password',
      'register.policy': '* Must contain 8+ characters, upper & lowercase letters, a number, and a symbol.',
      'register.submit': 'Register',
      'register.loginPrompt': 'Already have an account? <a href="patient-login.html" class="fw-bold text-decoration-underline" style="color: #187D85;">Log In</a>',
      'page.login.title': 'Patient Log In — TeleTriage',
      'login.heading': 'Patient Log In',
      'login.welcome': 'Welcome back!',
      'login.email': 'E-mail Address',
      'login.password': 'Password',
      'login.forgot': 'Forgot password?',
      'login.submit': 'Log In',
      'login.registerPrompt': 'New to TeleTriage? <a href="register.html" class="brand-teal fw-bold text-decoration-none small">Create an account</a>',
      'page.doctorLogin.title': 'Doctor Log In — TeleTriage',
      'doctorLogin.tagline': 'Authorized Doctor Portal Access',
      'doctorLogin.heading': 'Doctor Log In',
      'doctorLogin.welcome': 'Welcome back!',
      'doctorLogin.id': 'Doctor ID / Registration No.',
      'doctorLogin.password': 'Password',
      'doctorLogin.forgot': 'Forgot password?',
      'doctorLogin.submit': 'Log In',
      'doctorLogin.joinPrompt2': 'New to TeleTriage? <a href="doctor-join.html" class="fw-bold brand-teal text-decoration-none">Apply to join as a doctor</a>',
      'welcome.patient': 'Welcome,',
      'symptom.chiefComplaint.ph': 'Describe your chief symptom.....',
      'symptom.duration.ph': 'e.g., sudden, 1-3 days',
      'symptom.bodyLocation.ph': 'e.g., Chest, Back',
      'symptom.notes.ph': 'Any additional details or medical history......',
      'symptom.details': 'Symptom Details',
      'symptom.chiefComplaint.label': 'Chief Complaint:',
      'symptom.duration.label': 'Duration:',
      'symptom.bodyLocation.label': 'Body Location:',
      'symptom.painLevel.label': 'Pain Level:',
      'symptom.notes.label': 'Additional Notes:',
      'symptom.saveDraft': 'Save Draft',
      'symptom.continue': 'Continue',
      'symptom.submitting': 'Submitting...',
    },
    bn: {
      'page.home.title': 'TeleTriage — টেলিমেডিসিন ট্রায়াজ সিস্টেম',
      'home.headline': 'টেলিমেডিসিন<br>ট্রায়াজ সিস্টেমে স্বাগতম',
      'home.subtitle': 'বাড়ি থেকেই লক্ষণ জানান, অগ্রাধিকার যাচাই করুন এবং ক্লিনিকে যাওয়ার আগে ডিজিটাল লাইনে যোগ দিন',
      'home.btn.patient': 'আমি রোগী',
      'home.btn.doctor': 'আমি ডাক্তার',
      'home.btn.joinDoctor': 'ডাক্তার হিসেবে যোগ দিন',
      'home.step1.title': '১. ফর্ম পূরণ',
      'home.step1.desc': 'আপনার লক্ষণ বিস্তারিত লিখুন',
      'home.step2.title': '২. অগ্রাধিকার পান',
      'home.step2.desc': 'স্বয়ংক্রিয় গুরুত্ব স্কোর (১–৫)',
      'home.step3.title': '৩. পেমেন্ট ও পরামর্শ',
      'home.step3.desc': 'bKash / SSLCommerz দিয়ে পেমেন্ট',
      'page.register.title': 'রোগী নিবন্ধন — TeleTriage',
      'register.heading': 'রোগী নিবন্ধন',
      'register.fullName': 'পুরো নাম',
      'register.email': 'ইমেইল ঠিকানা',
      'register.phone': 'ফোন নম্বর',
      'register.password': 'পাসওয়ার্ড',
      'register.confirmPassword': 'পাসওয়ার্ড নিশ্চিত করুন',
      'register.policy': '* কমপক্ষে ৮ অক্ষর, বড়-ছোট হাতের অক্ষর, সংখ্যা ও চিহ্ন থাকতে হবে।',
      'register.submit': 'নিবন্ধন করুন',
      'register.loginPrompt': 'অ্যাকাউন্ট আছে? <a href="patient-login.html" class="fw-bold text-decoration-underline" style="color: #187D85;">লগ ইন</a>',
      'page.login.title': 'রোগী লগ ইন — TeleTriage',
      'login.heading': 'রোগী লগ ইন',
      'login.welcome': 'আবার স্বাগতম!',
      'login.email': 'ইমেইল ঠিকানা',
      'login.password': 'পাসওয়ার্ড',
      'login.forgot': 'পাসওয়ার্ড ভুলে গেছেন?',
      'login.submit': 'লগ ইন',
      'login.registerPrompt': 'TeleTriage-এ নতুন? <a href="register.html" class="brand-teal fw-bold text-decoration-none small">অ্যাকাউন্ট তৈরি করুন</a>',
      'page.doctorLogin.title': 'ডাক্তার লগ ইন — TeleTriage',
      'doctorLogin.tagline': 'অনুমোদিত ডাক্তার পোর্টাল',
      'doctorLogin.heading': 'ডাক্তার লগ ইন',
      'doctorLogin.welcome': 'আবার স্বাগতম!',
      'doctorLogin.id': 'ডাক্তার আইডি / রেজিস্ট্রেশন নং',
      'doctorLogin.password': 'পাসওয়ার্ড',
      'doctorLogin.forgot': 'পাসওয়ার্ড ভুলে গেছেন?',
      'doctorLogin.submit': 'লগ ইন',
      'doctorLogin.joinPrompt2': 'TeleTriage-এ নতুন? <a href="doctor-join.html" class="fw-bold brand-teal text-decoration-none">ডাক্তার হিসেবে যোগ দিন</a>',
      'welcome.patient': 'স্বাগতম,',
      'symptom.chiefComplaint.ph': 'আপনার প্রধান লক্ষণ লিখুন...',
      'symptom.duration.ph': 'যেমন: হঠাৎ, ১–৩ দিন',
      'symptom.bodyLocation.ph': 'যেমন: বুক, পিঠ',
      'symptom.notes.ph': 'অতিরিক্ত তথ্য বা রোগের ইতিহাস...',
      'symptom.details': 'লক্ষণের বিবরণ',
      'symptom.chiefComplaint.label': 'প্রধান সমস্যা:',
      'symptom.duration.label': 'কতদিন ধরে:',
      'symptom.bodyLocation.label': 'শরীরের অংশ:',
      'symptom.painLevel.label': 'ব্যথার মাত্রা:',
      'symptom.notes.label': 'অতিরিক্ত তথ্য:',
      'symptom.saveDraft': 'খসড়া সংরক্ষণ',
      'symptom.continue': 'এগিয়ে যান',
      'symptom.submitting': 'জমা হচ্ছে...',
    },
  };

  let current = localStorage.getItem(STORAGE_KEY) || 'en';
  const textOriginals = new WeakMap();
  let applying = false;

  function t(key) {
    return (T[current] && T[current][key]) || T.en[key] || key;
  }

  function translatePhrase(text) {
    if (current === 'en' || !text) return text;
    let out = text;
    const keys = Object.keys(PHRASES).sort((a, b) => b.length - a.length);
    for (const en of keys) {
      if (out.includes(en)) out = out.split(en).join(PHRASES[en]);
    }
    return out;
  }

  function translatePlaceholder(text) {
    if (current === 'en' || !text) return text;
    return PHRASES[text] || translatePhrase(text);
  }

  function autoTranslateDom() {
    if (!document.body.hasAttribute('data-i18n-auto') || applying) return;
    applying = true;

    const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);

    document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach((el) => {
      if (el.hasAttribute('data-i18n-placeholder')) return;
      if (!el.dataset.i18nPhOrig) el.dataset.i18nPhOrig = el.placeholder;
      el.placeholder = current === 'bn' ? translatePlaceholder(el.dataset.i18nPhOrig) : el.dataset.i18nPhOrig;
    });

    document.querySelectorAll('option').forEach((opt) => {
      if (!opt.dataset.i18nOrig) opt.dataset.i18nOrig = opt.textContent;
      opt.textContent = current === 'bn' ? translatePhrase(opt.dataset.i18nOrig) : opt.dataset.i18nOrig;
    });

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parent = node.parentElement;
      if (!parent || skip.has(parent.tagName) || parent.closest('[data-i18n]')) {
        node = walker.nextNode();
        continue;
      }
      if (!textOriginals.has(node)) {
        textOriginals.set(node, node.textContent);
      } else {
        const stored = textOriginals.get(node);
        const live = node.textContent;
        const translated = translatePhrase(stored);
        if (live !== stored && live !== translated) {
          textOriginals.set(node, live);
        }
      }
      const orig = textOriginals.get(node);
      node.textContent = current === 'bn' ? translatePhrase(orig) : orig;
      node = walker.nextNode();
    }
    applying = false;
  }

  function updateToggleButtons() {
    document.querySelectorAll('#langToggle, .lang-btn').forEach((btn) => {
      btn.textContent = current === 'en' ? 'EN | বাং' : 'বাং | EN';
    });
  }

  function applyKeyedTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const value = t(key);
      if (el.hasAttribute('data-i18n-html')) el.innerHTML = value;
      else el.textContent = value;
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (!el.dataset.i18nPhOrig) el.dataset.i18nPhOrig = el.getAttribute('placeholder') || T.en[key] || '';
      el.placeholder = t(key);
    });

    const titleEl = document.querySelector('[data-i18n-title]');
    if (titleEl) document.title = t(titleEl.getAttribute('data-i18n-title'));
  }

  function tr(text) {
    if (current === 'en' || text == null) return text;
    return PHRASES[text] || translatePhrase(String(text));
  }

  function reapply() {
    if (current === 'bn') autoTranslateDom();
  }

  function apply(lang) {
    current = lang === 'bn' ? 'bn' : 'en';
    localStorage.setItem(STORAGE_KEY, current);
    document.documentElement.lang = current === 'bn' ? 'bn' : 'en';
    applyKeyedTranslations();
    autoTranslateDom();
    updateToggleButtons();
  }

  function toggle() {
    apply(current === 'en' ? 'bn' : 'en');
  }

  function init() {
    document.querySelectorAll('#langToggle, .lang-btn').forEach((btn) => {
      if (!btn.dataset.i18nBound) {
        btn.dataset.i18nBound = '1';
        btn.addEventListener('click', toggle);
      }
    });
    apply(current);

    // Re-apply after dynamic JS updates labels
    let reapplyTimer;
    const observer = new MutationObserver(() => {
      if (applying || current !== 'bn') return;
      clearTimeout(reapplyTimer);
      reapplyTimer = setTimeout(() => autoTranslateDom(), 150);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  return { init, toggle, apply, t, tr, reapply, getLang: () => current };
})();

document.addEventListener('DOMContentLoaded', () => TeleTriageI18n.init());
