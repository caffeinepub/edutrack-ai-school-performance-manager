import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useActor } from "../hooks/useActor";

export interface Session {
  token: string;
  name: string;
  role: "admin" | "teacher";
  username: string;
}

interface AuthContextValue {
  session: Session | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const SESSION_KEY = "edutrack_session";

export const AuthContext = createContext<AuthContextValue>({
  session: null,
  login: async () => {},
  logout: () => {},
  isLoading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { actor, isFetching: actorFetching } = useActor();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, validate stored session
  useEffect(() => {
    if (actorFetching || !actor) return;

    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }

    let parsed: Session;
    try {
      parsed = JSON.parse(stored) as Session;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      setIsLoading(false);
      return;
    }

    // Validate the stored token with the backend
    actor.validateSession(parsed.token).then((result) => {
      if (result) {
        setSession({
          token: parsed.token,
          name: result.name,
          role: result.role === "admin" ? "admin" : "teacher",
          username: result.username,
        });
      } else {
        localStorage.removeItem(SESSION_KEY);
      }
    }).catch(() => {
      localStorage.removeItem(SESSION_KEY);
    }).finally(() => {
      setIsLoading(false);
    });
  }, [actor, actorFetching]);

  const login = useCallback(async (username: string, password: string) => {
    if (!actor) throw new Error("Actor not ready");
    const result = await actor.login(username, password);
    if (result.__kind__ === "err") {
      throw new Error(result.err);
    }
    const { token, name, role } = result.ok;
    const newSession: Session = {
      token,
      name,
      role: role === "admin" ? "admin" : "teacher",
      username,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
  }, [actor]);

  const logout = useCallback(() => {
    if (session?.token && actor) {
      actor.logout(session.token).catch(() => {});
    }
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, [session, actor]);

  return (
    <AuthContext.Provider value={{ session, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
