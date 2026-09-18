"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Lock,
  Plus,
  Search as SearchIcon,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  KeyRound,
  FileText,
  User,
  Check,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  getRequests,
  createRequest,
  executeRequest,
  GdprRequest,
  GdprType,
} from "@/lib/api/gdpr";
import candidatsDataRaw from "@/lib/mock-data/candidats.json";
import { Candidat } from "@/types/candidat";
import { SkeletonTableRow } from "@/components/shared/skeleton-table-row";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function GDPRPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentUser } = useAppStore();

  // 1. Contrôle d'accès RBAC : accessible UNIQUEMENT au rôle Admin
  const isAuthorized = currentUser?.role === "admin";

  useEffect(() => {
    if (!isAuthorized) {
      toast.error("Accès restreint", {
        description:
          "Le registre RGPD et les actions irréversibles d'effacement sont réservés au rôle Administrateur.",
      });
      router.replace("/search");
    }
  }, [isAuthorized, router]);

  // État de recherche dans le tableau
  const [tableSearch, setTableSearch] = useState("");

  // Gestion des lignes repliables pour le rapport technique
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});

  // 2. Modales et formulaires
  // Étape 1 : Dialog "Nouvelle demande"
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidat | null>(null);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [requestType, setRequestType] = useState<GdprType>("suppression");

  // Étape 2 : Modal de double confirmation
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [activeRequestToExecute, setActiveRequestToExecute] = useState<GdprRequest | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // TanStack Query pour charger les demandes
  const {
    data: requests = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["gdpr-requests"],
    queryFn: getRequests,
    enabled: isAuthorized,
  });

  // Mutation création d'une demande
  const mutationCreate = useMutation({
    mutationFn: ({
      candidatId,
      candidatNom,
      type,
    }: {
      candidatId: string;
      candidatNom: string;
      type: GdprType;
    }) => createRequest(candidatId, candidatNom, type),
    onSuccess: (newReq) => {
      queryClient.setQueryData<GdprRequest[]>(["gdpr-requests"], (old = []) => [
        newReq,
        ...old,
      ]);
      setIsNewRequestOpen(false);
      // Enchaînement direct vers la modal de confirmation
      setActiveRequestToExecute(newReq);
      setAdminPassword("");
      setPasswordError(null);
      setIsConfirmOpen(true);
    },
    onError: () => {
      toast.error("Échec de création de la demande");
    },
  });

  // Mutation exécution de la demande avec mot de passe
  const mutationExecute = useMutation({
    mutationFn: ({
      id,
      password,
    }: {
      id: string;
      password: string;
    }) => executeRequest(id, password),
    onSuccess: (rapport, variables) => {
      // Met à jour la liste en local
      queryClient.setQueryData<GdprRequest[]>(["gdpr-requests"], (old = []) =>
        old.map((r) =>
          r.id === variables.id
            ? { ...r, statut: "terminee", rapportTechnique: rapport }
            : r
        )
      );
      // Ouvre automatiquement la section repliable de la ligne
      setOpenRows((prev) => ({ ...prev, [variables.id]: true }));
      setIsConfirmOpen(false);
      setActiveRequestToExecute(null);
      setAdminPassword("");
      setPasswordError(null);
      toast.success("Action RGPD exécutée avec succès", {
        description: "Le rapport cryptographique a été généré et enregistré dans le registre d'audit.",
      });
    },
    onError: (err: any) => {
      // Met à jour le statut en échec dans le tableau
      if (activeRequestToExecute) {
        queryClient.setQueryData<GdprRequest[]>(["gdpr-requests"], (old = []) =>
          old.map((r) =>
            r.id === activeRequestToExecute.id ? { ...r, statut: "echec" } : r
          )
        );
      }
      setPasswordError(err?.message || "Mot de passe incorrect");
    },
  });

  // Filtrage des candidats pour la recherche dans le Dialog 1
  const filteredCandidates = useMemo(() => {
    if (!candidateSearch.trim()) {
      return (candidatsDataRaw as Candidat[]).slice(0, 5);
    }
    const q = candidateSearch.toLowerCase();
    return (candidatsDataRaw as Candidat[])
      .filter((c) => c.nom.toLowerCase().includes(q) || c.posteActuel.toLowerCase().includes(q))
      .slice(0, 6);
  }, [candidateSearch]);

  // Filtrage des requêtes du tableau
  const filteredRequests = useMemo(() => {
    if (!tableSearch.trim()) return requests;
    const q = tableSearch.toLowerCase();
    return requests.filter(
      (r) =>
        r.candidatNom.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
    );
  }, [requests, tableSearch]);

  // Gestion de la copie du rapport d'audit
  const handleCopyReport = (rapport?: GdprRequest["rapportTechnique"]) => {
    if (!rapport) return;
    const textToCopy = `RAPPORT D'AUDIT RGPD (Art. 17 / Art. 18)
----------------------------------------
Horodatage : ${rapport.horodatage}
Responsable : ${rapport.dpoResponsable}
Vecteurs supprimés : ${rapport.vecteursSupprimes}
Relations graphe purgées : ${rapport.relationsSupprimees}
Fichiers sources détruits : ${rapport.fichiersPelles}
Hash cryptographique SHA-256 :
${rapport.hashAudit}
----------------------------------------
Preuve d'effacement immuable certifiée.`;

    navigator.clipboard.writeText(textToCopy);
    toast.success("Rapport d'audit copié", {
      description: "Le texte formaté et le hash d'audit sont dans votre presse-papier.",
    });
  };

  // Bascule repliable
  const toggleRow = (id: string) => {
    setOpenRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 1. EN-TÊTE AVEC TITRE ET BOUTON NOUVELLE DEMANDE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <span>Registre de Conformité RGPD</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Gouvernance de l&apos;effacement définitif (Art. 17) et de l&apos;anonymisation des profils (Art. 18).
          </p>
        </div>

        <Button
          id="new-gdpr-request-button"
          size="sm"
          onClick={() => {
            setSelectedCandidate(null);
            setCandidateSearch("");
            setRequestType("suppression");
            setIsNewRequestOpen(true);
          }}
          className="gap-2 text-xs font-semibold h-9 rounded-lg"
        >
          <Plus className="h-4 w-4" />
          Nouvelle demande de suppression
        </Button>
      </div>

      {/* 2. TABLEAU SHADCN DES DEMANDES */}
      <Card className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher par candidat ou ID..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="h-9 pl-9 pr-3 text-xs rounded-lg bg-background"
            />
          </div>

          <span className="text-xs font-mono text-muted-foreground">
            {filteredRequests.length} demande{filteredRequests.length > 1 ? "s" : ""}
          </span>
        </div>

        {isLoading ? (
          <div className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date de création</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={5} />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : isError ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-destructive">
              Erreur lors du chargement des demandes RGPD
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-xs gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Réessayer
            </Button>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={ShieldAlert}
              title="Aucune demande RGPD pour le moment"
              description="Toutes les demandes de droit à l'oubli et d'anonymisation apparaîtront dans ce registre immuable."
              action={
                <Button
                  size="sm"
                  onClick={() => setIsNewRequestOpen(true)}
                  className="text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Créer une demande
                </Button>
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidat</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((req) => {
                const isOpen = Boolean(openRows[req.id]);
                const isInProgress = req.statut === "en_cours";
                const isPending = req.statut === "en_attente";
                const isFailed = req.statut === "echec";
                const isDone = req.statut === "terminee";

                return (
                  <React.Fragment key={req.id}>
                    <TableRow className="hover:bg-muted/30 transition-colors">
                      {/* Candidat */}
                      <TableCell className="font-semibold text-foreground">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-foreground">
                              {req.candidatNom}
                            </p>
                            <p className="text-[11px] font-mono text-muted-foreground">
                              {req.id}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Type : Badge rouge "Suppression" ou bleu "Anonymisation" */}
                      <TableCell>
                        {req.type === "suppression" ? (
                          <Badge
                            variant="outline"
                            className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 text-[11px] font-semibold gap-1"
                          >
                            <Trash2 className="h-3 w-3" /> Suppression
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[11px] font-semibold gap-1"
                          >
                            <Lock className="h-3 w-3" /> Anonymisation
                          </Badge>
                        )}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {req.dateCreation}
                      </TableCell>

                      {/* Statut : Badge orange, bleu animé, vert, ou rouge */}
                      <TableCell>
                        {isPending && (
                          <Badge
                            variant="outline"
                            className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-semibold gap-1"
                          >
                            <Clock className="h-3 w-3" /> En attente
                          </Badge>
                        )}
                        {isInProgress && (
                          <Badge
                            variant="outline"
                            className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 text-[11px] font-semibold gap-1 animate-pulse"
                          >
                            <RefreshCw className="h-3 w-3 animate-spin" /> En cours
                          </Badge>
                        )}
                        {isDone && (
                          <Badge
                            variant="outline"
                            className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-semibold gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Terminée
                          </Badge>
                        )}
                        {isFailed && (
                          <Badge
                            variant="outline"
                            className="bg-destructive/10 text-destructive border-destructive/30 text-[11px] font-semibold gap-1"
                          >
                            <XCircle className="h-3 w-3" /> Échec
                          </Badge>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Bouton pour relancer ou exécuter si en attente ou échec */}
                          {(isPending || isFailed) && (
                            <Button
                              size="sm"
                              variant={isFailed ? "destructive" : "default"}
                              onClick={() => {
                                setActiveRequestToExecute(req);
                                setAdminPassword("");
                                setPasswordError(null);
                                setIsConfirmOpen(true);
                              }}
                              disabled={isInProgress}
                              className="h-7 px-2.5 text-[11px] font-semibold gap-1 rounded-md"
                            >
                              <KeyRound className="h-3 w-3" />
                              {isFailed ? "Relancer" : "Exécuter"}
                            </Button>
                          )}

                          {/* Bouton pour afficher/replier le rapport si terminée */}
                          {req.rapportTechnique && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRow(req.id)}
                              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
                            >
                              <span>Détails</span>
                              {isOpen ? (
                                <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronRight className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Zone repliable pour le rapport technique d'audit */}
                    {req.rapportTechnique && (
                      <TableRow className="border-t-0 p-0">
                        <TableCell colSpan={5} className="p-0 border-t-0">
                          <Collapsible open={isOpen} onOpenChange={() => toggleRow(req.id)}>
                            <CollapsibleContent className="p-4 bg-muted/20 border-y border-border/60">
                              <div className="rounded-xl border border-border bg-background p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                                      Rapport d&apos;exécution technique & Audit cryptographique
                                    </span>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopyReport(req.rapportTechnique)}
                                    className="h-7 text-xs gap-1.5"
                                  >
                                    <Copy className="h-3 w-3" />
                                    Copier le rapport
                                  </Button>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                  <div className="p-2.5 rounded-lg border border-border/70 bg-muted/30">
                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                                      Relations purgées
                                    </span>
                                    <p className="text-base font-bold font-mono text-foreground mt-0.5">
                                      {req.rapportTechnique.relationsSupprimees}
                                    </p>
                                  </div>

                                  <div className="p-2.5 rounded-lg border border-border/70 bg-muted/30">
                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                                      Vecteurs supprimés
                                    </span>
                                    <p className="text-base font-bold font-mono text-foreground mt-0.5">
                                      {req.rapportTechnique.vecteursSupprimes}
                                    </p>
                                  </div>

                                  <div className="p-2.5 rounded-lg border border-border/70 bg-muted/30">
                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                                      Fichiers détruits
                                    </span>
                                    <p className="text-base font-bold font-mono text-foreground mt-0.5">
                                      {req.rapportTechnique.fichiersPelles}
                                    </p>
                                  </div>

                                  <div className="p-2.5 rounded-lg border border-border/70 bg-muted/30">
                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                                      Responsable DPO
                                    </span>
                                    <p className="text-xs font-semibold text-foreground mt-0.5 truncate">
                                      {req.rapportTechnique.dpoResponsable}
                                    </p>
                                  </div>
                                </div>

                                <div className="rounded-lg bg-muted/50 p-3 font-mono text-[11px] text-muted-foreground break-all space-y-1">
                                  <span className="font-semibold text-foreground block">
                                    Empreinte d&apos;audit SHA-256 :
                                  </span>
                                  <span>{req.rapportTechnique.hashAudit}</span>
                                  <span className="block text-[10px] text-muted-foreground/70 pt-1">
                                    Horodatage UTC : {req.rapportTechnique.horodatage}
                                  </span>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* 3. DIALOG ÉTAPE 1 : NOUVELLE DEMANDE (Sélection du candidat et du type) */}
      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className="sm:max-w-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <ShieldAlert className="h-5 w-5 text-primary" />
              <span>Initier une demande de droit RGPD</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Sélectionnez le candidat concerné et la typologie de traitement réglementaire.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Recherche du candidat */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Candidat ciblé
              </label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Rechercher par nom (ex. Sarah Pichon)..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className="h-9 pl-9 pr-3 text-xs rounded-lg"
                />
              </div>

              {/* Résultats de sélection rapide */}
              <div className="space-y-1 pt-1 max-h-40 overflow-y-auto">
                {filteredCandidates.map((c) => {
                  const isSelected = selectedCandidate?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCandidate(c)}
                      className={cn(
                        "p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "border-border hover:bg-muted/40"
                      )}
                    >
                      <div>
                        <p className="font-semibold text-foreground">{c.nom}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {c.posteActuel} • {c.entrepriseActuelle}
                        </p>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Choix du type : 2 Cards cliquables côte à côte */}
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-semibold text-foreground">
                Type d&apos;action RGPD
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1 : Suppression complète */}
                <div
                  onClick={() => setRequestType("suppression")}
                  className={cn(
                    "p-3.5 rounded-xl border cursor-pointer transition-all space-y-1.5",
                    requestType === "suppression"
                      ? "border-red-500 bg-red-500/10 ring-2 ring-red-500/20"
                      : "border-border hover:border-red-500/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-xs font-bold text-foreground">
                      Suppression complète
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <strong>Art. 17 RGPD :</strong> Purge intégrale de la base, destruction des fichiers CVs, des plongements vectoriels et des relations de graphe.
                  </p>
                </div>

                {/* Option 2 : Anonymisation */}
                <div
                  onClick={() => setRequestType("anonymisation")}
                  className={cn(
                    "p-3.5 rounded-xl border cursor-pointer transition-all space-y-1.5",
                    requestType === "anonymisation"
                      ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/20"
                      : "border-border hover:border-blue-500/40"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-bold text-foreground">
                      Anonymisation
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <strong>Art. 18 RGPD :</strong> Remplacement des identifiants directs par un hash pseudonymisé (#CAND-XXXX) tout en conservant les métriques globales.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsNewRequestOpen(false)}
              className="text-xs"
            >
              Annuler
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={!selectedCandidate || mutationCreate.isPending}
              onClick={() => {
                if (!selectedCandidate) return;
                mutationCreate.mutate({
                  candidatId: selectedCandidate.id,
                  candidatNom: selectedCandidate.nom,
                  type: requestType,
                });
              }}
              className="text-xs font-semibold"
            >
              Continuer vers la confirmation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. DIALOG ÉTAPE 2 : DOUBLE CONFIRMATION AVEC MOT DE PASSE ADMIN */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Confirmation d&apos;exécution irréversible</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cette action est finale et auditable par la CNIL et les autorités de régulation.
            </DialogDescription>
          </DialogHeader>

          {activeRequestToExecute && (
            <div className="space-y-4 pt-2">
              {/* Récapitulatif du candidat et de l'action */}
              <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Candidat ciblé :</span>
                  <span className="font-bold text-foreground">
                    {activeRequestToExecute.candidatNom}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Action requise :</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-bold uppercase",
                      activeRequestToExecute.type === "suppression"
                        ? "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30"
                        : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
                    )}
                  >
                    {activeRequestToExecute.type}
                  </Badge>
                </div>
              </div>

              {/* Encadré rouge d'avertissement irréversibilité */}
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-800 dark:text-red-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                  <span>Avertissement légal d&apos;irréversibilité</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  La validation de cette opération déclenche la suppression physique des index FAISS/Qdrant, des nœuds Neo4j et des archives binaires. Aucune restauration ne sera possible.
                </p>
              </div>

              {/* Champ Mot de passe administrateur */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>Mot de passe administrateur</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    (Démo : demo1234)
                  </span>
                </label>
                <Input
                  type="password"
                  id="admin-password-input"
                  placeholder="Entrez votre mot de passe administrateur..."
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    if (passwordError) setPasswordError(null);
                  }}
                  className={cn(
                    "h-9 text-xs rounded-lg font-mono",
                    passwordError && "border-destructive focus-visible:ring-destructive"
                  )}
                />

                {/* Message d'erreur inline si executeRequest échoue */}
                {passwordError && (
                  <p className="text-xs text-destructive font-medium flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    <span>{passwordError}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t border-border flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsConfirmOpen(false);
                setPasswordError(null);
              }}
              disabled={mutationExecute.isPending}
              className="text-xs"
            >
              Annuler
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!adminPassword.trim() || mutationExecute.isPending}
              onClick={() => {
                if (!activeRequestToExecute) return;
                mutationExecute.mutate({
                  id: activeRequestToExecute.id,
                  password: adminPassword,
                });
              }}
              className="text-xs font-bold gap-1.5"
            >
              {mutationExecute.isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Purge en cours...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Confirmer l&apos;exécution définitive
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
