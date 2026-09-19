import { apiFetch } from "@/lib/api/client";
import { Candidat, ExperiencePro, FormationDiplome } from "@/types/candidat";

export interface ExtractedFilter {
  id: string;
  type: "experience" | "skill" | "role" | "availability" | "location";
  label: string;
  value: string;
}

/**
 * Extrait des filtres décoratifs affichés en chips sous la barre de recherche.
 * Purement client-side : le backend fait sa propre extraction de filtres
 * (voir SearchResponse.filtres_extraits) à partir du texte de la requête.
 */
export function extractFilters(query: string): ExtractedFilter[] {
  if (!query || !query.trim()) return [];

  const filters: ExtractedFilter[] = [];
  const normalized = query.toLowerCase();

  const expMatch = normalized.match(/(\+?\s*(\d+))\s*(?:ans|années|annees)/i);
  if (expMatch && expMatch[2]) {
    const years = expMatch[2];
    filters.push({
      id: `exp-${years}`,
      type: "experience",
      label: `Expérience ≥ ${years} ans`,
      value: years,
    });
  }

  const commonSkills = [
    { key: "react", label: "React" },
    { key: "next", label: "Next.js" },
    { key: "typescript", label: "TypeScript" },
    { key: "python", label: "Python" },
    { key: "node", label: "Node.js" },
    { key: "tailwind", label: "Tailwind CSS" },
    { key: "data scientist", label: "Data Science" },
    { key: "machine learning", label: "Machine Learning" },
    { key: "mlops", label: "MLOps" },
    { key: "nlp", label: "NLP" },
    { key: "sql", label: "SQL" },
    { key: "graphql", label: "GraphQL" },
    { key: "docker", label: "Docker" },
  ];

  for (const skill of commonSkills) {
    if (normalized.includes(skill.key)) {
      filters.push({
        id: `skill-${skill.key}`,
        type: "skill",
        label: skill.label,
        value: skill.label,
      });
    }
  }

  const locations = [
    { key: "paris", label: "Paris" },
    { key: "remote", label: "Remote" },
    { key: "télétravail", label: "Remote" },
    { key: "lyon", label: "Lyon" },
    { key: "bordeaux", label: "Bordeaux" },
  ];

  for (const loc of locations) {
    if (normalized.includes(loc.key)) {
      if (!filters.some((f) => f.label === loc.label)) {
        filters.push({
          id: `loc-${loc.key}`,
          type: "location",
          label: loc.label,
          value: loc.label,
        });
      }
    }
  }

  if (normalized.includes("immédiat") || normalized.includes("immediate") || normalized.includes("dispo")) {
    filters.push({
      id: "avail-immediate",
      type: "availability",
      label: "Dispo immédiate",
      value: "immediate",
    });
  }

  return filters;
}

interface BackendCompetence {
  nom: string;
}

interface BackendDiplome {
  intitule: string;
  etablissement: string | null;
  annee_obtention: number | null;
}

interface BackendExperience {
  poste: string;
  entreprise: string | null;
  date_debut: string;
  date_fin: string | null;
  description: string | null;
}

interface CandidatDetailResponse {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  localisation: string | null;
  competences: BackendCompetence[];
  diplomes: BackendDiplome[];
  experiences: BackendExperience[];
  annees_experience_cumulees: number | null;
  statut_qualite: string;
}

interface CandidatRecommande {
  candidat_id: string;
  justification: string;
  elements_cites: string[];
  score: number | null;
}

interface SearchResponse {
  filtres_extraits: unknown;
  candidats: CandidatRecommande[];
  synthese: string;
}

function formatPeriode(exp: BackendExperience): string {
  const start = exp.date_debut?.slice(0, 4) ?? "";
  const end = exp.date_fin ? exp.date_fin.slice(0, 4) : "Présent";
  return `${start} - ${end}`;
}

// score n'est pas garanti normalisé par le backend (contrairement à
// Competence.confiance qui est explicitement 0-1) : on accepte les deux formats.
function normalizeScore(score: number | null): number {
  if (score == null) return 0;
  return Math.round(score <= 1 ? score * 100 : score);
}

function toCandidat(detail: CandidatDetailResponse, reco: CandidatRecommande): Candidat {
  const nom = detail.nom
    ? `${detail.prenom ?? ""} ${detail.nom}`.trim()
    : detail.nom ?? "";
  const competences = detail.competences.map((c) => c.nom);
  const anonymise = detail.email === null && detail.nom !== null;
  const posteActuel = detail.experiences[0]?.poste ?? "";
  const entrepriseActuelle = detail.experiences[0]?.entreprise ?? "";
  const scorePertinence = normalizeScore(reco.score);

  return {
    id: detail.id,
    nom,
    name: nom,
    posteActuel,
    currentRole: posteActuel,
    entrepriseActuelle,
    company: entrepriseActuelle,
    anneesExperience: detail.annees_experience_cumulees ?? 0,
    experienceYears: detail.annees_experience_cumulees ?? 0,
    competences,
    skills: competences,
    scorePertinence,
    matchScore: scorePertinence,
    statutAnonymise: anonymise,
    isAnonymized: anonymise,
    justificationLLM: reco.justification,
    aiRationale: reco.justification,
    location: detail.localisation ?? undefined,
    experiences: detail.experiences.map(
      (e): ExperiencePro => ({
        poste: e.poste,
        entreprise: e.entreprise ?? "",
        periode: formatPeriode(e),
        description: e.description ?? undefined,
      })
    ),
    diplomes: detail.diplomes.map(
      (d): FormationDiplome => ({
        diplome: d.intitule,
        etablissement: d.etablissement ?? "",
        annee: d.annee_obtention ? String(d.annee_obtention) : "",
      })
    ),
    qualiteDonnees: detail.statut_qualite === "ok" ? "verifiee" : "a_valider",
  };
}

/**
 * Lance une recherche sémantique puis récupère le profil complet de chaque
 * candidat recommandé (le endpoint /search ne renvoie que id + justification + score).
 * activeFilters n'est pas envoyé au backend : celui-ci fait sa propre extraction
 * de filtres à partir du texte de la requête (SearchResponse.filtres_extraits).
 */
export async function searchCandidats(query: string, _activeFilters?: ExtractedFilter[]): Promise<Candidat[]> {
  if (!query.trim()) return [];

  const searchRes = await apiFetch<SearchResponse>("/api/v1/candidats/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });

  const details = await Promise.all(
    searchRes.candidats.map((reco) =>
      apiFetch<CandidatDetailResponse>(`/api/v1/candidats/${reco.candidat_id}`).catch(() => null)
    )
  );

  return searchRes.candidats
    .map((reco, i) => (details[i] ? toCandidat(details[i]!, reco) : null))
    .filter((c): c is Candidat => c !== null);
}

/** Fonction de rétrocompatibilité pour les composants existants */
export async function fetchCandidats(query?: string): Promise<Candidat[]> {
  return searchCandidats(query || "");
}

export async function fetchCandidatById(id: string): Promise<Candidat | null> {
  try {
    const detail = await apiFetch<CandidatDetailResponse>(`/api/v1/candidats/${id}`);
    return toCandidat(detail, { candidat_id: id, justification: "", elements_cites: [], score: null });
  } catch {
    return null;
  }
}
