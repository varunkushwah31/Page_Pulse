import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginUser, registerUser } from '../lib/api';

export const AuthPage: React.FC = () => {
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

  // Active User State
  const [currentUser, setCurrentUser] = useState<{ username: string; email: string; role: string } | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Check if user was redirected from audit save
  const redirectState = location.state as { from?: string; auditId?: number } | undefined;
  const isAuditSaveRedirect = redirectState?.from && redirectState?.auditId;

  useEffect(() => {
    const savedUser = localStorage.getItem('pagepulse_user');
    if (savedUser) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('pagepulse_user');
      }
    }
  }, []);

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
      localStorage.setItem('pagepulse_token', res.accessToken);
      const userProfile = { username: res.user.username, email: res.user.email, role: res.user.role || 'USER' };
      localStorage.setItem('pagepulse_user', JSON.stringify(userProfile));
      setCurrentUser(userProfile);
      setSuccessMessage(`Welcome back, ${res.user.username}! Session active.`);
      setLoginPassword('');
      
      // Handle redirect after login
      if (isAuditSaveRedirect) {
        // The user will be redirected back to the audit page
        // They can click "Save to Database" again now that they're authenticated
        navigate(redirectState.from!, { replace: true });
      } else if (redirectState?.from) {
        navigate(redirectState.from, { replace: true });
      } else {
        navigate('/');
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
      localStorage.setItem('pagepulse_token', res.accessToken);
      const userProfile = { username: res.user.username, email: res.user.email, role: res.user.role || 'USER' };
      localStorage.setItem('pagepulse_user', JSON.stringify(userProfile));
      setCurrentUser(userProfile);
      setSuccessMessage(`Account created successfully! Welcome, ${res.user.username}.`);
      setSignupPassword('');
      setSignupConfirmPassword('');
      
      // Handle redirect after signup
      if (redirectState?.from) {
        navigate(redirectState.from, { replace: true });
      } else {
        navigate('/');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pagepulse_token');
    localStorage.removeItem('pagepulse_user');
    setCurrentUser(null);
    setSuccessMessage('Logged out successfully.');
    setErrorMessage(null);
  };

  return (
    <section className="space-y-6 font-mono">
      {/* Page Title Header */}
      <div className="flex items-center justify-between border-b border-[#262B33] pb-3">
        <div>
          <h2 className="text-sm font-semibold text-[#E7EAEE] uppercase tracking-wider">
            Identity & Authentication Console
          </h2>
          <p className="text-[11px] text-[#8B93A1]">
            Manage enterprise JWT access tokens and secure API session state.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-[#4FD8C4] shadow-[0_0_8px_#4FD8C4]"></span>
          <span className="text-[11px] text-[#4FD8C4] uppercase">Auth Active</span>
        </div>
      </div>

      {/* Alert Banners */}
      {errorMessage && (
        <div className="rounded border border-[#FF5555]/40 bg-[#FF5555]/10 p-3 text-xs text-[#FF5555]">
          <span className="font-bold mr-1">ERROR:</span> {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 p-3 text-xs text-[#4FD8C4]">
          <span className="font-bold mr-1">SUCCESS:</span> {successMessage}
        </div>
      )}

      {/* Logged In User State View */}
      {currentUser ? (
        <div className="rounded border border-[#262B33] bg-[#12151A] p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-[#262B33] pb-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-[#191D24] border border-[#333A45] flex items-center justify-center font-bold text-[#4FD8C4] text-base">
                {currentUser.username.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-[#E7EAEE] text-sm">{currentUser.username}</h3>
                <p className="text-[11px] text-[#8B93A1]">{currentUser.email}</p>
              </div>
            </div>
            <span className="rounded bg-[#191D24] border border-[#333A45] px-2.5 py-1 text-[10px] text-[#4FD8C4] font-bold uppercase">
              {currentUser.role}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px] text-[#8B93A1]">
            <div>
              <span className="block text-[#565D68] uppercase text-[10px]">Session Status</span>
              <span className="text-[#4FD8C4]">Active (JWT Verified)</span>
            </div>
            <div>
              <span className="block text-[#565D68] uppercase text-[10px]">Storage Mode</span>
              <span className="text-[#E7EAEE]">LocalStorage + Bearer Token</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="rounded bg-[#191D24] border border-[#FF5555]/40 px-4 py-2 text-xs font-semibold text-[#FF5555] hover:bg-[#FF5555]/10 hover:border-[#FF5555] transition-all cursor-pointer"
            >
              Sign Out Session
            </button>
          </div>
        </div>
      ) : (
        /* Unauthenticated Auth Form View */
        <div className="rounded border border-[#262B33] bg-[#12151A] p-6 space-y-6">
          {/* Redirect Message */}
          {isAuditSaveRedirect && (
            <div className="rounded border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 p-3 text-xs text-[#4FD8C4] flex items-center gap-2">
              <span className="font-bold mr-1">INFO:</span> 
              <span>You were redirected here to authenticate before saving your audit report. Sign in or create an account to continue.</span>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-[#262B33] gap-2">
            <button
              type="button"
              onClick={() => { setMode('login'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`pb-2.5 px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer border-b-2 transition-all ${
                mode === 'login'
                  ? 'border-[#4FD8C4] text-[#4FD8C4]'
                  : 'border-transparent text-[#8B93A1] hover:text-[#E7EAEE]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMessage(null); setSuccessMessage(null); }}
              className={`pb-2.5 px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer border-b-2 transition-all ${
                mode === 'signup'
                  ? 'border-[#4FD8C4] text-[#4FD8C4]'
                  : 'border-transparent text-[#8B93A1] hover:text-[#E7EAEE]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-[11px] text-[#8B93A1] uppercase tracking-wider">
                  Username or Email
                </label>
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. admin_tester or user@example.com"
                  className="w-full rounded bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68]"
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
                    className="text-[10px] text-[#4FD8C4] hover:underline cursor-pointer"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-[#191D24] border border-[#333A45] p-2.5 font-semibold text-[#4FD8C4] hover:bg-[#4FD8C4]/10 hover:border-[#4FD8C4] transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to System'}
              </button>
            </form>
          )}

          {/* SIGNUP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-[11px] text-[#8B93A1] uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  placeholder="e.g. dev_pulse"
                  className="w-full rounded bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68]"
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
                  className="w-full rounded bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68]"
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
                    className="text-[10px] text-[#4FD8C4] hover:underline cursor-pointer"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68]"
                  required
                />
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
                  className="w-full rounded bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded bg-[#191D24] border border-[#333A45] p-2.5 font-semibold text-[#4FD8C4] hover:bg-[#4FD8C4]/10 hover:border-[#4FD8C4] transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Register Account'}
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
};
