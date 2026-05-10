import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY || API_KEY === 'undefined' || API_KEY === '') {
  console.warn("GEMINI_API_KEY no encontrada. Asegúrate de configurar tu archivo .env");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "" });

// Funciones para manejar cookies de tags
export const saveTagsToCookies = (tags: string[]): void => {
  if (typeof window !== 'undefined') {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString(); // 7 días
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
          console.error('Error al parsear tags de cookies:', e);
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

export type Phase = "broad" | "refinement" | "final";

export interface Option {
  id: number;
  label: string;
  description: string;
  emoji: string;
  tags: string[];
}

export interface FinalPlan {
  activity: string;
  details: string;
  duration: string;
  required_tags: string[];
}

export interface PathfinderResponse {
  phase: Phase;
  active_filters?: string[];
  title: string;
  options?: Option[];
  final_plan?: FinalPlan | null;
}

const TAG_LIST = ["aventura", "relajado", "romantico", "social", "solo", "familia", "amigos", "creativo", "aprendizaje", "fitness", "wellness", "cultural", "gastronomia", "musica", "arte", "cine", "juegos", "naturaleza", "urbano", "outdoor", "indoor", "deporte", "extremo", "tecnologia", "voluntariado", "mascotas", "espiritual", "productivo", "descanso", "fiesta", "explorar", "fotografia", "lectura", "DIY", "gaming", "nostalgico", "lujo", "barato", "gratis", "premium", "rapido", "medio_tiempo", "todo_el_dia", "mañana", "tarde", "noche", "lluvia", "soleado", "frio", "calor", "cerca", "viaje_corto", "sin_transporte", "con_auto", "alta_energia", "baja_energia", "tranquilo", "emocionante", "conocer_gente", "pareja", "niños", "local", "turistico", "nuevo", "clasico", "saludable", "antojo", "cafes", "parques", "museos", "compras", "concierto", "evento", "comunidad"];

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    phase: { type: Type.STRING, description: "broad | refinement | final" },
    active_filters: { type: Type.ARRAY, items: { type: Type.STRING } },
    title: { type: Type.STRING, description: "Title in Spanish" },
    options: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.NUMBER },
          label: { type: Type.STRING },
          description: { type: Type.STRING },
          emoji: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["id", "label", "description", "emoji", "tags"],
      },
    },
    final_plan: {
      type: Type.OBJECT,
      properties: {
        activity: { type: Type.STRING },
        details: { type: Type.STRING },
        duration: { type: Type.STRING },
        required_tags: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["activity", "details", "duration", "required_tags"],
    },
  },
  required: ["phase", "title"],
};

export async function getPathfinderPath(
  userInput: string,
  history: string[] = [],
  activeFilters: string[] = [],
  location: { lat: number; lng: number } | null = null
): Promise<PathfinderResponse> {
  let phase: Phase = "broad";
  if (history.length === 1) phase = "refinement";
  if (history.length === 2) phase = "final";

  const locationContext = location 
    ? `User is currently at latitude ${location.lat}, longitude ${location.lng}. Recommend specific places and activities available near these coordinates.`
    : "User location is not available. Recommend general types of activities.";

  const systemInstruction = `You are a "Context-Aware Pathfinder AI." Your logic is driven by a two-step input: Selected Tags (pre-filters) and a Vague Idea.
Your goal is to narrow down user desires into concrete, actionable plans while strictly adhering to the selected tags.

WORKFLOW:
1. Phase 1 (Broad): Map the idea and tags to 3-4 general paths.
2. Phase 2 (Refinement): Drill down into the chosen path.
3. Phase 3 (Final): Provide the full executable plan.

STRICT FILTERING:
- You MUST filter out any activities that contradict the active filters.
- Active Filters: ${activeFilters.join(", ")}
- Authorized Tag List (DO NOT TRANSLATE): ${TAG_LIST.join(", ")}
- Every card generated must display which tags from the list it satisfies.

GEOLOCATION:
- ${locationContext}

LANGUAGE:
- Use Spanish for all titles, labels, and descriptions.

CURRENT CONTEXT:
- Initial User Idea: "${userInput}"
- Active Filters: ${activeFilters.join(", ")}
- Selection History: ${history.join(" -> ")}
- Current Phase to generate: ${phase}

GUIDELINES:
- Be creative and specific.
- For "broad" and "refinement", provide exactly 3-4 options.
- In the "final" phase, the "options" field can be empty, but "final_plan" MUST be filled.
- In "broad" and "refinement" phases, "final_plan" should be null.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: "Generar la siguiente fase siguiendo los filtros y la idea del usuario." }] }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA as any,
    },
  });

  return JSON.parse(response.text || "{}");
}
