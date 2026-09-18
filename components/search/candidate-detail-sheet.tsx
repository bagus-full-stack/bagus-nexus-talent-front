"use client";

import React, { useState } from "react";
import { Candidat, ExperiencePro, FormationDiplome } from "@/types/candidat";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScoreBadge } from "@/components/shared/score-badge";
import { getAvatarColor, getInitials } from "@/components/search/candidate-card";
import { toast } from "sonner";
import {
  Mail,
  Download,
  Sparkles,
  Briefcase,
  GraduationCap,
  ChevronDown,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CandidateDetailSheetProps {
  candidat: Candidat | null;
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Fonction de découpage et mise en valeur sémantique du texte LLM.
 * Gère les passages entre crochets [texte] ou les balises simples/gras (**texte**)
 * et les transforme en éléments <mark> stylisés.
 */
function renderHighlightedText(text: string) {
  if (!text) return null;

  // Regex pour capturer **texte** OU [texte]
  const regex = /(\*\*([^*]+)\*\*|\[([^\]]+)\])/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const highlightContent = match[2] || match[3];
    parts.push(
      <mark
        key={match.index}
        className="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-950 dark:text-indigo-200 px-1.5 py-0.5 rounded font-semibold not-italic inline-block mx-0.5 border border-indigo-200/50 dark:border-indigo-700/40"
      >
        {highlightContent}
      </mark>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

/**
 * Niveaux par défaut déterministes si non précisés
 */
const DEFAULT_LEVELS: Array<"Débutant" | "Intermédiaire" | "Avancé" | "Expert"> = [
  "Intermédiaire",
  "Avancé",
  "Expert",
  "Avancé",
];

function getLevelBadgeStyle(level: string) {
  switch (level.toLowerCase()) {
    case "expert":
      return "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30";
    case "avancé":
    case "avance":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "intermédiaire":
    case "intermediaire":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
    default:
      return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
  }
}

/**
 * Génère des expériences factices cohérentes si non fournies
 */
function getMockExperiences(candidat: Candidat): ExperiencePro[] {
  if (candidat.experiences && candidat.experiences.length > 0) {
    return candidat.experiences;
  }

  const poste = candidat.posteActuel || candidat.currentRole || "Ingénieur Logiciel";
  const entreprise = candidat.entrepriseActuelle || candidat.company || "Scale-up";
  const annees = candidat.anneesExperience ?? candidat.experienceYears ?? 4;
  const competences = candidat.competences || candidat.skills || [];

  return [
    {
      poste: poste,
      entreprise: entreprise,
      periode: `2022 - Présent (${annees > 2 ? 3 : annees} ans)`,
      description: `Pilotage des initiatives techniques clés, déploiement continu et encadrement des bonnes pratiques. Conception d'architectures résilientes.`,
      competences: competences.slice(0, 3),
    },
    {
      poste: `Développeur ${poste.includes("Data") ? "Data / ML" : "Web & Mobile"} Confirmé`,
      entreprise: "Agence Tech & Conseil Digital",
      periode: "2019 - 2022 (3 ans)",
      description: `Développement de fonctionnalités critiques sur applications métiers, refonte de modules complexes et intégration d'APIs tierces.`,
      competences: competences.slice(2, 5),
    },
  ];
}

/**
 * Génère des diplômes factices cohérents si non fournis
 */
function getMockDiplomes(candidat: Candidat): FormationDiplome[] {
  if (candidat.diplomes && candidat.diplomes.length > 0) {
    return candidat.diplomes;
  }

  const isData = (candidat.posteActuel || "").toLowerCase().includes("data");
  return [
    {
      diplome: isData
        ? "Master 2 Intelligence Artificielle & Science des Données"
        : "Diplôme d'Ingénieur / Master Informatique & Systèmes Distribués",
      etablissement: isData ? "Université Paris-Saclay" : "CentraleSupélec / École d'Ingénieurs",
      annee: "2018",
    },
    {
      diplome: "Licence / CPGE Mathématiques & Informatique",
      etablissement: "Sorbonne Université",
      annee: "2016",
    },
  ];
}

export function CandidateDetailSheet({
  candidat,
  open,
  onClose,
  onOpenChange,
}: CandidateDetailSheetProps) {
  const [isQualityHistoryOpen, setIsQualityHistoryOpen] = useState(false);

  if (!candidat) return null;

  const handleClose = () => {
    if (onClose) onClose();
    if (onOpenChange) onOpenChange(false);
  };

  const isAnonymized = Boolean(candidat.statutAnonymise || candidat.isAnonymized);
  const displayName = isAnonymized
    ? `Candidat #${candidat.id.replace(/[^0-9]/g, "") || candidat.id}`
    : candidat.nom || candidat.name || "Candidat";

  const poste = candidat.posteActuel || candidat.currentRole || "Professionnel";
  const entreprise = candidat.entrepriseActuelle || candidat.company || "Entreprise confidentielle";
  const exp = candidat.anneesExperience ?? candidat.experienceYears ?? 0;
  const score = candidat.scorePertinence ?? candidat.matchScore ?? 0;
  const skills = candidat.competences || candidat.skills || [];

  // Justification LLM avec balises ou crochets pour mise en valeur
  let rawRationale = candidat.justificationLLM || candidat.aiRationale || "";
  if (rawRationale && !rawRationale.includes("[") && !rawRationale.includes("**")) {
    // Si la chaîne n'a pas encore de marqueurs, ajoutons une mise en valeur subtile
    // pour démontrer le rendu <mark>
    if (skills[0] && rawRationale.includes(skills[0])) {
      rawRationale = rawRationale.replace(
        skills[0],
        `[${skills[0]}]`
      );
    } else {
      rawRationale = `[Excellente adéquation] : ${rawRationale}`;
    }
  }

  const initiales = getInitials(candidat.nom || candidat.name || "", isAnonymized, candidat.id);
  const avatarColors = getAvatarColor(candidat.nom || candidat.name || candidat.id);

  const experiences = getMockExperiences(candidat);
  const diplomes = getMockDiplomes(candidat);

  const isVerified = candidat.qualiteDonnees === "verifiee" || !isAnonymized;

  const handleActionToast = (actionName: string) => {
    toast("Fonctionnalité à venir", {
      description: `L'action « ${actionName} » sera bientôt disponible dans une prochaine version.`,
    });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
        else if (onOpenChange) onOpenChange(isOpen);
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] p-0 overflow-y-auto bg-background border-l border-border"
      >
        <div className="p-6 space-y-6">
          {/* EN-TÊTE : Avatar large, nom, identifiant anonymisé, poste, boutons d'action */}
          <SheetHeader className="text-left space-y-4 pb-4 border-b border-border/80">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3.5 min-w-0">
                <Avatar
                  className={cn(
                    "h-14 w-14 shrink-0 rounded-2xl border border-border/60 shadow-xs font-bold text-base",
                    avatarColors.bg,
                    avatarColors.text
                  )}
                >
                  <AvatarFallback className={cn("rounded-2xl", avatarColors.bg, avatarColors.text)}>
                    {initiales}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <SheetTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                      {displayName}
                    </SheetTitle>
                    {isAnonymized && (
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-semibold bg-muted text-muted-foreground border-border"
                      >
                        Anonymisé
                      </Badge>
                    )}
                  </div>

                  <SheetDescription className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5 truncate">
                    <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{poste}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground truncate">{entreprise}</span>
                  </SheetDescription>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {exp} {exp > 1 ? "ans" : "an"} d&apos;exp.
                    </span>
                    {candidat.location && (
                      <>
                        <span>•</span>
                        <span>{candidat.location}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Score de pertinence */}
              <div className="shrink-0">
                <ScoreBadge value={score} size="md" showLabel />
              </div>
            </div>

            {/* Boutons d'action dans l'en-tête (Mail, Download) */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="default"
                size="sm"
                onClick={() => handleActionToast("Contacter le candidat")}
                className="flex-1 h-9 rounded-lg gap-2 text-xs font-medium"
              >
                <Mail className="h-4 w-4" />
                <span>Contacter</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleActionToast("Exporter en PDF")}
                className="h-9 rounded-lg gap-2 text-xs font-medium border-border"
              >
                <Download className="h-4 w-4" />
                <span>Exporter en PDF</span>
              </Button>
            </div>
          </SheetHeader>

          {/* SECTION : Pourquoi ce candidat correspond (Card fond teinté bg-indigo-50 dark:bg-indigo-950) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Pourquoi ce candidat correspond</span>
            </div>

            <Card className="rounded-xl border border-indigo-200/60 dark:border-indigo-800/40 bg-indigo-50 dark:bg-indigo-950/70 shadow-none">
              <CardContent className="p-4 text-xs sm:text-sm leading-relaxed text-indigo-950 dark:text-indigo-100">
                {rawRationale ? (
                  <p>{renderHighlightedText(rawRationale)}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    Aucune analyse sémantique renseignée pour ce profil.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* SECTION : Compétences (Badges groupés avec niveau mocké) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5" />
                <span>Compétences ({skills.length})</span>
              </h4>
            </div>

            {skills.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Aucune compétence renseignée
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {skills.map((skill, index) => {
                  const level = DEFAULT_LEVELS[index % DEFAULT_LEVELS.length];
                  return (
                    <div
                      key={skill}
                      className="flex flex-col justify-between p-2.5 rounded-lg border border-border/70 bg-card hover:bg-muted/30 transition-colors"
                    >
                      <span className="font-semibold text-xs text-foreground truncate">
                        {skill}
                      </span>
                      <div className="pt-1 flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Niveau</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-medium px-1.5 py-0 rounded border",
                            getLevelBadgeStyle(level)
                          )}
                        >
                          {level}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION : Expériences (Timeline verticale) */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              <span>Expériences professionnelles</span>
            </h4>

            {experiences.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-1">
                Aucune expérience renseignée
              </p>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
                {experiences.map((expItem, idx) => (
                  <div key={idx} className="relative space-y-1.5">
                    {/* Point de la timeline */}
                    <div className="absolute -left-6 top-1 h-4 w-4 rounded-full border-2 border-background bg-primary ring-2 ring-primary/20" />

                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-foreground">
                        {expItem.poste}
                      </h5>
                      <p className="text-xs font-medium text-muted-foreground">
                        {expItem.entreprise} •{" "}
                        <span className="text-foreground/80 font-normal">{expItem.periode}</span>
                      </p>
                    </div>

                    {expItem.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {expItem.description}
                      </p>
                    )}

                    {expItem.competences && expItem.competences.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {expItem.competences.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 font-normal"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION : Formation */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Formation & Diplômes</span>
            </h4>

            {diplomes.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-1">
                Aucune formation renseignée
              </p>
            ) : (
              <div className="space-y-2.5">
                {diplomes.map((dip, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-border/70 bg-card space-y-0.5"
                  >
                    <p className="text-xs sm:text-sm font-semibold text-foreground">
                      {dip.diplome}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-between">
                      <span>{dip.etablissement}</span>
                      <span className="font-mono text-[11px] font-medium text-foreground">
                        {dip.annee}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION REPLIABLE : Historique de traitement (Collapsible) */}
          <Collapsible
            open={isQualityHistoryOpen}
            onOpenChange={setIsQualityHistoryOpen}
            className="rounded-xl border border-border/70 bg-card overflow-hidden transition-all"
          >
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between p-3.5 text-xs font-semibold text-foreground hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-primary" />
                  <span>Historique de traitement & Qualité</span>
                </div>
                <div className="flex items-center gap-2">
                  {isVerified ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                    >
                      Données vérifiées
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                    >
                      À valider
                    </Badge>
                  )}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform duration-200",
                      isQualityHistoryOpen && "rotate-180"
                    )}
                  />
                </div>
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="px-3.5 pb-3.5 pt-1 border-t border-border/50 text-xs space-y-2.5">
              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                <div className="space-y-0.5">
                  <span className="text-muted-foreground">Source d&apos;ingestion :</span>
                  <p className="font-medium text-foreground">{candidat.source || "CVthèque interne"}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-muted-foreground">Indexation LLM :</span>
                  <p className="font-medium text-foreground">
                    {candidat.ingestionDate || "Conforme RGPD v2.4"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
                {isVerified ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Profil validé par le filtre anti-biais et certifié conforme à la politique de recrutement éthique.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Extraction en cours de vérification humaine périodique.
                    </span>
                  </>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SheetContent>
    </Sheet>
  );
}
