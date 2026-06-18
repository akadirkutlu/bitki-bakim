import { PLANT_TYPES } from "./plantTypes";
import type { PlantType } from "./types";

const TURKISH_CHAR_MAP: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[çğıöşü]/g, (char) => TURKISH_CHAR_MAP[char] ?? char);
}

// English common names that won't match Latin/Turkish names directly.
const EXTRA_KEYWORDS: Record<string, string[]> = {
  "dracaena-marginata": ["dracaena", "drasena", "dragon", "marginata"],
  "sansevieria-trifasciata": ["snake", "sansevieria"],
  "ficus-elastica": ["rubber"],
  spathiphyllum: ["peace", "lily"],
  "crassula-ovata": ["jade", "money"],
  phalaenopsis: ["orchid", "orkide"],
  "zamioculcas-zamiifolia": ["zz"],
  cactaceae: ["cactus"],
  "nephrolepis-exaltata": ["fern"],
  "ficus-lyrata": ["fiddle"],
  "chlorophytum-comosum": ["spider"],
  "saintpaulia": ["violet"],
  "hedera-helix": ["ivy"],
  "schefflera-arboricola": ["schefflera", "seflera", "umbrella", "semsiye"],
  "syngonium-podophyllum": ["arrowhead", "singonyum", "goosefoot"],
  "fittonia-albivenis": ["nerve", "mosaic", "fitonya", "sinir"],
  "beaucarnea-recurvata": ["ponytail", "elephant", "fil", "kuyruk"],
  "asplenium-nidus": ["nest", "fern", "yuva"],
  adiantum: ["maidenhair", "fern", "venus", "baldirikara"],
  "senecio-rowleyanus": ["pearls", "string", "inci"],
  haworthia: ["zebra", "sukulent"],
  "dracaena-fragrans": ["corn", "dracaena", "drasena", "misir"],
  "aspidistra-elatior": ["cast", "iron", "demir"],
  "pachira-aquatica": ["pachira", "money", "guiana", "guyana", "chestnut"],
  pelargonium: ["geranium", "sardunya"],
  "euphorbia-pulcherrima": ["poinsettia", "ataturk", "yildiz"],
  "hibiscus-rosa-sinensis": ["hibiscus", "japon", "china", "rose"],
  "fatsia-japonica": ["aralia", "fatsya", "fatsia"],
  "cordyline-fruticosa": ["cordyline", "kordilin"],
};

function keywordsFor(plantType: PlantType): string[] {
  const fromLatin = normalize(plantType.latinName)
    .split(/\s+/)
    .filter((word) => word.length > 3);
  const fromTurkish = plantType.turkishNames.flatMap((name) =>
    normalize(name)
      .split(/\s+/)
      .filter((word) => word.length > 3)
  );
  const fromEnglish = plantType.englishNames.flatMap((name) =>
    normalize(name)
      .split(/\s+/)
      .filter((word) => word.length > 3)
  );
  const extras = EXTRA_KEYWORDS[plantType.id] ?? [];
  return [...new Set([...fromLatin, ...fromTurkish, ...fromEnglish, ...extras])];
}

function scorePlantType(plantType: PlantType, normalizedHint: string): number {
  let score = 0;

  if (normalizedHint.includes(normalize(plantType.latinName))) {
    score += 4;
  }

  for (const name of plantType.turkishNames) {
    if (normalizedHint.includes(normalize(name))) {
      score += 3;
    }
  }

  for (const name of plantType.englishNames) {
    if (normalizedHint.includes(normalize(name))) {
      score += 3;
    }
  }

  for (const keyword of keywordsFor(plantType)) {
    if (normalizedHint.includes(keyword)) {
      score += 2;
    }
  }

  return score;
}

export function identifyPlantCandidates(hint: string): PlantType[] {
  const normalizedHint = normalize(hint);
  const ranked = PLANT_TYPES.map((plantType) => ({
    plantType,
    score: scorePlantType(plantType, normalizedHint),
  })).sort((a, b) => b.score - a.score);

  if (!ranked[0] || ranked[0].score <= 0) {
    // No signal in the hint: return a small set of the most common picks.
    return PLANT_TYPES.slice(0, 4);
  }

  const topScore = ranked[0].score;
  return ranked
    .filter((item) => item.score >= Math.max(1, topScore - 2))
    .slice(0, 4)
    .map((item) => item.plantType);
}
