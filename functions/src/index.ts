import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { BigQuery } from '@google-cloud/bigquery';
import { GoogleGenerativeAI } from "@google/generative-ai";

admin.initializeApp();
const bq = new BigQuery();

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'gen-lang-client-0460255563';
const DATASET_ID = 'venueflow_analytics';

export const getBigQueryAnalytics = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  // Check auth if needed: if (!context.auth) throw new functions.https.HttpsError('unauthenticated', '...');

  const queries = {
    // (a) Average wait time per sector over last 1 hour
    avgWaitTime: `
      SELECT 
        JSON_VALUE(data, '$.sectorId') as sectorId, 
        AVG(SAFE_CAST(JSON_VALUE(data, '$.waitTime') AS FLOAT64)) as avgWait 
      FROM \`${PROJECT_ID}.${DATASET_ID}.queues_raw_changelog\` 
      WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR) 
      GROUP BY sectorId
    `,
    
    // (b) Peak crowd density by sector (ever or in timeframe)
    peakDensity: `
      SELECT 
        JSON_VALUE(data, '$.id') as sectorId, 
        MAX(SAFE_CAST(JSON_VALUE(data, '$.density') AS FLOAT64)) as peakDensity 
      FROM \`${PROJECT_ID}.${DATASET_ID}.venues_raw_changelog\` 
      GROUP BY sectorId
    `,
    
    // (c) Staff task completion rate
    taskEfficiency: `
      SELECT 
        COUNTIF(JSON_VALUE(data, '$.status') = 'completed') as completed,
        COUNT(*) as total,
        COUNTIF(JSON_VALUE(data, '$.status') = 'completed') / NULLIF(COUNT(*), 0) as rate
      FROM \`${PROJECT_ID}.${DATASET_ID}.tasks_raw_latest\`
    `
  };

  try {
    const [avgWaitResults] = await bq.query({ query: queries.avgWaitTime });
    const [peakDensityResults] = await bq.query({ query: queries.peakDensity });
    const [taskResults] = await bq.query({ query: queries.taskEfficiency });

    return {
      waitTime: avgWaitResults,
      density: peakDensityResults,
      efficiency: taskResults[0] || { rate: 0, completed: 0, total: 0 }
    };
  } catch (error) {
    console.error('BigQuery Query Error:', error);
    throw new functions.https.HttpsError('internal', 'BigQuery query failed');
  }
});

/**
 * Secure wrapper for Gemini API with Rate Limiting
 */
export const callGemini = functions.https.onCall(async (data: { prompt: string }, context: functions.https.CallableContext) => {
  // 1. Authenticate
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be signed in.');
  }

  const uid = context.auth.uid;
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  // 2. Rate Limiting (Max 10 per minute)
  const rateLimitRef = admin.firestore().collection('rateLimits').doc(uid);
  const rateLimitDoc = await rateLimitRef.get();
  const history: number[] = rateLimitDoc.exists ? (rateLimitDoc.data()?.timestamps || []) : [];
  
  const recentRequests = history.filter(ts => ts > oneMinuteAgo);
  if (recentRequests.length >= 10) {
    throw new functions.https.HttpsError('resource-exhausted', 'Rate limit exceeded. Try again in a minute.');
  }

  // 3. Update rate limit history
  recentRequests.push(now);
  await rateLimitRef.set({ timestamps: recentRequests });

  // 4. Secure API Call (Key stored in Environment)
  const apiKey = functions.config().gemini.key;
  if (!apiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Gemini API Key not configured on server.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  try {
    const result = await model.generateContent(data.prompt);
    const response = await result.response;
    return { text: response.text() };
  } catch (error) {
    console.error("Gemini server error:", error);
    throw new functions.https.HttpsError('internal', 'AI generation failed.');
  }
});
