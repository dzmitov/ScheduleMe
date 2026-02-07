import { GoogleGenAI, Type } from "@google/genai";
import { LessonPlan } from "../types";

let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!ai) {
    const apiKey = typeof process !== "undefined" ? process.env?.API_KEY : undefined;
    if (!apiKey || (typeof apiKey === "string" && apiKey.startsWith("undefined"))) {
      throw new Error(
        "GEMINI_API_KEY is not set. Create a .env file in the project root with: GEMINI_API_KEY=your_api_key"
      );
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export const generateLessonPlan = async (subject: string, grade: string, topic: string): Promise<LessonPlan> => {
  const response = await getAI().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate a detailed lesson plan for ${subject}, grade ${grade}, topic: ${topic}.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          objectives: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          materials: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                time: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["time", "description"]
            }
          }
        },
        required: ["title", "objectives", "materials", "activities"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}') as LessonPlan;
  } catch (e) {
    throw new Error("Failed to parse AI response");
  }
};

export const getScheduleAdvice = async (lessons: any[]): Promise<string> => {
  const response = await getAI().models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on this teacher's schedule: ${JSON.stringify(lessons)}, provide 3 concise tips for managing their week effectively.`,
  });
  return response.text || "No advice available at this time.";
};
