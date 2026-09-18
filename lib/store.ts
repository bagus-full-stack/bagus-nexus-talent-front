import { create } from 'zustand';
import { User, UserRole } from '@/types/user';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  theme: 'light' | 'dark' | 'system';
  displayDensity: 'compact' | 'comfortable';
  isSidebarCollapsed: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setUserRole: (role: UserRole) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setDisplayDensity: (density: 'compact' | 'comfortable') => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  login: (email: string, role?: UserRole) => void;
  logout: () => void;
}

export const useAppStore = create<AuthState>((set) => ({
  currentUser: {
    id: 'usr-1',
    name: 'Alexandre V.',
    email: 'alexandre.v@talentai.internal',
    role: 'admin',
    avatar: 'AV',
    status: 'actif',
    lastActivity: 'Il y a quelques instants',
  },
  isAuthenticated: true,
  theme: 'light',
  displayDensity: 'comfortable',
  isSidebarCollapsed: false,

  setUser: (user) => set({ currentUser: user, isAuthenticated: !!user }),
  
  setUserRole: (role) =>
    set((state) => ({
      currentUser: state.currentUser
        ? { ...state.currentUser, role }
        : {
            id: 'usr-demo',
            name: 'Alexandre V.',
            email: 'alexandre.v@talentai.internal',
            role,
            avatar: 'AV',
            status: 'actif',
          },
      isAuthenticated: true,
    })),

  setTheme: (theme) => set({ theme }),
  setDisplayDensity: (density) => set({ displayDensity: density }),

  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

  login: (email, role = 'admin') =>
    set({
      currentUser: {
        id: 'usr-1',
        name: email.split('@')[0] || 'Utilisateur',
        email,
        role,
        avatar: (email[0] || 'U').toUpperCase(),
        status: 'actif',
      },
      isAuthenticated: true,
    }),

  logout: () =>
    set({
      currentUser: null,
      isAuthenticated: false,
    }),
}));
