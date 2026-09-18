export type IngestionStatus = 'en_attente' | 'analyse_ocr' | 'vectorisation' | 'termine' | 'erreur';

export interface CVDocument {
  id: string;
  candidateId?: string;
  candidateName?: string;
  fileName: string;
  fileSize: string; // e.g. "2.4 Mo"
  uploadDate: string;
  status: IngestionStatus;
  progressPercent: number;
  extractedSkillsCount: number;
  vectorStoreStatus: 'Synchronisé' | 'En attente' | 'Échec';
  hashSha256: string;
  errorMessage?: string;
}
