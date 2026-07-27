import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginUser, registerUser } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Shield, Key, Lock, User as UserIcon, LogOut, CheckCircle2, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, logout, user: authUser } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup State
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // Common UI State
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Check if user was redirected from audit save
  const redirectState = location.state as { from?: string; auditId?: number } | undefined;
  const isAuditSaveRedirect = redirectState?.from && redirectState?.auditId;

  // Password Strength Meter for Signup
  const passwordStrength = useMemo(() => {
    if (!signupPassword) return { score: 0, label: '', color: '' };
    let score = 0;
    if (signupPassword.length >= 8) score += 1;
    if (/[A-Z]/.test(signupPassword)) score += 1;
    if (/[0-9]/.test(signupPassword)) score += 1;
    if (/[^A-Za-z0-9]/.test(signupPassword)) score += 1;

    if (score <= 1) return { score, label: 'Weak', color: 'bg-[#F87171] text-[#F87171]' };
    if (score === 2 || score === 3) return { score, label: 'Moderate', color: 'bg-[#FBBF24] text-[#FBBF24]' };
    return { score, label: 'Strong', color: 'bg-[#4ADE80] text-[#4ADE80]' };
  }, [signupPassword]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!loginIdentifier.trim() || !loginPassword) {
      setErrorMessage('Please enter your username/email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser(loginIdentifier.trim(), loginPassword);
      const userProfile = { id: res.user.id, username: res.user.username, email: res.user.email, role: res.user.role || 'ROLE_USER' };
      login(res.accessToken, userProfile);
      setSuccessMessage(`Welcome back, ${res.user.username}! JWT session verified.`);
      setLoginPassword('');

      if (isAuditSaveRedirect) {
        navigate(redirectState.from!, { replace: true });
      } else if (redirectState?.from) {
        navigate(redirectState.from, { replace: true });
      } else {
        navigate('/profile');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed. Please check credentials.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!signupUsername.trim() || !signupEmail.trim() || !signupPassword) {
      setErrorMessage('Please fill out all required fields.');
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerUser(signupUsername.trim(), signupEmail.trim(), signupPassword);
      const userProfile = { id: res.user.id, username: res.user.username, email: res.user.email, role: res.user.role || 'ROLE_USER' };
      login(res.accessToken, userProfile);
      setSuccessMessage(`Account created successfully! Welcome, ${res.user.username}.`);
      setSignupPassword('');
      setSignupConfirmPassword('');

      if (redirectState?.from) {
        navigate(redirectState.from, { replace: true });
      } else {
        navigate('/profile');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setSuccessMessage('Session terminated successfully.');
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6 font-mono text-xs max-w-2xl mx-auto">
      {/* Identity & Header Strip */}
      <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#262B33] pb-3">
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-[#4FD8C4]" />
            <span className="text-[#E7EAEE] font-bold">Identity & Authentication Engine</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#4FD8C4]">
            <span className="size-2 rounded-full bg-[#4FD8C4] animate-pulse"></span>
            <span>JWT SECURE</span>
          </div>
        </div>

        <p className="text-[#8B93A1] font-sans text-xs">
          Authenticate your account to enable cloud MongoDB report saving, API key generation, and automated background audit monitors.
        </p>
      </div>

      {/* Alert Notification Banners */}
      {errorMessage && (
        <div className="rounded-lg border border-[#F87171]/40 bg-[#F87171]/10 p-3.5 text-xs text-[#F87171] flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-[#4ADE80]/40 bg-[#4ADE80]/10 p-3.5 text-xs text-[#4ADE80] flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0 text-[#4ADE80]" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Logged-In User Dashboard View */}
      {authUser ? (
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#262B33] pb-4">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-[#191D24] border border-[#333A45] flex items-center justify-center font-bold text-[#4FD8C4] text-lg">
                {authUser.username.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#E7EAEE] text-sm">{authUser.username}</h3>
                  <span className="rounded bg-[#4FD8C4]/20 border border-[#4FD8C4]/40 px-2 py-0.5 text-[10px] font-bold text-[#4FD8C4] uppercase">
                    {authUser.role || 'ROLE_USER'}
                  </span>
                </div>
                <p className="text-xs text-[#8B93A1] font-sans">{authUser.email}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-[#262B33] bg-[#0A0C0F] p-3 space-y-1">
              <span className="text-[10px] text-[#565D68] uppercase font-bold block">Session Bearer Token</span>
              <span className="text-[#4FD8C4] font-mono flex items-center gap-1">
                <Key className="size-3 text-[#4FD8C4]" />
                <span>JWT Signature Active</span>
              </span>
            </div>

            <div className="rounded-lg border border-[#262B33] bg-[#0A0C0F] p-3 space-y-1">
              <span className="text-[10px] text-[#565D68] uppercase font-bold block">Cloud Storage Target</span>
              <span className="text-[#E7EAEE] font-mono">MongoDB Atlas Cluster</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/profile')}
                className="rounded border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 px-4 py-2 font-bold text-[#4FD8C4] hover:bg-[#4FD8C4]/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <UserIcon className="size-3.5" />
                <span>View User Profile</span>
              </button>

              <button
                onClick={() => navigate('/audit')}
                className="rounded border border-[#333A45] bg-[#191D24] px-4 py-2 font-bold text-[#E7EAEE] hover:bg-[#262B33] transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Run Audit</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="rounded border border-[#F87171]/40 bg-[#F87171]/10 px-4 py-2 font-bold text-[#F87171] hover:bg-[#F87171]/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <LogOut className="size-3.5" />
              <span>Terminate Session</span>
            </button>
          </div>
        </div>
      ) : (
        /* Unauthenticated Login / Register Console */
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-6 space-y-6 shadow-2xl">
          {/* Redirect Info Banner */}
          {isAuditSaveRedirect && (
            <div className="rounded-lg border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 p-3 text-xs text-[#4FD8C4] flex items-center gap-2">
              <Lock className="size-4 shrink-0 text-[#4FD8C4]" />
              <span>Sign in or create an account to save your audit report to MongoDB Atlas.</span>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-[#262B33] gap-3">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`pb-2.5 px-4 font-bold uppercase tracking-wider cursor-pointer border-b-2 transition-all ${
                mode === 'login'
                  ? 'border-[#4FD8C4] text-[#4FD8C4]'
                  : 'border-transparent text-[#8B93A1] hover:text-[#E7EAEE]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`pb-2.5 px-4 font-bold uppercase tracking-wider cursor-pointer border-b-2 transition-all ${
                mode === 'signup'
                  ? 'border-[#4FD8C4] text-[#4FD8C4]'
                  : 'border-transparent text-[#8B93A1] hover:text-[#E7EAEE]'
              }`}
            >
              Register Account
            </button>
          </div>

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Quick Demo Credentials Auto-Fill Card */}
              <div className="rounded-lg border border-[#262B33] bg-[#0A0C0F] p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#4FD8C4] font-bold">
                  <span>⚡ Demo Accounts (Pre-seeded & Ready)</span>
                  <span className="text-[#565D68] text-[10px] uppercase">1-Click Auto-Fill</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginIdentifier('admin');
                      setLoginPassword('Admin@123456');
                    }}
                    className="p-2 rounded border border-[#333A45] bg-[#191D24] hover:bg-[#262B33] hover:border-[#4FD8C4]/60 transition-all text-left cursor-pointer space-y-0.5"
                  >
                    <div className="font-bold text-[#E7EAEE] text-[11px] flex items-center justify-between">
                      <span>Admin Demo</span>
                      <span className="text-[#4FD8C4] text-[9px] border border-[#4FD8C4]/30 px-1 rounded">ADMIN</span>
                    </div>
                    <div className="text-[10px] text-[#8B93A1] font-mono">admin / Admin@123456</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginIdentifier('devuser');
                      setLoginPassword('Dev@123456');
                    }}
                    className="p-2 rounded border border-[#333A45] bg-[#191D24] hover:bg-[#262B33] hover:border-[#4FD8C4]/60 transition-all text-left cursor-pointer space-y-0.5"
                  >
                    <div className="font-bold text-[#E7EAEE] text-[11px] flex items-center justify-between">
                      <span>Developer Demo</span>
                      <span className="text-[#7AA2F7] text-[9px] border border-[#7AA2F7]/30 px-1 rounded">USER</span>
                    </div>
                    <div className="text-[10px] text-[#8B93A1] font-mono">devuser / Dev@123456</div>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] text-[#8B93A1] uppercase tracking-wider">
                  Username or Email
                </label>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. admin or devuser"
                  className="w-full rounded-lg bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] text-[#8B93A1] uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] text-[#4FD8C4] hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#191D24] border border-[#333A45] p-2.5 font-bold text-[#4FD8C4] hover:bg-[#4FD8C4]/10 hover:border-[#4FD8C4] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <Key className="size-3.5" />
                <span>{loading ? 'Verifying Credentials...' : 'Sign In to System'}</span>
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] text-[#8B93A1] uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  placeholder="e.g. dev_pulse"
                  className="w-full rounded-lg bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] text-[#8B93A1] uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="dev@example.com"
                  className="w-full rounded-lg bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] text-[#8B93A1] uppercase tracking-wider">
                    Password
                  </label>
                  {passwordStrength.label && (
                    <span className={`text-[10px] font-bold ${passwordStrength.color}`}>
                      Strength: {passwordStrength.label}
                    </span>
                  )}
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-lg bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68]"
                  required
                />
                {signupPassword && (
                  <div className="w-full h-1 bg-[#0A0C0F] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        passwordStrength.score <= 1
                          ? 'bg-[#F87171] w-1/3'
                          : passwordStrength.score <= 3
                          ? 'bg-[#FBBF24] w-2/3'
                          : 'bg-[#4ADE80] w-full'
                      }`}
                    ></div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] text-[#8B93A1] uppercase tracking-wider">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-lg bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#191D24] border border-[#333A45] p-2.5 font-bold text-[#4FD8C4] hover:bg-[#4FD8C4]/10 hover:border-[#4FD8C4] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <UserIcon className="size-3.5" />
                <span>{loading ? 'Creating Account...' : 'Register Account'}</span>
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
