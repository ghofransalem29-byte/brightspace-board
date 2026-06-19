import { useEffect, useState, useCallback } from "react";

export type CardKind = "image" | "text" | "color";

export interface BoardCard {
  id: string;
  kind: CardKind;
  x: number;
  y: number;
  w: number;
  h: number;
  content: string; // image url, text, or hex color
  rotation?: number;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  cover: string; // hex or url
  palette: string[];
  createdAt: number;
  cards: BoardCard[];
}

const KEY = "moodboard.projects.v1";

const SEED: Project[] = [
  {
    id: "seed-noir",
    title: "Noir Cafe Identity",
    description: "Smoky espresso bars, raw concrete, brass accents.",
    cover: "#1a1a1a",
    palette: ["#1a1a1a", "#3d2b1f", "#b8956a", "#f0ead6"],
    createdAt: Date.now() - 86400000 * 4,
    cards: [],
  },
  {
    id: "seed-coast",
    title: "Coastal Editorial",
    description: "Sun-bleached linen, salt air, faded ceramics.",
    cover: "#c9d6db",
    palette: ["#0f3a52", "#5c8a9c", "#c9d6db", "#f4ede2"],
    createdAt: Date.now() - 86400000 * 12,
    cards: [],
  },
  {
    id: "seed-bloom",
    title: "Bloom Studio",
    description: "Botanical print shop — risograph pinks and mossy greens.",
    cover: "#e8a5b8",
    palette: ["#3d4a2a", "#a8b87a", "#e8a5b8", "#f5e9d4"],
    createdAt: Date.now() - 86400000 * 25,
    cards: [],
  },
];

function read(): Project[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as Project[];
  } catch {
    return SEED;
  }
}

function write(projects: Project[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(projects));
  window.dispatchEvent(new CustomEvent("moodboard:update"));
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProjects(read());
    setLoaded(true);
    const handler = () => setProjects(read());
    window.addEventListener("moodboard:update", handler);
    return () => window.removeEventListener("moodboard:update", handler);
  }, []);

  const create = useCallback((title: string) => {
    const id = `p-${Date.now().toString(36)}`;
    const palettes = [
      ["#0f0f0f", "#2a2a2a", "#d4a574", "#f5f0e6"],
      ["#1a2e3d", "#4a7a8c", "#e8d4b8", "#f0e8dc"],
      ["#2d3a1f", "#7a8b5c", "#d4c5a0", "#f4ede2"],
      ["#3d1f2a", "#8b4a5c", "#d4a5b8", "#f0e0e4"],
    ];
    const palette = palettes[Math.floor(Math.random() * palettes.length)];
    const project: Project = {
      id,
      title: title || "Untitled Board",
      description: "A new visual exploration.",
      cover: palette[2],
      palette,
      createdAt: Date.now(),
      cards: [],
    };
    const next = [project, ...read()];
    write(next);
    return project;
  }, []);

  return { projects, loaded, create };
}

export function getProject(id: string): Project | undefined {
  return read().find((p) => p.id === id);
}

export function updateProject(id: string, patch: Partial<Project>) {
  const next = read().map((p) => (p.id === id ? { ...p, ...patch } : p));
  write(next);
}

export function deleteProject(id: string) {
  write(read().filter((p) => p.id !== id));
}