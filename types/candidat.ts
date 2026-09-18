export interface Competence {
  name: string;
  level?: 'Debutant' | 'Intermédiaire' | 'Avancé' | 'Expert';
  category?: 'Langage' | 'Framework' | 'Cloud' | 'Méthodologie';
  inferredConfidence?: number;
}

export interface ExperiencePro {
  id?: string;
  poste: string;
  entreprise: string;
  periode: string;
  description?: string;
  competences?: string[];
}

export interface FormationDiplome {
  id?: string;
  diplome: string;
  etablissement: string;
  annee: string;
}

export interface Candidat {
  id: string;
  nom: string;
  name?: string; // rétro-compatibilité
  posteActuel: string;
  currentRole?: string; // rétro-compatibilité
  entrepriseActuelle: string;
  company?: string; // rétro-compatibilité
  anneesExperience: number;
  experienceYears?: number; // rétro-compatibilité
  competences: string[];
  competencesDetails?: Competence[];
  skills?: string[]; // rétro-compatibilité
  scorePertinence: number;
  matchScore?: number; // rétro-compatibilité
  statutAnonymise: boolean;
  isAnonymized?: boolean; // rétro-compatibilité
  justificationLLM: string;
  aiRationale?: string; // rétro-compatibilité
  location?: string;
  availability?: string;
  salaryExpectation?: string;
  codeId?: string;
  source?: string;
  ingestionDate?: string;
  shortlisted?: boolean;
  experiences?: ExperiencePro[];
  diplomes?: FormationDiplome[];
  qualiteDonnees?: 'verifiee' | 'a_valider';
}
