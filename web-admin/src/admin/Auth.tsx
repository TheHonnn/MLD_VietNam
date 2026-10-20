import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => ({ success: false, error: "AuthContext chưa sẵn sàng" }),
  logout: async () => {},
});

export const useAdmin = () => useContext(AuthContext);

export function AdminAuth({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to fetch user details from public.users and verify administrative permissions
  const fetchAdminProfile = async (email: string, authId?: string): Promise<AdminUser | null> => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, full_name, email, phone, role, is_active, avatar_url")
        .or(`email.eq.${email}${authId ? `,id.eq.${authId}` : ""}`)
        .maybeSingle();

      if (error || !data) {
        console.warn("[AdminAuth] Không tìm thấy thông tin profile:", error);
        return null;
      }

      if (!data.is_active) {
        throw new Error("Tài khoản đã bị tạm khóa. Vui lòng liên hệ quản trị hệ thống.");
      }

      const allowedRoles = [
        "SUPER_ADMIN",
        "ADMIN",
        "BRANCH_MANAGER",
        "CASHIER",
        "RECEPTIONIST",
        "INSTRUCTOR",
        "TECHNICIAN",
      ];

      if (!allowedRoles.includes(data.role)) {
        throw new Error("Tài khoản khách hàng không có quyền truy cập cổng Quản trị.");
      }

      return {
        id: data.id,
        email: data.email || email,
        full_name: data.full_name || "Quản trị viên",
        role: data.role,
        phone: data.phone,
        avatar_url: data.avatar_url,
      };
    } catch (err) {
      console.error("[AdminAuth] Lỗi xác thực quyền:", err);
      throw err;
    }
  };

  // Restore session on mount
  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.user?.email) {
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        sessionStorage.setItem("mld_admin_token", session.access_token);
        const profile = await fetchAdminProfile(session.user.email, session.user.id);
        if (isMounted) {
          setUser(profile);
        }
      } catch (err) {
        console.warn("[AdminAuth] Lỗi khôi phục phiên:", err);
        sessionStorage.removeItem("mld_admin_token");
        await supabase.auth.signOut().catch(() => {});
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    restoreSession();

    // Listen to Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        sessionStorage.removeItem("mld_admin_token");
        setUser(null);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        sessionStorage.setItem("mld_admin_token", session.access_token);
      }
    });

    // Listen to admin-signout event (fired on 401 Unauthorized API responses)
    const handleSignoutEvent = async () => {
      await logout();
    };
    window.addEventListener("admin-signout", handleSignoutEvent);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener("admin-signout", handleSignoutEvent);
    };
  }, []);

  const login = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      let loginEmail = identifier.trim();

      // If user entered a phone number instead of an email, look up corresponding email
      if (!loginEmail.includes("@")) {
        const { data: userByPhone, error: phoneError } = await supabase
          .from("users")
          .select("email, is_active, role")
          .eq("phone", loginEmail)
          .maybeSingle();

        if (phoneError || !userByPhone || !userByPhone.email) {
          return {
            success: false,
            error: "Số điện thoại chưa được đăng ký tài khoản quản trị.",
          };
        }
        loginEmail = userByPhone.email;
      }

      // Perform Supabase Auth login
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error || !data.session || !data.user) {
        const msg = error?.message || "";
        if (msg.includes("Invalid login credentials")) {
          return { success: false, error: "Thông tin tài khoản hoặc mật khẩu không chính xác." };
        }
        if (msg.includes("Email not confirmed")) {
          return { success: false, error: "Email quản trị chưa được xác thực." };
        }
        return { success: false, error: msg || "Đăng nhập thất bại. Vui lòng thử lại." };
      }

      // Check role and permissions
      const profile = await fetchAdminProfile(loginEmail, data.user.id);
      if (!profile) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: "Không tìm thấy hồ sơ quản trị liên kết với tài khoản này.",
        };
      }

      sessionStorage.setItem("mld_admin_token", data.session.access_token);
      setUser(profile);
      return { success: true };
    } catch (err: any) {
      await supabase.auth.signOut().catch(() => {});
      return {
        success: false,
        error: err.message || "Lỗi hệ thống khi đăng nhập.",
      };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[AdminAuth] Lỗi khi đăng xuất:", err);
    } finally {
      sessionStorage.removeItem("mld_admin_token");
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AdminLogout() {
  const { logout } = useAdmin();
  useEffect(() => {
    logout();
  }, [logout]);
  return null;
}
