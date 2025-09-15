import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function RequireRole({ allowedRoles, children }: { allowedRoles: string[]; children: React.ReactNode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const role = auth.role ? auth.role.toString().toUpperCase() : null;

  React.useEffect(() => {
    if (!role) return; // no role yet
    if (!allowedRoles.map(r=>r.toUpperCase()).includes(role)) {
      // redirect to appropriate dashboard
      const target = role === 'OWNER' ? '/dashboard/owner' : role === 'FREELANCER' ? '/dashboard/freelancer' : role === 'ADMIN' ? '/dashboard/admin' : '/dashboard/user';
      navigate(target, { replace: true });
    }
  }, [role, allowedRoles, navigate]);

  if (!role) return null;
  if (allowedRoles.map(r=>r.toUpperCase()).includes(role)) return <>{children}</>;
  return null;
}
