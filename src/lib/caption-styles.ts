export const CAPTION_STYLES = [
  {
    id: 'karaoke',
    name: 'Karaokê',
    preview: 'ISSO É VIRAL',
    description: 'Palavra destacada em tempo real',
    color: '#22c55e',
    ffmpegArgs: (text: string, font: string) =>
      `drawtext=text='${text}':fontfile=${font}:fontsize=56:fontcolor=white:shadowcolor=black:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h*0.75`,
  },
  {
    id: 'impacto',
    name: 'Impacto',
    preview: 'ISSO É VIRAL',
    description: 'Caixa alta com borda preta',
    color: '#ffe14d',
    ffmpegArgs: (text: string, font: string) =>
      `drawtext=text='${text}':fontfile=${font}:fontsize=64:fontcolor=white:borderw=4:bordercolor=black:x=(w-text_w)/2:y=h*0.80:uppercase=1`,
  },
  {
    id: 'neon',
    name: 'Neon',
    preview: 'ISSO É VIRAL',
    description: 'Brilho ciano futurista',
    color: '#22d3ee',
    ffmpegArgs: (text: string, font: string) =>
      `drawtext=text='${text}':fontfile=${font}:fontsize=56:fontcolor=0x22d3ee:shadowcolor=0x22d3ee:shadowx=0:shadowy=0:borderw=2:bordercolor=0x22d3ee:x=(w-text_w)/2:y=h*0.75`,
  },
  {
    id: 'faixa',
    name: 'Faixa',
    preview: 'ISSO É VIRAL',
    description: 'Faixa preta semitransparente',
    color: '#ffffff',
    ffmpegArgs: (text: string, font: string) =>
      `drawbox=y=ih*0.72:color=black@0.7:width=iw:height=80:t=fill,drawtext=text='${text}':fontfile=${font}:fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h*0.75`,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    preview: 'isso é viral',
    description: 'Elegante e discreto',
    color: '#e2e8f0',
    ffmpegArgs: (text: string, font: string) =>
      `drawtext=text='${text}':fontfile=${font}:fontsize=44:fontcolor=white:alpha=0.9:x=(w-text_w)/2:y=h*0.80`,
  },
] as const;

export type CaptionStyleId = typeof CAPTION_STYLES[number]['id'];
