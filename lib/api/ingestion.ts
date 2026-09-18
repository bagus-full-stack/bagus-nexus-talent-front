import initialCvs from "@/lib/mock-data/cvs.json";

export interface CvExtrait {
  nom: string;
  email: string;
  telephone: string;
  poste: string;
  experienceAnnees: number;
  competences: string;
  formation: string;
}

export interface CvItem {
  id: string;
  nomFichier: string;
  dateUpload: string;
  statut: "ok" | "a_valider" | "echec" | "en_cours";
  scoreConfiance: number;
  champsAVerifier: string[];
  taille?: string;
  motifEchec?: string;
  extrait: CvExtrait;
}

// Mémoire locale pour les mutations au cours de la session
let cvDatabase: CvItem[] = [...(initialCvs as CvItem[])];

/**
 * Récupère la liste complète des CVs avec délai réseau simulé
 */
export async function getCvs(): Promise<CvItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return [...cvDatabase];
}

/**
 * Simule l'upload d'un CV avec progression granulaire via onProgress
 */
export async function uploadCv(
  file: File,
  onProgress?: (percent: number) => void
): Promise<CvItem> {
  // Simulation de progression d'upload par étapes
  const steps = [15, 35, 60, 85, 100];
  for (const step of steps) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (onProgress) {
      onProgress(step);
    }
  }

  // Création du nouvel élément au statut intermédiaire "en_cours"
  const now = new Date();
  const dateFormatted = `${String(now.getDate()).padStart(2, "0")}/${String(
    now.getMonth() + 1
  ).padStart(2, "0")}/${now.getFullYear()} à ${String(now.getHours()).padStart(
    2,
    "0"
  )}:${String(now.getMinutes()).padStart(2, "0")}`;

  const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

  const newCv: CvItem = {
    id: `cv-${Date.now()}`,
    nomFichier: file.name,
    dateUpload: dateFormatted,
    statut: "en_cours",
    scoreConfiance: 88,
    champsAVerifier: ["experienceAnnees"],
    taille: `${(file.size / (1024 * 1024)).toFixed(1)} Mo`,
    extrait: {
      nom: cleanName || "Nouveau Candidat",
      email: "candidat.extrait@domaine.fr",
      telephone: "+33 6 00 00 00 00",
      poste: "Candidat extrait par pipeline IA",
      experienceAnnees: 3,
      competences: "Extraction en cours...",
      formation: "Diplôme en cours d'analyse",
    },
  };

  // Ajout au début de la base
  cvDatabase = [newCv, ...cvDatabase];
  return newCv;
}

/**
 * Valide ou corrige un CV en attente de vérification
 */
export async function validateCv(
  id: string,
  correctedFields: Partial<CvExtrait>,
  action: "valider" | "rejeter" = "valider"
): Promise<CvItem> {
  await new Promise((resolve) => setTimeout(resolve, 350));

  const index = cvDatabase.findIndex((c) => c.id === id);
  if (index === -1) {
    throw new Error(`CV avec l'identifiant ${id} introuvable.`);
  }

  const current = cvDatabase[index];
  const updated: CvItem = {
    ...current,
    statut: action === "valider" ? "ok" : "echec",
    scoreConfiance: action === "valider" ? Math.max(90, current.scoreConfiance) : 0,
    champsAVerifier: action === "valider" ? [] : current.champsAVerifier,
    motifEchec: action === "rejeter" ? "Rejeté manuellement lors de la revue RH" : undefined,
    extrait: {
      ...current.extrait,
      ...correctedFields,
    },
  };

  cvDatabase[index] = updated;
  return updated;
}
