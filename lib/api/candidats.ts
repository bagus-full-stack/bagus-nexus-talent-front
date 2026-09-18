import { Candidat } from '@/types/candidat';
import candidatsData from '@/lib/mock-data/candidats.json';

export interface ExtractedFilter {
  id: string;
  type: 'experience' | 'skill' | 'role' | 'availability' | 'location';
  label: string;
  value: string;
}

/**
 * Extrait des filtres factices simulés à partir de mots-clés simples détectés dans la requête
 */
export function extractFilters(query: string): ExtractedFilter[] {
  if (!query || !query.trim()) return [];

  const filters: ExtractedFilter[] = [];
  const normalized = query.toLowerCase();

  // Détection expérience : ex. "5 ans", "+5 ans", "≥ 3 ans"
  const expMatch = normalized.match(/(\+?\s*(\d+))\s*(?:ans|années|annees)/i);
  if (expMatch && expMatch[2]) {
    const years = expMatch[2];
    filters.push({
      id: `exp-${years}`,
      type: 'experience',
      label: `Expérience ≥ ${years} ans`,
      value: years,
    });
  }

  // Détection compétences courantes
  const commonSkills = [
    { key: 'react', label: 'React' },
    { key: 'next', label: 'Next.js' },
    { key: 'typescript', label: 'TypeScript' },
    { key: 'python', label: 'Python' },
    { key: 'node', label: 'Node.js' },
    { key: 'tailwind', label: 'Tailwind CSS' },
    { key: 'data scientist', label: 'Data Science' },
    { key: 'machine learning', label: 'Machine Learning' },
    { key: 'mlops', label: 'MLOps' },
    { key: 'nlp', label: 'NLP' },
    { key: 'sql', label: 'SQL' },
    { key: 'graphql', label: 'GraphQL' },
    { key: 'docker', label: 'Docker' },
  ];

  for (const skill of commonSkills) {
    if (normalized.includes(skill.key)) {
      filters.push({
        id: `skill-${skill.key}`,
        type: 'skill',
        label: skill.label,
        value: skill.label,
      });
    }
  }

  // Détection localisation
  const locations = [
    { key: 'paris', label: 'Paris' },
    { key: 'remote', label: 'Remote' },
    { key: 'télétravail', label: 'Remote' },
    { key: 'lyon', label: 'Lyon' },
    { key: 'bordeaux', label: 'Bordeaux' },
  ];

  for (const loc of locations) {
    if (normalized.includes(loc.key)) {
      if (!filters.some((f) => f.label === loc.label)) {
        filters.push({
          id: `loc-${loc.key}`,
          type: 'location',
          label: loc.label,
          value: loc.label,
        });
      }
    }
  }

  // Détection disponibilité
  if (normalized.includes('immédiat') || normalized.includes('immediate') || normalized.includes('dispo')) {
    filters.push({
      id: 'avail-immediate',
      type: 'availability',
      label: 'Dispo immédiate',
      value: 'immediate',
    });
  }

  return filters;
}

/**
 * Recherche des candidats avec simulation de délai (600ms),
 * filtrage et attribution d'un score de pertinence dynamique.
 */
export async function searchCandidats(query: string, activeFilters?: ExtractedFilter[]): Promise<Candidat[]> {
  // Simule exactement 600ms de délai
  await new Promise((resolve) => setTimeout(resolve, 600));

  const allCandidats = (candidatsData as Candidat[]).map((c) => ({
    ...c,
    nom: c.nom || c.name || '',
    name: c.nom || c.name || '',
    posteActuel: c.posteActuel || c.currentRole || '',
    currentRole: c.posteActuel || c.currentRole || '',
    entrepriseActuelle: c.entrepriseActuelle || c.company || '',
    company: c.entrepriseActuelle || c.company || '',
    anneesExperience: c.anneesExperience ?? c.experienceYears ?? 0,
    experienceYears: c.anneesExperience ?? c.experienceYears ?? 0,
    competences: c.competences || c.skills || [],
    skills: c.competences || c.skills || [],
    scorePertinence: c.scorePertinence ?? c.matchScore ?? 80,
    matchScore: c.scorePertinence ?? c.matchScore ?? 80,
    statutAnonymise: c.statutAnonymise ?? c.isAnonymized ?? false,
    isAnonymized: c.statutAnonymise ?? c.isAnonymized ?? false,
    justificationLLM: c.justificationLLM || c.aiRationale || '',
    aiRationale: c.justificationLLM || c.aiRationale || '',
  }));

  if (!query && (!activeFilters || activeFilters.length === 0)) {
    return allCandidats;
  }

  const queryTerms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

  let filtered = allCandidats.filter((candidat) => {
    // Si des filtres actifs sont spécifiés, vérifions-les
    if (activeFilters && activeFilters.length > 0) {
      for (const filter of activeFilters) {
        if (filter.type === 'experience') {
          const minExp = parseInt(filter.value, 10);
          if (candidat.anneesExperience < minExp) return false;
        }
        if (filter.type === 'skill') {
          const hasSkill = candidat.competences.some((s) =>
            s.toLowerCase().includes(filter.value.toLowerCase())
          );
          if (!hasSkill) return false;
        }
        if (filter.type === 'location') {
          const locMatch = (candidat.location || '').toLowerCase().includes(filter.value.toLowerCase());
          if (!locMatch) return false;
        }
        if (filter.type === 'availability') {
          if (filter.value === 'immediate' && !(candidat.availability || '').toLowerCase().includes('immédiate')) {
            return false;
          }
        }
      }
    }

    if (queryTerms.length === 0) return true;

    // Correspondance avec les termes de la requête
    const searchableText = [
      candidat.nom,
      candidat.posteActuel,
      candidat.entrepriseActuelle,
      ...candidat.competences,
      candidat.justificationLLM,
      candidat.location || '',
    ]
      .join(' ')
      .toLowerCase();

    return queryTerms.some((term) => searchableText.includes(term));
  });

  // Calcul d'un score de pertinence dynamique avec composante aléatoire réaliste
  filtered = filtered.map((candidat) => {
    let score = candidat.scorePertinence;
    // Si la recherche mentionne explicitement son poste ou compétence clé
    if (query) {
      const qLower = query.toLowerCase();
      if (candidat.competences.some((comp) => qLower.includes(comp.toLowerCase()))) {
        score = Math.min(99, score + 4);
      }
      if (qLower.includes(candidat.posteActuel.toLowerCase())) {
        score = Math.min(99, score + 5);
      }
    }
    // Variation fine aléatoire pour le réalisme
    const variance = Math.floor(Math.random() * 5) - 2;
    const finalScore = Math.max(30, Math.min(99, score + variance));

    return {
      ...candidat,
      scorePertinence: finalScore,
      matchScore: finalScore,
    };
  });

  // Tri par pertinence décroissante
  filtered.sort((a, b) => b.scorePertinence - a.scorePertinence);

  return filtered;
}

/**
 * Fonction de rétrocompatibilité pour les composants existants
 */
export async function fetchCandidats(query?: string): Promise<Candidat[]> {
  return searchCandidats(query || '');
}

export async function fetchCandidatById(id: string): Promise<Candidat | null> {
  const data = (candidatsData as Candidat[]).map((c) => ({
    ...c,
    nom: c.nom || c.name || '',
    name: c.nom || c.name || '',
    posteActuel: c.posteActuel || c.currentRole || '',
    currentRole: c.posteActuel || c.currentRole || '',
    entrepriseActuelle: c.entrepriseActuelle || c.company || '',
    company: c.entrepriseActuelle || c.company || '',
    anneesExperience: c.anneesExperience ?? c.experienceYears ?? 0,
    experienceYears: c.anneesExperience ?? c.experienceYears ?? 0,
    competences: c.competences || c.skills || [],
    skills: c.competences || c.skills || [],
    scorePertinence: c.scorePertinence ?? c.matchScore ?? 80,
    matchScore: c.scorePertinence ?? c.matchScore ?? 80,
    statutAnonymise: c.statutAnonymise ?? c.isAnonymized ?? false,
    isAnonymized: c.statutAnonymise ?? c.isAnonymized ?? false,
    justificationLLM: c.justificationLLM || c.aiRationale || '',
    aiRationale: c.justificationLLM || c.aiRationale || '',
  }));
  return data.find((c) => c.id === id) || null;
}
