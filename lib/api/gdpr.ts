/**
 * API mockée pour la gestion des demandes de conformité RGPD (Droit à l'effacement Art. 17 / Anonymisation Art. 18)
 */

import gdprRequestsRaw from "@/lib/mock-data/gdpr-requests.json";

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

// État mémoire persistant en session
let gdprDatabase: GdprRequest[] = [...(gdprRequestsRaw as GdprRequest[])];

/**
 * Récupère l'ensemble des demandes RGPD avec un délai réseau simulé
 */
export async function getRequests(): Promise<GdprRequest[]> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return [...gdprDatabase];
}

/**
 * Crée une nouvelle demande de suppression ou d'anonymisation
 */
export async function createRequest(
  candidatId: string,
  candidatNom: string,
  type: GdprType
): Promise<GdprRequest> {
  await new Promise((resolve) => setTimeout(resolve, 350));

  const now = new Date();
  const dateFormatted = `${now.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })} à ${now.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  const newRequest: GdprRequest = {
    id: `gdpr-req-${Date.now().toString().slice(-4)}`,
    candidatId,
    candidatNom,
    type,
    dateCreation: dateFormatted,
    statut: "en_attente",
  };

  gdprDatabase = [newRequest, ...gdprDatabase];
  return newRequest;
}

/**
 * Exécute irréversiblement la demande RGPD.
 * Valide le mot de passe administrateur ("demo1234").
 */
export async function executeRequest(
  id: string,
  confirmationPassword: string
): Promise<GdprRapportTechnique> {
  // Simule un délai d'exécution de 1.5s
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const index = gdprDatabase.findIndex((r) => r.id === id);
  if (index === -1) {
    throw new Error("Demande introuvable.");
  }

  // Vérification du mot de passe administrateur
  if (confirmationPassword !== "demo1234") {
    // Si échec du mot de passe, on peut marquer la demande en échec
    gdprDatabase[index] = {
      ...gdprDatabase[index],
      statut: "echec",
      rapportTechnique: {
        relationsSupprimees: 0,
        vecteursSupprimes: 0,
        fichiersPelles: 0,
        hashAudit: "ERR_AUTH_ADMIN_REFUSED_HASH",
        horodatage: new Date().toISOString(),
        dpoResponsable: "Authentification Administrateur Échouée",
      },
    };
    throw new Error("Mot de passe administrateur incorrect.");
  }

  // Génération du rapport d'audit cryptographique
  const isSuppression = gdprDatabase[index].type === "suppression";
  const fakeRandomHash = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");

  const rapport: GdprRapportTechnique = {
    relationsSupprimees: isSuppression ? Math.floor(8 + Math.random() * 10) : 0,
    vecteursSupprimes: Math.floor(1 + Math.random() * 3),
    fichiersPelles: isSuppression ? 2 : 1,
    hashAudit: `sha256:${fakeRandomHash}`,
    horodatage: new Date().toISOString(),
    dpoResponsable: "DPO / Admin Système",
  };

  gdprDatabase[index] = {
    ...gdprDatabase[index],
    statut: "terminee",
    rapportTechnique: rapport,
  };

  return rapport;
}
