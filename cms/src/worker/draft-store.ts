import { DurableObject } from "cloudflare:workers";
import type { Env } from "./env";

// Filled in during Phase 5 (draft store + WebSocket broadcast).
export class DraftStore extends DurableObject<Env> {
  async fetch(): Promise<Response> {
    return new Response("not implemented", { status: 501 });
  }
}
