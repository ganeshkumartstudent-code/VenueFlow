import { functions, httpsCallable } from './firebase';
import { toast } from 'sonner';
import { sanitizeInput } from './sanitizer';

/**
 * Calls the secure backend Cloud Function for Gemini AI processing.
 * This ensures the API key remains server-side and applies rate limiting.
 */
export async function askGemini(prompt: string) {
  try {
    // 1. Sanitize user input before sending to backend
    const cleanPrompt = sanitizeInput(prompt);

    // 2. Call the deployed Cloud Function
    const callGemini = httpsCallable(functions, 'callGemini');
    const result = await callGemini({ prompt: cleanPrompt });
    
    return (result.data as { text: string }).text;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    // Handle specific rate limit error from backend
    if (error.code === 'resource-exhausted') {
      toast.error("You are asking too many questions! Please wait a minute.");
    } else if (error.message.includes("injection detected")) {
      toast.error("Your message was rejected for security reasons.");
    } else {
      toast.error("AI is temporarily unavailable.");
    }
    
    return "I'm sorry, I'm having trouble connecting to my AI brain right now.";
  }
}

/**
 * Prediction calls should also move to a secure backend function 
 * if they use sensitive data or the Gemini API directly.
 */
export async function getCrowdPrediction(sensorData: any) {
  try {
    const callGemini = httpsCallable(functions, 'callGemini');
    const prompt = `Based on this sensor data: ${JSON.stringify(sensorData)}, predict crowd density. Return JSON { "predictions": [...] }`;
    
    const result = await callGemini({ prompt });
    const data = (result.data as { text: string }).text;
    
    // Attempt to parse JSON from AI response
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  } catch (error) {
    console.error("Prediction Error:", error);
    toast.error("Crowd analysis failed.");
    return null;
  }
}
