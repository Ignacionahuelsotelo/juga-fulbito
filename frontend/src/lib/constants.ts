// Arrays for forms (selects, dropdowns)
export const POSITIONS_LIST = [
  { value: "goalkeeper", label: "Arquero" },
  { value: "defender", label: "Defensor" },
  { value: "midfielder", label: "Mediocampista" },
  { value: "forward", label: "Delantero" },
  { value: "mixed", label: "Mixto" },
] as const;

export const SKILL_LEVELS_LIST = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "competitive", label: "Competitivo" },
] as const;

export const PLAY_STYLES_LIST = [
  { value: "relaxed", label: "Tranqui" },
  { value: "competitive", label: "Competitivo" },
  { value: "physical", label: "Muy fisico" },
] as const;

export const DOMINANT_FEET_LIST = [
  { value: "left", label: "Zurdo" },
  { value: "right", label: "Diestro" },
  { value: "both", label: "Ambidiestro" },
] as const;

export const MATCH_TYPES_LIST = [
  { value: "5v5", label: "Futbol 5" },
  { value: "7v7", label: "Futbol 7" },
  { value: "11v11", label: "Futbol 11" },
] as const;

export const MATCH_TYPE_PREFS_LIST = [
  { value: "competitive", label: "Competitivo" },
  { value: "relaxed", label: "Tranqui" },
  { value: "any", label: "Me da igual" },
] as const;

export const DURATION_OPTIONS = [
  { value: 60, label: "1 hora" },
  { value: 90, label: "1:30 hs" },
  { value: 120, label: "2 horas" },
] as const;

// Lookup maps for display
export const POSITIONS: Record<string, string> = Object.fromEntries(
  POSITIONS_LIST.map((p) => [p.value, p.label])
);

export const SKILL_LEVELS: Record<string, string> = Object.fromEntries(
  SKILL_LEVELS_LIST.map((s) => [s.value, s.label])
);

export const PLAY_STYLES: Record<string, string> = Object.fromEntries(
  PLAY_STYLES_LIST.map((s) => [s.value, s.label])
);

export const DOMINANT_FEET: Record<string, string> = Object.fromEntries(
  DOMINANT_FEET_LIST.map((f) => [f.value, f.label])
);

export const MATCH_TYPES: Record<string, string> = Object.fromEntries(
  MATCH_TYPES_LIST.map((t) => [t.value, t.label])
);

export const MATCH_STATUSES: Record<string, { label: string; color: string }> = {
  open: { label: "Abierto", color: "green" },
  full: { label: "Completo", color: "blue" },
  confirmed: { label: "Confirmado", color: "indigo" },
  in_progress: { label: "En juego", color: "orange" },
  completed: { label: "Finalizado", color: "gray" },
  cancelled: { label: "Cancelado", color: "red" },
};

export const RATING_CATEGORIES = [
  { key: "skill_score", label: "Habilidad", emoji: "&#9917;" },
  { key: "punctuality_score", label: "Puntualidad", emoji: "&#9201;" },
  { key: "fair_play_score", label: "Fair Play", emoji: "&#129309;" },
  { key: "attitude_score", label: "Actitud", emoji: "&#128170;" },
] as const;
