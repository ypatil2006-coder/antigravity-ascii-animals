import { AnimalEngine } from "./engine";
import { ANIMALS, type AnimalKey } from "./animals";

export const SPECIES_CONFIG: { key: AnimalKey; label: string; color: string; hotkey: string }[] = [
  { key: "butterflies", label: "Butterfly", color: "#38bdf8", hotkey: "1" },
  { key: "koi",         label: "Koi",       color: "#fb923c", hotkey: "2" },
  { key: "jellyfish",   label: "Jellyfish", color: "#f472b6", hotkey: "3" },
  { key: "dragonflies", label: "Dragonfly", color: "#4ade80", hotkey: "4" },
  { key: "frogs",       label: "Frog",      color: "#84cc16", hotkey: "5" },
  { key: "cranes",      label: "Crane",     color: "#f8fafc", hotkey: "6" },
  { key: "crabs",       label: "Crab",      color: "#f87171", hotkey: "7" },
  { key: "manta",       label: "Manta",     color: "#818cf8", hotkey: "8" }
];

(globalThis as any).AnimalEngine = AnimalEngine;
(globalThis as any).ANIMALS = ANIMALS;
(globalThis as any).SPECIES_CONFIG = SPECIES_CONFIG;
