import { createServerFn } from '@tanstack/react-start';
import { generateText } from 'ai';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

const Input = z.object({
  clipsData: z.string(), // JSON serializado dos top clips para análise
});

export const generateInsights = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const { createAIModel } = await import('./ai-gateway.server');
    const model = createAIModel();

    const { text } = await generateText({
      model,
      system: 'Você é um analista de conteúdo viral brasileiro. Analise os dados de clips e gere 3 insights práticos e curtos (máximo 2 frases cada) sobre padrões de desempenho, horários, duração ideal e temas que mais viralizam. Responda em PT-BR, em formato JSON: {"insights": [{"icon": "emoji", "title": "...", "body": "..."}]}',
      prompt: `Dados dos clips do usuário: ${data.clipsData}`,
      maxTokens: 500,
    });

    try {
      const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const parsed = JSON.parse(clean) as { insights: Array<{ icon: string; title: string; body: string }> };
      return { ok: true as const, insights: parsed.insights.slice(0, 3) };
    } catch {
      return {
        ok: true as const,
        insights: [
          { icon: '🔥', title: 'Continue criando', body: 'Você ainda não tem clips suficientes para gerar insights. Crie mais projetos!' },
        ],
      };
    }
  });
