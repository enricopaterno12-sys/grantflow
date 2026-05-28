/** Get env vars with lazy init — safe even if module loads before Next.js populates env */
function getEnv() {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!base || !key) {
    const err = `Supabase env vars missing — URL: ${base ? "OK" : "MISSING"}, KEY: ${key ? "OK" : "MISSING"}`;
    console.error("[supabase-server]", err);
    throw new Error(err);
  }
  return { base, key };
}

/** Build a proper REST URL, normalizing away trailing slashes and double slashes */
function restUrl(path: string, qs: string, baseUrl: string): string {
  // new URL resolves relative paths correctly regardless of trailing slash on base
  const u = new URL(path, baseUrl);
  u.search = qs;
  return u.href;
}

async function supFetch(
  method: string,
  path: string,
  qs: string,
  body?: unknown,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const { base, key } = getEnv();
  const url = restUrl(path, qs, base);
  const headers: Record<string, string> = {
    "apikey": key,
    "Authorization": `Bearer ${key}`,
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    headers["Prefer"] = "return=representation";
  }
  // GET for a single row by pk: ask PostgREST to return an object, not array
  if (method === "GET" && qs.includes("id=eq.")) {
    headers["Accept"] = "application/vnd.pgrst.object+json";
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[supabase-server] NETWORK error ${method} ${url}:`, msg);
    throw new Error(`Errore di rete: ${msg}`);
  }

  if (!res.ok) {
    const raw = await res.text();
    let detail: string;
    let code = "";
    try {
      const j = JSON.parse(raw);
      detail = j.message || j.detail || j.error || raw;
      code = j.code || "";
    } catch {
      detail = raw || `HTTP ${res.status}`;
    }
    const prefix = code ? `[${code}] ` : "";
    console.error(`[supabase-server] HTTP ${res.status} ${method} ${url}: ${prefix}${detail}`);
    throw new Error(`${prefix}${detail}`);
  }

  if (method === "DELETE") return { ok: true, status: res.status, data: true };

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  return { ok: true, status: res.status, data };
}

export async function insertRow(table: string, record: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data } = await supFetch("POST", `rest/v1/${table}`, `select=*`, record);
  return Array.isArray(data) ? data[0] : (data as Record<string, unknown>);
}

export async function selectAll(table: string): Promise<Record<string, unknown>[]> {
  const { data } = await supFetch("GET", `rest/v1/${table}`, `select=*&order=is_pinned.desc,created_at.desc`);
  return data as Record<string, unknown>[];
}

export async function selectById(table: string, id: string): Promise<Record<string, unknown>> {
  const { data } = await supFetch("GET", `rest/v1/${table}`, `id=eq.${id}&select=*`);
  return data as Record<string, unknown>;
}

export async function deleteRow(table: string, id: string): Promise<boolean> {
  const { data } = await supFetch("DELETE", `rest/v1/${table}`, `id=eq.${id}`);
  return data as boolean;
}

export async function updateRow(table: string, id: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { data } = await supFetch("PATCH", `rest/v1/${table}`, `id=eq.${id}&select=*`, patch);
  return Array.isArray(data) ? data[0] : (data as Record<string, unknown>);
}
