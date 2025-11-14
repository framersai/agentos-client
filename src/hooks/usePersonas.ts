import { useQuery } from "@tanstack/react-query";
import { listPersonas, type ListPersonaFilters } from "@/lib/agentosClient";
import type { PersonaDefinition } from "@/state/sessionStore";

// listPersonas already returns PersonaDefinition[] from the backend; no additional normalization needed.

export interface UsePersonasOptions {
  userId?: string;
  filters?: ListPersonaFilters;
  enabled?: boolean;
  staleTimeMs?: number;
}

export function usePersonas(options: UsePersonasOptions = {}) {
  const { userId, filters, enabled = true, staleTimeMs = 5 * 60 * 1000 } = options;
  const normalizedFilters: ListPersonaFilters | undefined = filters
    ? {
        capability: filters.capability
          ? (Array.isArray(filters.capability)
              ? (filters.capability as string[]).map((capability: string) => capability.trim()).filter(Boolean).sort()
              : [filters.capability.trim()]).filter(Boolean)
          : undefined,
        tier: filters.tier
          ? (Array.isArray(filters.tier)
              ? (filters.tier as string[]).map((tier: string) => tier.trim()).filter(Boolean).sort()
              : [filters.tier.trim()]).filter(Boolean)
          : undefined,
        search: filters.search?.trim() ? filters.search.trim() : undefined
      }
    : undefined;

  return useQuery<PersonaDefinition[]>({
    queryKey: ["agentos", "personas", userId ?? null, normalizedFilters ?? {}],
    enabled,
    staleTime: staleTimeMs,
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    refetchOnMount: false, // Don't refetch if data exists
    retry: 1, // Only retry once on failure
    queryFn: ({ signal }) =>
      listPersonas({ userId, filters: normalizedFilters, signal }),
  });
}
