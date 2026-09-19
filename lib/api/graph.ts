import { apiFetch } from "@/lib/api/client";

export interface GraphApiNode {
  id: string;
  type: "Candidat" | "Competence" | "Entreprise" | "Diplome";
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphApiLink {
  source: string;
  target: string;
  type: string;
}

export interface SubgraphResponse {
  nodes: GraphApiNode[];
  links: GraphApiLink[];
  truncated: boolean;
}

export async function getSubgraph(params?: {
  types?: string[];
  depth?: number;
  search?: string;
}): Promise<SubgraphResponse> {
  const qs = new URLSearchParams();
  (params?.types ?? []).forEach((t) => qs.append("types", t));
  if (params?.depth) qs.set("depth", String(params.depth));
  if (params?.search) qs.set("search", params.search);
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiFetch<SubgraphResponse>(`/api/v1/graph/subgraph${suffix}`);
}
