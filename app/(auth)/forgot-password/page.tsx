"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { Sparkles, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { requestPasswordReset } from "@/lib/api/auth";
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

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "L'adresse email est requise")
    .email("Format d'adresse email invalide"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await requestPasswordReset(data.email);
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#FAFAF9] dark:bg-[#18181B] text-foreground p-4 sm:p-6 transition-colors">
      {/* Barre supérieure discrète */}
      <header className="flex items-center justify-between w-full max-w-4xl mx-auto py-2">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la connexion
        </Link>
        <ThemeToggle />
      </header>

      {/* Carte centrale (~400px) */}
      <main className="w-full max-w-[400px] mx-auto my-auto py-6">
        <Card className="rounded-xl border border-border shadow-sm bg-card">
          <CardHeader className="text-center space-y-2 pb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto mb-1">
              <Sparkles className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              Mot de passe oublié
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Réinitialisez votre accès à l&apos;application interne TalentAI
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {isSubmitted ? (
              <div className="space-y-4 text-center py-2 animate-in fade-in-50">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-sm font-semibold text-foreground">
                    Demande enregistrée
                  </h2>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Si un compte existe avec cet email, un lien a été envoyé.
                  </p>
                </div>
                <div className="pt-2">
                  <Button asChild className="w-full h-10 rounded-lg text-sm">
                    <Link href="/login">Retour à la page de connexion</Link>
                  </Button>
                </div>
              </div>
            ) : (
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

                {/* Bouton Envoyer le lien de réinitialisation */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-10 font-medium text-sm rounded-lg gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    "Envoyer le lien de réinitialisation"
                  )}
                </Button>

                {/* Lien retour vers /login */}
                <div className="text-center pt-2">
                  <Link
                    href="/login"
                    className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                  >
                    Retour à la connexion
                  </Link>
                </div>
              </form>
            )}
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
