import { Question } from "../types/couchsync";

export const MOCK_QUESTIONS_POOL: Question[] = [
  {
    id: "q-genre",
    category: "genre",
    title: "¿Qué tipo de historia nos apetece vivir hoy?",
    subtitle: "Elige el género principal que definirá la selección",
    options: [
      { id: "opt-thriller", label: "Thriller y Misterio", description: "Giros de guion, conspiraciones y tensión constante" },
      { id: "opt-comedy", label: "Comedia Inteligente o Absurda", description: "Risas garantizadas, buen rollo y desconexión" },
      { id: "opt-scifi", label: "Ciencia Ficción & Futuro", description: "Conceptos alucinantes, viajes en el tiempo y espacio" },
      { id: "opt-action", label: "Acción Directa", description: "Persecuciones, combates coreografiados y adrenalina" },
    ],
  },
  {
    id: "q-pacing",
    category: "pacing",
    title: "¿Qué ritmo de película necesita el grupo?",
    subtitle: "Ajusta la velocidad narrativa a la energía de la sala",
    options: [
      { id: "opt-frenetic", label: "Frenético y sin respiro", description: "Desde el minuto 1 pasando cosas, cero tiempos muertos" },
      { id: "opt-balanced", label: "Equilibrado y con gancho", description: "Desarrollo con giros bien dosificados y suspense" },
      { id: "opt-slowburn", label: "A fuego lento (Slow burn)", description: "Atmósfera densa, personajes profundos y clímax brutal" },
      { id: "opt-contemplative", label: "Pausado y contemplativo", description: "Planos abiertos, silencios expresivos y belleza visual sin prisa" },
    ],
  },
  {
    id: "q-vibe",
    category: "vibe",
    title: "¿Cuál es el tono o vibra de la noche?",
    subtitle: "Cómo queréis sentiros al terminar los créditos",
    options: [
      { id: "opt-mindblown", label: "Volarnos la cabeza", description: "Quedarnos media hora debatiendo qué acaba de pasar" },
      { id: "opt-fun", label: "Puro entretenimiento", description: "Cero complicaciones, comer palomitas y disfrutar" },
      { id: "opt-dark", label: "Tensión y oscuridad", description: "Morderse las uñas con una atmósfera inquietante" },
      { id: "opt-uplifting", label: "Inspirador y emotivo", description: "Historias humanas que tocan el corazón y dejan buen sabor de boca" },
    ],
  },
  {
    id: "q-duration",
    category: "duration",
    title: "¿Límite de duración para no dormirse en el sofá?",
    subtitle: "El cansancio colectivo también manda",
    options: [
      { id: "opt-short", label: "Menos de 100 minutos (< 1h 40m)", description: "Película ágil y directa a la cama temprano" },
      { id: "opt-standard", label: "Duración estándar (~ 2 horas)", description: "El formato clásico de cine sin excederse" },
      { id: "opt-long", label: "Sin prisa (hasta 2h 30m)", description: "Si la película es una obra maestra, que dure lo que haga falta" },
      { id: "opt-epic-length", label: "Maratón épico (> 2h 30m)", description: "Grandes odiseas o versiones extendidas donde sumergirse a fondo" },
    ],
  },
  {
    id: "q-era",
    category: "era",
    title: "¿De qué época nos apetece el cine hoy?",
    subtitle: "El estilo visual y la nostalgia importan",
    options: [
      { id: "opt-recent", label: "Estrenos recientes (2020 - Actualidad)", description: "Efectos modernos, temas actuales y factura impecable" },
      { id: "opt-modern-classic", label: "Clásicos modernos (2000 - 2019)", description: "La era dorada del thriller y blockbuster contemporáneo" },
      { id: "opt-retro", label: "Nostalgia 80s / 90s", description: "Efectos prácticos, bandas sonoras míticas y carisma puro" },
      { id: "opt-golden-age", label: "Clásicos dorados (antes de 1980)", description: "Joyas maestras de la historia del cine que marcaron escuela" },
    ],
  },
  {
    id: "q-visual-style",
    category: "visual",
    title: "¿Qué estilo visual preferís en pantalla?",
    subtitle: "La estética de la televisión marca la experiencia",
    options: [
      { id: "opt-cinematic", label: "Gran cinematografía espectacular", description: "Planos majestuosos, iluminación artística y fotografía top" },
      { id: "opt-gritty", label: "Realista y crudo (Cámara en mano)", description: "Inmersión documental, naturalismo y cercanía" },
      { id: "opt-stylized", label: "Hiperestilizado o Animación adulta", description: "Colores vivos, montaje pop o animación de vanguardia" },
      { id: "opt-neon-noir", label: "Neo-Noir & Atmósfera visual", description: "Luces de neón, contrastes oscuros y puesta en escena elegante" },
    ],
  },
  {
    id: "q-intensity",
    category: "intensity",
    title: "¿Cuánta intensidad cardiaca aguanta el salón?",
    subtitle: "Para regular sustos o taquicardias",
    options: [
      { id: "opt-chill", label: "Zona de confort y relax", description: "Agradable, reconfortante y sin picos de angustia" },
      { id: "opt-medium-intensity", label: "Tensión moderada", description: "Momentos de intriga que enganchan sin traumatizar" },
      { id: "opt-hardcore", label: "Adrenalina a tope", description: "Al borde del sofá con el corazón en la garganta" },
      { id: "opt-rollercoaster", label: "Montaña rusa emocional", description: "Alternar calma, risas y picos de infarto durante toda la película" },
    ],
  },
  {
    id: "q-plot-twists",
    category: "plot",
    title: "¿Queréis que la trama os engañe?",
    subtitle: "El nivel de trampas del guionista",
    options: [
      { id: "opt-twists-yes", label: "¡Sí! Cuantos más giros locos, mejor", description: "Queremos darnos cabezazos intentando adivinar el final" },
      { id: "opt-twists-mindgame", label: "Duelo de ingenio con pistas", description: "Pistas sutiles para ir deduciendo la verdad antes del final" },
      { id: "opt-twists-no", label: "Trama sólida y directa sin trucos", description: "Una buena historia bien contada sin giros forzados" },
      { id: "opt-twists-open", label: "Final abierto o ambiguo", description: "Historias sugerentes que dejan la interpretación en manos del público" },
    ],
  },
  {
    id: "q-humor-level",
    category: "humor",
    title: "¿Qué papel debe tener el humor?",
    subtitle: "Para no equivocarse con las bromas",
    options: [
      { id: "opt-serious", label: "Seriedad total", description: "Tono sobrio, dramático o solemne" },
      { id: "opt-comic-relief", label: "Alivio cómico puntual", description: "Historia seria pero con comentarios ingeniosos" },
      { id: "opt-full-comedy", label: "Risas continuas", description: "La prioridad absoluta es pasar un buen rato riendo" },
      { id: "opt-dark-humor", label: "Humor negro y sátira", description: "Sarcasmo mordaz, ironía inteligente y situaciones políticamente incorrectas" },
    ],
  },
  {
    id: "q-setting",
    category: "setting",
    title: "¿Dónde debe ambientarse la historia?",
    subtitle: "El universo en el que nos sumergiremos",
    options: [
      { id: "opt-city", label: "Gran ciudad contemporánea", description: "Rascacielos, callejones oscuros y vida urbana moderna" },
      { id: "opt-isolated", label: "Lugar remoto o aislado", description: "Una isla, una cabaña en el bosque o una nave espacial" },
      { id: "opt-fantasy-sci", label: "Mundo ficticio / Fantasía", description: "Universos creados desde cero con sus propias reglas" },
      { id: "opt-historical-setting", label: "Época histórica fascinante", description: "Reinos antiguos, guerras del pasado o la Belle Époque con gran ambientación" },
    ],
  },
  {
    id: "q-conflict-scale",
    category: "scale",
    title: "¿Qué escala de conflicto preferís?",
    subtitle: "Desde un secreto familiar hasta el fin del planeta",
    options: [
      { id: "opt-personal", label: "Íntimo y psicológico", description: "Conflictos entre pocos personajes en habitaciones cerradas" },
      { id: "opt-social", label: "Conspiración o crimen organizado", description: "Robos, mafias, detectives y poder institucional" },
      { id: "opt-epic", label: "Épico / Salvación del mundo", description: "Grandes batallas, apocalipsis o destino de la humanidad" },
      { id: "opt-survival", label: "Supervivencia extrema", description: "El ser humano al límite contra la naturaleza, el frío o el aislamiento" },
    ],
  },
  {
    id: "q-protagonist",
    category: "character",
    title: "¿Qué tipo de protagonista preferís seguir?",
    subtitle: "La brújula moral del protagonista",
    options: [
      { id: "opt-antihero", label: "Antihéroe de moral dudosa", description: "Carismático, imperfecto y capaz de cruzar cualquier línea" },
      { id: "opt-underdog", label: "El desvalido (Underdog)", description: "Gente común superando obstáculos contra todo pronóstico" },
      { id: "opt-ensemble", label: "Grupo coral / Sin protagonista único", description: "Varios personajes con sus propias tramas entrelazadas" },
      { id: "opt-duo", label: "Dúo inseparable (Buddy dynamic)", description: "Dos personalidades opuestas obligadas a cooperar con química brutal" },
    ],
  },
  {
    id: "q-ending-flavor",
    category: "ending",
    title: "¿Cómo preferís que sea el desenlace?",
    subtitle: "Para no terminar la noche con mal cuerpo",
    options: [
      { id: "opt-triumphant", label: "Final satisfactorio y con victoria", description: "Todo encaja, los buenos ganan y salimos con energía" },
      { id: "opt-bittersweet", label: "Agridulce y reflexivo", description: "Realista, con sacrificios y que deja poso emocional" },
      { id: "opt-shocking", label: "Devastador o con cliffhanger", description: "Un final inesperado que nos deje mirando la pantalla negra" },
      { id: "opt-poetic-justice", label: "Justicia poética rotunda", description: "Cada personaje recibe exactamente su merecido de forma catártica" },
    ],
  },
  {
    id: "q-dialogue-style",
    category: "dialogue",
    title: "¿Cómo os gustan los diálogos?",
    subtitle: "El ritmo verbal de la cinta",
    options: [
      { id: "opt-witty", label: "Afilados y con mucha chispa", description: "Estilo Tarantino o Sorkin: réplicas rápidas e ingeniosas" },
      { id: "opt-minimal", label: "Más imagen, menos palabras", description: "Narración visual: miradas, silencios y música" },
      { id: "opt-classic-story", label: "Narración fluida convencional", description: "Diálogos naturales que sirven a la trama sin excesos" },
      { id: "opt-philosophical", label: "Diálogos profundos y reflexivos", description: "Conversaciones que te dejan pensando y frases memorables" },
    ],
  },
  {
    id: "q-music-role",
    category: "music",
    title: "¿Qué papel debe jugar la banda sonora?",
    subtitle: "El componente sonoro en el salón",
    options: [
      { id: "opt-soundtrack-epic", label: "Banda sonora protagonista y memorable", description: "Temas inolvidables que se te quedan grabados días" },
      { id: "opt-soundtrack-jukebox", label: "Éxitos pop/rock y canciones icónicas", description: "Temazos reconocibles que te hacen mover los pies en el sofá" },
      { id: "opt-soundtrack-synth", label: "Sintetizadores y electrónica inmersiva", description: "Pulsos electrónicos envolventes estilo Stranger Things o Blade Runner" },
      { id: "opt-soundtrack-ambient", label: "Música sutil de acompañamiento", description: "Que cree atmósfera sin llamar la atención sobre sí misma" },
    ],
  },
  {
    id: "q-violence",
    category: "violence",
    title: "¿Nivel de violencia o sangre permitido?",
    subtitle: "Para que nadie tenga que taparse los ojos",
    options: [
      { id: "opt-violence-low", label: "Blanca / Cero gore", description: "Apta para estómagos sensibles sin vísceras ni crueldad" },
      { id: "opt-violence-stylized", label: "Violencia estilizada de acción", description: "Disparos y peleas coreografiadas sin recreación morbosa" },
      { id: "opt-violence-raw", label: "Cruda y visceral", description: "Si la historia pide sangre real, sin censura" },
      { id: "opt-violence-psychological", label: "Terror psicológico sin sangre", description: "Cero vísceras pero tensión agobiante que te pone la piel de gallina" },
    ],
  },
  {
    id: "q-brain-energy",
    category: "brain",
    title: "¿Cuánta atención mental queréis poner hoy?",
    subtitle: "Ajustar al nivel de cansancio colectivo",
    options: [
      { id: "opt-turn-off-brain", label: "Apagar el cerebro por completo", description: "Disfrutar del espectáculo sin tener que pensar" },
      { id: "opt-detective-mode", label: "Modo detective activo", description: "Atentos a pistas, detalles y sospechosos" },
      { id: "opt-philosophical", label: "Dilemas éticos y morales", description: "Películas que cuestionan qué haríamos nosotros" },
      { id: "opt-puzzle-collective", label: "Puzle colectivo para debatir", description: "Para ir comentando teorías juntos en tiempo real en el salón" },
    ],
  },
  {
    id: "q-romance-presence",
    category: "romance",
    title: "¿Queréis trama romántica en la película?",
    subtitle: "Para evitar empalagues o frialdad según el grupo",
    options: [
      { id: "opt-no-romance", label: "Cero romance, gracias", description: "Mejor centrarse en la misión, supervivencia o misterio" },
      { id: "opt-subtle-romance", label: "Tensión o química sutil", description: "Miradas y complicidad como subrama sin distraer" },
      { id: "opt-central-love", label: "El amor como motor principal", description: "Pasión, reencuentros o pérdidas que mueven al protagonista" },
      { id: "opt-tragic-love", label: "Romance prohibido o tormentoso", description: "Pasión de alto voltaje con drama y sacrificios que conmueven" },
    ],
  },
  {
    id: "q-movie-origin",
    category: "origin",
    title: "¿Origen o cultura cinematográfica?",
    subtitle: "Variar fuera de Hollywood enriquece la sesión",
    options: [
      { id: "opt-hollywood", label: "Hollywood / Gran producción", description: "El formato más reconocible con grandes estrellas" },
      { id: "opt-european-spanish", label: "Cine español o europeo", description: "Historias más cercanas con identidad propia y gran calidad" },
      { id: "opt-asian-cinema", label: "Cine asiático (Corea, Japón, etc.)", description: "Narrativas rompedoras, giros salvajes y originalidad pura" },
      { id: "opt-latin-world", label: "Cine latinoamericano o internacional", description: "Historias vibrantes, realismo mágico y propuestas frescas de festivales" },
    ],
  },
  {
    id: "q-realism-level",
    category: "realism",
    title: "¿Basada en hechos reales o pura ficción?",
    subtitle: "El anclaje con la realidad",
    options: [
      { id: "opt-true-story", label: "Inspirada en hechos reales", description: "La fascinación de saber que ocurrió de verdad" },
      { id: "opt-historical-drama", label: "Ficción histórica rigurosa", description: "Reconstrucción meticulosa de épocas pasadas con drama fascinante" },
      { id: "opt-sci-realistic", label: "Ciencia ficción plausible (Hard Sci-Fi)", description: "Conceptos científicos reales llevados al extremo como Interstellar" },
      { id: "opt-pure-fiction", label: "Pura inventiva y ficción", description: "Libertad total para sorprender sin ataduras históricas" },
    ],
  },
  {
    id: "q-villain-type",
    category: "villain",
    title: "¿Qué tipo de antagonista preferís?",
    subtitle: "La calidad de una película depende de su enemigo",
    options: [
      { id: "opt-mastermind", label: "Genio maquiavélico", description: "Siempre diez pasos por delante de los protagonistas" },
      { id: "opt-unseen-threat", label: "Amenaza invisible o sistema corrupto", description: "El tiempo en contra, una enfermedad o una corporación" },
      { id: "opt-chaotic-evil", label: "Fuerza salvaje e impredecible", description: "Locura pura, monstruos o asesinos sin piedad" },
      { id: "opt-sympathetic-villain", label: "Villano trágico y comprensible", description: "Motivaciones humanas complejas que hacen que casi le entiendas" },
    ],
  },
  {
    id: "q-emotional-impact",
    category: "emotion",
    title: "¿Qué emoción dominante buscáis hoy?",
    subtitle: "Para conectar con el estado de ánimo de todos",
    options: [
      { id: "opt-euphoria", label: "Euforia y diversión", description: "Celebrar cada escena y comentar en voz alta con amigos" },
      { id: "opt-catharsis", label: "Catarsis o emoción profunda", description: "Llegar a soltar alguna lagrimita de emoción genuina" },
      { id: "opt-suspense-sweat", label: "Nervios y tensión constante", description: "Esa sensación placentera de alivio cuando todo se resuelve" },
      { id: "opt-warm-comfort", label: "Calidez reconfortante (Comfort movie)", description: "Sensación de abrazo cálido, nostalgia y paz al terminar" },
    ],
  },
  {
    id: "q-snack-vibe",
    category: "snacks",
    title: "¿Qué merienda/cena acompaña la sesión?",
    subtitle: "La comida en el sofá también dicta el tipo de cine",
    options: [
      { id: "opt-pizza-beer", label: "Pizza, cerveza o refrescos", description: "Perfecto para películas dinámicas, accesibles y colectivas" },
      { id: "opt-popcorn-candy", label: "Palomitas, gominolas y chocolate", description: "Experiencia clásica de sala de cine para disfrutar a tope" },
      { id: "opt-picoteo", label: "Picoteo ligero y café/infusión", description: "Para películas que requieren concentración y silencio" },
      { id: "opt-gourmet-night", label: "Cena especial o sushi", description: "Noche de gala en el salón que pide una película a la altura" },
    ],
  },
  {
    id: "q-structure",
    category: "structure",
    title: "¿Estructura cronológica o no lineal?",
    subtitle: "Cómo se organiza el tiempo en la historia",
    options: [
      { id: "opt-linear", label: "Cronológica de principio a fin", description: "Clara, limpia y fácil de seguir para todo el grupo" },
      { id: "opt-non-linear", label: "Saltos temporales y flashbacks", description: "Puzzles narrativos que recomponen la historia" },
      { id: "opt-realtime", label: "En tiempo real (metraje continuo)", description: "La tensión de vivir los acontecimientos minuto a minuto sin elipsis" },
      { id: "opt-parallel-stories", label: "Historias cruzadas (Ensemble)", description: "Vidas paralelas que convergen en un clímax común inesperado" },
    ],
  },
  {
    id: "q-discussion-potential",
    category: "debate",
    title: "¿Queréis debate tras la película?",
    subtitle: "El valor del poscine con amigos",
    options: [
      { id: "opt-high-debate", label: "¡Sí! Con teorías y debate acalorado", description: "Finales abiertos o dilemas morales para hablar 1 hora" },
      { id: "opt-moral-debate", label: "Dilema ético sobre decisiones", description: "¿Qué habrías hecho tú en el lugar del protagonista?" },
      { id: "opt-artistic-debate", label: "Análisis técnico y cinéfilo", description: "Para comentar planos, dirección, estética y actuaciones" },
      { id: "opt-low-debate", label: "No, disfrutarla y a dormir felices", description: "Todo queda cerrado y resuelto de forma impecable" },
    ],
  },
  {
    id: "q-special-effects",
    category: "effects",
    title: "¿Efectos prácticos o CGI digital?",
    subtitle: "La textura de lo que vemos",
    options: [
      { id: "opt-practical", label: "Especialistas reales y efectos físicos", description: "Especialistas acrobáticos, coches reales y maquetas" },
      { id: "opt-cgi", label: "CGI apabullante y mundos digitales", description: "Magia digital sin límites de imaginación" },
      { id: "opt-mixed-effects", label: "Híbrido equilibrado: realidad y CGI", description: "Lo mejor de los dos mundos al servicio de la inmersión" },
      { id: "opt-no-effects", label: "Cero efectos, puro teatro interpretativo", description: "La fuerza de los actores y del guion en primer plano" },
    ],
  },
  {
    id: "q-camera-movement",
    category: "direction",
    title: "¿Dirección dinámica o pausada?",
    subtitle: "Cómo se mueve la cámara",
    options: [
      { id: "opt-dynamic-cam", label: "Cámara ágil y montaje picado", description: "Cine moderno y enérgico que te empuja hacia adelante" },
      { id: "opt-steady-cam", label: "Planos fijos y contemplativos", description: "Dejar que la escena respire y los actores brillen" },
      { id: "opt-handheld", label: "Cámara en mano inmersiva", description: "Sentir que estás dentro de la escena como un testigo invisible" },
      { id: "opt-symmetrical", label: "Simetría visual hipnótica", description: "Composiciones geométricas y encuadres pictóricos perfectos" },
    ],
  },
  {
    id: "q-sound-design",
    category: "sound",
    title: "¿Cómo tenéis los altavoces de la tele hoy?",
    subtitle: "Para no despertar a los vecinos",
    options: [
      { id: "opt-sound-loud", label: "¡Volumen alto! Queremos sentir los graves", description: "Explosiones, tiroteos y música envolvente" },
      { id: "opt-surround-fx", label: "Efectos envolventes 3D y espaciales", description: "Sonidos que viajan por el salón y te sumergen por completo" },
      { id: "opt-dialogue-focus", label: "Voces nítidas y cristalinas", description: "Prioridad a la comprensión perfecta de cada palabra" },
      { id: "opt-sound-moderate", label: "Volumen comedido / Nocturno", description: "Claridad en diálogos sin estruendos repentinos" },
    ],
  },
  {
    id: "q-group-consensus",
    category: "consensus",
    title: "¿Filosofía del grupo ante las discrepancias?",
    subtitle: "Regla de oro para elegir",
    options: [
      { id: "opt-unanimous-strict", label: "Unanimidad total o nada", description: "Buscamos esa joya que enamore al 100% de la sala" },
      { id: "opt-majority-compromise", label: "Mayoría razonable", description: "Si a la mayoría le flipa y al resto le parece bien, ¡se ve!" },
      { id: "opt-curator-choice", label: "Criterio de IA mediadora", description: "Confiamos en el veredicto matemático de la frontera de Pareto" },
      { id: "opt-wildcard-gamble", label: "Apuesta a ciegas / Ruleta", description: "Que el destino decida entre las mejores opciones finalistas" },
    ],
  },
  {
    id: "q-final-touch",
    category: "final",
    title: "Último detalle: ¿Preferís ir a tiro fijo o descubrir?",
    subtitle: "El factor sorpresa",
    options: [
      { id: "opt-safe-hit", label: "A tiro fijo (Aclamada por todos)", description: "Garantía de calidad con miles de críticas positivas" },
      { id: "opt-hidden-gem", label: "Joya oculta / Sorpresa inesperada", description: "Esa película que nadie del grupo conocía y resulta ser un 10" },
      { id: "opt-cult-classic", label: "Clásico de culto de nicho", description: "Cine venerado por los fans más apasionados que merece descubrirse" },
      { id: "opt-recent-buzz", label: "Fenómeno del momento", description: "La película de la que todo el mundo habla y no puedes perderte" },
    ],
  },
];

/**
 * Helper to pick randomized, varied questions for each round.
 * Guarantees that every question selected has strictly 4 options.
 */
export function getRandomQuestionBatch(count: number = 3, excludeIds: string[] = []): Question[] {
  const available = MOCK_QUESTIONS_POOL.filter((q) => !excludeIds.includes(q.id));
  const pool = available.length >= count ? available : MOCK_QUESTIONS_POOL;

  // Fisher-Yates shuffle
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

export const INITIAL_PARTICIPANTS = [
  { id: "user-1", name: "Alex (Tú)", avatar: "A", color: "bg-indigo-500", status: "ready" as const, isHost: true },
  { id: "user-2", name: "Sofía M.", avatar: "S", color: "bg-pink-500", status: "ready" as const },
  { id: "user-3", name: "Carlos G.", avatar: "C", color: "bg-emerald-500", status: "ready" as const },
  { id: "user-4", name: "Laura T.", avatar: "L", color: "bg-amber-500", status: "ready" as const },
];
