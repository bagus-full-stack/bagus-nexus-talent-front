/**
 * API mockée pour la gestion des utilisateurs et collaborateurs
 */

import usersRaw from "@/lib/mock-data/users.json";

export type MockUserRole = "recruteur" | "rh_interne" | "admin";
export type MockUserStatut = "actif" | "invitation_en_attente";

export interface MockCollaborateur {
  id: string;
  nom: string;
  email: string;
  role: MockUserRole;
  statut: MockUserStatut;
  dateAjout: string;
}

// État mémoire en session
let usersDatabase: MockCollaborateur[] = [...(usersRaw as MockCollaborateur[])];

export async function getUsers(): Promise<MockCollaborateur[]> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  return [...usersDatabase];
}

// Alias de rétrocompatibilité
export const fetchUsers = async () => {
  const users = await getUsers();
  return users.map((u) => ({
    id: u.id,
    name: u.nom,
    email: u.email,
    role: u.role === "rh_interne" ? "rh" : u.role,
    status: u.statut === "actif" ? "actif" : "en_attente",
    createdAt: u.dateAjout,
  }));
};

export async function inviteUser(
  email: string,
  role: MockUserRole
): Promise<MockCollaborateur> {
  await new Promise((resolve) => setTimeout(resolve, 600));

  const emailNormalized = email.trim().toLowerCase();
  const exists = usersDatabase.some(
    (u) => u.email.toLowerCase() === emailNormalized
  );

  if (exists) {
    throw new Error("Cet email est déjà associé à un compte ou à une invitation.");
  }

  const generatedName = emailNormalized
    .split("@")[0]
    .split(/[._-]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");

  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const newUser: MockCollaborateur = {
    id: `usr-${Date.now().toString().slice(-4)}`,
    nom: generatedName || "Nouveau Collaborateur",
    email: emailNormalized,
    role,
    statut: "invitation_en_attente",
    dateAjout: dateStr,
  };

  usersDatabase = [newUser, ...usersDatabase];
  return newUser;
}

export async function updateUserRole(
  id: string,
  newRole: MockUserRole
): Promise<MockCollaborateur> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const index = usersDatabase.findIndex((u) => u.id === id);
  if (index === -1) {
    throw new Error("Utilisateur non trouvé");
  }

  usersDatabase[index] = {
    ...usersDatabase[index],
    role: newRole,
  };

  return usersDatabase[index];
}

export async function revokeUser(id: string): Promise<{ success: boolean }> {
  await new Promise((resolve) => setTimeout(resolve, 350));
  usersDatabase = usersDatabase.filter((u) => u.id !== id);
  return { success: true };
}
