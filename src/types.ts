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
