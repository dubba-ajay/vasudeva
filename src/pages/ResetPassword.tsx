import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function ResetPasswordPage() {
  const [username, setUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await auth.resetPassword?.(username, newPassword);
      alert('Password reset successful. Please login.');
      navigate('/');
    } catch (err: any) {
      alert(err?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={submit} className="p-6 bg-white rounded shadow w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Reset Password</h2>
        <label className="block text-sm">Username
          <input value={username} onChange={e=>setUsername(e.target.value)} className="mt-1 block w-full border px-2 py-1" />
        </label>
        <label className="block text-sm mt-3">New Password
          <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="mt-1 block w-full border px-2 py-1" />
        </label>
        <div className="mt-4 flex justify-end">
          <button disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">Reset Password</button>
        </div>
      </form>
    </div>
  );
}
