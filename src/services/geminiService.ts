import { Phase, PathfinderResponse, Option } from "../types";

// Funciones para manejar cookies de tags (se mantienen igual)
export const saveTagsToCookies = (tags: string[]): void => {
  if (typeof window !== 'undefined') {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `selectedTags=${encodeURIComponent(JSON.stringify(tags))}; expires=${expires}; path=/`;
  }
};

export const getTagsFromCookies = (): string[] => {
  if (typeof window !== 'undefined') {
    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
      if (cookie.startsWith('selectedTags=')) {
        const value = cookie.substring('selectedTags='.length);
        try {
          return JSON.parse(decodeURIComponent(value));
        } catch (e) {
          return [];
        }
      }
    }
  }
  return [];
};

export const clearTagsFromCookies = (): void => {
  if (typeof window !== 'undefined') {
    document.cookie = 'selectedTags=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  }
};

export async function getPathfinderPath(
  userInput: string,
  history: string[] = [],
  activeFilters: string[] = [],
  location: { lat: number; lng: number } | null = null
): Promise<PathfinderResponse> {
  const response = await fetch("/api/pathfinder", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userInput,
      history,
      activeFilters,
      location,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Error al obtener respuesta del servidor");
  }

  return response.json();
}

