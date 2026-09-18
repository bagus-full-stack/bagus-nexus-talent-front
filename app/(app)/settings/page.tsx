"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { useTheme } from "next-themes";
import {
  Settings,
  User as UserIcon,
  Palette,
  Sliders,
  BookOpen,
  Bell,
  Check,
  Plus,
  Trash2,
  Search,
  Lock,
  Mail,
  Shield,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  Info,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useIsClient } from "@/hooks/use-is-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// Interface pour les synonymes
interface SynonymPair {
  id: string;
  termeA: string;
  termeB: string;
  dateAjout: string;
}

// Données initiales pour les synonymes
const INITIAL_SYNONYMS: SynonymPair[] = [
  {
    id: "syn-1",
    termeA: "React.js",
    termeB: "ReactJS",
    dateAjout: "10 Septembre 2026",
  },
  {
    id: "syn-2",
    termeA: "Next.js",
    termeB: "NextJS",
    dateAjout: "10 Septembre 2026",
  },
  {
    id: "syn-3",
    termeA: "PostgreSQL",
    termeB: "Postgres",
    dateAjout: "12 Septembre 2026",
  },
  {
    id: "syn-4",
    termeA: "DevOps",
    termeB: "SRE",
    dateAjout: "14 Septembre 2026",
  },
  {
    id: "syn-5",
    termeA: "TypeScript",
    termeB: "TS",
    dateAjout: "15 Septembre 2026",
  },
];

// Interface pour les notifications
interface NotificationSetting {
  id: string;
  titre: string;
  description: string;
  email: boolean;
  inApp: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationSetting[] = [
  {
    id: "new_match",
    titre: "Nouveau candidat à forte correspondance (>85%)",
    description: "Alertes automatiques dès qu'un profil pertinent correspond à un besoin ouvert.",
    email: true,
    inApp: true,
  },
  {
    id: "cv_processed",
    titre: "Traitement et vectorisation de CV achevé",
    description: "Notification de complétion après extraction OCR et enrichissement sémantique.",
    email: false,
    inApp: true,
  },
  {
    id: "gdpr_deadline",
    titre: "Demande RGPD reçue ou échéance de rétention",
    description: "Rappels sur les droits d'accès, d'anonymisation et de suppression légale.",
    email: true,
    inApp: true,
  },
  {
    id: "weekly_digest",
    titre: "Rapport d'activité hebdomadaire de l'équipe",
    description: "Synthèse analytique du pipeline de recrutement et métriques de sélection.",
    email: true,
    inApp: false,
  },
];

export default function SettingsPage() {
  const isClient = useIsClient();
  const { currentUser, setUser, theme, setTheme, displayDensity, setDisplayDensity } =
    useAppStore();
  const { theme: nextTheme, setTheme: setNextTheme } = useTheme();

  // Rôle de l'utilisateur actuel
  const userRole = currentUser?.role || "recruteur";
  const isAdmin = userRole === "admin";
  const isRhOrAdmin = userRole === "rh" || userRole === "admin";

  // Liste conditionnelle des onglets autorisés
  const availableTabs = [
    { id: "profil", label: "Profil", icon: UserIcon, allowed: true },
    { id: "affichage", label: "Affichage", icon: Palette, allowed: true },
    { id: "recherche", label: "Recherche", icon: Sliders, allowed: isRhOrAdmin },
    { id: "synonymes", label: "Synonymes", icon: BookOpen, allowed: isAdmin },
    { id: "notifications", label: "Notifications", icon: Bell, allowed: true },
  ].filter((tab) => tab.allowed);

  const [selectedTab, setSelectedTab] = useState<string>("profil");

  // Dérivation directe de l'onglet actif : retombe sur "profil" si le rôle ne donne plus accès
  const activeTab = availableTabs.some((t) => t.id === selectedTab)
    ? selectedTab
    : "profil";

  // État pour les feedbacks "Enregistré" (sauvegarde auto debouncée)
  const [savedFields, setSavedFields] = useState<Record<string, boolean>>({});
  const triggerSavedIndicator = (fieldKey: string) => {
    setSavedFields((prev) => ({ ...prev, [fieldKey]: true }));
    setTimeout(() => {
      setSavedFields((prev) => ({ ...prev, [fieldKey]: false }));
    }, 2000);
  };

  // --------------------------------------------------------------------------
  // 1. ONGLET PROFIL (React Hook Form + mot de passe)
  // --------------------------------------------------------------------------
  const [avatarPreview, setAvatarPreview] = useState(
    currentUser?.avatar || "AV"
  );

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
  } = useForm({
    defaultValues: {
      nom: currentUser?.name || "Alexandre V.",
      email: currentUser?.email || "alexandre.v@talentai.internal",
      avatar: currentUser?.avatar || "AV",
      currentPassword: "",
      newPassword: "",
    },
  });

  // Sauvegarde automatique du profil lors de la frappe (débouncée)
  const [profileSaveTimeout, setProfileSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const handleProfileFieldChange = (fieldName: "nom" | "email" | "avatar", val: string) => {
    if (profileSaveTimeout) clearTimeout(profileSaveTimeout);
    const timeout = setTimeout(() => {
      if (currentUser) {
        setUser({
          ...currentUser,
          [fieldName === "nom" ? "name" : fieldName]: val,
        });
      }
      triggerSavedIndicator(`profile_${fieldName}`);
    }, 500);
    setProfileSaveTimeout(timeout);
  };

  const handlePasswordChange = () => {
    triggerSavedIndicator("password_change");
  };

  // --------------------------------------------------------------------------
  // 2. ONGLET AFFICHAGE (Thème + Densité stockée dans le store)
  // --------------------------------------------------------------------------
  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    setNextTheme(newTheme);
    triggerSavedIndicator("theme_setting");
  };

  const handleDensityChange = (newDensity: "compact" | "comfortable") => {
    setDisplayDensity(newDensity);
    triggerSavedIndicator("density_setting");
  };

  // --------------------------------------------------------------------------
  // 3. ONGLET RECHERCHE (Slider confiance, TOP_K_LLM, Anonymisation)
  // --------------------------------------------------------------------------
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(70);
  const [topKLlm, setTopKLlm] = useState<number>(5);
  const [topKError, setTopKError] = useState<string | null>(null);
  const [defaultAnonymization, setDefaultAnonymization] = useState<boolean>(false);

  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const handleConfidenceChange = (val: number[]) => {
    const num = val[0] ?? 70;
    setConfidenceThreshold(num);
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    const timer = setTimeout(() => {
      triggerSavedIndicator("confidence_threshold");
    }, 500);
    setSearchDebounceTimer(timer);
  };

  const handleTopKChange = (valStr: string) => {
    const num = parseInt(valStr, 10);
    setTopKLlm(isNaN(num) ? 0 : num);

    if (isNaN(num) || num < 3 || num > 15) {
      setTopKError("La valeur de TOP_K_LLM doit être comprise entre 3 et 15.");
      return;
    }

    setTopKError(null);
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    const timer = setTimeout(() => {
      triggerSavedIndicator("top_k_llm");
    }, 500);
    setSearchDebounceTimer(timer);
  };

  const handleAnonymizationToggle = (checked: boolean) => {
    setDefaultAnonymization(checked);
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    const timer = setTimeout(() => {
      triggerSavedIndicator("anonymization_toggle");
    }, 500);
    setSearchDebounceTimer(timer);
  };

  // --------------------------------------------------------------------------
  // 4. ONGLET SYNONYMES (Terme A / Terme B + suppression + recherche)
  // --------------------------------------------------------------------------
  const [synonyms, setSynonyms] = useState<SynonymPair[]>(INITIAL_SYNONYMS);
  const [searchSynonym, setSearchSynonym] = useState("");
  const [newTermA, setNewTermA] = useState("");
  const [newTermB, setNewTermB] = useState("");
  const [synonymError, setSynonymError] = useState<string | null>(null);

  const handleAddSynonym = (e: React.FormEvent) => {
    e.preventDefault();
    setSynonymError(null);

    const a = newTermA.trim();
    const b = newTermB.trim();

    if (!a || !b) {
      setSynonymError("Les deux termes sont requis.");
      return;
    }

    const pair: SynonymPair = {
      id: `syn-${Date.now().toString().slice(-4)}`,
      termeA: a,
      termeB: b,
      dateAjout: new Date().toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };

    setSynonyms([pair, ...synonyms]);
    setNewTermA("");
    setNewTermB("");
    triggerSavedIndicator("synonym_add");
  };

  const handleDeleteSynonym = (id: string) => {
    setSynonyms(synonyms.filter((s) => s.id !== id));
    triggerSavedIndicator("synonym_table");
  };

  const filteredSynonyms = synonyms.filter((s) => {
    const q = searchSynonym.toLowerCase().trim();
    return s.termeA.toLowerCase().includes(q) || s.termeB.toLowerCase().includes(q);
  });

  // --------------------------------------------------------------------------
  // 5. ONGLET NOTIFICATIONS (Événements avec toggles Email / In-app)
  // --------------------------------------------------------------------------
  const [notifications, setNotifications] = useState<NotificationSetting[]>(
    INITIAL_NOTIFICATIONS
  );

  const handleNotificationToggle = (
    id: string,
    channel: "email" | "inApp",
    val: boolean
  ) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, [channel]: val } : notif
      )
    );
    triggerSavedIndicator(`notif_${id}_${channel}`);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* En-tête principal */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-primary" />
          <span>Paramètres de la Plateforme</span>
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Personnalisation de votre compte, réglages du moteur sémantique, synonymes et alertes.
        </p>
      </div>

      {/* Structure à onglets verticaux à gauche */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Navigation verticale latérale gauche */}
        <aside className="md:col-span-3 space-y-1 bg-card border border-border rounded-xl p-2 shadow-xs">
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-3 py-2">
            Configuration
          </p>
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setSelectedTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all text-left",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Contenu principal de l'onglet actif */}
        <main className="md:col-span-9 space-y-6">
          {/* ========================================================================= */}
          {/* ONGLET 1 : PROFIL */}
          {/* ========================================================================= */}
          {activeTab === "profil" && (
            <Card className="rounded-xl border border-border bg-card shadow-xs">
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-primary" />
                    <span>Profil & Identité professionnelle</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Mettez à jour vos coordonnées et identifiants. Les modifications sont enregistrées automatiquement.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  {/* Nom complet */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">
                        Nom complet
                      </label>
                      {savedFields["profile_nom"] && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                          <CheckCircle2 className="h-3 w-3" /> Enregistré
                        </span>
                      )}
                    </div>
                    <Input
                      {...registerProfile("nom")}
                      onChange={(e) => {
                        registerProfile("nom").onChange(e);
                        handleProfileFieldChange("nom", e.target.value);
                      }}
                      className="h-9 text-xs rounded-lg"
                    />
                  </div>

                  {/* Adresse email */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">
                        Adresse email
                      </label>
                      {savedFields["profile_email"] && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                          <CheckCircle2 className="h-3 w-3" /> Enregistré
                        </span>
                      )}
                    </div>
                    <Input
                      type="email"
                      {...registerProfile("email")}
                      onChange={(e) => {
                        registerProfile("email").onChange(e);
                        handleProfileFieldChange("email", e.target.value);
                      }}
                      className="h-9 text-xs rounded-lg font-mono"
                    />
                  </div>

                  {/* Initiales / Avatar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">
                        Initiales de l&apos;avatar
                      </label>
                      {savedFields["profile_avatar"] && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                          <CheckCircle2 className="h-3 w-3" /> Enregistré
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                        {avatarPreview || "AV"}
                      </div>
                      <Input
                        maxLength={3}
                        {...registerProfile("avatar")}
                        onChange={(e) => {
                          const upper = e.target.value.toUpperCase();
                          setAvatarPreview(upper);
                          registerProfile("avatar").onChange(e);
                          handleProfileFieldChange("avatar", upper);
                        }}
                        className="h-9 text-xs rounded-lg max-w-[120px] uppercase font-mono"
                      />
                    </div>
                  </div>

                  {/* Séparateur */}
                  <div className="border-t border-border pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>Changement de mot de passe</span>
                      </h4>
                      {savedFields["password_change"] && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                          <CheckCircle2 className="h-3 w-3" /> Enregistré
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Mot de passe actuel
                        </label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...registerProfile("currentPassword")}
                          className="h-9 text-xs rounded-lg"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Nouveau mot de passe
                        </label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...registerProfile("newPassword")}
                          className="h-9 text-xs rounded-lg"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handlePasswordChange}
                        className="text-xs font-semibold h-8 rounded-lg"
                      >
                        Mettre à jour le mot de passe
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ========================================================================= */}
          {/* ONGLET 2 : AFFICHAGE */}
          {/* ========================================================================= */}
          {activeTab === "affichage" && (
            <Card className="rounded-xl border border-border bg-card shadow-xs">
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Palette className="h-4 w-4 text-primary" />
                    <span>Préférences d&apos;Affichage & Interface</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ajustez le contraste lumineux et la compacité visuelle des tableaux de bord.
                  </p>
                </div>

                <div className="space-y-6 pt-2">
                  {/* Thème sombre / clair */}
                  <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-xs font-bold text-foreground">
                          Thème de l&apos;application
                        </label>
                        <p className="text-[11px] text-muted-foreground">
                          Basculez entre le mode clair, le mode sombre ou le respect du système.
                        </p>
                      </div>
                      {savedFields["theme_setting"] && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                          <CheckCircle2 className="h-3 w-3" /> Enregistré
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <Button
                        type="button"
                        variant={theme === "light" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleThemeChange("light")}
                        className="text-xs gap-1.5 h-9"
                      >
                        <Sun className="h-3.5 w-3.5" /> Clair
                      </Button>
                      <Button
                        type="button"
                        variant={theme === "dark" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleThemeChange("dark")}
                        className="text-xs gap-1.5 h-9"
                      >
                        <Moon className="h-3.5 w-3.5" /> Sombre
                      </Button>
                      <Button
                        type="button"
                        variant={theme === "system" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleThemeChange("system")}
                        className="text-xs gap-1.5 h-9"
                      >
                        <Laptop className="h-3.5 w-3.5" /> Système
                      </Button>
                    </div>
                  </div>

                  {/* Densité d'affichage */}
                  <div className="rounded-xl border border-border/70 p-4 space-y-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-xs font-bold text-foreground">
                          Densité des listes & tableaux
                        </label>
                        <p className="text-[11px] text-muted-foreground">
                          Stockée dans le store Zustand pour ajuster l&apos;espacement des lignes et grilles.
                        </p>
                      </div>
                      {savedFields["density_setting"] && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                          <CheckCircle2 className="h-3 w-3" /> Enregistré
                        </span>
                      )}
                    </div>

                    <div className="w-full sm:w-64 pt-1">
                      <Select
                        value={displayDensity}
                        onValueChange={(val: "compact" | "comfortable") =>
                          handleDensityChange(val)
                        }
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="compact">
                            Compact (Haute densité)
                          </SelectItem>
                          <SelectItem value="comfortable">
                            Confortable (Espacement standard)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ========================================================================= */}
          {/* ONGLET 3 : RECHERCHE (RH Interne + Admin) */}
          {/* ========================================================================= */}
          {activeTab === "recherche" && isRhOrAdmin && (
            <Card className="rounded-xl border border-border bg-card shadow-xs">
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-primary" />
                    <span>Moteur de Recherche & Synthèse LLM</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Paramétrez la rigueur du matching vectoriel et le volume de candidats injectés dans le modèle de raisonnement.
                  </p>
                </div>

                <div className="space-y-6 pt-2">
                  {/* Seuil de confiance minimum (Slider 0-100%) */}
                  <div className="rounded-xl border border-border/70 p-4 space-y-4 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-xs font-bold text-foreground">
                          Seuil de confiance minimum
                        </label>
                        <p className="text-[11px] text-muted-foreground">
                          Exclut les profils dont le score de similarité cosinus est inférieur à ce seuil.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {savedFields["confidence_threshold"] && (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                            <CheckCircle2 className="h-3 w-3" /> Enregistré
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className="font-mono text-xs font-bold px-2.5 py-1 bg-background"
                        >
                          {confidenceThreshold}%
                        </Badge>
                      </div>
                    </div>

                    <Slider
                      value={[confidenceThreshold]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={handleConfidenceChange}
                      className="w-full py-2"
                    />
                  </div>

                  {/* TOP_K_LLM */}
                  <div className="rounded-xl border border-border/70 p-4 space-y-2 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-xs font-bold text-foreground">
                          TOP_K_LLM (Candidats en synthèse)
                        </label>
                        <p className="text-[11px] text-muted-foreground">
                          Nombre de candidats maximum injectés dans la synthèse (min: 3, max: 15).
                        </p>
                      </div>
                      {savedFields["top_k_llm"] && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                          <CheckCircle2 className="h-3 w-3" /> Enregistré
                        </span>
                      )}
                    </div>

                    <div className="w-32 pt-1">
                      <Input
                        type="number"
                        min={3}
                        max={15}
                        value={topKLlm}
                        onChange={(e) => handleTopKChange(e.target.value)}
                        className={cn(
                          "h-9 text-xs rounded-lg font-mono",
                          topKError && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                    </div>

                    {/* Message inline sous le champ sans toast */}
                    {topKError && (
                      <p className="text-[11px] text-destructive font-medium pt-1">
                        {topKError}
                      </p>
                    )}
                  </div>

                  {/* Anonymisation par défaut sur les résultats */}
                  <div className="rounded-xl border border-border/70 p-4 flex items-center justify-between bg-muted/20">
                    <div className="space-y-0.5 pr-4">
                      <label className="text-xs font-bold text-foreground">
                        Anonymisation par défaut sur les résultats
                      </label>
                      <p className="text-[11px] text-muted-foreground">
                        Masque les noms et photographies des candidats dans les résumés de matching afin de prévenir les biais cognitifs.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {savedFields["anonymization_toggle"] && (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                          <CheckCircle2 className="h-3 w-3" /> Enregistré
                        </span>
                      )}
                      <Switch
                        checked={defaultAnonymization}
                        onCheckedChange={handleAnonymizationToggle}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ========================================================================= */}
          {/* ONGLET 4 : SYNONYMES (Admin uniquement) */}
          {/* ========================================================================= */}
          {activeTab === "synonymes" && isAdmin && (
            <Card className="rounded-xl border border-border bg-card shadow-xs">
              <div className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <span>Dictionnaire de Synonymes Métier</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Harmonise les compétences techniques et équivalences lors de l&apos;expansion de requêtes sémantiques.
                    </p>
                  </div>
                  {savedFields["synonym_add"] && (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                      <CheckCircle2 className="h-3 w-3" /> Enregistré
                    </span>
                  )}
                </div>

                {/* Champ d'ajout rapide (deux inputs + bouton) */}
                <form
                  onSubmit={handleAddSynonym}
                  className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3"
                >
                  <p className="text-xs font-semibold text-foreground">
                    Ajouter une paire d&apos;équivalence
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-start">
                    <div className="sm:col-span-2">
                      <Input
                        placeholder="Terme A (ex. Kubernetes)"
                        value={newTermA}
                        onChange={(e) => {
                          setNewTermA(e.target.value);
                          if (synonymError) setSynonymError(null);
                        }}
                        className="h-9 text-xs rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        placeholder="Terme B (ex. K8s)"
                        value={newTermB}
                        onChange={(e) => {
                          setNewTermB(e.target.value);
                          if (synonymError) setSynonymError(null);
                        }}
                        className="h-9 text-xs rounded-lg"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <Button
                        type="submit"
                        size="sm"
                        className="w-full text-xs font-semibold h-9 rounded-lg gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" /> Ajouter
                      </Button>
                    </div>
                  </div>

                  {synonymError && (
                    <p className="text-[11px] text-destructive font-medium">
                      {synonymError}
                    </p>
                  )}
                </form>

                {/* Recherche et tableau des paires existantes */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative w-full sm:w-64">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Filtrer les synonymes..."
                        value={searchSynonym}
                        onChange={(e) => setSearchSynonym(e.target.value)}
                        className="h-9 pl-9 pr-3 text-xs rounded-lg bg-background"
                      />
                    </div>

                    <span className="text-xs font-mono text-muted-foreground">
                      {filteredSynonyms.length} paire{filteredSynonyms.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {filteredSynonyms.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
                      <p className="text-xs font-semibold text-foreground">
                        Aucun synonyme configuré
                      </p>
                      <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                        Enrichissez votre lexique en ajoutant des équivalences ci-dessus pour améliorer la découverte des candidats.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Terme A</TableHead>
                            <TableHead>Terme B (Équivalent)</TableHead>
                            <TableHead>Date d&apos;ajout</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSynonyms.map((syn) => (
                            <TableRow key={syn.id} className="hover:bg-muted/30">
                              <TableCell className="font-semibold text-xs text-foreground">
                                {syn.termeA}
                              </TableCell>
                              <TableCell className="text-xs text-foreground">
                                <Badge
                                  variant="outline"
                                  className="bg-primary/5 text-primary border-primary/20 text-xs font-mono"
                                >
                                  {syn.termeB}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {syn.dateAjout}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSynonym(syn.id)}
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* ========================================================================= */}
          {/* ONGLET 5 : NOTIFICATIONS */}
          {/* ========================================================================= */}
          {activeTab === "notifications" && (
            <Card className="rounded-xl border border-border bg-card shadow-xs">
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    <span>Préférences de Notifications & Alertes</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sélectionnez les canaux de diffusion pour chaque type d&apos;événement système.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="hidden sm:grid grid-cols-12 text-[11px] font-semibold text-muted-foreground px-4 pb-2 border-b border-border">
                    <span className="col-span-8">Type d&apos;événement</span>
                    <span className="col-span-2 text-center">Email</span>
                    <span className="col-span-2 text-center">In-app</span>
                  </div>

                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className="p-4 rounded-xl border border-border/70 bg-muted/20 flex flex-col sm:grid sm:grid-cols-12 gap-3 sm:items-center"
                    >
                      <div className="sm:col-span-8 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-foreground">
                            {notif.titre}
                          </p>
                          {(savedFields[`notif_${notif.id}_email`] ||
                            savedFields[`notif_${notif.id}_inApp`]) && (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 animate-in fade-in">
                              <CheckCircle2 className="h-3 w-3" /> Enregistré
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {notif.description}
                        </p>
                      </div>

                      {/* Toggle Email */}
                      <div className="sm:col-span-2 flex items-center justify-between sm:justify-center gap-2">
                        <span className="sm:hidden text-xs text-muted-foreground">
                          Email :
                        </span>
                        <Switch
                          checked={notif.email}
                          onCheckedChange={(checked) =>
                            handleNotificationToggle(notif.id, "email", checked)
                          }
                        />
                      </div>

                      {/* Toggle In-app */}
                      <div className="sm:col-span-2 flex items-center justify-between sm:justify-center gap-2">
                        <span className="sm:hidden text-xs text-muted-foreground">
                          In-app :
                        </span>
                        <Switch
                          checked={notif.inApp}
                          onCheckedChange={(checked) =>
                            handleNotificationToggle(notif.id, "inApp", checked)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
