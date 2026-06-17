import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/health')({
  server: {
    handlers: {
      GET: async () => {
        return Response.json(
          { status: 'ok', ts: Date.now() },
          { headers: { 'cache-control': 'no-store' } },
        );
      },
    },
  },
});
