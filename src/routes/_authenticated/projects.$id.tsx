import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { analyzeProject } from "@/lib/projects.functions";
import { transcribeProject } from "@/lib/transcribe.functions";
import { downloadYoutube } from "@/lib/download-youtube.functions";
import { renderClip } from "@/lib/render-clip.functions";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Upload,
  Save,
  AlertCircle,
  Flame,
  Wand2,
  Check,
  Circle,
  Download,
  Scissors,
  Lightbulb,
} from "lucide-react";

const STEPS: { key: string; label: string; pct: number }[] = [
  { key: "queued", label: "Enfileirado", pct: 10 },
  { key: "downloading", label: "Baixando vídeo", pct: 30 },
  { key: "transcribing", label: "Transcrevendo áudio", pct: 60 },
  { key: "processing", label: "Gerando cortes com IA", pct: 85 },
  { key: "ready", label: "Pronto", pct: 100 },
];

function stepIndex(status: string, busy: boolean) {
  const i = STEPS.findIndex((s) => s.key === status);
  if (i >= 0) return i;
  if (status === "draft" && busy) return 3; // transcript saved, analysis next
  if (status === "draft") return -1;
  if (status === "error") return -1;
  return -1;
}

type Project = {
  id: string;
  title: string;
  source_url: string | null;
  source_type: string;
  status: string;
  transcript: string | null;
  processing_error: string | null;
  duration_sec: number | null;
};

type Clip = {
  id: string;
  title: string;
  caption: string | null;
  hashtags: string[] | null;
  start_sec: number | null;
  end_sec: number | null;
  viral_score: number | null;
  status: string;
  output_url: string | null;
  reason: string | null;
};

export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: () => ({
    meta: [
      { title: "Projeto — Corta.vc" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProjectDetail,
});

function fmtTime(s: number | null) {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function ProjectDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const analyze = useServerFn(analyzeProject);
  const transcribe = useServerFn(transcribeProject);
  const download = useServerFn(downloadYoutube);
  const render = useServerFn(renderClip);

  const [project, setProject] = useState<Project | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [renderingClipId, setRenderingClipId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: p } = await supabase
      .from("projects")
      .select(
        "id, title, source_url, source_type, status, transcript, processing_error, duration_sec",
      )
      .eq("id", id)
      .single();
    if (!p) {
      navigate({ to: "/dashboard" });
      return;
    }
    setProject(p as Project);
    setTranscript((p as Project).transcript ?? "");
    const { data: c } = await supabase
      .from("clips")
      .select("id, title, caption, hashtags, start_sec, end_sec, viral_score, status, output_url, reason")
      .eq("project_id", id)
      .order("viral_score", { ascending: false });
    setClips((c ?? []) as Clip[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Poll project status while a long task is running on the server
  useEffect(() => {
    if (!transcribing && !analyzing) return;
    const t = setInterval(async () => {
      const { data: p } = await supabase
        .from("projects")
        .select("status, processing_error")
        .eq("id", id)
        .single();
      if (p) setProject((prev) => (prev ? { ...prev, status: p.status, processing_error: p.processing_error } : prev));
    }, 1500);
    return () => clearInterval(t);
  }, [transcribing, analyzing, id]);

  async function saveTranscript() {
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("projects")
      .update({ transcript })
      .eq("id", id);
    setSaving(false);
    if (err) setError(err.message);
    else if (project) setProject({ ...project, transcript });
  }

  async function runAnalyze() {
    setAnalyzing(true);
    setError(null);
    if (transcript !== (project?.transcript ?? "")) {
      await saveTranscript();
    }
    try {
      const result = await analyze({ data: { projectId: id, customPrompt: customPrompt.trim() || undefined } });
      if (result.ok) await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao gerar cortes");
    } finally {
      setAnalyzing(false);
    }
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setUploadPct(0);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Não autenticado');

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sessão expirada');

      const path = `${userId}/${id}/${Date.now()}-${file.name}`;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/videos/${path}`;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('x-upsert', 'false');
        xhr.setRequestHeader('cache-control', '3600');

        xhr.upload.addEventListener('progress', (evt) => {
          if (evt.lengthComputable) {
            setUploadPct(Math.round((evt.loaded / evt.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload falhou: ${xhr.status} ${xhr.responseText.slice(0, 200)}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Erro de rede durante upload')));
        xhr.send(file);
      });

      const { error: updErr } = await supabase
        .from('projects')
        .update({ source_type: 'upload', source_url: path })
        .eq('id', id);
      if (updErr) throw updErr;

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no upload');
    } finally {
      setUploading(false);
    }
  }

  async function handleRender(clipId: string) {
    setRenderingClipId(clipId);
    setError(null);
    try {
      await render({ data: { clipId } });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no render');
    } finally {
      setRenderingClipId(null);
    }
  }

  if (loading || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface-1/60 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <h1 className="font-bold truncate flex-1">{project.title}</h1>
          <Badge variant="secondary" className="capitalize">{project.status}</Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-[1fr_360px] gap-6">
        <section className="space-y-6 min-w-0">
          <Card className="p-5 bg-surface-1 border-border">
            <h2 className="font-bold mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4" /> Fonte do vídeo
            </h2>
            {project.source_url && project.source_type === "url" ? (
              <div>
                <p className="text-sm text-muted-foreground break-all">
                  YouTube: <a href={project.source_url} target="_blank" rel="noreferrer" className="text-primary underline">{project.source_url}</a>
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  disabled={downloading}
                  onClick={async () => {
                    setDownloading(true);
                    setError(null);
                    try {
                      await download({ data: { projectId: id } });
                      await load();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'Falha no download');
                    } finally {
                      setDownloading(false);
                    }
                  }}
                >
                  {downloading
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Baixando áudio…</>
                    : <><Download className="w-3 h-3" /> Baixar áudio do YouTube</>
                  }
                </Button>
              </div>
            ) : project.source_url ? (
              <p className="text-sm text-muted-foreground break-all">Upload: {project.source_url}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum arquivo enviado ainda.</p>
            )}
            <div className="mt-3">
              <Label htmlFor="file" className="text-xs text-muted-foreground">Enviar vídeo (MP4, até ~500MB)</Label>
              <Input id="file" type="file" accept="video/*" onChange={onUpload} disabled={uploading} className="mt-1" />
              {uploading && (
                <div className="mt-2 space-y-1">
                  <div className="w-full bg-surface-2 rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all duration-200"
                      style={{ width: `${uploadPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Enviando… {uploadPct}%</p>
                </div>
              )}
            </div>
          </Card>

          {(transcribing || analyzing || ["queued", "downloading", "transcribing", "processing"].includes(project.status)) && (() => {
            const busy = transcribing || analyzing;
            const idx = stepIndex(project.status, busy);
            const pct = idx >= 0 ? STEPS[idx].pct : busy ? 5 : 0;
            return (
              <Card className="p-5 bg-surface-1 border-border">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" /> Processando
                  </h2>
                  <span className="text-xs text-muted-foreground">{pct}%</span>
                </div>
                <Progress value={pct} className="mb-4" />
                <ol className="space-y-2">
                  {STEPS.map((s, i) => {
                    const done = i < idx || project.status === "ready";
                    const active = i === idx && project.status !== "ready";
                    return (
                      <li key={s.key} className="flex items-center gap-3 text-sm">
                        {done ? (
                          <Check className="w-4 h-4 text-primary" />
                        ) : active ? (
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground/40" />
                        )}
                        <span className={done ? "text-foreground" : active ? "text-foreground font-medium" : "text-muted-foreground"}>
                          {s.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </Card>
            );
          })()}



          <Card className="p-5 bg-surface-1 border-border">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <h2 className="font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Transcript
              </h2>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    setTranscribing(true);
                    setError(null);
                    try {
                      await transcribe({ data: { projectId: id } });
                      await load();
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Falha na transcrição");
                    } finally {
                      setTranscribing(false);
                    }
                  }}
                  disabled={transcribing || !project.source_url || project.source_type !== "upload"}
                  title={project.source_type !== "upload" ? "Envie um arquivo de vídeo para transcrever" : "Transcrever áudio com Whisper"}
                >
                  {transcribing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} Transcrever automaticamente
                </Button>
                <Button size="sm" variant="ghost" onClick={saveTranscript} disabled={saving}>
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Salvar
                </Button>
              </div>
            </div>
            <Textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Cole aqui o transcript ou clique em 'Transcrever automaticamente' após enviar o vídeo (até 25MB)."
              rows={14}
              className="font-mono text-xs bg-background"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {transcript.length.toLocaleString("pt-BR")} caracteres · mínimo 50 para gerar cortes · Whisper aceita até 25MB.
            </p>
          </Card>

          <Card className="p-5 bg-surface-1 border-border">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Cortes gerados {clips.length > 0 && <span className="text-muted-foreground font-normal">({clips.length})</span>}</h2>
              <Button onClick={runAnalyze} disabled={analyzing || transcript.length < 50} className="font-bold">
                {analyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando…</> : <><Sparkles className="w-4 h-4" /> Gerar cortes com IA</>}
              </Button>
            </div>

            <div className="mb-4">
              <Label className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <Lightbulb className="w-3 h-3" /> Filtro de IA (opcional)
              </Label>
              <Input
                placeholder='Ex.: "momentos engraçados" ou "dicas práticas sobre dinheiro"'
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                maxLength={500}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">Direcione a IA para um tema ou emoção específica.</p>
            </div>

            {error && (
              <div className="flex gap-2 items-start p-3 mb-4 rounded-md bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}

            {clips.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhum corte ainda. Cole um transcript e clique em "Gerar cortes com IA".
              </p>
            ) : (
              <div className="space-y-3">
                {clips.map((c) => (
                  <div key={c.id} className="p-4 rounded-lg bg-surface-2 border border-border">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-bold text-foreground">{c.title}</h3>
                      {c.viral_score != null && (
                        <Badge className="bg-primary/20 text-primary border-0 shrink-0">
                          <Flame className="w-3 h-3" /> {c.viral_score}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {fmtTime(c.start_sec)} → {fmtTime(c.end_sec)}
                    </p>
                    {c.caption && <p className="text-sm text-foreground/90 mb-2 whitespace-pre-wrap">{c.caption}</p>}
                    {c.hashtags && c.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {c.hashtags.map((h) => (
                          <span key={h} className="text-xs text-primary">#{h.replace(/^#/, "")}</span>
                        ))}
                      </div>
                    )}
                    {c.reason && (
                      <div className="mt-3 flex items-start gap-2 p-2 rounded-md bg-primary/5 border border-primary/15">
                        <Lightbulb className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground">{c.reason}</p>
                      </div>
                    )}
                    <div className="flex gap-2 mt-3">
                      {c.output_url ? (
                        <a
                          href={c.output_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary underline"
                        >
                          <Download className="w-3 h-3" /> Baixar clip
                        </a>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={renderingClipId === c.id || !project.source_url || project.source_type !== 'upload'}
                          onClick={() => handleRender(c.id)}
                          title={project.source_type !== 'upload' ? 'Faça upload ou baixe o áudio antes de renderizar' : ''}
                        >
                          {renderingClipId === c.id
                            ? <><Loader2 className="w-3 h-3 animate-spin" /> Renderizando…</>
                            : <><Scissors className="w-3 h-3" /> Renderizar clip</>
                          }
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </section>

        <aside className="space-y-4">
          <Card className="p-5 bg-surface-1 border-border">
            <h3 className="font-bold mb-2">Como funciona</h3>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Envie o vídeo ou cole o link.</li>
              <li>Cole o transcript do vídeo.</li>
              <li>A IA encontra os melhores momentos e gera título + legenda + hashtags.</li>
              <li>Em breve: render automático com legendas e exportação.</li>
            </ol>
          </Card>
          {project.processing_error && (
            <Card className="p-4 bg-destructive/10 border-destructive/30">
              <p className="text-xs text-destructive">
                <strong>Último erro:</strong> {project.processing_error}
              </p>
            </Card>
          )}
        </aside>
      </main>
    </div>
  );
}
