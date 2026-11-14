import type { Env } from "./env";

export { DraftStore } from "./draft-store";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
      return Response.json({ ok: true, authMode: env.AUTH_MODE });
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
