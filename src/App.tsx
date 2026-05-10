/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Compass, 
  ArrowRight, 
  RotateCcw, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Tag,
  ArrowLeft,
  RefreshCw,
  MapPin
} from "lucide-react";
import { 
  getPathfinderPath, 
  PathfinderResponse, 
  Option,
  saveTagsToCookies,
  getTagsFromCookies,
  clearTagsFromCookies
} from "./services/geminiService";

export default function App() {
  const [userInput, setUserInput] = useState("");
  const [currentInput, setCurrentInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [response, setResponse] = useState<PathfinderResponse | null>(null);
  const [responseStack, setResponseStack] = useState<PathfinderResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Cargar tags guardados en cookies al montar el componente
  useEffect(() => {
    const savedTags = getTagsFromCookies();
    if (savedTags.length > 0) {
      setSelectedTags(savedTags);
    }
  }, []);

  // Request location on mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (err) => {
          console.warn("Geolocation denied or unavailable:", err);
        }
      );
    }
  }, []);

  const TAG_OPTIONS = ["barato", "outdoor", "indoor", "solo", "social", "aventura", "relajado", "romantico", "creativo", "fitness", "noche", "mañana"];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const updatedTags = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag];
      saveTagsToCookies(updatedTags);
      return updatedTags;
    });
  };

  const startJourney = useCallback(async (input: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPathfinderPath(input, [], selectedTags, location);
      setResponse(res);
      setResponseStack([res]);
      setUserInput(input);
      setHistory([]);
    } catch (err) {
      setError("No pudimos encontrar un camino. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedTags, location]);

  const selectOption = useCallback(async (option: Option) => {
    setIsLoading(true);
    setError(null);
    const newHistory = [...history, option.label];
    try {
      const res = await getPathfinderPath(userInput, newHistory, selectedTags, location);
      setResponse(res);
      setResponseStack(prev => [...prev, res]);
      setHistory(newHistory);
    } catch (err) {
      setError("No pudimos refinar el camino. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  }, [history, userInput, selectedTags, location]);

  const goBack = () => {
    if (responseStack.length <= 1) {
      reset();
      return;
    }
    const newStack = responseStack.slice(0, -1);
    const newHistory = history.slice(0, -1);
    setResponseStack(newStack);
    setResponse(newStack[newStack.length - 1]);
    setHistory(newHistory);
  };

  const regeneratePlan = async () => {
    if (response?.phase !== "final") return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPathfinderPath(userInput, history, selectedTags, location);
      setResponse(res);
      setResponseStack(prev => [...prev.slice(0, -1), res]);
    } catch (err) {
      setError("No pudimos regenerar el plan. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setUserInput("");
    setCurrentInput("");
    setSelectedTags([]);
    setHistory([]);
    setResponse(null);
    setResponseStack([]);
    setError(null);
    clearTagsFromCookies();
  };  return (
    <div id="app-root" className="min-h-screen bg-[#fafaf9] text-[#1c1917] flex flex-col items-center p-6 md:p-12 font-sans overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-orange-400/5 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-400/5 blur-[100px]" />
      </div>

      <header className="w-full max-w-2xl mb-12 flex flex-col items-center text-center z-10">
        <div className="flex items-center gap-2 mb-4">
          <Compass className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-bold tracking-tight">What I Want</h1>
        </div>
        <p className="text-[#57534e]">Tus deseos vagos convertidos en planes accionables.</p>
        
        {location ? (
          <div className="mt-4 flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-green-100">
            <MapPin className="w-3 h-3" /> Ubicación Activa
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-amber-100">
            <MapPin className="w-3 h-3 opacity-50" /> Esperando Ubicación
          </div>
        )}
      </header>

      <main className="w-full max-w-2xl flex-1 z-10 flex flex-col">
        <AnimatePresence mode="wait">
          {!response && !isLoading && (
            <motion.div
              key="initial"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-8"
            >
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400 text-center">Filtros de Estilo</h3>
                <div className="flex flex-wrap gap-2 justify-center">
                  {TAG_OPTIONS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                        selectedTags.includes(tag)
                          ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20"
                          : "bg-white border-stone-200 text-stone-600 hover:border-stone-300"
                      }`}
                    >
                      {tag}
                      {selectedTags.includes(tag) && <span className="ml-2">✕</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <input
                  id="user-input"
                  type="text"
                  placeholder="Dime qué tienes en mente hoy..."
                  className="w-full px-6 py-5 bg-white border border-[#e7e5e4] rounded-2xl shadow-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none text-lg pr-16"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && currentInput && startJourney(currentInput)}
                />
                <button
                  id="go-btn"
                  onClick={() => currentInput && startJourney(currentInput)}
                  disabled={!currentInput}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-orange-500 text-white rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 justify-center">
                {["Sorpréndeme", "Activo y con energía", "Relajación total", "Inspiración creativa"].map((hint) => (
                  <button
                    key={hint}
                    className="px-4 py-2 bg-[#f5f5f4] text-[#78716c] rounded-xl text-sm hover:bg-[#e7e5e4] transition-colors border border-[#e7e5e4]"
                    onClick={() => {
                      setCurrentInput(hint);
                      startJourney(hint);
                    }}
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
              <p className="text-[#a8a29e] animate-pulse">Trazando el camino...</p>
            </motion.div>
          )}

          {response && !isLoading && (
            <motion.div
              key={response.phase + response.title}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-8"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <span className="px-2 py-0.5 border border-orange-200 rounded-md bg-orange-50 text-orange-600">
                      Fase: {response.phase === "broad" ? "Exploración" : response.phase === "refinement" ? "Refinamiento" : "Final"}
                    </span>
                    {response.active_filters?.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-stone-100 text-stone-500 rounded-md border border-stone-200">
                        {tag}
                      </span>
                    ))}
                    {history.length > 0 && <span className="text-[#a8a29e] truncate max-w-[200px]">({history.join(" → ")})</span>}
                  </div>
                  
                  <button 
                    onClick={goBack}
                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-500 hover:text-orange-600 transition-colors bg-white px-3 py-1.5 rounded-lg border border-stone-200 shadow-sm"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Atrás
                  </button>
                </div>
                <h2 className="text-4xl font-bold tracking-tight text-[#1c1917] font-serif leading-tight">
                  {response.title}
                </h2>
              </div>

              {response.phase !== "final" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {response.options?.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => selectOption(opt)}
                      className="group p-6 bg-white border border-[#e7e5e4] rounded-2xl text-left hover:border-orange-500 hover:shadow-xl hover:shadow-orange-500/5 transition-all flex flex-col h-full active:scale-[0.98]"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-4xl group-hover:scale-110 transition-transform">
                          {opt.emoji}
                        </span>
                        <div className="flex gap-1">
                          {opt.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[10px] font-bold uppercase tracking-tighter px-1.5 py-0.5 bg-stone-100 text-stone-500 rounded border border-stone-200">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <h3 className="text-xl font-bold mb-2 group-hover:text-orange-600 transition-colors">
                        {opt.label}
                      </h3>
                      <p className="text-[#78716c] text-sm leading-relaxed mb-4 flex-1">
                        {opt.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-auto">
                        {opt.tags.slice(2, 5).map(tag => (
                          <span key={tag} className="text-[10px] text-stone-400">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-8 bg-white border border-[#e7e5e4] rounded-3xl shadow-sm space-y-8 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                      <CheckCircle2 className="w-40 h-40 text-orange-500" />
                    </div>
                    
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#a8a29e] mb-2">Plan Sugerido</h4>
                        <p className="text-2xl font-bold text-[#1c1917]">{response.final_plan?.activity}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-stone-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#a8a29e] mb-2">Detalles</h4>
                        <p className="text-lg text-[#44403c] leading-relaxed italic">
                          "{response.final_plan?.details}"
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 text-stone-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#a8a29e] mb-2">Duración</h4>
                        <p className="text-lg text-[#44403c] font-medium">{response.final_plan?.duration}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
                        <Tag className="w-5 h-5 text-stone-600" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-[#a8a29e] mb-2">Categorías</h4>
                        <div className="flex flex-wrap gap-2">
                          {response.final_plan?.required_tags.map((tag) => (
                            <span key={tag} className="px-3 py-1 bg-[#1c1917] text-white rounded-lg text-xs font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={regeneratePlan}
                      className="flex-1 py-5 bg-orange-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-lg active:scale-[0.99] shadow-orange-500/20"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Regenerar Plan
                    </button>
                    <button
                      onClick={reset}
                      className="flex-1 py-5 bg-[#1c1917] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#2e2a27] transition-all shadow-lg active:scale-[0.99]"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Planear otro camino
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-center justify-between">
                  <span>{error}</span>
                  <button onClick={() => setResponse(null)} className="underline font-bold">Reintentar</button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {response && !isLoading && (
          <footer className="mt-12 py-8 border-t border-[#e7e5e4] flex justify-between items-center text-xs font-medium text-[#a8a29e] tracking-widest uppercase">
            <button 
              onClick={reset}
              className="hover:text-orange-600 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
            </button>
            <p>Pathfinder AI © 2026</p>
          </footer>
        )}
      </main>
    </div>
  );
}

