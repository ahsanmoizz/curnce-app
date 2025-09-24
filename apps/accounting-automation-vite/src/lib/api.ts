// src/lib/api.ts
const BASE_URL ="https://api.curnce.com";

export async function api(
  path: string,
  options: RequestInit & { raw?: boolean } = {}
) {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> =
    options.headers instanceof Headers
      ? Object.fromEntries(options.headers.entries())
      : (options.headers as Record<string, string>) || {};

  // 🟢 FIXED: prepare body properly
  let body = options.body;
  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    // stringify plain object safely
    if (typeof body === "object") {
      body = JSON.stringify(body);
    }
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await  fetch(`${BASE_URL}/v1${path}`, {
    ...options,
    headers,
    body, // 🟢 use processed body here
  });

  // 🔄 Handle expired token → try refresh
  if (res.status === 401 && localStorage.getItem("refreshToken")) {
    try {
      const refreshRes = await fetch(`${BASE_URL}/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refreshToken: localStorage.getItem("refreshToken"),
        }),
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();

        // store new tokens
        localStorage.setItem("token", data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem("refreshToken", data.refreshToken);
        }

        // retry original request with new token
        headers["Authorization"] = `Bearer ${data.accessToken}`;
        res = await fetch(`${BASE_URL}/v1${path}`, {
          ...options,
          headers,
          body, // 🟢 retry with processed body
        });
      } else {
        // refresh failed → clear session
        localStorage.clear();
        window.location.href = "/auth/login";
        throw new Error("Session expired, please log in again.");
      }
    } catch (err) {
      localStorage.clear();
      window.location.href = "/auth/login";
      throw err;
    }
  }

  // ✅ support raw blob downloads
  if (!res.ok) {
    const errorText = await res.clone().text();
    throw new Error(`API error ${res.status}: ${errorText}`);
  }

  const contentType = res.headers.get("content-type") || "";

  // If backend sends file → return Blob
  if (
    options.raw ||
    contentType.includes("application/pdf") ||
    contentType.includes("text/csv") ||
    contentType.includes("application/vnd.ms-excel") ||
    contentType.includes("spreadsheet")
  ) {
    return await res.blob();
  }

  // If response has JSON → parse
  if (contentType.includes("application/json")) {
    return await res.json();
  }

  // Otherwise → plain text
  return await res.text();
}
// ✅ support raw blob downloads
/*if (options.raw) {
  if (!res.ok) {
    const errorText = await res.clone().text(); // clone before consuming
    throw new Error(`API error ${res.status}: ${errorText}`);
  }
  return await res.blob();
}

if (!res.ok) {
  throw new Error(`API error ${res.status}: ${await res.text()}`);
}

return res.json();*/



