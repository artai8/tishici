export type AIModel = 'gemini-3-flash-preview' | 'gemini-3-pro-preview';

export interface Shot {
  id: number;
  description: string;
  voiceover: string;
  movement: string;
}

export interface Character {
  id: string;
  name: string;
  description: string;
  prompt?: string;
}

export interface Scene {
  id: string;
  name: string;
  description: string;
  prompt?: string;
}

export interface Settings {
  overview: string;
  style: string;
}

export interface ImagePrompt {
  shotId: number;
  subject: string;
  environment: string;
  lighting: string;
  camera: string;
  colorGrade: string;
  style: string;
  quality: string;
  fullPrompt: string; // The assembled prompt string
}

export interface VideoPrompt {
  shotId: number;
  prompt: string;
}

export interface ProjectData {
  title: string;
  settings: Settings;
  characters: Character[];
  scenes: Scene[];
  script: Shot[];
  imagePrompts: Record<number, ImagePrompt>; // Keyed by shot ID
  videoPrompts: Record<number, VideoPrompt>; // Keyed by shot ID
}

export interface GenerationProgress {
  status: 'idle' | 'analyzing' | 'generating_script' | 'generating_prompts' | 'complete' | 'error';
  message: string;
  percent: number;
}
