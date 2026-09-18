import { UserRole } from "@/types/user";

export interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    avatar: string;
  };
  error?: string;
}

/**
 * Fonction mockée de connexion simulant une authentification API.
 * Simule un délai de 500ms.
 * Succès si l'email contient "@" et le mot de passe fait plus de 6 caractères.
 */
export async function login(email: string, password: string): Promise<LoginResponse> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const isValidEmail = Boolean(email && email.includes('@'));
  const isValidPassword = Boolean(password && password.length > 6);

  if (isValidEmail && isValidPassword) {
    const username = email.split('@')[0];
    const formattedName =
      username.charAt(0).toUpperCase() + username.slice(1).replace(/[._-]/g, ' ');

    return {
      success: true,
      user: {
        id: `usr-${Date.now().toString().slice(-4)}`,
        name: formattedName || 'Alexandre V.',
        email,
        role: 'admin',
        avatar: (email[0] || 'U').toUpperCase(),
      },
    };
  }

  return {
    success: false,
    error: 'Email ou mot de passe incorrect',
  };
}

/**
 * Fonction mockée de réinitialisation de mot de passe.
 * Simule un délai de 500ms.
 */
export async function requestPasswordReset(_email: string): Promise<{ success: boolean; message: string }> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return {
    success: true,
    message: 'Si un compte existe avec cet email, un lien a été envoyé.',
  };
}
