"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileCheck,
  Search as SearchIcon,
  Eye,
  Pencil,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Check,
  Ban,
  FileUp,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import {
  getCvs,
  uploadCv,
  validateCv,
  CvItem,
  CvExtrait,
} from "@/lib/api/ingestion";
import { SkeletonTableRow } from "@/components/shared/skeleton-table-row";
import { ScoreBadge } from "@/components/shared/score-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface UploadingFile {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  error?: string;
  isCancelled?: boolean;
}

type SortField = "nomFichier" | "dateUpload" | "statut" | "scoreConfiance";
type SortOrder = "asc" | "desc";

const ITEMS_PER_PAGE = 10;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".txt"];

export default function IngestionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentUser } = useAppStore();

  // 1. Contrôle d'accès RBAC (accessible uniquement à RH interne et Admin)
  const isAuthorized =
    currentUser?.role === "rh" || currentUser?.role === "admin";

  useEffect(() => {
    if (!isAuthorized) {
      toast.error("Accès refusé", {
        description:
          "La section Ingestion de CV est strictement réservée aux rôles RH interne et Administrateur.",
      });
      router.replace("/search");
    }
  }, [isAuthorized, router]);

  // États locaux
  const [activeTab, setActiveTab] = useState<"tous" | "a_valider" | "echec">(
    "tous"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("dateUpload");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Upload d'éléments en cours
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dialog de validation manuelle
  const [editingCv, setEditingCv] = useState<CvItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Dialog d'inspection en lecture seule
  const [viewingCv, setViewingCv] = useState<CvItem | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // Formulaire de correction avec React Hook Form
  const {
    register,
    handleSubmit,
    reset: resetForm,
    formState: { isSubmitting },
  } = useForm<CvExtrait>();

  // Récupération des données TanStack Query
  const {
    data: cvs = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["ingestion-cvs"],
    queryFn: getCvs,
    enabled: isAuthorized,
  });

  // Mutation pour la validation ou le rejet d'un CV
  const mutationValidate = useMutation({
    mutationFn: ({
      id,
      data,
      action,
    }: {
      id: string;
      data: Partial<CvExtrait>;
      action: "valider" | "rejeter";
    }) => validateCv(id, data, action),
    onSuccess: (updated) => {
      queryClient.setQueryData<CvItem[]>(["ingestion-cvs"], (old = []) =>
        old.map((item) => (item.id === updated.id ? updated : item))
      );
      setIsDialogOpen(false);
      setEditingCv(null);
      if (updated.statut === "ok") {
        toast.success("CV validé avec succès", {
          description: `Le profil extrait pour ${updated.nomFichier} a été indexé au vivier.`,
        });
      } else {
        toast.info("CV rejeté", {
          description: `Le fichier ${updated.nomFichier} a été marqué comme rejeté.`,
        });
      }
    },
    onError: () => {
      toast.error("Erreur lors de la validation du CV");
    },
  });

  // Gestion de l'ouverture du formulaire d'édition
  const handleOpenEdit = (cv: CvItem) => {
    setEditingCv(cv);
    resetForm({
      nom: cv.extrait.nom || "",
      poste: cv.extrait.poste || "",
      experienceAnnees: cv.extrait.experienceAnnees ?? 0,
      competences: cv.extrait.competences || "",
      formation: cv.extrait.formation || "",
      email: cv.extrait.email || "",
      telephone: cv.extrait.telephone || "",
    });
    setIsDialogOpen(true);
  };

  const handleOpenView = (cv: CvItem) => {
    setViewingCv(cv);
    setIsViewDialogOpen(true);
  };

  // Soumission du formulaire de validation
  const onSubmitCorrection = (formData: CvExtrait) => {
    if (!editingCv) return;
    mutationValidate.mutate({
      id: editingCv.id,
      data: formData,
      action: "valider",
    });
  };

  const handleRejectCv = () => {
    if (!editingCv) return;
    mutationValidate.mutate({
      id: editingCv.id,
      data: {},
      action: "rejeter",
    });
  };

  // Gestion du tri
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // Processus d'upload simulé avec validation inline d'erreur
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const fileId = `up-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;

      let errorMsg: string | undefined;
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        errorMsg = `Format non pris en charge (${ext || "inconnu"}). Formats autorisés : .pdf, .docx, .txt`;
      } else if (file.size > MAX_FILE_SIZE_BYTES) {
        errorMsg = `Fichier trop volumineux (${(file.size / (1024 * 1024)).toFixed(1)} Mo). Limite : 10 Mo.`;
      }

      const uploadItem: UploadingFile = {
        id: fileId,
        file,
        name: file.name,
        size: file.size,
        progress: errorMsg ? 0 : 5,
        error: errorMsg,
      };

      setUploadingFiles((prev) => [uploadItem, ...prev]);

      // Si valide, lancer la simulation d'upload
      if (!errorMsg) {
        uploadCv(file, (percent) => {
          setUploadingFiles((prev) =>
            prev.map((item) =>
              item.id === fileId ? { ...item, progress: percent } : item
            )
          );
        })
          .then((newCv) => {
            // Mise à jour de la query TanStack avec le nouveau CV
            queryClient.setQueryData<CvItem[]>(["ingestion-cvs"], (old = []) => [
              newCv,
              ...old,
            ]);

            // Retirer de la liste d'upload après courte animation
            setTimeout(() => {
              setUploadingFiles((prev) => prev.filter((it) => it.id !== fileId));
            }, 600);

            // Simulation du statut intermédiaire "en_cours" -> "ok" ou "a_valider" après 5 secondes
            setTimeout(() => {
              queryClient.setQueryData<CvItem[]>(["ingestion-cvs"], (old = []) =>
                old.map((item) => {
                  if (item.id === newCv.id) {
                    const randomOutcome =
                      Math.random() > 0.35 ? "ok" : "a_valider";
                    return {
                      ...item,
                      statut: randomOutcome,
                      scoreConfiance:
                        randomOutcome === "ok"
                          ? 94
                          : Math.floor(65 + Math.random() * 15),
                      champsAVerifier:
                        randomOutcome === "ok" ? [] : ["competences", "experienceAnnees"],
                    };
                  }
                  return item;
                })
              );
              toast.success("Pipeline d'analyse terminé", {
                description: `L'indexation de « ${file.name} » est maintenant finalisée.`,
              });
            }, 4500);
          })
          .catch(() => {
            setUploadingFiles((prev) =>
              prev.map((item) =>
                item.id === fileId
                  ? { ...item, error: "Échec de téléversement réseau." }
                  : item
              )
            );
          });
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancelUpload = (fileId: string) => {
    setUploadingFiles((prev) => prev.filter((item) => item.id !== fileId));
  };

  // Calcul des statistiques pour les 4 cartes en en-tête
  const stats = useMemo(() => {
    const total = cvs.length;
    const aValider = cvs.filter((c) => c.statut === "a_valider").length;
    const reussis = cvs.filter((c) => c.statut === "ok").length;
    const echecs = cvs.filter((c) => c.statut === "echec").length;

    const totalTermines = reussis + echecs;
    const tauxReussite =
      totalTermines > 0 ? Math.round((reussis / totalTermines) * 100) : 95;

    // Simulation de coût moyen : 0.04€ par CV traité
    const coutMoyen = 0.04;

    return {
      traitesAujourdhui: total,
      aValider,
      tauxReussite,
      coutMoyen: "0,04 €",
    };
  }, [cvs]);

  // Filtrage par onglet et par champ de recherche
  const filteredCvs = useMemo(() => {
    return cvs.filter((cv) => {
      // Filtrage par onglet
      if (activeTab === "a_valider" && cv.statut !== "a_valider") return false;
      if (activeTab === "echec" && cv.statut !== "echec") return false;

      // Filtrage par recherche de nom de fichier
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        const matchesName = cv.nomFichier.toLowerCase().includes(queryLower);
        const matchesCandidate = cv.extrait?.nom
          ?.toLowerCase()
          .includes(queryLower);
        if (!matchesName && !matchesCandidate) return false;
      }

      return true;
    });
  }, [cvs, activeTab, searchQuery]);

  // Tri des CVs
  const sortedCvs = useMemo(() => {
    return [...filteredCvs].sort((a, b) => {
      let valA: string | number = a[sortField];
      let valB: string | number = b[sortField];

      if (sortField === "scoreConfiance") {
        return sortOrder === "asc"
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }

      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredCvs, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedCvs.length / ITEMS_PER_PAGE);
  const paginatedCvs = useMemo(() => {
    return sortedCvs.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
    );
  }, [sortedCvs, currentPage]);

  // Compteurs pour les onglets
  const countTous = cvs.length;
  const countAValider = cvs.filter((c) => c.statut === "a_valider").length;
  const countEchec = cvs.filter((c) => c.statut === "echec").length;

  if (!isAuthorized) {
    return null; // Déjà redirigé via useEffect
  }

  return (
    <div className="space-y-6">
      {/* 1. LES 4 CARTES STATISTIQUES EN EN-TÊTE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CV traités aujourd'hui */}
        <Card className="rounded-xl border border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                CV traités aujourd&apos;hui
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {stats.traitesAujourdhui}
                </span>
                <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-3.5 w-3.5 mr-0.5" /> +14%
                </span>
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* En attente de validation */}
        <Card className="rounded-xl border border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                En attente de validation
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {stats.aValider}
                </span>
                <span className="inline-flex items-center text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <Clock className="h-3.5 w-3.5 mr-0.5" /> revue requise
                </span>
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Taux de réussite */}
        <Card className="rounded-xl border border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Taux de réussite
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {stats.tauxReussite}%
                </span>
                <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-3.5 w-3.5 mr-0.5" /> +2.1%
                </span>
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Percent className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Coût moyen par CV */}
        <Card className="rounded-xl border border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Coût moyen (€/CV)
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground">
                  {stats.coutMoyen}
                </span>
                <span className="inline-flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <TrendingDown className="h-3.5 w-3.5 mr-0.5" /> -0.01 €
                </span>
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. ZONE DE DÉPÔT DRAG & DROP & LISTE D'UPLOADS */}
      <Card
        id="cv-dropzone"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleFilesSelected(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-xl border-2 border-dashed transition-all bg-card shadow-xs relative overflow-hidden",
          isDragOver
            ? "border-primary bg-primary/5 ring-4 ring-primary/10"
            : "border-border hover:border-primary/40"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="cv-file-input"
          multiple
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />

        <CardContent className="flex flex-col items-center justify-center p-8 sm:p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 shadow-xs">
            <UploadCloud className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            Glissez-déposez vos CVs ou parcourez vos dossiers
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Formats acceptés : <strong>PDF, DOCX, TXT</strong> jusqu&apos;à 10 Mo par document. L&apos;analyse OCR et l&apos;extraction d&apos;entités se lancent immédiatement.
          </p>

          <div className="mt-4 flex items-center gap-3">
            <Button
              type="button"
              id="browse-files-button"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2 text-xs font-semibold h-9 rounded-lg"
            >
              <FileUp className="h-4 w-4" />
              Parcourir les fichiers
            </Button>
          </div>
        </CardContent>

        {/* Liste des fichiers en cours d'upload avec barre de progression shadcn */}
        {uploadingFiles.length > 0 && (
          <div className="border-t border-border bg-muted/20 p-4 space-y-3">
            <p className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Téléversements en cours ({uploadingFiles.length})</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                Traitement asynchrone sécurisé
              </span>
            </p>

            <div className="space-y-2">
              {uploadingFiles.map((up) => (
                <div
                  key={up.id}
                  className="rounded-lg border border-border bg-background p-3 text-xs space-y-2 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-semibold text-foreground truncate">
                        {up.name}
                      </span>
                      <span className="text-muted-foreground text-[11px] shrink-0">
                        ({(up.size / (1024 * 1024)).toFixed(2)} Mo)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!up.error && (
                        <span className="text-[11px] font-mono font-medium text-primary">
                          {up.progress}%
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCancelUpload(up.id)}
                        className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Annuler le téléversement"
                        aria-label="Annuler"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {!up.error ? (
                    <Progress value={up.progress} className="h-1.5" />
                  ) : (
                    <div className="flex items-center gap-1.5 text-destructive text-[11px] font-medium pt-0.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{up.error}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 3. TABLEAU DES DOCUMENTS & ONGLETS */}
      <Card className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {/* En-tête avec onglets et champ de recherche */}
        <div className="p-4 sm:p-5 border-b border-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Composant Tabs shadcn */}
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                setActiveTab(val as "tous" | "a_valider" | "echec");
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid grid-cols-3 w-full sm:w-auto h-9">
                <TabsTrigger value="tous" className="text-xs">
                  Tous ({countTous})
                </TabsTrigger>
                <TabsTrigger value="a_valider" className="text-xs">
                  À valider ({countAValider})
                </TabsTrigger>
                <TabsTrigger value="echec" className="text-xs">
                  Échecs ({countEchec})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Champ de recherche par nom de fichier */}
            <div className="relative w-full sm:w-72">
              <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                id="search-filename-input"
                placeholder="Rechercher par nom de fichier..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 pl-9 pr-8 text-xs rounded-lg"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Corps du tableau */}
        {isLoading ? (
          <div className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du fichier</TableHead>
                  <TableHead>Date d&apos;upload</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Score de confiance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={5} />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : isError ? (
          <div className="p-8 text-center space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive mx-auto">
              <AlertCircle className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Erreur lors du chargement des documents
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Réessayer
            </Button>
          </div>
        ) : paginatedCvs.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={FileCheck}
              title={
                searchQuery
                  ? "Aucun CV ne correspond à votre recherche"
                  : "Aucun CV dans cette catégorie"
              }
              description={
                searchQuery
                  ? "Vérifiez l'orthographe du nom de fichier ou réinitialisez le champ de recherche."
                  : "Déposez vos premiers fichiers PDF ou DOCX ci-dessus pour amorcer l'ingestion."
              }
              action={
                searchQuery ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="text-xs"
                  >
                    Effacer la recherche
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs gap-1.5"
                  >
                    <UploadCloud className="h-3.5 w-3.5" /> Téléverser un CV
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    onClick={() => handleSort("nomFichier")}
                    className="cursor-pointer select-none hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Nom du fichier</span>
                      {sortField === "nomFichier" ? (
                        sortOrder === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead
                    onClick={() => handleSort("dateUpload")}
                    className="cursor-pointer select-none hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date</span>
                      {sortField === "dateUpload" ? (
                        sortOrder === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead
                    onClick={() => handleSort("statut")}
                    className="cursor-pointer select-none hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Statut</span>
                      {sortField === "statut" ? (
                        sortOrder === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead
                    onClick={() => handleSort("scoreConfiance")}
                    className="cursor-pointer select-none hover:text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Score de confiance</span>
                      {sortField === "scoreConfiance" ? (
                        sortOrder === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5 text-primary" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </div>
                  </TableHead>

                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedCvs.map((cv) => (
                  <TableRow key={cv.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2.5 max-w-[280px] sm:max-w-none">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <div className="truncate">
                          <p className="truncate text-xs font-semibold">{cv.nomFichier}</p>
                          {cv.extrait?.nom && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {cv.extrait.nom} {cv.extrait.poste ? `• ${cv.extrait.poste}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {cv.dateUpload}
                    </TableCell>

                    <TableCell>
                      {cv.statut === "ok" && (
                        <Badge
                          variant="outline"
                          className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 font-semibold gap-1 text-[11px]"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Conforme
                        </Badge>
                      )}
                      {cv.statut === "a_valider" && (
                        <Badge
                          variant="outline"
                          className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold gap-1 text-[11px]"
                        >
                          <Clock className="h-3 w-3" /> À valider (
                          {cv.champsAVerifier.length})
                        </Badge>
                      )}
                      {cv.statut === "echec" && (
                        <Badge
                          variant="outline"
                          className="bg-destructive/10 text-destructive border-destructive/30 font-semibold gap-1 text-[11px]"
                        >
                          <XCircle className="h-3 w-3" /> Échec OCR
                        </Badge>
                      )}
                      {cv.statut === "en_cours" && (
                        <Badge
                          variant="outline"
                          className="bg-primary/10 text-primary border-primary/30 font-semibold gap-1 text-[11px] animate-pulse"
                        >
                          <RefreshCw className="h-3 w-3 animate-spin" /> En cours d&apos;analyse
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ScoreBadge
                          value={cv.scoreConfiance}
                          size="sm"
                          showLabel={false}
                        />
                        <span className="text-xs font-mono font-medium text-foreground">
                          {cv.scoreConfiance}%
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenView(cv)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          title="Aperçu du document"
                          aria-label="Aperçu"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {cv.statut === "a_valider" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(cv)}
                            className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                            title="Vérifier et corriger"
                            aria-label="Corriger"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination si plus de 10 lignes */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-border flex items-center justify-between gap-4">
                <span className="text-xs text-muted-foreground">
                  Affichage de {(currentPage - 1) * ITEMS_PER_PAGE + 1} à{" "}
                  {Math.min(currentPage * ITEMS_PER_PAGE, sortedCvs.length)} sur{" "}
                  {sortedCvs.length} documents
                </span>

                <Pagination className="justify-end w-auto mx-0">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      />
                    </PaginationItem>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (pNum) => (
                        <PaginationItem key={pNum}>
                          <PaginationLink
                            isActive={currentPage === pNum}
                            onClick={() => setCurrentPage(pNum)}
                          >
                            {pNum}
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
        )}
      </Card>

      {/* 4. DIALOG DE REVUE MANUELLE (2 colonnes : aperçu à gauche / formulaire à droite) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Revue et validation humaine de CV</span>
                  <Badge
                    variant="outline"
                    className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]"
                  >
                    À valider
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Fichier : <span className="font-mono text-foreground">{editingCv?.nomFichier}</span> • Date d&apos;upload : {editingCv?.dateUpload}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {editingCv && (
            <form onSubmit={handleSubmit(onSubmitCorrection)}>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6">
                {/* COLONNE GAUCHE : Zone simulant l'aperçu PDF (5 colonnes) */}
                <div className="md:col-span-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Aperçu du document source
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {editingCv.taille || "PDF"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border bg-muted/40 p-4 min-h-[360px] flex flex-col items-center justify-center text-center space-y-3">
                    <div className="h-16 w-16 rounded-2xl bg-background border border-border shadow-xs flex items-center justify-center text-primary">
                      <FileText className="h-8 w-8" />
                    </div>
                    <div className="space-y-1 max-w-[220px]">
                      <p className="text-xs font-bold text-foreground break-all">
                        {editingCv.nomFichier}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Document scanné avec extraction automatique des blocs textuels.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border/60 w-full space-y-2 text-left">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                        Champs nécessitant confirmation :
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {editingCv.champsAVerifier.map((champ) => (
                          <Badge
                            key={champ}
                            variant="outline"
                            className="text-[10px] font-mono bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/40"
                          >
                            {champ}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLONNE DROITE : Formulaire React Hook Form (7 colonnes) */}
                <div className="md:col-span-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Données extraites par le modèle
                    </span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      Bordure orange = champ à vérifier
                    </span>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    {/* Nom du candidat */}
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">
                        Nom complet du candidat
                      </label>
                      <Input
                        {...register("nom")}
                        className={cn(
                          "h-9 text-xs rounded-lg",
                          editingCv.champsAVerifier.includes("nom") &&
                            "border-amber-500 focus-visible:ring-amber-500 bg-amber-50/20 dark:bg-amber-950/20"
                        )}
                      />
                    </div>

                    {/* Poste ciblé / actuel */}
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">
                        Poste identifié
                      </label>
                      <Input
                        {...register("poste")}
                        className={cn(
                          "h-9 text-xs rounded-lg",
                          editingCv.champsAVerifier.includes("poste") &&
                            "border-amber-500 focus-visible:ring-amber-500 bg-amber-50/20 dark:bg-amber-950/20"
                        )}
                      />
                    </div>

                    {/* Années d'expérience */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-foreground">
                          Années d&apos;expérience
                        </label>
                        <Input
                          type="number"
                          {...register("experienceAnnees", {
                            valueAsNumber: true,
                          })}
                          className={cn(
                            "h-9 text-xs rounded-lg font-mono",
                            editingCv.champsAVerifier.includes(
                              "experienceAnnees"
                            ) &&
                              "border-amber-500 focus-visible:ring-amber-500 bg-amber-50/20 dark:bg-amber-950/20"
                          )}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-foreground">
                          Téléphone
                        </label>
                        <Input
                          {...register("telephone")}
                          className={cn(
                            "h-9 text-xs rounded-lg font-mono",
                            editingCv.champsAVerifier.includes("telephone") &&
                              "border-amber-500 focus-visible:ring-amber-500 bg-amber-50/20 dark:bg-amber-950/20"
                          )}
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">
                        Adresse e-mail
                      </label>
                      <Input
                        {...register("email")}
                        className={cn(
                          "h-9 text-xs rounded-lg font-mono",
                          editingCv.champsAVerifier.includes("email") &&
                            "border-amber-500 focus-visible:ring-amber-500 bg-amber-50/20 dark:bg-amber-950/20"
                        )}
                      />
                    </div>

                    {/* Compétences clés */}
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">
                        Compétences clés extraites (séparées par des virgules)
                      </label>
                      <Input
                        {...register("competences")}
                        className={cn(
                          "h-9 text-xs rounded-lg",
                          editingCv.champsAVerifier.includes("competences") &&
                            "border-amber-500 focus-visible:ring-amber-500 bg-amber-50/20 dark:bg-amber-950/20"
                        )}
                      />
                    </div>

                    {/* Formation */}
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">
                        Formation / Diplôme principal
                      </label>
                      <Input
                        {...register("formation")}
                        className={cn(
                          "h-9 text-xs rounded-lg",
                          editingCv.champsAVerifier.includes("formation") &&
                            "border-amber-500 focus-visible:ring-amber-500 bg-amber-50/20 dark:bg-amber-950/20"
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="p-6 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRejectCv}
                  disabled={isSubmitting || mutationValidate.isPending}
                  className="w-full sm:w-auto text-destructive hover:bg-destructive/10 border-destructive/30 gap-1.5 text-xs h-9"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Rejeter le CV
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDialogOpen(false)}
                    className="text-xs h-9"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting || mutationValidate.isPending}
                    className="text-xs gap-1.5 h-9 font-medium"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Valider et intégrer
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 5. DIALOG D'INSPECTION SIMPLE (Icône Eye) */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>Détails du document</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {viewingCv?.nomFichier}
            </DialogDescription>
          </DialogHeader>

          {viewingCv && (
            <div className="space-y-3 text-xs pt-2">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border border-border bg-muted/30">
                <div>
                  <span className="text-muted-foreground text-[11px]">Statut :</span>
                  <p className="font-semibold text-foreground capitalize">
                    {viewingCv.statut}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Score OCR :</span>
                  <p className="font-semibold text-foreground font-mono">
                    {viewingCv.scoreConfiance}%
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Taille :</span>
                  <p className="font-medium text-foreground">{viewingCv.taille || "N/A"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Date :</span>
                  <p className="font-medium text-foreground">{viewingCv.dateUpload}</p>
                </div>
              </div>

              {viewingCv.motifEchec && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-xs">
                  <strong>Raison de l&apos;échec :</strong> {viewingCv.motifEchec}
                </div>
              )}

              <div className="space-y-1.5 p-3 rounded-lg border border-border bg-card">
                <span className="font-semibold text-foreground">Extrait textuel :</span>
                <p className="text-muted-foreground">
                  <strong>Candidat :</strong> {viewingCv.extrait?.nom || "Inconnu"}
                </p>
                <p className="text-muted-foreground">
                  <strong>Poste :</strong> {viewingCv.extrait?.poste || "Non identifié"}
                </p>
                <p className="text-muted-foreground">
                  <strong>Compétences :</strong> {viewingCv.extrait?.competences || "N/A"}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsViewDialogOpen(false)}
              className="text-xs"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
