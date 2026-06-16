import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AnalyzeInput = z.object({
  projectId: z.string().uuid(),
});

const ClipSchema = z.object({
  title: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  start_sec: z.number(),
  end_sec: z.number(),
  viral_score: z.number(),
  reason: z.string(),
});

const AnalyzeOutput = z.object({
  clips: z.array(ClipSchema),
});

export const analyzeProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select("id, title, transcript, source_url, duration_sec")
      .eq("id", data.projectId)
      .eq("user_id", userId)
      .single();

    if (projErr || !project) {
      throw new Error("Projeto não encontrado");
    }
    if (!project.transcript || project.transcript.trim().length < 50) {
      throw new Error("Cole um transcript de pelo menos 50 caracteres antes de gerar cortes.");
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente no servidor.");

    await supabase
      .from("projects")
      .update({ status: "processing", processing_error: null })
      .eq("id", project.id);

    try {
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const gateway = createLovableAiGatewayProvider(key);
      const model = gateway("google/gemini-2.5-flash");

      const system = [
        "Você é um editor de cortes virais para criadores brasileiros (TikTok, Reels, Shorts).",
        "Receberá um transcript bruto de um vídeo longo (podcast, live, aula, pregação, etc.).",
        "Tarefa: identificar de 3 a 6 momentos com maior potencial viral.",
        "Para cada corte gere: title (gancho curto e impactante em PT-BR), caption (legenda pronta para postar), hashtags (até 8, sem #), start_sec e end_sec (em segundos, estimativa razoável), viral_score (0-100), reason (por que viraliza).",
        "Cortes devem ter 20-90 segundos. Priorize ganchos, frases marcantes, polêmica saudável, emoção, dicas práticas.",
        "Responda APENAS no schema solicitado.",
      ].join(" ");

      const prompt = `Título do projeto: ${project.title}\n\nTRANSCRIPT:\n"""\n${project.transcript.slice(0, 60000)}\n"""`;

      const { output } = await generateText({
        model,
        system,
        prompt,
        output: Output.object({ schema: AnalyzeOutput }),
      });

      const clips = (output.clips ?? []).slice(0, 8);
      if (clips.length === 0) throw new Error("A IA não retornou cortes. Tente novamente.");

      const { error: delErr } = await supabase
        .from("clips")
        .delete()
        .eq("project_id", project.id)
        .eq("user_id", userId);
      if (delErr) throw delErr;

      const rows = clips.map((c) => ({
        project_id: project.id,
        user_id: userId,
        title: c.title,
        caption: c.caption,
        hashtags: c.hashtags,
        start_sec: c.start_sec,
        end_sec: c.end_sec,
        viral_score: Math.round(c.viral_score),
        status: "ready",
      }));

      const { error: insErr } = await supabase.from("clips").insert(rows);
      if (insErr) throw insErr;

      await supabase
        .from("projects")
        .update({ status: "ready" })
        .eq("id", project.id);

      return { ok: true as const, count: clips.length };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      await supabase
        .from("projects")
        .update({ status: "error", processing_error: message })
        .eq("id", project.id);
      throw new Error(message);
    }
  });
