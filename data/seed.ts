export const seedTopics = [
  {
    slug: 'heart-failure',
    title: 'Heart Failure',
    system: 'Cardiology',
    summary: 'Core mechanisms, symptoms, investigations, and first-line management of heart failure.',
    difficulty: 4,
    estMinutes: 35,
    highYield: true,
    lesson: {
      title: 'High-Yield Heart Failure Review',
      content: `Heart failure is a clinical syndrome caused by structural or functional cardiac abnormality resulting in reduced cardiac output and/or elevated intracardiac pressures. Key symptoms include dyspnea, fatigue, orthopnea, and reduced exercise tolerance. Core investigations include BNP/NT-proBNP, ECG, CXR, and echocardiography. Treatment depends on phenotype and decompensation status.`,
      pearls: 'Think phenotype first: HFrEF vs HFpEF. Echo confirms structure and EF. Diuretics relieve congestion, not mortality.',
      pitfalls: 'Do not rely on edema alone. A normal BNP makes significant HF less likely. Always search for precipitating causes.'
    },
    flashcards: [
      { front: 'Most useful imaging study to confirm heart failure phenotype?', back: 'Echocardiography.', note: 'Defines EF and structure.' },
      { front: 'Main symptom of left-sided heart failure?', back: 'Dyspnea, often with orthopnea or PND.', note: 'Pulmonary congestion.' },
      { front: '4 mortality-reducing drug pillars in HFrEF?', back: 'ARNI/ACEi/ARB, beta-blocker, MRA, SGLT2 inhibitor.', note: 'Core modern therapy.' }
    ],
    questions: [
      {
        stem: 'A 68-year-old man has exertional dyspnea, bilateral basal crackles, elevated JVP, and ankle edema. Which investigation best confirms the underlying cardiac functional abnormality?',
        explanation: 'Echocardiography is the key test to assess ejection fraction and structural abnormalities in heart failure.',
        difficulty: 3,
        options: [
          ['A', 'Echocardiography', true],
          ['B', 'Serum troponin', false],
          ['C', 'D-dimer', false],
          ['D', 'Spirometry', false]
        ]
      },
      {
        stem: 'Which medication primarily relieves congestive symptoms in acute decompensated heart failure but does not reduce mortality?',
        explanation: 'Loop diuretics reduce preload and improve congestion quickly, but are not mortality-reducing agents.',
        difficulty: 2,
        options: [
          ['A', 'Furosemide', true],
          ['B', 'Bisoprolol', false],
          ['C', 'Spironolactone', false],
          ['D', 'Empagliflozin', false]
        ]
      }
    ],
    cases: [
      {
        title: 'Shortness of breath on minimal exertion',
        chiefComplaint: 'Progressive dyspnea and orthopnea for 3 weeks.',
        findings: 'Bibasal crackles, pitting edema, JVP elevation, S3 gallop.',
        investigations: 'BNP elevated, CXR with cardiomegaly and pulmonary edema, echo EF 30%.',
        diagnosis: 'Decompensated HFrEF.',
        management: 'IV loop diuretics, oxygen if needed, identify trigger, then initiate guideline-directed medical therapy.'
      }
    ]
  },
  {
    slug: 'community-acquired-pneumonia',
    title: 'Community-Acquired Pneumonia',
    system: 'Respiratory Medicine',
    summary: 'Diagnosis, severity assessment, empiric therapy, and complications of CAP.',
    difficulty: 3,
    estMinutes: 25,
    highYield: true,
    lesson: {
      title: 'Community-Acquired Pneumonia Essentials',
      content: `CAP presents with cough, fever, dyspnea, pleuritic chest pain, and focal chest signs. Diagnosis is clinical plus imaging when indicated. Severity tools like CURB-65 support disposition decisions. Start empiric antibiotics based on local guidance and severity.`,
      pearls: 'Assess oxygenation early. Elderly patients may present atypically. Think sepsis and effusion.',
      pitfalls: 'Do not delay antibiotics in severe CAP. Viral infection can coexist with bacterial superinfection.'
    },
    flashcards: [
      { front: 'What does CURB-65 assess?', back: 'Pneumonia severity and need for admission.', note: 'Confusion, Urea, RR, BP, Age ≥65.' },
      { front: 'Most common classic bacterial cause of CAP?', back: 'Streptococcus pneumoniae.', note: 'High-yield exam fact.' }
    ],
    questions: [
      {
        stem: 'A 72-year-old woman with confusion, RR 32/min, and low blood pressure presents with CAP. What is the most appropriate next step?',
        explanation: 'This is severe pneumonia with high CURB-65 features, requiring admission and urgent treatment.',
        difficulty: 4,
        options: [
          ['A', 'Outpatient oral antibiotics and review in 48 hours', false],
          ['B', 'Hospital admission and immediate empiric antibiotics', true],
          ['C', 'Wait for sputum culture before treatment', false],
          ['D', 'Treat as asthma exacerbation first', false]
        ]
      }
    ],
    cases: [
      {
        title: 'Fever and pleuritic pain',
        chiefComplaint: 'Productive cough, fever, chest pain.',
        findings: 'Bronchial breath sounds and crackles over right lower lobe.',
        investigations: 'CXR shows lobar consolidation.',
        diagnosis: 'Community-acquired pneumonia.',
        management: 'Empiric antibiotics, fluids, oxygen if hypoxic, severity stratification.'
      }
    ]
  },
  {
    slug: 'diabetes-ketoacidosis',
    title: 'Diabetic Ketoacidosis',
    system: 'Endocrinology',
    summary: 'Emergency recognition and management of DKA.',
    difficulty: 5,
    estMinutes: 30,
    highYield: true,
    lesson: {
      title: 'DKA Rapid Review',
      content: `DKA is characterized by hyperglycemia, ketosis, and metabolic acidosis. Common triggers include infection, insulin omission, MI, and new-onset diabetes. Initial management focuses on fluids, insulin, potassium monitoring, and trigger treatment.`,
      pearls: 'Always check potassium before and during insulin therapy. Look for precipitating illness.',
      pitfalls: 'Do not stop insulin too early. Cerebral edema is rare but critical in younger patients.'
    },
    flashcards: [
      { front: 'Classic triad of DKA?', back: 'Hyperglycemia, ketosis, metabolic acidosis.', note: 'Core definition.' },
      { front: 'Why monitor potassium closely in DKA?', back: 'Insulin drives potassium intracellularly and can cause dangerous hypokalemia.', note: 'High-yield safety point.' }
    ],
    questions: [
      {
        stem: 'Which component is essential in early DKA treatment after initial assessment?',
        explanation: 'Fluid resuscitation is a cornerstone of initial DKA management and begins immediately.',
        difficulty: 3,
        options: [
          ['A', 'Immediate bicarbonate in all cases', false],
          ['B', 'Aggressive fluid resuscitation', true],
          ['C', 'High-dose steroids', false],
          ['D', 'Oral metformin', false]
        ]
      }
    ],
    cases: [
      {
        title: 'Vomiting and Kussmaul breathing',
        chiefComplaint: 'Abdominal pain, vomiting, polyuria, deep breathing.',
        findings: 'Dehydration, tachycardia, acetone breath.',
        investigations: 'Glucose high, blood ketones elevated, pH low, bicarbonate low.',
        diagnosis: 'Diabetic ketoacidosis.',
        management: 'IV fluids, fixed-rate insulin infusion, potassium replacement, treat trigger.'
      }
    ]
  }
];
