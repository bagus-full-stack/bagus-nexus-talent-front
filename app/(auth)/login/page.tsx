"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Eye,
  EyeOff,
  Building2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { login as apiLogin } from "@/lib/api/auth";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'adresse email est requise")
    .email("Format d'adresse email invalide"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .min(7, "Le mot de passe doit contenir plus de 6 caractères"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const storeLogin = useAppStore((state) => state.login);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "recruteur@talentai.internal",
      password: "password123",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiLogin(data.email, data.password);

      if (response.success && response.user) {
        storeLogin(response.user.email, response.user.role);
        router.push("/search");
      } else {
        setErrorMessage(response.error || "Email ou mot de passe incorrect");
      }
    } catch {
      setErrorMessage("Une erreur inattendue est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSsoClick = () => {
    toast("SSO non configuré pour cette démo", {
      description: "Veuillez utiliser la connexion par email et mot de passe.",
    });
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#FAFAF9] dark:bg-[#18181B] text-foreground p-4 sm:p-6 transition-colors">
      {/* Barre supérieure discrète avec toggle de thème */}
      <header className="flex items-center justify-between w-full max-w-4xl mx-auto py-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-foreground">
            TalentAI
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Carte centrale d'authentification (~400px) */}
      <main className="w-full max-w-[400px] mx-auto my-auto py-6">
        <Card className="rounded-xl border border-border shadow-sm bg-card">
          <CardHeader className="text-center space-y-2 pb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto mb-1">
              <Sparkles className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              Connexion à TalentAI
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Plateforme interne de recherche et qualification de talents
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Champ Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@entreprise.com"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  className="h-10 text-sm rounded-lg"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Champ Mot de passe */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline transition-colors"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    className="h-10 pr-10 text-sm rounded-lg"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive font-medium">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Bouton Se connecter pleine largeur */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-10 font-medium text-sm rounded-lg gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>

            {/* Message d'erreur affiché sous le formulaire */}
            {errorMessage && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive font-medium animate-in fade-in-50"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Séparateur visuel */}
            <div className="relative flex items-center justify-center my-4">
              <div className="w-full border-t border-border" />
              <span className="absolute bg-card px-2 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                ou
              </span>
            </div>

            {/* Bouton SSO Entreprise */}
            <Button
              type="button"
              variant="outline"
              onClick={handleSsoClick}
              className="w-full h-10 text-xs font-medium rounded-lg gap-2 text-foreground"
            >
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Se connecter avec le SSO de l&apos;entreprise
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Pied de page */}
      <footer className="text-center py-4 text-xs text-muted-foreground">
        <p>TalentAI • Système interne de recrutement et gestion des compétences</p>
      </footer>
    </div>
  );
}
