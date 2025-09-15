import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { getSupabase, hasSupabaseEnv } from "@/lib/supabase";
import { toast } from "sonner";

export default function AuthDialog({ open, onOpenChange, mode = "login" as "login" | "signup" }) {
  const { signIn, signUp, signInWithPhone, verifyPhoneOtp, signInWithCredentials } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<"login"|"signup">(mode);
  const [loading, setLoading] = useState(false);

  // phone OTP states
  const [usePhone, setUsePhone] = useState(false); // default to username to prioritize credential login in design-only previews
  const [useEmailMode, setUseEmailMode] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // after OTP verify, optionally set username/password
  const [showSetCredentials, setShowSetCredentials] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);

  async function navigateAfterCredentialLogin(roleOrTokenResult: any) {
    // roleOrTokenResult can be { mustReset, role, token }
    const r = roleOrTokenResult?.role || null;
    const mustReset = roleOrTokenResult?.mustReset;
    if (mustReset) {
      // redirect to reset password flow
      if (typeof window !== 'undefined') localStorage.setItem('pending_username', roleOrTokenResult.username || '');
      onOpenChange(false);
      navigate('/reset-password');
      return;
    }
    onOpenChange(false);
    // decide redirect based on role if present.
    // Owners and freelancers should be redirected immediately to their dashboards.
    const roleNorm = r ? String(r).toLowerCase() : null;
    if (roleNorm === 'owner') {
      navigate('/store-owner-dashboard', { replace: true });
      return;
    }
    if (roleNorm === 'freelancer') {
      navigate('/freelancer-dashboard', { replace: true });
      return;
    }
    if (roleNorm === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }
    // For regular users (customers), do not redirect away from current page — keep them on the homepage or wherever they are.
    return;
  }

  const onUsernameLogin = async () => {
    try {
      setLoading(true);
      // Map username to email if needed
      const raw = email.trim();
      const isEmail = raw.includes('@');
      let loginEmail = raw;
      if (!isEmail) {
        const host = (() => { try { return new URL(import.meta.env.VITE_SUPABASE_URL).host; } catch(e){ return 'local'; } })();
        loginEmail = `${raw}@no-reply.${host}`;
      }
      // Try server-side credential login first (works even if Supabase is unreachable)
      if (signInWithCredentials) {
        try {
          console.debug('[AuthDialog] attempting server credential login', { username: raw });
          const res = await signInWithCredentials(raw, password);
          console.debug('[AuthDialog] server credential login response', res);
          await navigateAfterCredentialLogin(res || {});
          return;
        } catch (e) {
          console.debug('[AuthDialog] server credential login failed', e); try { toast.error(e?.message || 'Username/password login failed'); } catch(_){};
          // report client-side error to server for debugging
          try { fetch((import.meta.env.VITE_API_BASE || '/.netlify/functions') + '/clientLog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ctx: 'AuthDialog', fn: 'signInWithCredentials', err: String(e), username: raw, ts: new Date().toISOString() }) }); } catch(_){}
          // continue to try Supabase client if server-side cred failed
        }
      }

      // use supabase password signin as fallback
      await signIn(loginEmail, password);
      // after supabase signin, fetch session user to get role
      if (hasSupabaseEnv) {
        try {
          const supabase = getSupabase();
          const { data } = await supabase.auth.getUser();
          const r = data.user?.user_metadata?.role || null;
          await navigateAfterCredentialLogin({ role: r });
          return;
        } catch (e) { /* fallback to token-based flow */ }
      }
      toast.error('Login failed');
    } catch (e:any) {
      const msg = (e && e.message) ? String(e.message) : String(e);
      // report to server for debugging
      try { fetch((import.meta.env.VITE_API_BASE || '/.netlify/functions') + '/clientLog', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ctx: 'AuthDialog', fn: 'onUsernameLogin', err: msg, username: email.trim(), ts: new Date().toISOString() }) }); } catch(_){}
      // If Supabase network failure, fallback to server-side credential login
      if (/Failed to fetch|NetworkError|Unable to contact authentication server/i.test(msg) && signInWithCredentials) {
        try {
          const res = await signInWithCredentials(email.trim(), password);
          await navigateAfterCredentialLogin(res || {});
          return;
        } catch (err:any) {
          toast.error(err?.message || String(err));
        }
      } else {
        toast.error(msg);
      }
    } finally { setLoading(false); }
  };

  const onSendOtp = async () => {
    if (!signInWithPhone) { toast.error('Phone auth not configured'); return; }
    try {
      setLoading(true);
      await signInWithPhone(phone);
      setOtpSent(true);
      toast("OTP sent");
    } catch (e:any) { toast.error(e.message || String(e)); } finally { setLoading(false); }
  };

  const onVerifyOtp = async () => {
    if (!verifyPhoneOtp) { toast.error('Phone auth not configured'); return; }
    try {
      setLoading(true);
      await verifyPhoneOtp(phone, otp);
      // get supabase user id if available
      if (hasSupabaseEnv) {
        try {
          const supabase = getSupabase();
          const { data } = await supabase.auth.getUser();
          setSupabaseUserId(data.user?.id ?? null);
        } catch (e) { console.debug('failed to get supabase user id', e); }
      }
      // after verification, let user optionally set credentials
      setShowSetCredentials(true);
      toast('Phone verified. You can optionally set a username & password for future logins.');
    } catch (e:any) { toast.error(e.message || String(e)); } finally { setLoading(false); }
  };

  const onSetCredentials = async () => {
    try {
      setLoading(true);
      // call backend to create credential for this user
      const r = await fetch(`${import.meta.env.VITE_API_BASE || '/.netlify/functions'}/createCredential`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: newUsername.trim(), password: newPassword, userId: supabaseUserId }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Failed to create credentials');
      toast('Credentials saved. You can now login with username/password.');
      setShowSetCredentials(false);
      onOpenChange(false);
      navigate('/user-dashboard');
    } catch (e:any) { toast.error(e.message || String(e)); } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tab === "login" ? "Login" : "Create account"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Toggle between phone, username, and email */}
          <div className="flex gap-2">
            <button onClick={()=>{ setUsePhone(true); setUseEmailMode(false); setTab('login'); }} className={`flex-1 py-2 rounded ${usePhone ? 'bg-gray-200' : 'bg-transparent'}`}>Phone</button>
            <button onClick={()=>{ setUsePhone(false); setUseEmailMode(false); setTab('login'); }} className={`flex-1 py-2 rounded ${!usePhone && !useEmailMode ? 'bg-gray-200' : 'bg-transparent'}`}>Username</button>
            <button onClick={()=>{ setUsePhone(false); setUseEmailMode(true); setTab('login'); }} className={`flex-1 py-2 rounded ${!usePhone && useEmailMode ? 'bg-gray-200' : 'bg-transparent'}`}>Email</button>
          </div>
          <div className="text-xs text-muted-foreground">
            Tip: Testing emails supported (owner@test.com, freelancer@test.com, user@test.com) with password "pass123".
          </div>

          {usePhone ? (
            // Phone OTP UI (signup/login unified)
            <>
              <div className="grid gap-2">
                <Label>Mobile number</Label>
                <Input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+911234567890" />
              </div>
              {otpSent && (
                <div className="grid gap-2">
                  <Label>Enter OTP</Label>
                  <Input value={otp} onChange={e=>setOtp(e.target.value)} placeholder="123456" />
                </div>
              )}

              <div className="flex items-center gap-2">
                {!otpSent ? (
                  <Button className="flex-1" onClick={onSendOtp} disabled={loading || !phone}>Send OTP</Button>
                ) : (
                  <Button className="flex-1" onClick={onVerifyOtp} disabled={loading || !otp}>Verify OTP</Button>
                )}
                <Button variant="ghost" onClick={()=>{ setUsePhone(false); setOtpSent(false); setPhone(''); setOtp(''); }}>Use username</Button>
              </div>

              {showSetCredentials && (
                <div className="mt-4 border-t pt-4">
                  <div className="text-sm mb-2">Set username & password (optional)</div>
                  <div className="grid gap-2">
                    <Label>Username</Label>
                    <Input value={newUsername} onChange={e=>setNewUsername(e.target.value)} />
                    <Label>New password</Label>
                    <Input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} />
                    <div className="flex justify-end">
                      <Button onClick={onSetCredentials} disabled={loading || !newUsername || !newPassword}>Save</Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Username/password login for admin-provisioned accounts
            <>
              <div className="grid gap-2">
                <Label>{useEmailMode ? 'Email' : 'Username'}</Label>
                <Input type={useEmailMode ? 'email' : 'text'} value={email} onChange={e=>setEmail(e.target.value)} placeholder={useEmailMode ? 'you@example.com' : 'username'} />
              </div>
              <div className="grid gap-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={e=>setPassword(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Button className="flex-1" onClick={onUsernameLogin} disabled={loading}>Login</Button>
                <Button variant="ghost" onClick={()=>{ setUsePhone(true); setUseEmailMode(false); setOtpSent(false); }}>{'Use phone'}</Button>
              </div>
            </>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
