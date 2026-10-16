import React, { createContext, useContext, useEffect, useState } from "react";
import { LogIn, LoaderCircle, LogOut } from "lucide-react";
import { adminApi } from "./api";

interface User {
  localDevelopment?: boolean;
  id: string;
  full_name: string;
  role: string;
}
const AuthContext = createContext<{ user: User; logout: () => void } | null>(
  null,
);
export const useAdmin = () => useContext(AuthContext)!;
export function AdminAuth({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [checking, setChecking] = useState(true);
  const [identifier, setIdentifier] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const logout = () => {
    sessionStorage.removeItem("mld_admin_token");
    setUser(null);
  };
  useEffect(() => {
    const controller = new AbortController();
    const expired = () => {
      setUser(null);
      setError("Phiên đăng nhập đã hết hạn.");
    };
    window.addEventListener("admin-signout", expired);
    adminApi<User>("session", undefined, controller.signal)
        .then(setUser)
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        })
        .finally(() => setChecking(false));
    return () => {
      controller.abort();
      window.removeEventListener("admin-signout", expired);
    };
  }, []);
  if (checking)
    return (
      <main className="admin-auth">
        <LoaderCircle className="animate-spin" aria-label="Đang xác thực" />
      </main>
    );
  if (user)
    return (
      <AuthContext.Provider value={{ user, logout }}>
        {children}
      </AuthContext.Provider>
    );
  return (
    <main className="admin-auth">
      <form
        className="admin-login"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setBusy(true);
          try {
            const result = await adminApi<{ accessToken: string; user: User }>(
              "login",
              { identifier, password },
            );
            sessionStorage.setItem("mld_admin_token", result.accessToken);
            setPassword("");
            setUser(result.user);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <img src="/logo.png" alt="MLD Việt Nam" />
        <p className="admin-eyebrow">KHÔNG GIAN QUẢN TRỊ</p>
        <h1>Đăng nhập</h1>
        <label>
          Tài khoản
          <input
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            maxLength={255}
          />
        </label>
        <label>
          Mật khẩu
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            maxLength={256}
          />
        </label>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        <button className="admin-primary" disabled={busy}>
          {busy ? <LoaderCircle className="animate-spin" /> : <LogIn />}Đăng
          nhập
        </button>
      </form>
    </main>
  );
}
export function AdminLogout() {
  const { logout, user } = useAdmin();
  if(user.localDevelopment) return null;
  return (
    <button onClick={logout} title="Đăng xuất" className="admin-icon">
      <LogOut size={18} />
    </button>
  );
}
