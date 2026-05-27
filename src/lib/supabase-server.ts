let cachedUrl = "";
let cachedKey = "";

function getEnv() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  if (!url || !key) throw new Error("Supabase URL and key must be set in environment variables");
  cachedUrl = url;
  cachedKey = key;
  return { url, key };
}

/** Raw fetch-based insert into a table, returning the inserted row */
export async function insertRow(
  table: string,
  record: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { url, key } = cachedUrl ? { url: cachedUrl, key: cachedKey } : getEnv();

  const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify(record),
  });

  if (!res.ok) {
    const body = await res.text();
    let detail: string;
    try {
      const parsed = JSON.parse(body);
      detail = parsed.message || parsed.detail || parsed.error || body;
    } catch {
      detail = body || `HTTP ${res.status}`;
    }
    throw new Error(detail);
  }

  // Accept header for single-object response
  const accept = res.headers.get("content-type") || "";
  if (accept.includes("json")) {
    const data = await res.json();
    return Array.isArray(data) ? data[0] : data;
  }
  return {};
}

/** Raw fetch-based select query */
export async function selectAll(table: string) {
  const { url, key } = cachedUrl ? { url: cachedUrl, key: cachedKey } : getEnv();

  const res = await fetch(`${url}/rest/v1/${table}?select=*&order=is_pinned.desc,created_at.desc`, {
    method: "GET",
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    let detail: string;
    try {
      const parsed = JSON.parse(body);
      detail = parsed.message || parsed.detail || parsed.error || body;
    } catch {
      detail = body || `HTTP ${res.status}`;
    }
    throw new Error(detail);
  }

  return res.json();
}

/** Raw fetch-based single row select */
export async function selectById(table: string, id: string) {
  const { url, key } = cachedUrl ? { url: cachedUrl, key: cachedKey } : getEnv();

  const res = await fetch(`${url}/rest/v1/${table}?id=eq.${id}&select=*`, {
    method: "GET",
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Accept": "application/vnd.pgrst.object+json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    let detail: string;
    try {
      const parsed = JSON.parse(body);
      detail = parsed.message || parsed.detail || parsed.error || body;
    } catch {
      detail = body || `HTTP ${res.status}`;
    }
    throw new Error(detail);
  }

  return res.json();
}

/** Raw fetch-based delete */
export async function deleteRow(table: string, id: string) {
  const { url, key } = cachedUrl ? { url: cachedUrl, key: cachedKey } : getEnv();

  const res = await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Prefer": "return=representation",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    let detail: string;
    try {
      const parsed = JSON.parse(body);
      detail = parsed.message || parsed.detail || parsed.error || body;
    } catch {
      detail = body || `HTTP ${res.status}`;
    }
    throw new Error(detail);
  }

  return true;
}

/** Raw fetch-based update */
export async function updateRow(table: string, id: string, patch: Record<string, unknown>) {
  const { url, key } = cachedUrl ? { url: cachedUrl, key: cachedKey } : getEnv();

  const res = await fetch(`${url}/rest/v1/${table}?id=eq.${id}&select=*`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Prefer": "return=representation",
    },
    body: JSON.stringify(patch),
  });

  if (!res.ok) {
    const body = await res.text();
    let detail: string;
    try {
      const parsed = JSON.parse(body);
      detail = parsed.message || parsed.detail || parsed.error || body;
    } catch {
      detail = body || `HTTP ${res.status}`;
    }
    throw new Error(detail);
  }

  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}
