import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Gemini Configuration
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenAI(API_KEY || "");

const TAG_LIST = ["aventura", "relajado", "romantico", "social", "solo", "familia", "amigos", "creativo", "aprendizaje", "fitness", "wellness", "cultural", "gastronomia", "musica", "arte", "cine", "juegos", "naturaleza", "urbano", "outdoor", "indoor", "deporte", "extremo", "tecnologia", "voluntariado", "mascotas", "espiritual", "productivo", "descanso", "fiesta", "explorar", "fotografia", "lectura", "DIY", "gaming", "nostalgico", "lujo", "barato", "gratis", "premium", "rapido", "medio_tiempo", "todo_el_dia", "mañana", "tarde", "noche", "lluvia", "soleado", "frio", "calor", "cerca", "viaje_corto", "sin_transporte", "con_auto", "alta_energia", "baja_energia", "tranquilo", "emocionante", "conocer_gente", "pareja", "niños", "local", "turistico", "nuevo", "clasico", "saludable", "antojo", "cafes", "parques", "museos", "compras", "concierto", "evento", "comunidad"];

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    phase: { type: Type.STRING },
    active_filters: { type: Type.ARRAY, items: { type: Type.STRING } },
    title: { type: Type.STRING },
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Pathfinder
  app.post("/api/pathfinder", async (req, res) => {
    try {
      const { userInput, history = [], activeFilters = [], location = null } = req.body;

      if (!API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY no configurada en el servidor." });
      }

      let phase = "broad";
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

      const model = genAI.getGenerativeModel({
        model: "gemini-3-flash-preview", 
        systemInstruction,
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "Generar la siguiente fase siguiendo los filtros y la idea del usuario." }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA as any,
        },
      });

      const responseText = result.response.text();
      res.json(JSON.parse(responseText));
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Error procesando la solicitud con AI." });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

