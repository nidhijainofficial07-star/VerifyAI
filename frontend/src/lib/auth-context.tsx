
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  loginViaApi,
  registerCreatorViaApi,
  getCurrentUserViaApi,
  clearAuthToken,
  type AuthUser,
} from "./api";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const currentUser = await getCurrentUserViaApi();

        if (active) {
          setUser(currentUser);
        }
      } catch {
        clearAuthToken();

        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (sessionStorage.getItem("verityai_token")) {
      restoreSession();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, []);

  async function login(email: string, password: string) {
    const response = await loginViaApi(email, password);
    setUser(response.user);
  }

  async function register(
    name: string,
    email: string,
    password: string
  ) {
    const response = await registerCreatorViaApi(
      name,
      email,
      password
    );

    setUser(response.user);
  }

  function logout() {
    clearAuthToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
