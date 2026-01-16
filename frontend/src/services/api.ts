export const fetchHello = async () => {
  try {
    const res = await fetch("/api/hello");
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.error("Error fetching hello:", error);
    throw error;
  }
};

export interface LoginResponse {
  token: string;
}

export interface LoginError {
  message: string;
}

export const login = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Login failed");
    }

    // Store token in localStorage
    if (data.token) {
      localStorage.setItem("token", data.token);
    }

    return data;
  } catch (error) {
    console.error("Error during login:", error);
    throw error;
  }
};
  