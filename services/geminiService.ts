import { GoogleGenAI, Type } from "@google/genai";
import { ProjectData, Shot, Character, Scene, AIModel, ImagePrompt, VideoPrompt } from "../types";

// Helper to strip markdown code blocks if the model adds them despite schema
const cleanJson = (text: string) => {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned;
};

// Initialize Gemini Client
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables.");
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

  // Define schema for structured output
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
  settings: any,
  model: AIModel = 'gemini-3-flash-preview'
): Promise<{ imagePrompts: Record<number, ImagePrompt>, videoPrompts: Record<number, VideoPrompt> }> => {
  const ai = getAiClient();

  // We process in batches if too large, but for now assuming < 40 shots, we can do it in one or two calls.
  // To ensure stability, let's just do it in one large context call since Gemini 1.5/3 has huge context.

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

    Return JSON with two maps: 'imagePrompts' and 'videoPrompts', keyed by shot ID.
  `;

  // We define a simpler schema for this specific task to avoid deep nesting issues
  // Using loose schema strategy for flexibility or explicit if needed.
  // Let's try explicit to ensure type safety.

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
    
    // Transform arrays to records
    const imgRecord: Record<number, ImagePrompt> = {};
    const vidRecord: Record<number, VideoPrompt> = {};

    result.imagePrompts.forEach((p: any) => { imgRecord[p.shotId] = p; });
    result.videoPrompts.forEach((p: any) => { vidRecord[p.shotId] = p; });

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
