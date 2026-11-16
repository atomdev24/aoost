export const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });

export const error = (status: number, message: string, extra: Record<string, unknown> = {}) => json({ ok: false, error: message, ...extra }, status);

export async function readJson<T>(request: Request): Promise<T | null> {
  if (!(request.headers.get("Content-Type") ?? "").includes("application/json")) return null;
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export const html = (body: string, status = 200) =>
  new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
