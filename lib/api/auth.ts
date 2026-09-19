import { apiFetch, setTokens, clearTokens, toFrontendRole, ApiError } from "@/lib/api/client";
import { User } from "@/types/user";

interface BackendUser {
  id: string;
  nom: string;
  email: string;
  role: string;
}

interface LoginApiResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: BackendUser;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  error?: string;
}

function toUser(u: BackendUser): User {
  return {
    id: u.id,
    name: u.nom,
    email: u.email,
    role: toFrontendRole(u.role),
    avatar: u.nom.charAt(0).toUpperCase(),
    status: "actif",
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    const data = await apiFetch<LoginApiResponse>("/api/v1/auth/login", {
      method: "POST",
      skipAuth: true,
      body: JSON.stringify({ email, password }),
    });
    setTokens(data.access_token, data.refresh_token);
    return { success: true, user: toUser(data.user) };
  } catch (err) {
    return {
      success: false,
      error: err instanceof ApiError ? err.message : "Impossible de contacter le serveur",
    };
  }
}

export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  await apiFetch("/api/v1/auth/forgot-password", {
    method: "POST",
    skipAuth: true,
    body: JSON.stringify({ email }),
  });
  return {
    success: true,
    message: "Si un compte existe avec cet email, un lien a été envoyé.",
  };
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const data = await apiFetch<BackendUser>("/api/v1/auth/me");
    return toUser(data);
  } catch {
    return null;
  }
}

export function logoutClient(): void {
  clearTokens();
}
