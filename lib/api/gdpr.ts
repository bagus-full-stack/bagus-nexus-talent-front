import { apiFetch, ApiError } from "@/lib/api/client";

export type GdprType = "suppression" | "anonymisation";
export type GdprStatut = "en_attente" | "en_cours" | "terminee" | "echec";

export interface GdprRapportTechnique {
  relationsSupprimees: number;
  vecteursSupprimes: number;
  fichiersPelles: number;
  hashAudit: string;
  horodatage: string;
  dpoResponsable: string;
}

export interface GdprRequest {
  id: string;
  candidatId: string;
  candidatNom: string;
  type: GdprType;
  dateCreation: string;
  statut: GdprStatut;
  rapportTechnique?: GdprRapportTechnique;
}

interface BackendGdprRequest {
  id: string;
  candidat_id: string;
  type: GdprType;
  statut: GdprStatut;
  date_creation: string;
  date_execution: string | null;
  resultat_json: { relations_supprimees?: number; vecteurs_supprimes?: number; hash_audit?: string } | null;
  demande_par: string;
}

interface PaginatedGDPRRequests {
  items: BackendGdprRequest[];
  page: number;
  limit: number;
  total: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function toRapport(req: BackendGdprRequest): GdprRapportTechnique | undefined {
  if (!req.resultat_json || req.statut !== "terminee") return undefined;
  return {
    relationsSupprimees: req.resultat_json.relations_supprimees ?? 0,
    vecteursSupprimes: req.resultat_json.vecteurs_supprimes ?? 0,
    // Non fourni par le backend (gdpr_service ne détruit pas de fichiers séparés du graphe/vectoriel).
    fichiersPelles: 0,
    hashAudit: req.resultat_json.hash_audit ?? "",
    horodatage: req.date_execution ?? "",
    dpoResponsable: req.demande_par,
  };
}

// Le backend ne renvoie que candidat_id, pas le nom du candidat - un fetch par
// requête est nécessaire pour l'afficher dans le registre (petit volume attendu).
async function resolveCandidatNom(candidatId: string): Promise<string> {
  try {
    const detail = await apiFetch<{ nom: string | null; prenom: string | null }>(`/api/v1/candidats/${candidatId}`);
    const nom = [detail.prenom, detail.nom].filter(Boolean).join(" ");
    return nom || `Candidat #${candidatId.slice(0, 8)}`;
  } catch {
    return `Candidat #${candidatId.slice(0, 8)}`;
  }
}

async function toGdprRequest(req: BackendGdprRequest): Promise<GdprRequest> {
  return {
    id: req.id,
    candidatId: req.candidat_id,
    candidatNom: await resolveCandidatNom(req.candidat_id),
    type: req.type,
    dateCreation: formatDate(req.date_creation),
    statut: req.statut,
    rapportTechnique: toRapport(req),
  };
}

export async function getRequests(): Promise<GdprRequest[]> {
  const res = await apiFetch<PaginatedGDPRRequests>("/api/v1/gdpr/?page=1&limit=200");
  return Promise.all(res.items.map(toGdprRequest));
}

export async function createRequest(candidatId: string, candidatNom: string, type: GdprType): Promise<GdprRequest> {
  const req = await apiFetch<BackendGdprRequest>("/api/v1/gdpr/", {
    method: "POST",
    body: JSON.stringify({ candidat_id: candidatId, type }),
  });
  return {
    id: req.id,
    candidatId: req.candidat_id,
    candidatNom,
    type: req.type,
    dateCreation: formatDate(req.date_creation),
    statut: req.statut,
  };
}

export async function executeRequest(id: string, confirmationPassword: string): Promise<GdprRapportTechnique> {
  try {
    const req = await apiFetch<BackendGdprRequest>(`/api/v1/gdpr/${id}/execute`, {
      method: "POST",
      body: JSON.stringify({ password: confirmationPassword }),
    });
    const rapport = toRapport(req);
    if (!rapport) throw new Error("Exécution incomplète : rapport indisponible.");
    return rapport;
  } catch (err) {
    throw new Error(err instanceof ApiError ? err.message : "Mot de passe administrateur incorrect.");
  }
}
