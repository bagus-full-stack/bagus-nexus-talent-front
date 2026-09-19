import { apiFetch } from "@/lib/api/client";

export type CollaborateurRole = "recruteur" | "rh_interne" | "admin";
export type CollaborateurStatut = "actif" | "invitation_en_attente";

export interface Collaborateur {
  id: string;
  nom: string;
  email: string;
  role: CollaborateurRole;
  statut: CollaborateurStatut;
  dateAjout: string;
}

interface BackendUser {
  id: string;
  nom: string;
  email: string;
  role: CollaborateurRole;
  statut: CollaborateurStatut | "revoque";
  date_creation: string;
}

interface PaginatedUsers {
  items: BackendUser[];
  page: number;
  limit: number;
  total: number;
}

function toCollaborateur(u: BackendUser): Collaborateur {
  return {
    id: u.id,
    nom: u.nom,
    email: u.email,
    role: u.role,
    // "revoque" n'existe pas côté UI (les révoqués sont retirés de la liste
    // localement après DELETE) - fallback défensif si l'API en renvoie un malgré tout.
    statut: u.statut === "revoque" ? "actif" : u.statut,
    dateAjout: new Date(u.date_creation).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }),
  };
}

export async function getUsers(): Promise<Collaborateur[]> {
  const res = await apiFetch<PaginatedUsers>("/api/v1/users/?page=1&limit=200");
  return res.items.filter((u) => u.statut !== "revoque").map(toCollaborateur);
}

export async function inviteUser(email: string, role: CollaborateurRole): Promise<Collaborateur> {
  const user = await apiFetch<BackendUser>("/api/v1/users/invite", {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
  return toCollaborateur(user);
}

export async function updateUserRole(id: string, newRole: CollaborateurRole): Promise<Collaborateur> {
  const user = await apiFetch<BackendUser>(`/api/v1/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role: newRole }),
  });
  return toCollaborateur(user);
}

export async function revokeUser(id: string): Promise<{ success: boolean }> {
  await apiFetch(`/api/v1/users/${id}`, { method: "DELETE" });
  return { success: true };
}
