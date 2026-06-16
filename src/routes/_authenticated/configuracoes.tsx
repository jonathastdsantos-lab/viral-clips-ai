import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Copy, Upload, Key, Palette } from 'lucide-react';
import { CAPTION_STYLES } from '@/lib/caption-styles';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/configuracoes')({
  head: () => ({ meta: [{ title: 'Configurações — Corta.vc' }] }),
  component: ConfiguracoesPage,
});

type BrandKit = {
  id: string;
  logo_url: string | null;
  logo_storage_path: string | null;
  caption_style: string;
  primary_color: string;
  highlight_color: string;
  font_size: number;
  position: string;
  watermark_enabled: boolean;
};

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

function ConfiguracoesPage() {
  const [userId, setUserId] = useState<string>('');
  const [brandKit, setBrandKit] = useState<BrandKit | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeyValue, setNewKeyValue] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      setUserId(uid);

      const [{ data: bk }, { data: keys }] = await Promise.all([
        supabase.from('brand_kits').select('*').eq('user_id', uid).single(),
        supabase.from('api_keys').select('id, name, key_prefix, created_at, last_used_at, expires_at, revoked_at')
          .eq('user_id', uid).is('revoked_at', null).order('created_at', { ascending: false }),
      ]);

      if (bk) setBrandKit(bk as BrandKit);
      else {
        // Criar brand kit padrão
        const { data: newBk } = await supabase.from('brand_kits').insert({
          user_id: uid,
          caption_style: 'karaoke',
          primary_color: '#ffffff',
          highlight_color: '#ffe14d',
          font_size: 56,
          position: 'bottom',
        }).select().single();
        if (newBk) setBrandKit(newBk as BrandKit);
      }

      setApiKeys((keys ?? []) as ApiKey[]);
    })();
  }, []);

  async function saveBrandKit() {
    if (!brandKit || !userId) return;
    setSaving(true);
    const { error } = await supabase
      .from('brand_kits')
      .update({
        caption_style: brandKit.caption_style,
        primary_color: brandKit.primary_color,
        highlight_color: brandKit.highlight_color,
        font_size: brandKit.font_size,
        position: brandKit.position,
        watermark_enabled: brandKit.watermark_enabled,
      })
      .eq('user_id', userId);
    setSaving(false);
    if (error) toast.error('Erro ao salvar brand kit');
    else toast.success('Brand kit salvo!');
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId || !brandKit) return;
    setUploadingLogo(true);
    const path = `${userId}/logo-${Date.now()}.${file.name.split('.').pop()}`;
    const { error: upErr } = await supabase.storage.from('brand-assets').upload(path, file, { upsert: true });
    if (upErr) { toast.error('Erro ao fazer upload do logo'); setUploadingLogo(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('brand-assets').getPublicUrl(path);
    await supabase.from('brand_kits').update({ logo_url: publicUrl, logo_storage_path: path }).eq('user_id', userId);
    setBrandKit({ ...brandKit, logo_url: publicUrl, logo_storage_path: path });
    setUploadingLogo(false);
    toast.success('Logo atualizado!');
  }

  async function createApiKey() {
    if (!newKeyName.trim() || !userId) return;
    setCreatingKey(true);
    try {
      // Gerar key segura no cliente (será hashada no servidor)
      const rawKey = `cvk_${crypto.randomUUID().replace(/-/g, '')}`;
      const encoder = new TextEncoder();
      const data = encoder.encode(rawKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase.from('api_keys').insert({
        user_id: userId,
        name: newKeyName.trim(),
        key_hash: keyHash,
        key_prefix: rawKey.slice(0, 12),
      });

      if (error) throw error;

      setNewKeyValue(rawKey); // Mostrar UMA VEZ para o usuário copiar
      setNewKeyName('');
      const { data: keys } = await supabase.from('api_keys')
        .select('id, name, key_prefix, created_at, last_used_at, expires_at, revoked_at')
        .eq('user_id', userId).is('revoked_at', null).order('created_at', { ascending: false });
      setApiKeys((keys ?? []) as ApiKey[]);
    } catch (err) {
      toast.error('Erro ao criar chave');
    } finally {
      setCreatingKey(false);
    }
  }

  async function revokeKey(keyId: string) {
    await supabase.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', keyId);
    setApiKeys(apiKeys.filter((k) => k.id !== keyId));
    toast.success('Chave revogada');
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <div>
        <p className="text-xs font-bold uppercase text-brand tracking-wider">Conta</p>
        <h1 className="text-3xl font-extrabold mt-1">Configurações</h1>
      </div>

      {/* Brand Kit */}
      <Card className="p-6 bg-surface-1 border-border">
        <div className="flex items-center gap-2 mb-5">
          <Palette className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Brand Kit</h2>
        </div>

        {brandKit && (
          <div className="space-y-5">
            {/* Logo */}
            <div>
              <Label className="text-sm">Logo / Marca d'água</Label>
              <div className="flex items-center gap-3 mt-2">
                {brandKit.logo_url ? (
                  <img src={brandKit.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-md border border-border bg-surface-2" />
                ) : (
                  <div className="w-16 h-16 rounded-md border-2 border-dashed border-border flex items-center justify-center">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <Button variant="outline" size="sm" disabled={uploadingLogo} onClick={() => fileRef.current?.click()}>
                    {uploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                    {brandKit.logo_url ? 'Trocar logo' : 'Enviar logo'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">PNG com fundo transparente recomendado</p>
                  <input ref={fileRef} type="file" accept="image/png,image/webp,image/svg+xml" onChange={uploadLogo} className="hidden" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Estilo de legenda */}
              <div>
                <Label className="text-sm">Estilo de legenda padrão</Label>
                <Select
                  value={brandKit.caption_style}
                  onValueChange={(v) => setBrandKit({ ...brandKit, caption_style: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAPTION_STYLES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Posição */}
              <div>
                <Label className="text-sm">Posição da legenda</Label>
                <Select
                  value={brandKit.position}
                  onValueChange={(v) => setBrandKit({ ...brandKit, position: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top">Topo</SelectItem>
                    <SelectItem value="middle">Centro</SelectItem>
                    <SelectItem value="bottom">Base (padrão)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cores */}
              <div>
                <Label className="text-sm">Cor principal (texto)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={brandKit.primary_color}
                    onChange={(e) => setBrandKit({ ...brandKit, primary_color: e.target.value })}
                    className="w-10 h-9 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <Input
                    value={brandKit.primary_color}
                    onChange={(e) => setBrandKit({ ...brandKit, primary_color: e.target.value })}
                    className="font-mono text-sm"
                    maxLength={7}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm">Cor de destaque (highlight)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={brandKit.highlight_color}
                    onChange={(e) => setBrandKit({ ...brandKit, highlight_color: e.target.value })}
                    className="w-10 h-9 rounded border border-border cursor-pointer bg-transparent"
                  />
                  <Input
                    value={brandKit.highlight_color}
                    onChange={(e) => setBrandKit({ ...brandKit, highlight_color: e.target.value })}
                    className="font-mono text-sm"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            {/* Tamanho de fonte */}
            <div>
              <Label className="text-sm">Tamanho da fonte: {brandKit.font_size}px</Label>
              <input
                type="range"
                min={32}
                max={80}
                step={4}
                value={brandKit.font_size}
                onChange={(e) => setBrandKit({ ...brandKit, font_size: Number(e.target.value) })}
                className="w-full mt-1"
              />
            </div>

            {/* Marca d'água */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm">Marca d'água ativada</Label>
                <p className="text-xs text-muted-foreground">Sobrepõe o logo no canto dos clips</p>
              </div>
              <Switch
                checked={brandKit.watermark_enabled}
                onCheckedChange={(v) => setBrandKit({ ...brandKit, watermark_enabled: v })}
              />
            </div>

            <Button onClick={saveBrandKit} disabled={saving} className="w-full">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : 'Salvar brand kit'}
            </Button>
          </div>
        )}
      </Card>

      {/* API Keys */}
      <Card className="p-6 bg-surface-1 border-border">
        <div className="flex items-center gap-2 mb-2">
          <Key className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Chaves de API</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Use para integrar com n8n, Make, Zapier ou qualquer automação. A chave só é exibida uma vez.
        </p>

        {newKeyValue && (
          <div className="mb-5 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs font-bold text-primary mb-2">✓ Chave criada! Copie agora — não será exibida novamente.</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-surface-2 px-2 py-1 rounded flex-1 break-all">{newKeyValue}</code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { navigator.clipboard.writeText(newKeyValue); toast.success('Copiado!'); }}
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={() => setNewKeyValue(null)}>
              Fechar
            </Button>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Nome da chave (ex: n8n produção)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createApiKey()}
          />
          <Button onClick={createApiKey} disabled={creatingKey || !newKeyName.trim()}>
            {creatingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Criar
          </Button>
        </div>

        {apiKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma chave criada ainda.</p>
        ) : (
          <div className="space-y-2">
            {apiKeys.map((k) => (
              <div key={k.id} className="flex items-center gap-3 p-3 rounded-md bg-background border border-border">
                <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{k.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-xs text-muted-foreground font-mono">{k.key_prefix}••••••••</code>
                    {k.last_used_at && (
                      <span className="text-xs text-muted-foreground">
                        Último uso: {new Date(k.last_used_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs">Ativa</Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => revokeKey(k.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 rounded-md bg-surface-2 text-xs text-muted-foreground">
          <strong>Como usar:</strong> Adicione o header <code className="font-mono">X-Corta-API-Key: sua_chave</code> em qualquer requisição POST para <code className="font-mono">/api/v1/projects</code> ou <code className="font-mono">/api/v1/clips</code>.
        </div>
      </Card>

      {/* Link de compartilhamento */}
      <Card className="p-6 bg-surface-1 border-border">
        <h2 className="text-lg font-bold mb-2">Links de compartilhamento</h2>
        <p className="text-sm text-muted-foreground">
          Cada clip tem um link público único. Acesse o projeto e clique em "Compartilhar" em qualquer clip com <code className="font-mono text-xs bg-surface-2 px-1 rounded">output_url</code> preenchido. O link pode ser compartilhado com clientes sem necessidade de login.
        </p>
      </Card>
    </div>
  );
}
