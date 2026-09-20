'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight, Loader2 } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { createClient } from '@supabase/supabase-js';
import { getDeviceId, getSession, isAdminAccount, setSession } from '@/lib/auth';

type LoginFormData = { email: string; password: string; remember: boolean; };
type SignupFormData = { name: string; phone: string; email: string; password: string; confirmPassword: string; };
type OtpFormData = { email: string; otp: string; };
type AuthMode = 'login' | 'signup' | 'otp';

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // Start in the callback/loading state during the first render. On an OAuth
  // return, the browser can render this component before the callback effect
  // runs; initializing to false caused the normal login form to flash for a
  // moment before Google session completion finished.
  const [googleCallbackLoading, setGoogleCallbackLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);

  const loginForm = useForm<LoginFormData>({ defaultValues: { email: '', password: '', remember: false } });
  const signupForm = useForm<SignupFormData>();
  const otpForm = useForm<OtpFormData>();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  useEffect(() => {
    if (!otpCooldown) return;
    const timer = window.setInterval(() => setOtpCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [otpCooldown]);

  const authRequest = async (path: string, body: any) => {
    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('dummy') || supabaseKey.includes('dummy')) {
      throw new Error('Supabase is not configured. Add your Supabase authentication keys first.');
    }
    const r = await fetch(`${supabaseUrl}/auth/v1/${path}`, {
      method: 'POST',
      headers: { apikey: supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) {
      const error = new Error(json?.msg || json?.message || json?.error_description || 'Authentication failed') as Error & { code?: string; status?: number; name?: string };
      error.code = json?.code || json?.error_code;
      error.status = r.status;
      error.name = json?.name || error.name;
      throw error;
    }
    return json;
  };

  const finishSession = async (accessToken: string, emailHint?: string, otpVerified = false, refreshToken?: string) => {
    const r = await fetch('/api/auth/complete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getDeviceId(), otpVerified }),
    });
    const result = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(result?.error || 'Unable to create secure session');

    if (result.needsEmailOtp) {
      otpForm.setValue('email', result.email || emailHint || '');
      localStorage.setItem('billing_hub_pending_google_token', accessToken);
      if (refreshToken) localStorage.setItem('billing_hub_pending_refresh_token_v4', refreshToken);
      // Backward compatibility for an older build that may still have this key.
      localStorage.setItem('sawariya_pending_google_token', accessToken);
      setMode('otp');
      setOtpSent(false);
      setOtpCooldown(0);
      toast.info('New device detected. Verify your email with the 6-digit OTP.');
      return false;
    }

    setSession({
      uid: result.uid,
      email: result.email,
      name: result.name,
      role: result.role,
      companyId: result.companyId,
      permissions: result.permissions || [],
      accessToken,
      refreshToken,
      isOwner: result.role === 'owner',
    });
    toast.success(result.firstLogin ? 'Owner account created successfully!' : 'Signed in successfully!');
    router.push('/');
    return true;
  };

  const onLogin = async (data: LoginFormData) => {
    setStaffLoading(true);
    try {
      const loginId = data.email.trim();
      const r = await fetch('/api/auth/staff-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password: data.password }),
      });
      const result = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(result?.error || 'Invalid staff Login ID or password');
      setSession({ uid: result.uid, email: result.email, name: result.name, role: result.role, companyId: result.companyId, permissions: result.permissions || [], accessToken: result.accessToken, refreshToken: result.refreshToken, isOwner: false });
      toast.success('Staff login successful');
      router.push('/');
    } catch (e: any) {
      toast.error(e?.message || 'Login failed');
    } finally {
      setStaffLoading(false);
    }
  };

  const sendOtp = async (email: string, metadata?: { full_name?: string; phone?: string }) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) throw new Error('Enter your email address');
    await authRequest('otp', {
      email: cleanEmail,
      create_user: true,
      options: metadata ? { data: metadata } : undefined,
    });
    otpForm.setValue('email', cleanEmail);
    otpForm.setValue('otp', '');
    setOtpSent(true);
    // Supabase rate-limits email OTP requests; keep the UI aligned with that limit.
    setOtpCooldown(60);
  };

  const onSignup = async (data: SignupFormData) => {
    if (data.password !== data.confirmPassword) {
      signupForm.setError('confirmPassword', { message: 'Passwords do not match' });
      return;
    }
    setIsLoading(true);
    try {
      await sendOtp(data.email, { full_name: data.name.trim(), phone: data.phone });
      setMode('otp');
      toast.success('6-digit verification OTP sent to your email');
    } catch (e: any) {
      toast.error(friendlyAuthError(e, 'Unable to send email OTP. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const onSendOtp = async () => {
    const email = otpForm.getValues('email').trim().toLowerCase();
    if (!email) {
      toast.error('Enter your email address');
      return;
    }
    if (otpCooldown > 0) {
      toast.info(`Please wait ${otpCooldown}s before requesting another OTP.`);
      return;
    }
    setOtpSending(true);
    try {
      await sendOtp(email);
      toast.success('6-digit OTP sent to your email address');
    } catch (e: any) {
      toast.error(friendlyAuthError(e, 'Unable to send OTP. Please try again.'));
    } finally {
      setOtpSending(false);
    }
  };

  const friendlyAuthError = (error: any, fallback: string) => {
    const code = String(error?.code || '').toLowerCase();
    const message = String(error?.message || '').toLowerCase();

    if (code === 'otp_expired' || message.includes('otp_expired') || message.includes('token has expired') || message.includes('otp has expired')) {
      return 'OTP expired. Please request a new OTP.';
    }
    if (code === 'invalid_credentials' || code === 'invalid_otp' || message.includes('invalid otp') || message.includes('invalid token') || message.includes('token is invalid')) {
      return 'Invalid OTP. Please check the code and try again.';
    }
    if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || error?.status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
      return 'Too many attempts. Please wait a moment and try again.';
    }
    if (code === 'otp_disabled') {
      return 'Email OTP login is currently unavailable. Please try again later.';
    }
    if (code === 'bad_code_verifier' || code === 'bad_oauth_callback' || code === 'bad_oauth_state') {
      return 'Secure sign-in could not be completed. Please start the login again.';
    }
    if (error instanceof TypeError || message.includes('failed to fetch') || message.includes('network')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    return fallback;
  };

  const onVerifyOtp = async (data: OtpFormData) => {
    const email = data.email.trim().toLowerCase();
    const otp = data.otp.trim();
    if (!/^\d{6}$/.test(otp)) {
      otpForm.setError('otp', { message: 'Enter a valid 6-digit OTP' });
      return;
    }
    setOtpVerifying(true);
    try {
      const result = await authRequest('verify', { type: 'email', email, token: otp });
      const accessToken = result.access_token;
      const refreshToken = result.refresh_token;
      if (!accessToken) throw new Error('OTP verification did not return a secure session');
      localStorage.removeItem('billing_hub_pending_google_token');
      localStorage.removeItem('sawariya_pending_google_token');
      localStorage.removeItem('billing_hub_pending_refresh_token_v4');
      await finishSession(accessToken, email, true, refreshToken);
    } catch (e: any) {
      const friendly = friendlyAuthError(e, 'Unable to verify OTP. Please try again.');
      const code = String(e?.code || '').toLowerCase();
      const message = String(e?.message || '').toLowerCase();
      const expired =
        code === 'otp_expired' ||
        message.includes('otp_expired') ||
        message.includes('token has expired') ||
        message.includes('otp has expired') ||
        message.includes('expired or is invalid');

      if (expired) {
        otpForm.setValue('otp', '');
        setOtpSent(false);
        toast.error('OTP expired. Please request a new OTP and use the latest code.');
      } else {
        toast.error(friendly);
      }
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('dummy') || supabaseKey.includes('dummy')) {
      toast.error('Supabase Google login is not configured');
      return;
    }
    setGoogleLoading(true);
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true },
    });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://billing-hub.in/sign-up-login',
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      setGoogleLoading(false);
      toast.error(friendlyAuthError(error, 'Google sign-in could not be completed. Please try again.'));
    }
  };

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const hasHashToken = hash.includes('access_token=');
    const hasOAuthCallback = hasHashToken || !!code;

    if (!hasOAuthCallback) {
      // Normal direct visit to /sign-up-login: show the regular login form.
      setGoogleCallbackLoading(false);
      return;
    }

    setGoogleCallbackLoading(true);
    // Keep URL detection disabled here. With PKCE, automatic URL handling can
    // race the explicit exchange below and consume the one-time code twice.
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true },
    });

    let finished = false;

    const complete = async (session: any) => {
      if (finished || !session?.access_token) return;
      finished = true;
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
        await finishSession(session.access_token, session.user?.email, false, session.refresh_token);
      } catch (e: any) {
        window.history.replaceState({}, document.title, window.location.pathname);
        toast.error(friendlyAuthError(e, 'Google sign-in could not be completed. Please try again.'));
      } finally {
        setGoogleCallbackLoading(false);
      }
    };

    const fail = (error: any) => {
      if (finished) return;
      window.history.replaceState({}, document.title, window.location.pathname);
      setGoogleCallbackLoading(false);
      toast.error(friendlyAuthError(error, 'Google sign-in could not be completed. Please try again.'));
    };

    const completeFromHash = async () => {
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      if (!accessToken) return;

      const { data, error } = await supabase.auth.getUser(accessToken);
      if (error) throw error;
      await complete({
        access_token: accessToken,
        refresh_token: refreshToken || undefined,
        user: data.user,
      });
    };

    const completeFromCode = async () => {
      if (!code) return;
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      if (!data.session?.access_token) {
        throw new Error('Google sign-in did not return a secure session');
      }
      await complete(data.session);
    };

    const runCallback = async () => {
      if (hasHashToken) {
        await completeFromHash();
        return;
      }

      if (code) {
        await completeFromCode();
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      await complete(data.session);
    };

    // One callback owner only: explicitly exchange the returned code/hash.
    // Avoiding an auth-state listener prevents a second consumer from racing
    // the single-use PKCE authorization code.
    void runCallback().catch(fail);

    const timeout = window.setTimeout(() => {
      if (!finished) {
        setGoogleCallbackLoading(false);
        toast.error('Google sign-in timed out. Please try again.');
      }
    }, 15000);

    return () => {
      window.clearTimeout(timeout);
      // No auth-state listener to unsubscribe.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (googleCallbackLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-5 text-foreground"><AppLogo size={56} showBrandName /></div>
          <div className="flex justify-center mb-4"><Loader2 size={28} className="animate-spin text-primary" /></div>
          <h2 className="text-xl font-semibold text-foreground">Signing you in...</h2>
          <p className="text-sm text-muted-foreground mt-1">Please wait while we securely complete your Google sign-in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 bg-gradient-brand flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-40 h-40 rounded-full border-4 border-primary-foreground" />
          <div className="absolute bottom-32 right-8 w-64 h-64 rounded-full border-2 border-primary-foreground" />
          <div className="absolute top-1/2 left-1/3 w-20 h-20 rounded-full border-2 border-primary-foreground" />
        </div>

        <div className="relative z-10">
          <div className="flex justify-center mb-12 text-center text-primary-foreground">
            <AppLogo size={56} showBrandName />
          </div>
          <h1 className="text-3xl xl:text-4xl font-bold text-primary-foreground leading-tight mb-4">Billing & Stock<br />Management</h1>
          <p className="text-primary-foreground/80 text-base leading-relaxed max-w-xs">Business billing, inventory, customer accounts, and reports.</p>
        </div>

        <div className="relative z-10 space-y-3">
          {[
            { icon: '📋', text: 'Create & print invoices in seconds' },
            { icon: '📦', text: 'Real-time stock level monitoring' },
            { icon: '📒', text: 'Khatabook — credit ledger tracking' },
            { icon: '📊', text: 'Daily sales analytics & reports' },
          ].map((f) => <div key={`feature-${f.text.slice(0,15)}`} className="flex items-center gap-3"><span className="text-lg">{f.icon}</span><span className="text-primary-foreground/80 text-sm">{f.text}</span></div>)}
        </div>
        <div className="relative z-10"><p className="text-primary-foreground/50 text-xs">India-ready billing and inventory management</p></div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-14 xl:px-20 py-10 bg-background overflow-y-auto">
        <div className="w-full max-w-md mx-auto">
          <div className="flex justify-center mb-8 lg:hidden text-foreground"><AppLogo size={40} showBrandName /></div>

          {mode === 'otp' ? (
            <OtpPanel otpForm={otpForm} onVerifyOtp={onVerifyOtp} onSendOtp={onSendOtp} otpSent={otpSent} otpCooldown={otpCooldown} otpSending={otpSending} otpVerifying={otpVerifying} onBack={() => { setMode('login'); setOtpSent(false); }} />
          ) : (
            <LoginPanel form={loginForm} onSubmit={loginForm.handleSubmit(onLogin)} showPassword={showPassword} setShowPassword={setShowPassword} isLoading={isLoading} staffLoading={staffLoading} googleLoading={googleLoading} onGoogleLogin={handleGoogleLogin} onOtpMode={(email:string) => { otpForm.setValue('email', email); otpForm.setValue('otp', ''); setOtpSent(false); setOtpCooldown(0); setMode('otp'); }} />
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleButton({ loading, onClick }: { loading:boolean; onClick:()=>void }) {
  return <button type="button" onClick={onClick} disabled={loading} className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-border rounded-lg bg-card hover:bg-secondary text-foreground text-sm font-medium transition-all duration-150 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
    {loading ? <Loader2 size={16} className="animate-spin" /> : <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>}
    Continue with Google
  </button>;
}

function LoginPanel({ form, onSubmit, showPassword, setShowPassword, isLoading, staffLoading, googleLoading, onGoogleLogin, onOtpMode }: any) {
  const { register, handleSubmit, formState:{errors} } = form;
  const [staffOpen, setStaffOpen] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState('');

  const handleOwnerOtp = () => {
    const email = ownerEmail.trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Enter a valid email address');
      return;
    }
    onOtpMode(email);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back</h2>
        <p className="text-sm text-muted-foreground">Sign in to your billing account</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
        <div className="relative">
          <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
          <input
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            type="email"
            placeholder="owner@example.com"
            className="input-field pl-9"
            autoComplete="email"
          />
        </div>
        <button
          type="button"
          onClick={handleOwnerOtp}
          disabled={isLoading}
          className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-3"
        >
          {isLoading ? <><Loader2 size={16} className="animate-spin"/>Sending OTP...</> : <>Continue with Email OTP<ArrowRight size={16}/></>}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border"/>
        <span className="text-xs text-muted-foreground">or</span>
        <div className="flex-1 h-px bg-border"/>
      </div>

      <GoogleButton loading={googleLoading} onClick={onGoogleLogin} />

      <button
        type="button"
        onClick={() => setStaffOpen((v) => !v)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg bg-secondary hover:bg-card text-foreground text-sm font-medium transition-all duration-150"
      >
        <User size={16}/>
        {staffOpen ? 'Hide Staff Login' : 'Staff Login'}
      </button>

      {staffOpen && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-border bg-secondary/50 p-4" noValidate>
          <div>
            <p className="text-sm font-semibold text-foreground mb-0.5">Staff Sign In</p>
            <p className="text-xs text-muted-foreground">Use the Login ID and password given by your business owner.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Staff Login ID</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input
                {...register('email',{required:'Login ID is required'})}
                type="text"
                placeholder="e.g. staff01"
                className="input-field pl-9"
                autoComplete="username"
              />
            </div>
            {errors.email&&<p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/>
              <input
                {...register('password',{required:'Password is required',minLength:{value:6,message:'Minimum 6 characters'}})}
                type={showPassword?'text':'password'}
                placeholder="Enter your password"
                className="input-field pl-9 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={()=>setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword?<EyeOff size={15}/>:<Eye size={15}/>}
              </button>
            </div>
            {errors.password&&<p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <div className="flex items-center gap-2">
            <input {...register('remember')} type="checkbox" id="remember" className="w-4 h-4 rounded border-border text-primary focus:ring-ring"/>
            <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">Remember me for 30 days</label>
          </div>

          <button type="submit" disabled={staffLoading || isLoading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">
            {staffLoading?<><Loader2 size={16} className="animate-spin"/>Signing in...</>:<>Staff Sign In<ArrowRight size={16}/></>}
          </button>
        </form>
      )}
    </div>
  );
}

function SignupPanel({ form, onSubmit, showPassword, setShowPassword, showConfirmPassword, setShowConfirmPassword, isLoading, googleLoading, onGoogleLogin }: any) {
  const { register, formState:{errors} } = form;
  return <form onSubmit={onSubmit} className="space-y-4" noValidate>
    <div><h2 className="text-2xl font-bold text-foreground mb-1">Create account</h2><p className="text-sm text-muted-foreground">Set up your Billing Hub account</p></div>
    <GoogleButton loading={googleLoading} onClick={onGoogleLogin} />
    <div className="flex items-center gap-2"><div className="flex-1 h-px bg-border"/><span className="text-xs text-muted-foreground">or continue with email</span><div className="flex-1 h-px bg-border"/></div>
    <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label><div className="relative"><User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input {...register('name',{required:'Name is required'})} type="text" placeholder="Ramesh Kumar" className="input-field pl-8 text-sm"/></div>{errors.name&&<p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}</div><div><label className="block text-sm font-medium text-foreground mb-1.5">Phone</label><div className="relative"><Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input {...register('phone',{required:'Phone required',pattern:{value:/^[6-9]\d{9}$/,message:'Invalid Indian mobile number'}})} type="tel" placeholder="9876543210" className="input-field pl-8 text-sm"/></div>{errors.phone&&<p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}</div></div>
    <div><label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label><div className="relative"><Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input {...register('email',{required:'Email is required',pattern:{value:/^\S+@\S+\.\S+$/,message:'Enter a valid email'}})} type="email" placeholder="owner@example.com" className="input-field pl-8 text-sm"/></div>{errors.email&&<p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}</div>
    <div><label className="block text-sm font-medium text-foreground mb-1.5">Password</label><div className="relative"><Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input {...register('password',{required:'Password required',minLength:{value:8,message:'Minimum 8 characters'}})} type={showPassword?'text':'password'} placeholder="Min. 8 characters" className="input-field pl-8 pr-9 text-sm"/><button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showPassword?<EyeOff size={14}/>:<Eye size={14}/>}</button></div>{errors.password&&<p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}</div>
    <div><label className="block text-sm font-medium text-foreground mb-1.5">Confirm Password</label><div className="relative"><Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input {...register('confirmPassword',{required:'Please confirm password'})} type={showConfirmPassword?'text':'password'} placeholder="Repeat password" className="input-field pl-8 pr-9 text-sm"/><button type="button" onClick={()=>setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{showConfirmPassword?<EyeOff size={14}/>:<Eye size={14}/>}</button></div>{errors.confirmPassword&&<p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}</div>
    <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">{isLoading?<><Loader2 size={16} className="animate-spin"/>Sending OTP...</>:<>Create Account<ArrowRight size={16}/></>}</button>
    <p className="text-xs text-center text-muted-foreground">You will verify this account using an 6-digit email OTP.</p>
  </form>;
}

function OtpPanel({ otpForm, onVerifyOtp, onSendOtp, otpSent, otpCooldown, otpSending, otpVerifying, onBack }: any) {
  const { register, handleSubmit, formState:{errors} } = otpForm;
  return <form onSubmit={handleSubmit(onVerifyOtp)} className="space-y-5" noValidate>
    <div><button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">← Back to Sign In</button><h2 className="text-2xl font-bold text-foreground mb-1">Email OTP Login</h2><p className="text-sm text-muted-foreground">Enter your email to receive an 6-digit one-time password</p></div>
    <div><label className="block text-sm font-medium text-foreground mb-1.5">Email Address</label><div className="flex gap-2"><div className="relative flex-1"><Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"/><input {...register('email',{required:'Email required',pattern:{value:/^\S+@\S+\.\S+$/,message:'Valid email required'}})} type="email" placeholder="owner@example.com" className="input-field pl-9"/></div><button type="button" onClick={onSendOtp} disabled={otpSending||otpVerifying||otpCooldown>0} className="btn-primary whitespace-nowrap px-4 text-sm flex items-center gap-1.5">{otpSending?<Loader2 size={14} className="animate-spin"/>:null}{otpCooldown>0?`${otpCooldown}s`:(otpSent?'Resend':'Send OTP')}</button></div>{errors.email&&<p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}</div>
    {otpSent&&<div className="p-3 bg-green-50 border border-green-200 rounded-lg"><p className="text-sm text-green-700">6-digit OTP sent to your email. Check Inbox/Spam and enter the code below.</p></div>}
    <div><label className="block text-sm font-medium text-foreground mb-1.5">Enter 6-digit OTP</label><input {...register('otp',{required:'OTP is required',validate:(v:string)=>/^\d{6}$/.test(v)||'6-digit OTP required'})} type="text" inputMode="numeric" placeholder="123456" maxLength={6} className="input-field tracking-widest text-center text-lg font-mono" onInput={(e)=>{e.currentTarget.value=e.currentTarget.value.replace(/\D/g,'').slice(0,6);}}/>{errors.otp&&<p className="mt-1 text-xs text-red-600">{errors.otp.message}</p>}</div>
    <button type="submit" disabled={otpVerifying||otpSending||!otpSent} className="btn-primary w-full flex items-center justify-center gap-2 py-2.5">{otpVerifying?<><Loader2 size={16} className="animate-spin"/>Verifying...</>:<>Verify & Sign In<ArrowRight size={16}/></>}</button>
  </form>;
}
