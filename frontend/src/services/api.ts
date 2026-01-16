import type { LoginResponse } from "../types/auth";

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    // Check content type before parsing JSON
    const contentType = res.headers.get("content-type");
    let data;
    
    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      throw new Error(`Server error: ${text || "Unknown error"}`);
    }

    if (!res.ok) {
      throw new Error(data.message || "Login failed");
    }

    // Store token in localStorage
    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    return data;
  } catch (error: any) {
    throw error;
  }
};
  