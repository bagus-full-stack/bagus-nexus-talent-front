"use client";

import React, {
  useState,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import dynamic from "next/dynamic";
import {
  Search as SearchIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  User,
  Code2,
  Building,
  GraduationCap,
  Layers,
  X,
  Filter,
  ExternalLink,
  Info,
  AlertTriangle,
  ArrowRight,
  Network,
  Loader2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getSubgraph, GraphApiNode } from "@/lib/api/graph";
import { fetchCandidatById } from "@/lib/api/candidats";
import { Candidat } from "@/types/candidat";
import { CandidateCard } from "@/components/search/candidate-card";
import { CandidateDetailSheet } from "@/components/search/candidate-detail-sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Import dynamique de react-force-graph-2d pour désactiver le SSR (nécessite Canvas côté navigateur)
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-slate-900">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <span className="text-xs font-semibold text-muted-foreground">
        Construction du graphe...
      </span>
    </div>
  ),
});

export type NodeType = "candidat" | "competence" | "entreprise" | "diplome";

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  properties: Record<string, unknown>;
  size?: number;
  val?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  __degree?: number;
  neighbors?: Set<string>;
  links?: Set<any>;
}

const API_TYPE_TO_NODE_TYPE: Record<GraphApiNode["type"], NodeType> = {
  Candidat: "candidat",
  Competence: "competence",
  Entreprise: "entreprise",
  Diplome: "diplome",
};

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type?: string;
}

const TYPE_CONFIG: Record<
  NodeType,
  {
    label: string;
    color: string;
    darkColor: string;
    badgeBg: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  candidat: {
    label: "Candidats",
    color: "#2563EB", // Bleu
    darkColor: "#3B82F6",
    badgeBg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
    icon: User,
  },
  competence: {
    label: "Compétences",
    color: "#059669", // Vert
    darkColor: "#10B981",
    badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    icon: Code2,
  },
  entreprise: {
    label: "Entreprises",
    color: "#D97706", // Orange
    darkColor: "#F59E0B",
    badgeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    icon: Building,
  },
  diplome: {
    label: "Diplômes",
    color: "#7C3AED", // Violet
    darkColor: "#8B5CF6",
    badgeBg: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
    icon: GraduationCap,
  },
};

export default function GraphPage() {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dimensions dynamiques du container
  const [dimensions, setDimensions] = useState({ width: 800, height: 650 });

  // États de filtrage des types de nœuds
  const [selectedTypes, setSelectedTypes] = useState<Record<NodeType, boolean>>({
    candidat: true,
    competence: true,
    entreprise: true,
    diplome: true,
  });

  // Recherche par label
  const [searchQuery, setSearchQuery] = useState("");
  const [searchNotFound, setSearchNotFound] = useState(false);

  // Nœud actuellement sélectionné / focalisé
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // État mobile pour le sheet de filtres et le sheet de détails
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  // État pour la vue détaillée Candidat (modal complète)
  const [isCandidateDetailOpen, setIsCandidateDetailOpen] = useState(false);
  const [detailCandidate, setDetailCandidate] = useState<Candidat | null>(null);

  // Calcul du redimensionnement fluide via ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setDimensions({
            width: entry.contentRect.width,
            height: Math.max(500, entry.contentRect.height),
          });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Chargement du graphe depuis le backend (Neo4j via /api/v1/graph/subgraph)
  const {
    data: graphData,
    isLoading: isGraphLoading,
    isError: isGraphError,
  } = useQuery({
    queryKey: ["graph-subgraph"],
    queryFn: () => getSubgraph({ depth: 2 }),
  });

  // Construction du graphe avec calcul des degrés et voisins
  const fullGraphData = useMemo(() => {
    if (!graphData) return { nodes: [] as GraphNode[], links: [] as GraphLink[] };

    const nodes: GraphNode[] = graphData.nodes.map((n) => ({
      id: n.id,
      type: API_TYPE_TO_NODE_TYPE[n.type] ?? "candidat",
      label: n.label,
      properties: n.properties,
      neighbors: new Set<string>(),
      links: new Set<any>(),
    }));

    const nodeMap = new Map<string, GraphNode>();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    const links: GraphLink[] = graphData.links
      .filter((l) => nodeMap.has(l.source) && nodeMap.has(l.target))
      .map((l) => {
        const sourceNode = nodeMap.get(l.source)!;
        const targetNode = nodeMap.get(l.target)!;
        sourceNode.neighbors?.add(targetNode.id);
        targetNode.neighbors?.add(sourceNode.id);
        return {
          source: l.source,
          target: l.target,
          type: l.type,
        };
      });

    // Calcul de la taille relative selon le degré de connexions
    nodes.forEach((n) => {
      const degree = n.neighbors?.size || 0;
      n.__degree = degree;
      // Rayon proportionnel au nombre de connexions (min 4, max 14)
      n.val = Math.max(4, Math.min(14, 4 + degree * 1.5));
    });

    return { nodes, links };
  }, [graphData]);

  // Décompte par type de nœud
  const countsByType = useMemo(() => {
    const counts: Record<NodeType, number> = {
      candidat: 0,
      competence: 0,
      entreprise: 0,
      diplome: 0,
    };
    fullGraphData.nodes.forEach((n) => {
      counts[n.type] = (counts[n.type] || 0) + 1;
    });
    return counts;
  }, [fullGraphData]);

  // Filtrage actif des données selon les types sélectionnés
  const filteredData = useMemo(() => {
    const activeNodes = fullGraphData.nodes.filter(
      (node) => selectedTypes[node.type]
    );
    const activeIds = new Set(activeNodes.map((n) => n.id));

    const activeLinks = fullGraphData.links.filter((link) => {
      const sId = typeof link.source === "object" ? (link.source as any).id : link.source;
      const tId = typeof link.target === "object" ? (link.target as any).id : link.target;
      return activeIds.has(sId) && activeIds.has(tId);
    });

    return { nodes: activeNodes, links: activeLinks };
  }, [fullGraphData, selectedTypes]);

  // Voisins et liens du nœud sélectionné pour mise en évidence
  const highlightInfo = useMemo(() => {
    if (!selectedNode) return null;
    const neighborIds = new Set<string>();
    neighborIds.add(selectedNode.id);

    filteredData.links.forEach((l) => {
      const sId = typeof l.source === "object" ? (l.source as any).id : l.source;
      const tId = typeof l.target === "object" ? (l.target as any).id : l.target;
      if (sId === selectedNode.id) neighborIds.add(tId);
      if (tId === selectedNode.id) neighborIds.add(sId);
    });

    return {
      neighborIds,
      links: filteredData.links.filter((l) => {
        const sId = typeof l.source === "object" ? (l.source as any).id : l.source;
        const tId = typeof l.target === "object" ? (l.target as any).id : l.target;
        return sId === selectedNode.id || tId === selectedNode.id;
      }),
    };
  }, [selectedNode, filteredData]);

  // Centrage sur un nœud
  const focusOnNode = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    if (fgRef.current && node.x !== undefined && node.y !== undefined) {
      fgRef.current.centerAt(node.x, node.y, 800);
      fgRef.current.zoom(2.2, 800);
    }
  }, []);

  // Recherche textuelle d'un nœud
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchNotFound(false);
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    const match = filteredData.nodes.find((n) =>
      n.label.toLowerCase().includes(q)
    );

    if (match) {
      setSearchNotFound(false);
      focusOnNode(match);
    } else {
      setSearchNotFound(true);
    }
  };

  // Bascule globale tout afficher / tout masquer
  const toggleAllTypes = (show: boolean) => {
    setSelectedTypes({
      candidat: show,
      competence: show,
      entreprise: show,
      diplome: show,
    });
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (fgRef.current) {
      fgRef.current.zoom(fgRef.current.zoom() * 1.3, 400);
    }
  };

  const handleZoomOut = () => {
    if (fgRef.current) {
      fgRef.current.zoom(fgRef.current.zoom() / 1.3, 400);
    }
  };

  const handleResetZoom = () => {
    setSelectedNode(null);
    if (fgRef.current) {
      fgRef.current.zoomToFit(600, 50);
    }
  };

  // Récupère la fiche complète du candidat sélectionné : le nœud de graphe ne
  // porte que id/nom/prenom/email (propriétés Neo4j), le détail complet (compétences,
  // expériences, diplômes) vient de l'API candidats via son id métier.
  const candidatBusinessId =
    selectedNode?.type === "candidat"
      ? (selectedNode.properties.id as string | undefined)
      : undefined;

  const { data: selectedCandidatObj = null, isLoading: isCandidatDetailLoading } = useQuery({
    queryKey: ["candidat-detail", candidatBusinessId],
    queryFn: () => fetchCandidatById(candidatBusinessId!),
    enabled: !!candidatBusinessId,
  });

  // Candidats reliés si le nœud est une compétence, entreprise ou diplôme
  const connectedCandidates = useMemo(() => {
    if (!selectedNode || selectedNode.type === "candidat") return [];

    const candIds: string[] = [];
    filteredData.links.forEach((l) => {
      const sId = typeof l.source === "object" ? (l.source as any).id : l.source;
      const tId = typeof l.target === "object" ? (l.target as any).id : l.target;

      if (sId === selectedNode.id) {
        const targetNode = filteredData.nodes.find((n) => n.id === tId);
        if (targetNode?.type === "candidat") candIds.push(tId);
      } else if (tId === selectedNode.id) {
        const sourceNode = filteredData.nodes.find((n) => n.id === sId);
        if (sourceNode?.type === "candidat") candIds.push(sId);
      }
    });

    const list: Array<{ id: string; nom: string; nodeRef: GraphNode | null }> = [];
    candIds.forEach((id) => {
      const foundNode = filteredData.nodes.find((n) => n.id === id) || null;
      list.push({
        id,
        nom: foundNode?.label || id,
        nodeRef: foundNode,
      });
    });

    return list;
  }, [selectedNode, filteredData]);

  // Dessin personnalisé des nœuds sur le canvas
  const drawNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const isHighlighted =
        !highlightInfo || highlightInfo.neighborIds.has(node.id);
      const isSelected = selectedNode?.id === node.id;

      const r = (node.val || 6) * 1.1;
      const typeCfg = TYPE_CONFIG[node.type as NodeType] || TYPE_CONFIG.candidat;
      const nodeColor = typeCfg.color;

      ctx.save();
      ctx.globalAlpha = isHighlighted ? 1 : 0.15;

      // Halo pour le nœud sélectionné
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI, false);
        ctx.fillStyle = `${nodeColor}40`;
        ctx.fill();
        ctx.strokeStyle = nodeColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Cercle du nœud principal
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI, false);
      ctx.fillStyle = nodeColor;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();

      // Libellé texte sous ou sur le nœud
      const fontSize = Math.max(10 / globalScale, 2.5);
      ctx.font = `${isSelected ? "bold " : ""}${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (globalScale > 1.2 || isSelected || (node.__degree || 0) > 4) {
        ctx.fillStyle = isHighlighted ? "#0F172A" : "#94A3B8";
        // Contour blanc pour contraste lisible
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5 / globalScale;
        ctx.strokeText(node.label, node.x, node.y + r + fontSize * 0.9);
        ctx.fillText(node.label, node.x, node.y + r + fontSize * 0.9);
      }

      ctx.restore();
    },
    [highlightInfo, selectedNode]
  );

  // Dessin personnalisé des arêtes
  const drawLink = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const sId = typeof link.source === "object" ? link.source.id : link.source;
      const tId = typeof link.target === "object" ? link.target.id : link.target;

      const isDirectLink =
        highlightInfo &&
        (sId === selectedNode?.id || tId === selectedNode?.id);

      ctx.save();
      if (highlightInfo) {
        if (isDirectLink) {
          ctx.strokeStyle = "#2563EB";
          ctx.lineWidth = 2 / globalScale;
          ctx.globalAlpha = 0.9;
        } else {
          ctx.strokeStyle = "#CBD5E1";
          ctx.lineWidth = 0.5 / globalScale;
          ctx.globalAlpha = 0.08;
        }
      } else {
        ctx.strokeStyle = "#94A3B8";
        ctx.lineWidth = 0.8 / globalScale;
        ctx.globalAlpha = 0.35;
      }

      ctx.beginPath();
      ctx.moveTo(link.source.x, link.source.y);
      ctx.lineTo(link.target.x, link.target.y);
      ctx.stroke();
      ctx.restore();
    },
    [highlightInfo, selectedNode]
  );

  return (
    <div className="space-y-4">
      {/* 1. BARRE SUPÉRIEURE (Recherche, Toggles filtres, Boutons Tout afficher / masquer) */}
      <Card className="rounded-xl border border-border bg-card shadow-xs">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Champ de recherche */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <form onSubmit={handleSearch} className="relative w-full sm:w-72">
                <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Centrer sur une entité (ex. React)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (searchNotFound) setSearchNotFound(false);
                  }}
                  className="h-9 pl-9 pr-8 text-xs rounded-lg bg-background"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchNotFound(false);
                    }}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </form>

              {/* Bouton mobile pour ouvrir les filtres */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFilterSheetOpen(true)}
                className="lg:hidden text-xs gap-1.5 h-9"
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Filtres entités</span>
              </Button>
            </div>

            {/* Message sous recherche si non trouvé */}
            {searchNotFound && (
              <p className="text-xs text-destructive font-medium lg:hidden">
                Aucune entité trouvée
              </p>
            )}

            {/* Filtres Desktop (Checkbox shadcn avec pastille de couleur et compteur) */}
            <div className="hidden lg:flex flex-wrap items-center gap-4 text-xs">
              {(Object.keys(TYPE_CONFIG) as NodeType[]).map((type) => {
                const config = TYPE_CONFIG[type];
                const count = countsByType[type] || 0;
                const Icon = config.icon;
                const isChecked = selectedTypes[type];

                return (
                  <label
                    key={type}
                    className="flex items-center gap-2 cursor-pointer select-none py-1 px-2 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        setSelectedTypes((prev) => ({
                          ...prev,
                          [type]: Boolean(checked),
                        }));
                      }}
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="font-semibold text-foreground">
                      {config.label}
                    </span>
                    <span className="text-muted-foreground text-[11px] font-mono">
                      ({count})
                    </span>
                  </label>
                );
              })}

              {/* Boutons Tout afficher / masquer */}
              <div className="flex items-center gap-1.5 pl-2 border-l border-border/80">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAllTypes(true)}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Tout afficher
                </Button>
                <span className="text-muted-foreground/40">•</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleAllTypes(false)}
                  className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Tout masquer
                </Button>
              </div>
            </div>
          </div>

          {searchNotFound && (
            <p className="hidden lg:block text-xs text-destructive font-medium pt-2">
              Aucune entité trouvée pour &quot;{searchQuery}&quot;
            </p>
          )}
        </CardContent>
      </Card>

      {/* Bannière d'avertissement si plus de 200 nœuds affichés */}
      {filteredData.nodes.length > 200 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 shadow-xs">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            Graphe volumineux ({filteredData.nodes.length} nœuds), affinez les filtres pour une meilleure lisibilité.
          </span>
        </div>
      )}

      {/* 2. ZONE PRINCIPALE DU GRAPHE + PANNEAU LATÉRAL DROIT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* CANVAS FORCE-DIRECTED (8 cols desktop si panneau ouvert, sinon 12) */}
        <div
          ref={containerRef}
          className={cn(
            "relative rounded-xl border border-border overflow-hidden bg-slate-50 dark:bg-slate-900 shadow-xs transition-all h-[620px]",
            selectedNode ? "lg:col-span-8" : "lg:col-span-12"
          )}
        >
          {isGraphLoading ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">
                Chargement du graphe...
              </span>
            </div>
          ) : isGraphError ? (
            <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center space-y-2">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm font-semibold text-foreground">
                Impossible de charger le graphe
              </p>
              <p className="text-xs text-muted-foreground">
                Vérifiez que le backend et Neo4j sont accessibles.
              </p>
            </div>
          ) : filteredData.nodes.length === 0 ? (
            <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center space-y-3">
              <Network className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">
                Tous les types de nœuds sont masqués
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleAllTypes(true)}
                className="text-xs"
              >
                Afficher toutes les entités
              </Button>
            </div>
          ) : (
            <ForceGraph2D
              ref={fgRef}
              width={
                selectedNode && dimensions.width > 900
                  ? Math.floor((dimensions.width * 8) / 12)
                  : dimensions.width
              }
              height={620}
              graphData={filteredData}
              nodeLabel={(n: any) => `${n.label} (${n.type})`}
              nodeCanvasObject={drawNode}
              linkCanvasObject={drawLink}
              onNodeClick={(node: any) => {
                focusOnNode(node as GraphNode);
                setIsMobileDetailOpen(true);
              }}
              onBackgroundClick={() => {
                setSelectedNode(null);
                setIsMobileDetailOpen(false);
              }}
              cooldownTicks={120}
              enableNodeDrag={true}
              enableZoomInteraction={true}
              enablePanInteraction={true}
            />
          )}

          {/* Contrôles de zoom (+/- et réinitialiser) en bas à droite */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1.5 z-10 bg-background/90 backdrop-blur-xs p-1.5 rounded-xl border border-border shadow-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="h-8 w-8 p-0"
              title="Zoom avant"
              aria-label="Zoom avant"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="h-8 w-8 p-0"
              title="Zoom arrière"
              aria-label="Zoom arrière"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              className="h-8 w-8 p-0"
              title="Réinitialiser la vue"
              aria-label="Réinitialiser"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Légende en bas à gauche */}
          <div className="absolute bottom-4 left-4 z-10 bg-background/90 backdrop-blur-xs p-2.5 rounded-xl border border-border shadow-md text-xs space-y-1.5 hidden sm:block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block pb-0.5 border-b border-border/60">
              Légende de l&apos;ontologie
            </span>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              {(Object.keys(TYPE_CONFIG) as NodeType[]).map((t) => {
                const cfg = TYPE_CONFIG[t];
                return (
                  <div key={t} className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span className="text-foreground">{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. PANNEAU LATÉRAL DROIT (Desktop 320px / 4 colonnes) */}
        {selectedNode && (
          <Card className="hidden lg:block lg:col-span-4 rounded-xl border border-border bg-card shadow-xs h-[620px] overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      TYPE_CONFIG[selectedNode.type]?.color || "#2563EB",
                  }}
                />
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Fiche de l&apos;entité
                </h4>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedNode(null)}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <CardContent className="p-4 space-y-4">
              {/* CAS 1 : C'est un CANDIDAT -> Mini carte réutilisant candidate-card */}
              {selectedNode.type === "candidat" ? (
                isCandidatDetailLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Chargement du profil...</span>
                  </div>
                ) : selectedCandidatObj ? (
                  <div className="space-y-3">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Profil candidat identifié :
                    </span>
                    <CandidateCard
                      candidat={selectedCandidatObj}
                      isSelected={true}
                      onSelect={() => {}}
                      onOpenDetails={(c) => {
                        setDetailCandidate(c);
                        setIsCandidateDetailOpen(true);
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDetailCandidate(selectedCandidatObj);
                        setIsCandidateDetailOpen(true);
                      }}
                      className="w-full text-xs gap-1.5 mt-2"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ouvrir la fiche complète
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-8 text-center">
                    Impossible de charger ce profil candidat.
                  </p>
                )
              ) : (
                /* CAS 2 : C'est une compétence / entreprise / diplôme -> Nom + Liste des candidats liés */
                <div className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-semibold uppercase",
                        TYPE_CONFIG[selectedNode.type]?.badgeBg
                      )}
                    >
                      {TYPE_CONFIG[selectedNode.type]?.label}
                    </Badge>
                    <h3 className="text-base font-bold text-foreground">
                      {selectedNode.label}
                    </h3>
                    <p className="text-muted-foreground text-[11px]">
                      {connectedCandidates.length} candidat{connectedCandidates.length > 1 ? "s" : ""} relié{connectedCandidates.length > 1 ? "s" : ""} à ce nœud.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/80">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Candidats associés (cliquez pour centrer) :
                    </span>

                    {connectedCandidates.length === 0 ? (
                      <p className="text-muted-foreground italic text-xs">
                        Aucun candidat connecté directement.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {connectedCandidates.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              if (c.nodeRef) focusOnNode(c.nodeRef);
                            }}
                            className="w-full text-left p-2.5 rounded-lg border border-border/70 hover:border-primary/40 bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <User className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="font-semibold text-foreground truncate">
                                {c.nom}
                              </span>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* 4. SHEET MOBILE DE DÉTAIL D'UN NŒUD */}
      <Sheet open={isMobileDetailOpen} onOpenChange={setIsMobileDetailOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto lg:hidden p-6">
          {selectedNode && (
            <div className="space-y-4">
              <SheetHeader className="text-left space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        TYPE_CONFIG[selectedNode.type]?.color || "#2563EB",
                    }}
                  />
                  <SheetTitle className="text-base font-bold text-foreground">
                    {selectedNode.label}
                  </SheetTitle>
                </div>
                <SheetDescription className="text-xs">
                  Type : {TYPE_CONFIG[selectedNode.type]?.label}
                </SheetDescription>
              </SheetHeader>

              {selectedNode.type === "candidat" ? (
                isCandidatDetailLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Chargement du profil...</span>
                  </div>
                ) : selectedCandidatObj ? (
                  <div className="space-y-3">
                    <CandidateCard
                      candidat={selectedCandidatObj}
                      isSelected={true}
                      onSelect={() => {}}
                      onOpenDetails={(c) => {
                        setDetailCandidate(c);
                        setIsCandidateDetailOpen(true);
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-6 text-center">
                    Impossible de charger ce profil candidat.
                  </p>
                )
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Candidats associés ({connectedCandidates.length}) :
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {connectedCandidates.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          if (c.nodeRef) focusOnNode(c.nodeRef);
                          setIsMobileDetailOpen(false);
                        }}
                        className="w-full text-left p-2 rounded-lg border border-border bg-muted/20 text-xs font-medium flex items-center justify-between"
                      >
                        <span>{c.nom}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* 5. SHEET MOBILE DES FILTRES (Tablette/Mobile) */}
      <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-xs p-6 space-y-5">
          <SheetHeader className="text-left space-y-1">
            <SheetTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <span>Filtres de l&apos;ontologie</span>
            </SheetTitle>
            <SheetDescription className="text-xs">
              Activez ou masquez les entités du graphe de compétences.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 text-xs">
            {(Object.keys(TYPE_CONFIG) as NodeType[]).map((type) => {
              const config = TYPE_CONFIG[type];
              const count = countsByType[type] || 0;
              const isChecked = selectedTypes[type];

              return (
                <label
                  key={type}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        setSelectedTypes((prev) => ({
                          ...prev,
                          [type]: Boolean(checked),
                        }));
                      }}
                    />
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="font-semibold text-foreground">
                      {config.label}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    {count}
                  </Badge>
                </label>
              );
            })}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAllTypes(true)}
              className="flex-1 text-xs"
            >
              Tout afficher
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAllTypes(false)}
              className="flex-1 text-xs"
            >
              Tout masquer
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* 6. MODAL COMPLÈTE CANDIDAT (réutilise CandidateDetailSheet) */}
      <CandidateDetailSheet
        candidat={detailCandidate}
        open={isCandidateDetailOpen}
        onClose={() => setIsCandidateDetailOpen(false)}
        onOpenChange={setIsCandidateDetailOpen}
      />
    </div>
  );
}
