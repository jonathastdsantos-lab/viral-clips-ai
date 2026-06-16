import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AnalyzeInput = z.object({
  projectId: z.string().uuid(),
  customPrompt: z.string().max(500).optional(),
});

type Clip = {
  title: string;
  caption: string;
  hashtags: string[];
  start_sec: number;
  end_sec: number;
  viral_score: number;
  reason: string;
};

function extractJson(raw: string): { clips: Clip[] } {
  let s = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = s.search(/[\{\[]/);
  const end = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
  if (start === -1 || end === -1) throw new Error("IA não retornou JSON.");
  s = s.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1").replace(/[\x00-\x1F\x7F]/g, " ");
  let parsed: unknown;
  try { parsed = JSON.parse(s); } catch { throw new Error("Falha ao interpretar JSON da IA."); }
  const obj = Array.isArray(parsed) ? { clips: parsed } : (parsed as { clips?: Clip[] });
  if (!obj || !Array.isArray(obj.clips)) throw new Error("JSON da IA sem campo 'clips'.");
  return { clips: obj.clips };
}

export const analyzeProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => AnalyzeInput.parse(input))
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

    await supabase
      .from("projects")
      .update({ status: "processing", processing_error: null })
      .eq("id", project.id);

    try {
      const { createAIModel } = await import("./ai-gateway.server");
      const model = createAIModel();

      const customInstruction = data.customPrompt
        ? `\nFiltro do usuário: "${data.customPrompt}". Priorize momentos que atendam a este critério.`
        : "";

      const system = [
        "Você é um editor de cortes virais para criadores brasileiros (TikTok, Reels, Shorts).",
        "Receberá um transcript de um vídeo longo.",
        "Tarefa: identificar de 3 a 6 momentos com maior potencial viral.",
        "Para cada corte gere: title (gancho curto e impactante em PT-BR), caption (legenda pronta para postar com emojis), hashtags (até 8, sem #), start_sec e end_sec (em segundos), viral_score (0-100), reason (frase curta explicando por que viraliza: gancho, emoção, polêmica, dica prática etc.).",
        "Se o transcript estiver em inglês, gere title, caption, hashtags e reason em PT-BR.",
        "Cortes devem ter 20-90 segundos. Priorize ganchos, frases marcantes, emoção, dicas práticas.",
        customInstruction,
        "Responda APENAS no schema JSON solicitado.",
      ].join(" ");

      const prompt = `Título do projeto: ${project.title}\n\nTRANSCRIPT:\n"""\n${project.transcript.slice(0, 60000)}\n"""\n\nResponda APENAS um JSON válido neste formato exato, sem markdown:\n{"clips":[{"title":"...","caption":"...","hashtags":["tag1"],"start_sec":0,"end_sec":40,"viral_score":85,"reason":"..."}]}`;

      const { text } = await generateText({ model, system, prompt });
      const { clips: rawClips } = extractJson(text);
      const clips = rawClips.slice(0, 8);
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
        reason: c.reason ?? null,
        custom_prompt: data.customPrompt ?? null,
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
