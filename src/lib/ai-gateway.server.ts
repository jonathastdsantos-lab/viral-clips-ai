import { createGoogleGenerativeAI } from '@ai-sdk/google';

export function createAIModel() {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY ausente no servidor.');
  const google = createGoogleGenerativeAI({ apiKey: key });
  return google('gemini-2.5-flash');
}
