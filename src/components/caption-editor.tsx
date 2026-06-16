import { useState } from 'react';
import { Check, X } from 'lucide-react';

interface Word {
  word: string;
  start: number;
  end: number;
}

interface CaptionEditorProps {
  words: Word[];
  onChange: (words: Word[]) => void;
}

export function CaptionEditor({ words, onChange }: CaptionEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  function startEdit(i: number) {
    setEditingIndex(i);
    setEditValue(words[i].word);
  }

  function confirmEdit() {
    if (editingIndex == null) return;
    const updated = words.map((w, i) =>
      i === editingIndex ? { ...w, word: editValue.trim() || w.word } : w
    );
    onChange(updated);
    setEditingIndex(null);
  }

  if (words.length === 0) {
    return (
      <div className="flex items-center justify-center p-4 rounded-lg bg-background border border-border min-h-12">
        <p className="text-xs text-muted-foreground">Nenhuma palavra para editar. Transcreva o vídeo primeiro.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 p-3 rounded-lg bg-background border border-border min-h-12">
      {words.map((w, i) =>
        editingIndex === i ? (
          <span key={i} className="inline-flex items-center gap-1">
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmEdit();
                if (e.key === 'Escape') setEditingIndex(null);
              }}
              className="border-b border-primary bg-transparent text-sm px-1 w-20 outline-none"
            />
            <button
              onClick={confirmEdit}
              className="text-primary hover:text-primary/80 transition-colors"
              title="Confirmar"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={() => setEditingIndex(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Cancelar"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ) : (
          <span
            key={i}
            onClick={() => startEdit(i)}
            className="text-sm px-1 py-0.5 rounded cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
            title={`${w.start.toFixed(1)}s — ${w.end.toFixed(1)}s`}
          >
            {w.word}
          </span>
        )
      )}
      <p className="w-full text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
        Clique em qualquer palavra para corrigir erros do Whisper.
      </p>
    </div>
  );
}
