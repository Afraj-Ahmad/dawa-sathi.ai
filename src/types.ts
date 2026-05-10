export interface Alternative {
  name: string;
  manufacturer: string;
  priceEstimate: string;
  reason: string;
}

export interface Medicine {
  name: string;
  strength: string;
  dosage: string;
  duration: string;
  purpose: string;
  activeIngredients: string[];
  instructions: string;
  alternatives: Alternative[];
}

export interface PrescriptionAnalysis {
  patientInfo?: {
    name?: string;
    age?: string;
    date?: string;
  };
  medicines: Medicine[];
  generalAdvice?: string;
}

export interface LabMetric {
  name: string;
  value: string;
  unit: string;
  normalRange: string;
  status: 'normal' | 'high' | 'low' | 'unknown';
  implication: string;
}

export interface LabReportAnalysis {
  patientInfo?: {
    name?: string;
    age?: string;
    date?: string;
  };
  metrics?: LabMetric[];
  goodPoints: string[];
  negativePoints: string[];
  possibleDiseases: string[];
  possibleBodyChanges: string[];
  testSuggestions: string[];
  medicineSuggestions: string[];
  recommendedDoctorDepartment: string;
  summary: string;
}

export type AnalysisType = 'prescription' | 'lab_report';

export interface HistoryItem {
  id: string;
  userId: string;
  type: AnalysisType;
  createdAt: any;
  data: PrescriptionAnalysis | LabReportAnalysis;
}
