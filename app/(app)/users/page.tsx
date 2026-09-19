"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Shield,
  UserPlus,
  Trash2,
  AlertTriangle,
  Mail,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  UserCheck,
  Building,
} from "lucide-react";
import { z } from "zod";
import { useAppStore } from "@/lib/store";
import {
  getUsers,
  inviteUser,
  updateUserRole,
  revokeUser,
  Collaborateur,
  CollaborateurRole,
} from "@/lib/api/users";
import { SkeletonTableRow } from "@/components/shared/skeleton-table-row";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Schéma Zod pour l'invitation
const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L'adresse email est requise.")
    .email("Veuillez saisir une adresse email valide."),
  role: z.enum(["recruteur", "rh_interne", "admin"] as const),
});

const ROLE_DESCRIPTIONS: Record<CollaborateurRole, string> = {
  recruteur:
    "Accès standard : recherche sémantique de profils, consultation des CVs et création de synthèses.",
  rh_interne:
    "Accès étendu : gestion des seuils de pertinence, filtres avancés, anonymisation et recherche sémantique.",
  admin:
    "Accès total : gouvernance RGPD, gestion des utilisateurs, dictionnaire de synonymes et paramètres système.",
};

export default function UsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentUser } = useAppStore();

  // Contrôle d'accès RBAC : Admin uniquement
  const isAuthorized = currentUser?.role === "admin";

  useEffect(() => {
    if (!isAuthorized) {
      toast.error("Accès restreint", {
        description:
          "La gestion des collaborateurs et des accès est réservée aux administrateurs.",
      });
      router.replace("/search");
    }
  }, [isAuthorized, router]);

  // État de recherche local
  const [search, setSearch] = useState("");

  // État du Dialog "Inviter un collaborateur"
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CollaborateurRole>("recruteur");
  const [emailValidationError, setEmailValidationError] = useState<string | null>(
    null
  );
  const [apiInviteError, setApiInviteError] = useState<string | null>(null);

  // État du Dialog de révocation
  const [userToRevoke, setUserToRevoke] = useState<Collaborateur | null>(
    null
  );

  // TanStack Query pour charger les utilisateurs
  const {
    data: users = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["users-list"],
    queryFn: getUsers,
    enabled: isAuthorized,
  });

  // Mutation : Inviter un collaborateur
  const mutationInvite = useMutation({
    mutationFn: ({
      email,
      role,
    }: {
      email: string;
      role: CollaborateurRole;
    }) => inviteUser(email, role),
    onSuccess: (newUser) => {
      queryClient.setQueryData<Collaborateur[]>(
        ["users-list"],
        (old = []) => [newUser, ...old]
      );
      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("recruteur");
      setEmailValidationError(null);
      setApiInviteError(null);
      toast.success("Invitation envoyée avec succès", {
        description: `Un lien d'activation a été adressé à ${newUser.email}.`,
      });
    },
    onError: (err: any) => {
      setApiInviteError(err?.message || "Échec de l'envoi de l'invitation.");
    },
  });

  // Mutation : Modifier le rôle inline
  const mutationUpdateRole = useMutation({
    mutationFn: ({
      id,
      newRole,
    }: {
      id: string;
      newRole: CollaborateurRole;
    }) => updateUserRole(id, newRole),
    onSuccess: (updated) => {
      queryClient.setQueryData<Collaborateur[]>(
        ["users-list"],
        (old = []) => old.map((u) => (u.id === updated.id ? updated : u))
      );
      toast.success("Rôle mis à jour", {
        description: `Le rôle de ${updated.nom} a été modifié en ${getRoleLabel(
          updated.role
        )}.`,
      });
    },
    onError: () => {
      toast.error("Erreur lors de la modification du rôle.");
    },
  });

  // Mutation : Révoquer un collaborateur
  const mutationRevoke = useMutation({
    mutationFn: (id: string) => revokeUser(id),
    onSuccess: (_, revokedId) => {
      queryClient.setQueryData<Collaborateur[]>(
        ["users-list"],
        (old = []) => old.filter((u) => u.id !== revokedId)
      );
      setUserToRevoke(null);
      toast.success("Accès révoqué", {
        description: "L'utilisateur a été retiré de l'organisation.",
      });
    },
    onError: () => {
      toast.error("Échec de la révocation.");
    },
  });

  // Soumission du formulaire d'invitation avec validation Zod
  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailValidationError(null);
    setApiInviteError(null);

    const validation = inviteSchema.safeParse({
      email: inviteEmail,
      role: inviteRole,
    });

    if (!validation.success) {
      const fieldError = validation.error.flatten().fieldErrors.email?.[0];
      setEmailValidationError(fieldError || "Email non valide.");
      return;
    }

    mutationInvite.mutate({
      email: inviteEmail,
      role: inviteRole,
    });
  };

  const getRoleLabel = (role: CollaborateurRole) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "rh_interne":
        return "RH Interne";
      case "recruteur":
        return "Recruteur";
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: CollaborateurRole) => {
    switch (role) {
      case "admin":
        return "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300";
      case "rh_interne":
        return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
      case "recruteur":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
      default:
        return "border-border bg-muted text-muted-foreground";
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase().trim();
    return (
      u.nom.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 1. EN-TÊTE DE LA PAGE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Users className="h-6 w-6 text-primary" />
            <span>Gestion des Collaborateurs</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Gouvernance des accès d&apos;équipe, rôles RBAC et invitations au sein de l&apos;organisation.
          </p>
        </div>

        <Button
          id="invite-collaborator-button"
          size="sm"
          onClick={() => {
            setInviteEmail("");
            setInviteRole("recruteur");
            setEmailValidationError(null);
            setApiInviteError(null);
            setIsInviteDialogOpen(true);
          }}
          className="gap-2 text-xs font-semibold h-9 rounded-lg"
        >
          <UserPlus className="h-4 w-4" />
          Inviter un collaborateur
        </Button>
      </div>

      {/* 2. TABLEAU DES UTILISATEURS */}
      <Card className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {/* Barre d'action et filtre */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher par nom, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 pr-3 text-xs rounded-lg bg-background"
            />
          </div>

          <span className="text-xs font-mono text-muted-foreground">
            {filteredUsers.length} collaborateur{filteredUsers.length > 1 ? "s" : ""}
          </span>
        </div>

        {/* Tableau */}
        {isLoading ? (
          <div className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date d&apos;ajout</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonTableRow key={i} columns={6} />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : isError ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-sm font-semibold text-destructive">
              Erreur lors du chargement des collaborateurs.
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
        ) : filteredUsers.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={Users}
              title={
                users.length === 0
                  ? "Aucun collaborateur enregistré"
                  : "Aucun résultat trouvé"
              }
              description={
                users.length === 0
                  ? "Votre organisation vient d'être créée. Invitez vos premiers collègues (RH, recruteurs ou administrateurs) pour collaborer."
                  : "Aucun membre ne correspond à votre recherche."
              }
              action={
                users.length === 0 ? (
                  <Button
                    size="sm"
                    onClick={() => setIsInviteDialogOpen(true)}
                    className="text-xs gap-1.5"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Inviter le premier membre
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <>
            {/* Desktop/tablette (≥md) : tableau complet */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date d&apos;ajout</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const isCurrentLoggedIn = currentUser?.email === user.email;

                    return (
                      <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                        {/* Nom */}
                        <TableCell className="font-semibold text-foreground">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                              {user.nom
                                .split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">
                                {user.nom}
                                {isCurrentLoggedIn && (
                                  <span className="ml-2 text-[10px] text-muted-foreground font-normal">
                                    (Vous)
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] font-mono text-muted-foreground">
                                {user.id}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Email */}
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {user.email}
                        </TableCell>

                        {/* Rôle avec Badge coloré */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[11px] font-semibold gap-1",
                              getRoleBadgeVariant(user.role)
                            )}
                          >
                            <Shield className="h-3 w-3" />
                            {getRoleLabel(user.role)}
                          </Badge>
                        </TableCell>

                        {/* Statut */}
                        <TableCell>
                          {user.statut === "actif" ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-semibold gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Actif
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-semibold gap-1"
                            >
                              <Clock className="h-3 w-3" /> Invitation en attente
                            </Badge>
                          )}
                        </TableCell>

                        {/* Date d'ajout */}
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {user.dateAjout}
                        </TableCell>

                        {/* Actions : Select inline pour rôle + bouton Révoquer */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Select inline de rôle */}
                            <div className="w-32 text-left">
                              <Select
                                value={user.role}
                                onValueChange={(val: CollaborateurRole) => {
                                  if (val !== user.role) {
                                    mutationUpdateRole.mutate({
                                      id: user.id,
                                      newRole: val,
                                    });
                                  }
                                }}
                                disabled={isCurrentLoggedIn || mutationUpdateRole.isPending}
                              >
                                <SelectTrigger className="h-7 text-[11px] bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent align="end">
                                  <SelectItem value="recruteur">Recruteur</SelectItem>
                                  <SelectItem value="rh_interne">RH Interne</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Bouton Révoquer */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUserToRevoke(user)}
                              disabled={isCurrentLoggedIn}
                              title={
                                isCurrentLoggedIn
                                  ? "Vous ne pouvez pas révoquer votre propre compte"
                                  : "Révoquer l'accès"
                              }
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile (<md) : liste de cartes empilées, table 6 colonnes + select inline illisibles en scroll horizontal */}
            <div className="md:hidden divide-y divide-border">
              {filteredUsers.map((user) => {
                const isCurrentLoggedIn = currentUser?.email === user.email;

                return (
                  <div key={user.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {user.nom
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">
                            {user.nom}
                            {isCurrentLoggedIn && (
                              <span className="ml-2 text-[10px] text-muted-foreground font-normal">
                                (Vous)
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {user.statut === "actif" ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-semibold gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Actif
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="shrink-0 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] font-semibold gap-1"
                        >
                          <Clock className="h-3 w-3" /> En attente
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] font-semibold gap-1",
                          getRoleBadgeVariant(user.role)
                        )}
                      >
                        <Shield className="h-3 w-3" />
                        {getRoleLabel(user.role)}
                      </Badge>
                      <span>Ajouté le {user.dateAjout}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex-1">
                        <Select
                          value={user.role}
                          onValueChange={(val: CollaborateurRole) => {
                            if (val !== user.role) {
                              mutationUpdateRole.mutate({
                                id: user.id,
                                newRole: val,
                              });
                            }
                          }}
                          disabled={isCurrentLoggedIn || mutationUpdateRole.isPending}
                        >
                          <SelectTrigger className="h-8 text-[11px] bg-background w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="recruteur">Recruteur</SelectItem>
                            <SelectItem value="rh_interne">RH Interne</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUserToRevoke(user)}
                        disabled={isCurrentLoggedIn}
                        title={
                          isCurrentLoggedIn
                            ? "Vous ne pouvez pas révoquer votre propre compte"
                            : "Révoquer l'accès"
                        }
                        className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* 3. DIALOG : INVITER UN COLLABORATEUR */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <UserPlus className="h-5 w-5 text-primary" />
              <span>Inviter un collaborateur</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Transmettez une invitation sécurisée pour intégrer l&apos;espace de recrutement.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendInvite} className="space-y-4 pt-2">
            {/* Champ Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Adresse email professionnelle</span>
              </label>
              <Input
                type="email"
                placeholder="collegue@talentai.internal"
                value={inviteEmail}
                onChange={(e) => {
                  setInviteEmail(e.target.value);
                  if (emailValidationError) setEmailValidationError(null);
                  if (apiInviteError) setApiInviteError(null);
                }}
                className={cn(
                  "h-9 text-xs rounded-lg",
                  (emailValidationError || apiInviteError) &&
                    "border-destructive focus-visible:ring-destructive"
                )}
              />

              {emailValidationError && (
                <p className="text-[11px] text-destructive font-medium">
                  {emailValidationError}
                </p>
              )}

              {apiInviteError && (
                <p className="text-[11px] text-destructive font-medium">
                  {apiInviteError}
                </p>
              )}
            </div>

            {/* Select Rôle avec description dynamique */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Rôle attribué</span>
              </label>
              <Select
                value={inviteRole}
                onValueChange={(val: CollaborateurRole) => setInviteRole(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recruteur">Recruteur</SelectItem>
                  <SelectItem value="rh_interne">RH Interne</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>

              {/* Description courte affichée sous le select selon le choix */}
              <div className="rounded-lg bg-muted/40 p-2.5 border border-border/60 text-[11px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground font-semibold">
                  {getRoleLabel(inviteRole)} :
                </strong>{" "}
                {ROLE_DESCRIPTIONS[inviteRole]}
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsInviteDialogOpen(false)}
                className="text-xs"
              >
                Annuler
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={mutationInvite.isPending}
                className="text-xs font-semibold gap-1.5"
              >
                {mutationInvite.isPending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Mail className="h-3.5 w-3.5" />
                    Envoyer l&apos;invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 4. DIALOG DE CONFIRMATION DE RÉVOCATION */}
      <Dialog
        open={Boolean(userToRevoke)}
        onOpenChange={(open) => !open && setUserToRevoke(null)}
      >
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>Révoquer l&apos;accès du collaborateur</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Êtes-vous certain de vouloir révoquer l&apos;accès de{" "}
              <strong>{userToRevoke?.nom}</strong> ({userToRevoke?.email}) ?
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive space-y-1 my-2">
            <p className="font-semibold">Conséquence immédiate :</p>
            <p className="text-[11px] leading-relaxed">
              L&apos;utilisateur sera immédiatement déconnecté et ses droits d&apos;accès révoqués de la plateforme.
            </p>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUserToRevoke(null)}
              disabled={mutationRevoke.isPending}
              className="text-xs"
            >
              Annuler
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={mutationRevoke.isPending}
              onClick={() => {
                if (userToRevoke) {
                  mutationRevoke.mutate(userToRevoke.id);
                }
              }}
              className="text-xs font-bold gap-1.5"
            >
              {mutationRevoke.isPending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Révocation...
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5" />
                  Confirmer la révocation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
