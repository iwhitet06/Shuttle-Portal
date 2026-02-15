import { GoogleGenAI } from "@google/genai";
import { LogEntry, Location } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const analyzeLogs = async (logs: LogEntry[], locations: Location[]) => {
  const ai = getClient();
  if (!ai) return "API Key not configured.";

  // Format data for the model to digest easily
  const recentLogs = logs.slice(-50); // Analyze last 50 logs to avoid token limits in this demo
  const logSummary = JSON.stringify(recentLogs.map(l => ({
    route: l.routeType,
    driver: l.driverName,
    passengers: l.passengerCount,
    company: l.companyName,
    time: new Date(l.timestamp).toLocaleTimeString(),
    date: new Date(l.timestamp).toLocaleDateString(),
    eta: l.eta
  })));

  const locationSummary = JSON.stringify(locations);

  const prompt = `
    You are an operations analyst for a charter bus company. 
    Here is a list of recent trip logs: ${logSummary}
    Here are the locations: ${locationSummary}

    Please provide a concise, professional daily briefing for the Admin.
    1. Summarize the total passenger volume.
    2. Identify any busy drivers or companies.
    3. Point out any potential anomalies or efficiency observations.
    4. Keep it under 150 words.
    5. Format with clear bullet points.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to generate analysis at this time. Please check API configuration.";
  }
};
