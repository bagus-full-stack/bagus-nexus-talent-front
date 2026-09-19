import { apiFetch, uploadWithProgress } from "@/lib/api/client";

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

const STATUT_MAP: Record<string, CvItem["statut"]> = {
  en_cours: "en_cours",
  ok: "ok",
  a_valider: "a_valider",
  echec_parsing: "echec",
  rejete: "echec",
};

interface BackendCompetence {
  nom: string;
  niveau?: string | null;
  confiance: number;
}

interface BackendDiplome {
  intitule: string;
  etablissement?: string | null;
  annee_obtention?: number | null;
  confiance: number;
}

interface BackendExperience {
  poste: string;
  entreprise?: string | null;
  date_debut: string;
  date_fin?: string | null;
  description?: string | null;
  confiance: number;
}

interface BackendCandidatCV {
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
  localisation?: string | null;
  langue_detectee?: string | null;
  disponible_a_partir_de?: string | null;
  competences: BackendCompetence[];
  diplomes: BackendDiplome[];
  experiences: BackendExperience[];
  source_confiance: Record<string, number>;
  statut_qualite: "ok" | "a_valider" | "echec_parsing";
  champs_a_verifier: string[];
}

interface CVListItem {
  id: string;
  nom_fichier: string;
  date_upload: string;
  statut: string;
  score_confiance_global: number | null;
}

interface CVDetailResponse extends CVListItem {
  donnees_json: BackendCandidatCV | null;
  champs_a_verifier: string[] | null;
}

interface PaginatedCVs {
  items: CVListItem[];
  page: number;
  limit: number;
  total: number;
}

interface CVUploadResponse {
  id: string;
  statut: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} à ${String(
    d.getHours()
  ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// score_confiance_global n'est pas garanti normalisé par le backend : on accepte 0-1 ou 0-100.
function normalizeScore(score: number | null): number {
  if (score == null) return 0;
  return Math.round(score <= 1 ? score * 100 : score);
}

function toCvItemFromList(item: CVListItem): CvItem {
  return {
    id: item.id,
    nomFichier: item.nom_fichier,
    dateUpload: formatDate(item.date_upload),
    statut: STATUT_MAP[item.statut] ?? "en_cours",
    scoreConfiance: normalizeScore(item.score_confiance_global),
    // La liste paginée ne renvoie pas donnees_json / champs_a_verifier -
    // seul getCvDetail() (GET /ingestion/{id}) les fournit.
    champsAVerifier: [],
    extrait: { nom: "", email: "", telephone: "", poste: "", experienceAnnees: 0, competences: "", formation: "" },
  };
}

function experienceAnneesFromExperiences(experiences: BackendExperience[]): number {
  return experiences.reduce((sum, e) => {
    const start = new Date(e.date_debut).getFullYear();
    const end = e.date_fin ? new Date(e.date_fin).getFullYear() : new Date().getFullYear();
    return sum + Math.max(0, end - start);
  }, 0);
}

function toCvItemFromDetail(detail: CVDetailResponse): CvItem {
  const d = detail.donnees_json;
  return {
    id: detail.id,
    nomFichier: detail.nom_fichier,
    dateUpload: formatDate(detail.date_upload),
    statut: STATUT_MAP[detail.statut] ?? "en_cours",
    scoreConfiance: normalizeScore(detail.score_confiance_global),
    champsAVerifier: detail.champs_a_verifier ?? [],
    extrait: {
      nom: [d?.prenom, d?.nom].filter(Boolean).join(" "),
      email: d?.email ?? "",
      telephone: d?.telephone ?? "",
      poste: d?.experiences?.[0]?.poste ?? "",
      experienceAnnees: d?.experiences ? experienceAnneesFromExperiences(d.experiences) : 0,
      competences: (d?.competences ?? []).map((c) => c.nom).join(", "),
      formation: d?.diplomes?.[0]?.intitule ?? "",
    },
  };
}

/** Récupère la liste des CVs. ponytail: une seule page de 200, pas de
 * pagination serveur branchée - la page d'ingestion filtre/trie déjà côté client. */
export async function getCvs(): Promise<CvItem[]> {
  const res = await apiFetch<PaginatedCVs>("/api/v1/ingestion/?page=1&limit=200");
  return res.items.map(toCvItemFromList);
}

/** Récupère les données extraites complètes d'un CV (absentes de la liste paginée). */
export async function getCvDetail(id: string): Promise<CvItem> {
  const detail = await apiFetch<CVDetailResponse>(`/api/v1/ingestion/${id}`);
  return toCvItemFromDetail(detail);
}

export async function uploadCv(file: File, onProgress?: (percent: number) => void): Promise<CvItem> {
  const formData = new FormData();
  formData.append("files", file);
  const [result] = await uploadWithProgress<CVUploadResponse[]>("/api/v1/ingestion/upload", formData, onProgress);

  return {
    id: result.id,
    nomFichier: file.name,
    dateUpload: formatDate(new Date().toISOString()),
    statut: STATUT_MAP[result.statut] ?? "en_cours",
    scoreConfiance: 0,
    champsAVerifier: [],
    taille: `${(file.size / (1024 * 1024)).toFixed(1)} Mo`,
    extrait: { nom: file.name.replace(/\.[^/.]+$/, ""), email: "", telephone: "", poste: "", experienceAnnees: 0, competences: "", formation: "" },
  };
}

/**
 * Valide ou rejette un CV. Le formulaire de correction du frontend est plat
 * (CvExtrait) alors que le backend attend le schéma CandidatCV complet (imbriqué) -
 * on part des données déjà extraites et on n'écrase que les champs corrigés.
 */
export async function validateCv(
  id: string,
  correctedFields: Partial<CvExtrait>,
  action: "valider" | "rejeter" = "valider"
): Promise<CvItem> {
  if (action === "rejeter") {
    await apiFetch(`/api/v1/ingestion/${id}/reject`, { method: "DELETE" });
    const detail = await getCvDetail(id);
    return { ...detail, statut: "echec", motifEchec: "Rejeté manuellement lors de la revue RH" };
  }

  const current = await apiFetch<CVDetailResponse>(`/api/v1/ingestion/${id}`);
  const d = current.donnees_json;

  const experiences: BackendExperience[] = correctedFields.poste
    ? [
        {
          ...(d?.experiences?.[0] ?? { date_debut: new Date().toISOString().slice(0, 10), confiance: 1 }),
          poste: correctedFields.poste,
        },
        ...(d?.experiences?.slice(1) ?? []),
      ]
    : d?.experiences ?? [];

  const donnees: BackendCandidatCV = {
    ...d,
    nom: correctedFields.nom || d?.nom || null,
    email: correctedFields.email || d?.email || null,
    telephone: correctedFields.telephone || d?.telephone || null,
    competences: correctedFields.competences
      ? correctedFields.competences
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((nom) => ({ nom, niveau: null, confiance: 1 }))
      : d?.competences ?? [],
    experiences,
    diplomes: d?.diplomes ?? [],
    source_confiance: d?.source_confiance ?? {},
    statut_qualite: "ok",
    champs_a_verifier: [],
  };

  const updated = await apiFetch<CVDetailResponse>(`/api/v1/ingestion/${id}/validate`, {
    method: "PATCH",
    body: JSON.stringify({ donnees }),
  });
  return toCvItemFromDetail(updated);
}
