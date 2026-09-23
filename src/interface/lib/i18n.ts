/* Shared (client + server) language helpers and strings for the solo voice mode. */

export type Lang = "en" | "es";

export function toLang(v: unknown): Lang {
  return typeof v === "string" && v.toLowerCase().startsWith("es") ? "es" : "en";
}

/** Best-effort language guess for typed text. Returns "en" when there is no Spanish signal. */
export function guessLang(text: string): Lang {
  const t = text.toLowerCase();
  if (/[áéíóúñ¿¡]/.test(t)) return "es";
  return /\b(quiero|pel[ií]cula|pel[ií]culas|hola|algo|una|los|las|para|que|con|por favor|ver|gustar[ií]a)\b/.test(t) ? "es" : "en";
}

const EN = {
  greeting:
    "Hi, I'm the CouchSync voice agent. How can I help you with your movie selection? Tell me a mood, a genre, an actor, or a title you liked.",
  statusIdle: "Hold the mic and talk",
  statusListening: "Listening... release to send",
  statusThinking: "Finding your picks...",
  statusSpeaking: "Speaking...",
  statusReady: "Getting ready...",
  askQuestions: "Ask me a few questions",
  endConversation: "End conversation",
  stopSpeaking: "Stop",
  langLocked: (l: string) => `Replying in ${l === "es" ? "Spanish" : "English"}`,
  placeholder: "Type what you feel like watching...",
  back: "Back",
  mute: "Mute voice replies",
  unmute: "Unmute voice replies",
  questionOf: (i: number, n: number) => `Question ${i} of ${n}.`,
  skip: "Skip",
  noneOfThese: "None of these",
  thisOne: "This one",
  option: "Option",
  movie: "Movie",
  series: "Series",
  searched: "Searched",
  didntCatch: "Sorry, I didn't catch which one.",
  stopped: "Okay, I'll be here when you need me.",
  chatInstead: "Okay, we can just chat instead. What do you feel like watching?",
  noMic: "I can't access the microphone. Check the browser permission for this page.",
  noStt: "Voice isn't configured (SLNG_API_KEY is missing). You can type instead.",
  sttFail: "Sorry, I couldn't transcribe that. Try again or type it.",
  error: (m: string) => `Sorry, that didn't work: ${m}`,
  // server replies
  whichOne: "Which one sounds best to you?",
  picks: "Here are wonderful movie picks for tonight.",
  guidedPicks: "Based on your choices, I have lined up these fantastic films.",
  relaxed: "I broadened our search to bring you these great options.",
  noResults: "I could not find an exact match for that, but let us try another genre or favorite actor!",
  followUp: "Welcome to CouchSync! Tell me what kind of movie or vibe you are in the mood for tonight.",
};

const ES: typeof EN = {
  greeting:
    "Hola, soy el agente de voz de CouchSync. ¿Cómo puedo ayudarte a elegir película? Dime un estado de ánimo, un género, un actor o un título que te gustó.",
  statusIdle: "Mantén pulsado el micro y habla",
  statusListening: "Escuchando... suelta para enviar",
  statusThinking: "Buscando tus opciones...",
  statusSpeaking: "Hablando...",
  statusReady: "Preparándome...",
  askQuestions: "Hazme unas preguntas",
  endConversation: "Terminar conversación",
  stopSpeaking: "Parar",
  langLocked: (l) => `Respondiendo en ${l === "es" ? "español" : "inglés"}`,
  placeholder: "Escribe qué te apetece ver...",
  back: "Volver",
  mute: "Silenciar respuestas por voz",
  unmute: "Activar respuestas por voz",
  questionOf: (i, n) => `Pregunta ${i} de ${n}.`,
  skip: "Omitir",
  noneOfThese: "Ninguna",
  thisOne: "Esta",
  option: "Opción",
  movie: "Película",
  series: "Serie",
  searched: "Búsqueda",
  didntCatch: "Perdona, no he entendido cuál.",
  stopped: "Vale, aquí estaré cuando me necesites.",
  chatInstead: "Vale, charlamos sin preguntas. ¿Qué te apetece ver?",
  noMic: "No puedo acceder al micrófono. Revisa el permiso del navegador para esta página.",
  noStt: "La voz no está configurada (falta SLNG_API_KEY). Puedes escribir.",
  sttFail: "Perdona, no he podido transcribirlo. Inténtalo de nuevo o escríbelo.",
  error: (m) => `Perdona, algo ha fallado: ${m}`,
  whichOne: "¿Cuál te apetece más ver?",
  picks: "¡Aquí tienes unas opciones de cine increíbles para hoy!",
  guidedPicks: "¡Según tus respuestas he preparado estas joyas cinematográficas!",
  relaxed: "He ampliado un poco los filtros para traerte opciones fantásticas.",
  noResults: "No encontré títulos exactos para ese criterio, ¡pero probemos con otro género o actor favorito!",
  followUp: "¡Te doy la bienvenida a CouchSync! Cuéntame qué género o tipo de película te apetece disfrutar hoy.",
};

export const STRINGS: Record<Lang, typeof EN> = { en: EN, es: ES };
