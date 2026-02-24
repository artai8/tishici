import { GoogleGenAI, Type } from "@google/genai";
import { ProjectData, Shot, Character, Scene, AIModel, ImagePrompt, VideoPrompt, Settings } from "../types";

const cleanJson = (text: string) => {
  let cleaned = text.trim();
  // Remove markdown code blocks
  cleaned = cleaned.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  // Attempt to find the first '{' and last '}' if there is extra text
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  return cleaned;
};

let runtimeApiKey: string | null = null;

export const setApiKey = (key: string) => {
  runtimeApiKey = key;
};

const getAiClient = () => {
  const apiKey = runtimeApiKey || process.env.API_KEY;
  if (!apiKey || apiKey === '__GEMINI_API_KEY_RUNTIME__') {
    throw new Error("API Key not found. Please set GEMINI_API_KEY in HuggingFace Space secrets or enter it in the app.");
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeImageIdea = async (
  fileBase64: string,
  mimeType: string,
  model: AIModel = 'gemini-3-flash-preview'
): Promise<string> => {
  const ai = getAiClient();
  
  const prompt = `
    Analyze this image or video frame. 
    Extract the core creative concept, visual style, atmosphere, and potential narrative. 
    Provide a concise but descriptive summary that can be used as a creative brief for a video project.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [
        { inlineData: { data: fileBase64, mimeType } },
        { text: prompt }
      ]
    }
  });

  return response.text || "Analysis failed.";
};

export const generateScriptFromIdea = async (
  idea: string,
  shotCount: number,
  model: AIModel = 'gemini-3-pro-preview'
): Promise<Partial<ProjectData>> => {
  const ai = getAiClient();

  const systemInstruction = `
    You are an expert AI Video Director. Your task is to take a creative idea and turn it into a structured storyboard script.
    
    Requirements:
    1. Define the world overview and visual style.
    2. Identify key characters and scenes.
    3. Generate exactly ${shotCount} shots.
    4. Each shot must have a visual description, voiceover/audio, and camera movement.
    5. The shots must follow a logical narrative flow (Beginning, Middle, End).
    
    Output strictly in JSON format.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      settings: {
        type: Type.OBJECT,
        properties: {
          overview: { type: Type.STRING },
          style: { type: Type.STRING }
        },
        required: ["overview", "style"]
      },
      characters: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["id", "name", "description"]
        }
      },
      scenes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["id", "name", "description"]
        }
      },
      script: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.INTEGER },
            description: { type: Type.STRING },
            voiceover: { type: Type.STRING },
            movement: { type: Type.STRING }
          },
          required: ["id", "description", "voiceover", "movement"]
        }
      }
    },
    required: ["title", "settings", "characters", "scenes", "script"]
  };

  const response = await ai.models.generateContent({
    model: model,
    contents: `Idea: ${idea}`,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  });

  try {
    const rawText = cleanJson(response.text || "{}");
    return JSON.parse(rawText) as Partial<ProjectData>;
  } catch (e) {
    console.error("JSON Parse Error", e);
    throw new Error("Failed to parse script generation response.");
  }
};

export const generatePromptsForShots = async (
  shots: Shot[],
  settings: Settings,
  model: AIModel = 'gemini-3-flash-preview'
): Promise<{ imagePrompts: Record<number, ImagePrompt>, videoPrompts: Record<number, VideoPrompt> }> => {
  const ai = getAiClient();

  const promptInput = JSON.stringify({
    style: settings.style,
    shots: shots
  });

  const systemInstruction = `
    You are a prompt engineering expert for Midjourney and Runway Gen-3.
    Convert the following shots into specific prompts.
    
    For Image Prompts (Midjourney):
    - Break down into: Subject, Environment, Lighting, Camera, ColorGrade, Style, Quality.
    - Compose a 'fullPrompt' by joining these with commas, adding "--ar 16:9" at the end.
    - Style should match: "${settings.style}".
    
    For Video Prompts (Runway/Kling):
    - Create a fluid natural language description of movement and content.
    - Ensure logical flow.

    Return JSON with two arrays: 'imagePrompts' and 'videoPrompts'.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      imagePrompts: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            shotId: { type: Type.INTEGER },
            subject: { type: Type.STRING },
            environment: { type: Type.STRING },
            lighting: { type: Type.STRING },
            camera: { type: Type.STRING },
            colorGrade: { type: Type.STRING },
            style: { type: Type.STRING },
            quality: { type: Type.STRING },
            fullPrompt: { type: Type.STRING }
          },
          required: ["shotId", "subject", "environment", "lighting", "camera", "colorGrade", "style", "quality", "fullPrompt"]
        }
      },
      videoPrompts: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            shotId: { type: Type.INTEGER },
            prompt: { type: Type.STRING }
          },
          required: ["shotId", "prompt"]
        }
      }
    },
    required: ["imagePrompts", "videoPrompts"]
  };

  const response = await ai.models.generateContent({
    model: model,
    contents: promptInput,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema
    }
  });

  try {
    const rawText = cleanJson(response.text || "{}");
    const result = JSON.parse(rawText);
    
    const imgRecord: Record<number, ImagePrompt> = {};
    const vidRecord: Record<number, VideoPrompt> = {};

    if (result.imagePrompts) {
      result.imagePrompts.forEach((p: any) => { imgRecord[p.shotId] = p; });
    }
    if (result.videoPrompts) {
      result.videoPrompts.forEach((p: any) => { vidRecord[p.shotId] = p; });
    }

    return { imagePrompts: imgRecord, videoPrompts: vidRecord };
  } catch (e) {
    console.error("Prompt Generation Parse Error", e);
    throw new Error("Failed to parse prompt generation response.");
  }
};

export const refineField = async (
  currentValue: string,
  instruction: string,
  context: string,
  model: AIModel = 'gemini-3-flash-preview'
): Promise<string> => {
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model,
    contents: `
      Context: ${context}
      Current Text: "${currentValue}"
      Instruction: ${instruction}
      
      Rewrite the Current Text based on the Instruction. Return ONLY the new text.
    `
  });
  return response.text?.trim() || currentValue;
};
