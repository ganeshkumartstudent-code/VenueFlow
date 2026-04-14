import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const geminiModel = "gemini-3-flash-preview";

export async function askGemini(prompt: string, systemInstruction?: string) {
  try {
    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || "You are VenueFlow AI, an assistant for event attendees and staff at large stadiums. Provide helpful, concise advice on crowd movement, queues, and venue navigation.",
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm sorry, I'm having trouble connecting to my AI brain right now.";
  }
}

export async function getCrowdPrediction(sensorData: any) {
  const prompt = `Based on this sensor data: ${JSON.stringify(sensorData)}, predict crowd density for the next 30 minutes. Return a JSON object with sector IDs and predicted density (0-100).`;
  
  try {
    const response = await ai.models.generateContent({
      model: geminiModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            predictions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  sectorId: { type: Type.STRING },
                  predictedDensity: { type: Type.NUMBER },
                  recommendation: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Prediction Error:", error);
    return null;
  }
}
