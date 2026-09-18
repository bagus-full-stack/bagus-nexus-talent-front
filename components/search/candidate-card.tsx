"use client";

import React from "react";
import { Candidat } from "@/types/candidat";
import { ScoreBadge } from "@/components/shared/score-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Clock, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CandidateCardProps {
  candidat: Candidat;
  isSelected?: boolean;
  onSelect: (candidat: Candidat) => void;
  onOpenDetails: (candidat: Candidat) => void;
}

/**
 * Fonction de hachage simple pour obtenir une couleur déterministe basée sur le nom
 */
export function getAvatarColor(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const palettes = [
    { bg: "bg-blue-100 dark:bg-blue-950/70", text: "text-blue-700 dark:text-blue-300" },
    { bg: "bg-emerald-100 dark:bg-emerald-950/70", text: "text-emerald-700 dark:text-emerald-300" },
    { bg: "bg-violet-100 dark:bg-violet-950/70", text: "text-violet-700 dark:text-violet-300" },
    { bg: "bg-amber-100 dark:bg-amber-950/70", text: "text-amber-700 dark:text-amber-300" },
    { bg: "bg-rose-100 dark:bg-rose-950/70", text: "text-rose-700 dark:text-rose-300" },
    { bg: "bg-teal-100 dark:bg-teal-950/70", text: "text-teal-700 dark:text-teal-300" },
    { bg: "bg-indigo-100 dark:bg-indigo-950/70", text: "text-indigo-700 dark:text-indigo-300" },
  ];

  const index = Math.abs(hash) % palettes.length;
  return palettes[index];
}

/**
 * Génère les initiales ou le code d'anonymat
 */
export function getInitials(name: string, isAnonymized: boolean, id: string): string {
  if (isAnonymized) {
    const code = id.replace(/[^0-9]/g, "");
    return `#${code.slice(-2) || "A"}`;
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "C";
}

export function CandidateCard({
  candidat,
  isSelected = false,
  onSelect,
  onOpenDetails,
}: CandidateCardProps) {
  const isAnonymized = Boolean(candidat.statutAnonymise || candidat.isAnonymized);
  const displayName = isAnonymized
    ? `Candidat #${candidat.id.replace(/[^0-9]/g, "") || candidat.id}`
    : candidat.nom || candidat.name || "Candidat";

  const poste = candidat.posteActuel || candidat.currentRole || "Professionnel";
  const entreprise = candidat.entrepriseActuelle || candidat.company || "Confidentiel";
  const exp = candidat.anneesExperience ?? candidat.experienceYears ?? 0;
  const score = candidat.scorePertinence ?? candidat.matchScore ?? 0;
  const skills = candidat.competences || candidat.skills || [];

  const initiales = getInitials(candidat.nom || candidat.name || "", isAnonymized, candidat.id);
  const avatarColors = getAvatarColor(candidat.nom || candidat.name || candidat.id);

  // 4 premiers badges de compétences + badge "+N" si plus
  const visibleSkills = skills.slice(0, 4);
  const remainingCount = skills.length - 4;

  const handleClick = (e: React.MouseEvent) => {
    // Si l'utilisateur clique sur la carte principale
    onSelect(candidat);
    onOpenDetails(candidat);
  };

  return (
    <Card
      onClick={handleClick}
      className={cn(
        "cursor-pointer rounded-xl border transition-all duration-200 bg-card hover:shadow-md",
        isSelected
          ? "border-primary/80 ring-2 ring-primary/20 bg-primary/[0.02]"
          : "border-border hover:border-primary/40"
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          {/* Avatar & Identité */}
          <div className="flex items-start gap-3.5 min-w-0">
            {/* Avatar avec initiales et couleur déterministe */}
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-sm select-none border border-border/50",
                avatarColors.bg,
                avatarColors.text
              )}
            >
              {initiales}
            </div>

            <div className="space-y-1 min-w-0">
              {/* Nom du candidat (ou Candidat #ID si anonymisé) */}
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-foreground truncate">
                  {displayName}
                </h3>
                {isAnonymized && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                    Anonymisé
                  </span>
                )}
              </div>

              {/* Poste + Entreprise */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground flex items-center gap-1 truncate">
                  <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {poste}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 truncate">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {entreprise}
                </span>
              </div>

              {/* Nombre d'années d'expérience */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{exp} {exp > 1 ? "ans" : "an"} d&apos;expérience</span>
              </div>
            </div>
          </div>

          {/* ScoreBadge affichant scorePertinence */}
          <div className="shrink-0">
            <ScoreBadge value={score} size="md" showLabel />
          </div>
        </div>

        {/* 4 premiers badges de compétences + badge "+N" */}
        <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center gap-1.5">
          {visibleSkills.map((skill) => (
            <Badge
              key={skill}
              variant="secondary"
              className="text-[11px] font-medium px-2 py-0.5 rounded-md"
            >
              {skill}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <Badge
              variant="outline"
              className="text-[11px] font-medium px-1.5 py-0.5 rounded-md text-muted-foreground border-dashed"
            >
              +{remainingCount}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
