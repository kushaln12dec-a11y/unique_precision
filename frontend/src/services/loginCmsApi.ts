import { apiFetch } from "../utils/apiClient";
import { apiUrl } from "./apiClient";
import type { LoginSlide, LoginSlideInput } from "../types/loginCms";

const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
};

// Public — fetch active slides for login page (no auth needed)
export const getPublicLoginSlides = async (): Promise<LoginSlide[]> => {
    try {
        const res = await apiFetch(apiUrl("/api/login-cms/public"), { method: "GET" });
        if (!res.ok) return [];
        return res.json();
    } catch {
        return [];
    }
};

// Admin — get all slides
export const getAllLoginSlides = async (): Promise<LoginSlide[]> => {
    const res = await apiFetch(apiUrl("/api/login-cms"), {
        method: "GET",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch login slides");
    return res.json();
};

// Admin — create slide
export const createLoginSlide = async (data: LoginSlideInput): Promise<LoginSlide> => {
    const res = await apiFetch(apiUrl("/api/login-cms"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Failed to create slide");
    }
    return res.json();
};

// Admin — update slide
export const updateLoginSlide = async (id: string, data: Partial<LoginSlideInput>): Promise<LoginSlide> => {
    const res = await apiFetch(apiUrl(`/api/login-cms/${id}`), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || "Failed to update slide");
    }
    return res.json();
};

// Admin — delete slide
export const deleteLoginSlide = async (id: string): Promise<void> => {
    const res = await apiFetch(apiUrl(`/api/login-cms/${id}`), {
        method: "DELETE",
        headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete slide");
};

// Admin — reorder slides
export const reorderLoginSlides = async (order: Array<{ id: string; sortOrder: number }>): Promise<LoginSlide[]> => {
    const res = await apiFetch(apiUrl("/api/login-cms/reorder/batch"), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ order }),
    });
    if (!res.ok) throw new Error("Failed to reorder slides");
    return res.json();
};
