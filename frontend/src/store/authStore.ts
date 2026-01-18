import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  apiKey: string | null;
  role: 'admin' | 'user' | null;
  login: (apiKey: string, role: 'admin' | 'user') => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem('zoaholic_api_key'),
  apiKey: localStorage.getItem('zoaholic_api_key'),
  role: localStorage.getItem('zoaholic_role') as 'admin' | 'user' | null,

  login: (apiKey, role) => {
    localStorage.setItem('zoaholic_api_key', apiKey);
    localStorage.setItem('zoaholic_role', role);
    set({ isAuthenticated: true, apiKey, role });
  },

  logout: () => {
    localStorage.removeItem('zoaholic_api_key');
    localStorage.removeItem('zoaholic_role');
    set({ isAuthenticated: false, apiKey: null, role: null });
  },
}));