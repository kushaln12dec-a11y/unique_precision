export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    localStorage.removeItem("token");
    try {
      const { disconnectAppSocket } = await import("../services/socket");
      disconnectAppSocket?.();
    } catch {}
    if (!window.location.pathname.includes("/login")) {
      window.location.assign("/login");
    }
  }
  return res;
}
