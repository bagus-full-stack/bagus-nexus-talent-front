"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import {
  Send,
  Sparkles,
  X,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  Bot,
  UserCheck,
  Search as SearchIcon,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { searchCandidats, extractFilters, ExtractedFilter } from "@/lib/api/candidats";
import { Candidat } from "@/types/candidat";
import { CandidateCard } from "@/components/search/candidate-card";
import { CandidateDetailSheet } from "@/components/search/candidate-detail-sheet";
import { ScoreBadge } from "@/components/shared/score-badge";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const SUGGESTIONS = [
  "Développeur React",
  "Data Scientist",
  "+5 ans d'expérience",
];

interface SearchFormData {
  query: string;
}

const ITEMS_PER_PAGE = 10;

export default function SearchPage() {
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<ExtractedFilter[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidat | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const { register, handleSubmit, setValue } = useForm<SearchFormData>({
    defaultValues: {
      query: "",
    },
  });

  // TanStack Query pour appeler searchCandidats
  const {
    data: candidats,
    isPending,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["candidats", submittedQuery, activeFilters],
    queryFn: () => searchCandidats(submittedQuery || "", activeFilters),
    enabled: submittedQuery !== null,
  });

  const onSubmit = (formData: SearchFormData) => {
    const trimmed = formData.query.trim();
    if (!trimmed) return;

    setSubmittedQuery(trimmed);
    const newFilters = extractFilters(trimmed);
    setActiveFilters(newFilters);
    setCurrentPage(1);
    // Réinitialiser la sélection ou la garder
    setSelectedCandidate(null);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setValue("query", suggestion);
    setSubmittedQuery(suggestion);
    const newFilters = extractFilters(suggestion);
    setActiveFilters(newFilters);
    setCurrentPage(1);
    setSelectedCandidate(null);
  };

  const handleRemoveFilter = (filterId: string) => {
    const updated = activeFilters.filter((f) => f.id !== filterId);
    setActiveFilters(updated);
    setCurrentPage(1);
  };

  const handleRemoveLastFilter = () => {
    if (activeFilters.length > 0) {
      setActiveFilters((prev) => prev.slice(0, -1));
      setCurrentPage(1);
    } else {
      // S'il n'y a plus de filtres, réinitialiser la requête
      setSubmittedQuery("");
      setValue("query", "");
      setCurrentPage(1);
    }
  };

  const handleOpenCandidateDetails = (candidate: Candidat) => {
    setSelectedCandidate(candidate);
    setIsDetailOpen(true);
  };

  const handleSelectCandidate = (candidate: Candidat) => {
    setSelectedCandidate(candidate);
  };

  // Pagination calculs
  const totalResults = candidats?.length ?? 0;
  const totalPages = Math.ceil(totalResults / ITEMS_PER_PAGE);
  const paginatedCandidats = candidats
    ? candidats.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Barre de recherche (Input large, style chat, bouton d'envoi avec icône Send) */}
      <Card className="rounded-xl border border-border shadow-xs bg-card">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Input
                type="text"
                id="search-query-input"
                placeholder="Ex. Développeur React avec +5 ans d'expérience à Paris..."
                className="h-12 pl-4 pr-10 text-sm sm:text-base rounded-xl bg-background border-border shadow-none focus-visible:ring-1 focus-visible:ring-primary"
                {...register("query")}
              />
            </div>
            <Button
              type="submit"
              id="search-submit-btn"
              disabled={isFetching}
              size="lg"
              className="h-12 px-5 rounded-xl gap-2 font-medium shrink-0"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Rechercher</span>
            </Button>
          </form>

          {/* Chips de suggestions sous la barre */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-muted-foreground font-medium text-[11px] flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" /> Suggestions :
            </span>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="inline-flex items-center rounded-lg border border-border bg-muted/40 hover:bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Badges de filtres extraits avec icône croix */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Filtres extraits par l&apos;IA :
              </span>
              {activeFilters.map((filter) => (
                <Badge
                  key={filter.id}
                  variant="secondary"
                  className="gap-1 pl-2.5 pr-1.5 py-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors"
                >
                  <span>{filter.label}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFilter(filter.id)}
                    className="rounded-full hover:bg-primary/20 p-0.5 inline-flex items-center justify-center transition-colors"
                    aria-label={`Retirer le filtre ${filter.label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveFilters([]);
                  setCurrentPage(1);
                }}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              >
                Tout effacer
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ÉTAT INITIAL (avant toute recherche) */}
      {submittedQuery === null && (
        <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center space-y-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="max-w-md space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Recherchez des talents en langage naturel
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Exprimez vos critères comme à un recruteur humain. Le moteur IA extrait automatiquement les compétences, l&apos;expérience requise et la localisation.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 max-w-lg pt-2">
            {SUGGESTIONS.map((sug) => (
              <Button
                key={sug}
                variant="outline"
                onClick={() => handleSuggestionClick(sug)}
                className="rounded-xl px-4 py-2 h-auto text-sm font-medium hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary mr-2" />
                {sug}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* ÉTAT PENDING / CHARGEMENT (3 Skeletons en forme de carte) */}
      {submittedQuery !== null && isPending && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 flex-1">
                  <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <Skeleton className="h-12 w-12 rounded-full shrink-0" />
              </div>
              <div className="flex gap-2 pt-2 border-t border-border/40">
                <Skeleton className="h-6 w-16 rounded-md" />
                <Skeleton className="h-6 w-20 rounded-md" />
                <Skeleton className="h-6 w-18 rounded-md" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ÉTAT ERREUR */}
      {submittedQuery !== null && !isPending && isError && (
        <ErrorState
          title="Erreur lors de la recherche de candidats"
          message="Une anomalie s'est produite lors du traitement de votre requête. Veuillez relancer la recherche."
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      )}

      {/* ÉTAT RÉSULTATS VIDES */}
      {submittedQuery !== null && !isPending && !isError && totalResults === 0 && (
        <EmptyState
          icon={SearchIcon}
          title="Aucun candidat ne correspond à ces critères"
          description="Vérifiez les compétences demandées ou retirez des filtres stricts pour élargir les profils qualifiés."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveLastFilter}
              className="gap-2"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {activeFilters.length > 0
                ? "Retirer le dernier filtre ajouté"
                : "Réinitialiser la recherche"}
            </Button>
          }
        />
      )}

      {/* RÉSULTATS + PANNEAU LATÉRAL RÉTRACTABLE */}
      {submittedQuery !== null && !isPending && !isError && totalResults > 0 && (
        <div className="space-y-4">
          {/* En-tête des résultats */}
          <div className="flex items-center justify-between gap-2 pb-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Résultats de la qualification
              </h3>
              <Badge variant="secondary" className="font-semibold text-xs">
                {totalResults} profil{totalResults > 1 ? "s" : ""}
              </Badge>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8"
            >
              <Bot className="h-3.5 w-3.5 text-primary" />
              <span>
                {isSidebarOpen ? "Masquer panneau IA" : "Afficher panneau IA"}
              </span>
            </Button>
          </div>

          {/* Grille principale : Liste de cartes + Panneau latéral droit */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Colonne de gauche : Cartes de candidats */}
            <div
              className={`space-y-3.5 transition-all ${
                isSidebarOpen ? "lg:col-span-8" : "lg:col-span-12"
              }`}
            >
              {paginatedCandidats.map((candidat) => (
                <CandidateCard
                  key={candidat.id}
                  candidat={candidat}
                  isSelected={selectedCandidate?.id === candidat.id}
                  onSelect={handleSelectCandidate}
                  onOpenDetails={handleOpenCandidateDetails}
                />
              ))}

              {/* Pagination si plus de 10 résultats */}
              {totalPages > 1 && (
                <div className="pt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          disabled={currentPage === 1}
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                        />
                      </PaginationItem>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (pageNum) => (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              isActive={currentPage === pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}

                      <PaginationItem>
                        <PaginationNext
                          disabled={currentPage === totalPages}
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>

            {/* Colonne de droite : Panneau latéral rétractable */}
            {isSidebarOpen && (
              <div className="hidden lg:block lg:col-span-4 sticky top-6">
                <Card className="rounded-xl border border-border shadow-xs bg-card overflow-hidden">
                  <div className="p-4 border-b border-border/80 bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Justification IA / LLM
                      </h4>
                    </div>
                    {selectedCandidate && (
                      <span className="text-[11px] font-semibold text-primary">
                        Score : {selectedCandidate.scorePertinence}%
                      </span>
                    )}
                  </div>

                  <CardContent className="p-4 space-y-4">
                    {selectedCandidate ? (
                      <div className="space-y-4 text-xs animate-in fade-in-50">
                        <div className="space-y-1">
                          <p className="font-bold text-foreground text-sm">
                            {selectedCandidate.statutAnonymise
                              ? `Candidat #${selectedCandidate.id.replace(/[^0-9]/g, "") || selectedCandidate.id}`
                              : selectedCandidate.nom}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {selectedCandidate.posteActuel} @ {selectedCandidate.entrepriseActuelle}
                          </p>
                        </div>

                        <div className="rounded-lg bg-primary/[0.04] border border-primary/20 p-3 leading-relaxed text-foreground">
                          {selectedCandidate.justificationLLM}
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Compétences clés :
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {selectedCandidate.competences.map((c) => (
                              <Badge
                                key={c}
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0.5"
                              >
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenCandidateDetails(selectedCandidate)}
                          className="w-full text-xs gap-1.5 mt-2"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Consulter la fiche complète
                        </Button>
                      </div>
                    ) : (
                      <div className="py-10 text-center space-y-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground mx-auto">
                          <UserCheck className="h-5 w-5" />
                        </div>
                        <div className="space-y-1 max-w-[200px] mx-auto">
                          <p className="text-xs font-semibold text-foreground">
                            Sélectionnez un candidat
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Cliquez sur une carte pour lire la justification d&apos;alignement générée par le modèle LLM.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sheet détaillé du candidat */}
      <CandidateDetailSheet
        candidat={selectedCandidate}
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onOpenChange={setIsDetailOpen}
      />
    </div>
  );
}
