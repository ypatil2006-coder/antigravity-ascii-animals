import type { Animal } from "../flock";
import { MANTA_CANDIDATES } from "./manta";

export interface Candidate {
  animal: Animal<any>;
  note: string;
}

/** Candidate versions of Manta */
export const CANDIDATES: Record<string, Candidate[]> = {
  manta: MANTA_CANDIDATES,
};

export function getStoredCandidate(key: string, def = 0): number {
  try {
    if (typeof localStorage !== "undefined") {
      const val = localStorage.getItem(`ascii-animals:candidate:${key}`);
      if (val !== null) {
        const n = Number(val);
        if (!isNaN(n) && n >= 0 && n < 4) return n;
      }
    }
  } catch {}
  return def;
}

export function setStoredCandidate(key: string, idea: number) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(`ascii-animals:candidate:${key}`, String(idea));
    }
  } catch {}
}
