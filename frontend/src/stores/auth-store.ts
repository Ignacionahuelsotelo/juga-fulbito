import { create } from "zustand";
import api from "@/lib/api";

interface User {
  id: string;
  email: string;
  is_active: boolean;
}

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  age: number | null;
  position: string | null;
  skill_level: string | null;
  play_style: string | null;
  dominant_foot: string | null;
  bio: string | null;
  rating_avg: number;
  matches_played: number;
  zone_name: string | null;
  tags: Record<string, number> | null;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, display_name: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  setProfile: (profile: Profile) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    const { access_token, refresh_token } = res.data;
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    set({ isAuthenticated: true });
    await get().fetchMe();
  },

  register: async (email, password, display_name) => {
    const res = await api.post("/auth/register", { email, password, display_name });
    const { access_token, refresh_token } = res.data;
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    set({ isAuthenticated: true });
    await get().fetchMe();
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, profile: null, isAuthenticated: false });
    window.location.href = "/login";
  },

  fetchMe: async () => {
    try {
      set({ isLoading: true });
      const res = await api.get("/users/me");
      set({
        user: res.data.user,
        profile: res.data.profile,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({ user: null, profile: null, isAuthenticated: false, isLoading: false });
    }
  },

  updateProfile: async (data) => {
    const res = await api.put("/users/me", data);
    set({ profile: res.data });
  },

  setProfile: (profile) => set({ profile }),
}));
