export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    creditsPerMonth: 10,
    maxProjects: 3,
    maxClipsPerProject: 3,
    canDownload: false,
    canSchedule: false,
    hasBrandKit: false,
    hasAnalytics: false,
    badge: null,
  },
  criador: {
    id: 'criador',
    name: 'Criador',
    price: 4700, // centavos = R$47
    creditsPerMonth: 100,
    maxProjects: 30,
    maxClipsPerProject: 8,
    canDownload: true,
    canSchedule: false,
    hasBrandKit: false,
    hasAnalytics: false,
    badge: '🔥',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 9700, // R$97
    creditsPerMonth: 500,
    maxProjects: -1, // ilimitado
    maxClipsPerProject: -1,
    canDownload: true,
    canSchedule: true,
    hasBrandKit: true,
    hasAnalytics: true,
    badge: '⚡',
  },
  agencia: {
    id: 'agencia',
    name: 'Agência',
    price: 29700, // R$297
    creditsPerMonth: 2000,
    maxProjects: -1,
    maxClipsPerProject: -1,
    canDownload: true,
    canSchedule: true,
    hasBrandKit: true,
    hasAnalytics: true,
    badge: '🏢',
  },
} as const;

export type PlanId = keyof typeof PLANS;

// Custo em créditos por operação
export const CREDIT_COSTS = {
  transcribe: 2,  // 2 créditos por transcrição
  analyze: 1,     // 1 crédito por geração de cortes
  render: 3,      // 3 créditos por render de clip
} as const;
