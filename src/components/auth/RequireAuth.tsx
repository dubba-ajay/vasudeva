import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading, token } = useAuth();
  const location = useLocation();
  if (loading) return null;
  // allow either supabase user or token-based credential login
  if (!user && !token) return <Navigate to="/" state={{ from: location }} replace />;
  return children;
}

export function RequireRole({ children, role }: { children: JSX.Element; role: "freelancer" | "owner" | "customer" }) {
  const { user, loading, role: current, token } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!user && !token) return <Navigate to="/" state={{ from: location }} replace />;
  const cur = current || (token ? ((): string | null => {
    try { const parts = token.split('.'); if (parts.length === 3) { const body = JSON.parse(atob(parts[1])); return (body.role || null); } } catch(e){} return null; })() : null);
  if (!cur) return <Navigate to="/" replace />;
  // normalize role comparison (case-insensitive)
  const curLower = String(cur).toLowerCase();
  const roleLower = String(role).toLowerCase();
  if (curLower !== roleLower) {
    // redirect to their dashboard
    const target = curLower === 'owner' ? '/store-owner-dashboard' : curLower === 'freelancer' ? '/freelancer-dashboard' : curLower === 'admin' ? '/admin' : '/user-dashboard';
    return <Navigate to={target} replace />;
  }
  return children;
}
