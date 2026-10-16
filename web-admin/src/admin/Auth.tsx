import React, { createContext, useContext } from "react";

export interface User {
  localDevelopment?: boolean;
  id: string;
  full_name: string;
  role: string;
}

const defaultAdminUser: User = {
  id: "admin-system",
  full_name: "Quản trị viên MLD",
  role: "admin",
  localDevelopment: true,
};

const AuthContext = createContext<{ user: User; logout: () => void }>({
  user: defaultAdminUser,
  logout: () => {},
});

export const useAdmin = () => useContext(AuthContext);

export function AdminAuth({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: defaultAdminUser, logout: () => {} }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AdminLogout() {
  return null;
}
