import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loginUser, registerUser } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldIcon,
  KeyIcon,
  LockIcon,
  UserIcon,
  SignOutIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  WarningCircleIcon,
  ArrowRightIcon,
  CheckIcon,
  XIcon,
  LightningIcon
} from '@phosphor-icons/react';

function calculatePasswordStrength(password: string) {
  if (!password) return { score: 0, label: '', color: '', checks: { length: false, upper: false, lower: false, digit: false, special: false } };

  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: /[^A-Za-z\d]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  if (score <= 2) return { score, label: 'Weak', color: 'text-[#F87171]', checks };
  if (score <= 3) return { score, label: 'Fair', color: 'text-[#FBBF24]', checks };
  if (score <= 4) return { score, label: 'Good', color: 'text-[#7AA2F7]', checks };
  return { score, label: 'Strong', color: 'text-[#4ADE80]', checks };
}

interface PasswordCriteriaProps {
  checks: { length: boolean; upper: boolean; lower: boolean; digit: boolean; special: boolean };
}

const PasswordCriteriaList: React.FC<PasswordCriteriaProps> = ({ checks }) => {
  const criteria = [
    { key: 'length' as const, label: '8+ chars' },
    { key: 'upper' as const, label: 'Uppercase' },
    { key: 'lower' as const, label: 'Lowercase' },
    { key: 'digit' as const, label: 'Number' },
    { key: 'special' as const, label: 'Special symbol' },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
      {criteria.map(({ key, label }) => {
        const passed = checks[key];
        return (
          <div
            key={key}
            className={`flex items-center gap-1 ${passed ? 'text-[#4ADE80]' : 'text-[#565D68]'}`}
          >
            {passed ? <CheckIcon className="size-2.5" /> : <XIcon className="size-2.5" />}
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
};

export const AuthPage: React.FC = () => {
  const { login, logout, user: authUser } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Login State
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup State
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  // Common UI State
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const redirectState = location.state as { from?: string; auditId?: number } | undefined;
  const isAuditSaveRedirect = Boolean(redirectState?.from && redirectState?.auditId);

  const passwordStrength = useMemo(() => calculatePasswordStrength(signupPassword), [signupPassword]);
  const passwordsMatch = signupConfirmPassword.length > 0 && signupPassword === signupConfirmPassword;
  const passwordsMismatch = signupConfirmPassword.length > 0 && signupPassword !== signupConfirmPassword;

  const handleLoginSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
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
      const userProfile = { id: res.user.id, username: res.user.username, email: res.user.email, role: res.user.role || 'USER' };
      login(res.accessToken, userProfile);
      setSuccessMessage(`Welcome back, ${res.user.username}! Session verified.`);
      setLoginPassword('');

      const targetPath = redirectState?.from || '/profile';
      setTimeout(() => navigate(targetPath, { replace: true }), 400);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please verify your login details.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
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

    if (passwordStrength.score < 4) {
      setErrorMessage('Password must contain at least 8 chars, uppercase, lowercase, number, and special symbol.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerUser(signupUsername.trim(), signupEmail.trim(), signupPassword);
      const userProfile = { id: res.user.id, username: res.user.username, email: res.user.email, role: res.user.role || 'USER' };
      login(res.accessToken, userProfile);
      setSuccessMessage(`Account created successfully! Welcome, ${res.user.username}.`);
      setSignupPassword('');
      setSignupConfirmPassword('');

      const targetPath = redirectState?.from || '/profile';
      setTimeout(() => navigate(targetPath, { replace: true }), 400);
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

  const handleDemoFill = (username: string, password: string) => {
    setLoginIdentifier(username);
    setLoginPassword(password);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-mono text-xs animate-fade-in-up">

      {/* Identity & Header Strip */}
      <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-5 space-y-3 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#262B33] pb-3">
          <div className="flex items-center gap-2">
            <ShieldIcon className="size-4 text-[#4FD8C4]" />
            <span className="text-[#E7EAEE] font-bold">Identity & Authentication Engine</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#4FD8C4]">
            <span className="size-2 rounded-full bg-[#4FD8C4] animate-pulse" />
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
          <WarningCircleIcon className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-[#4ADE80]/40 bg-[#4ADE80]/10 p-3.5 text-xs text-[#4ADE80] flex items-center gap-2">
          <CheckCircleIcon className="size-4 shrink-0 text-[#4ADE80]" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Logged-In User Dashboard View */}
      {authUser ? (
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#262B33] pb-4">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-lg bg-[#191D24] border border-[#333A45] flex items-center justify-center font-bold text-[#4FD8C4] text-lg">
                {authUser.username.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#E7EAEE] text-sm">{authUser.username}</h3>
                  <span className="rounded bg-[#4FD8C4]/20 border border-[#4FD8C4]/40 px-2 py-0.5 text-[10px] font-bold text-[#4FD8C4] uppercase">
                    {authUser.role?.replace('ROLE_', '') || 'USER'}
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
                <KeyIcon className="size-3 text-[#4FD8C4]" />
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
                type="button"
                onClick={() => navigate('/profile')}
                className="rounded border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 px-4 py-2 font-bold text-[#4FD8C4] hover:bg-[#4FD8C4]/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <UserIcon className="size-3.5" />
                <span>View User Profile</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/audit')}
                className="rounded border border-[#333A45] bg-[#191D24] px-4 py-2 font-bold text-[#E7EAEE] hover:bg-[#262B33] transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Run Audit</span>
                <ArrowRightIcon className="size-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded border border-[#F87171]/40 bg-[#F87171]/10 px-4 py-2 font-bold text-[#F87171] hover:bg-[#F87171]/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <SignOutIcon className="size-3.5" />
              <span>Terminate Session</span>
            </button>
          </div>
        </div>
      ) : (
        /* Unauthenticated Login / Register Console */
        <div className="rounded-xl border border-[#262B33] bg-[#12151A] p-6 space-y-5 shadow-2xl">
          {/* Redirect Info Banner */}
          {isAuditSaveRedirect && (
            <div className="rounded-lg border border-[#4FD8C4]/40 bg-[#4FD8C4]/10 p-3 text-xs text-[#4FD8C4] flex items-center gap-2">
              <LockIcon className="size-4 shrink-0 text-[#4FD8C4]" />
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
                  <span className="flex items-center gap-1">
                    <LightningIcon className="size-3.5" />
                    Demo Accounts (Pre-seeded & Ready)
                  </span>
                  <span className="text-[#565D68] text-[10px] uppercase">1-Click Auto-Fill</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDemoFill('admin', 'Admin@123456')}
                    className="p-2.5 rounded border border-[#333A45] bg-[#191D24] hover:bg-[#262B33] hover:border-[#4FD8C4]/60 transition-all text-left cursor-pointer space-y-0.5"
                  >
                    <div className="font-bold text-[#E7EAEE] text-[11px] flex items-center justify-between">
                      <span>Admin Demo</span>
                      <span className="text-[#4FD8C4] text-[9px] border border-[#4FD8C4]/30 px-1 rounded">ADMIN</span>
                    </div>
                    <div className="text-[10px] text-[#8B93A1] font-mono">admin / Admin@123456</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemoFill('devuser', 'Dev@123456')}
                    className="p-2.5 rounded border border-[#333A45] bg-[#191D24] hover:bg-[#262B33] hover:border-[#4FD8C4]/60 transition-all text-left cursor-pointer space-y-0.5"
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
                <label htmlFor="login-identifier" className="block text-[11px] text-[#8B93A1] uppercase tracking-wider">
                  Username or Email
                </label>
                <input
                  id="login-identifier"
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="e.g. admin or devuser"
                  className="w-full rounded-lg bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68] transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="block text-[11px] text-[#8B93A1] uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] text-[#4FD8C4] hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    {showPassword ? <EyeSlashIcon className="size-3" /> : <EyeIcon className="size-3" />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68] transition-colors"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[#191D24] border border-[#333A45] p-2.5 font-bold text-[#4FD8C4] hover:bg-[#4FD8C4]/10 hover:border-[#4FD8C4] transition-all cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <KeyIcon className="size-3.5" />
                <span>{loading ? 'Verifying Credentials...' : 'Sign In to System'}</span>
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="signup-fullname" className="block text-[11px] text-[#8B93A1] uppercase tracking-wider">
                  Full Name (Optional)
                </label>
                <input
                  id="signup-fullname"
                  type="text"
                  value={signupFullName}
                  onChange={(e) => setSignupFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full rounded-lg bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="signup-username" className="block text-[11px] text-[#8B93A1] uppercase tracking-wider">
                    Username
                  </label>
                  {signupUsername.length >= 3 && (
                    <span className="text-[10px] text-[#4ADE80] flex items-center gap-0.5">
                      <CheckIcon className="size-3" /> Valid
                    </span>
                  )}
                </div>
                <input
                  id="signup-username"
                  type="text"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  placeholder="e.g. dev_pulse"
                  className="w-full rounded-lg bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68] transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="signup-email" className="block text-[11px] text-[#8B93A1] uppercase tracking-wider">
                    Email Address
                  </label>
                  {signupEmail.includes('@') && signupEmail.includes('.') && (
                    <span className="text-[10px] text-[#4ADE80] flex items-center gap-0.5">
                      <CheckIcon className="size-3" /> Valid
                    </span>
                  )}
                </div>
                <input
                  id="signup-email"
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="dev@example.com"
                  className="w-full rounded-lg bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68] transition-colors"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="signup-password" className="block text-[11px] text-[#8B93A1] uppercase tracking-wider">
                    Password
                  </label>
                  <div className="flex items-center gap-2">
                    {passwordStrength.label && (
                      <span className={`text-[10px] font-bold ${passwordStrength.color}`}>
                        Strength: {passwordStrength.label}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-[#4FD8C4] hover:underline cursor-pointer inline-flex items-center gap-1"
                    >
                      {showPassword ? <EyeSlashIcon className="size-3" /> : <EyeIcon className="size-3" />}
                    </button>
                  </div>
                </div>
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full rounded-lg bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68] transition-colors"
                  required
                />

                {signupPassword && (
                  <div className="space-y-1.5 pt-1">
                    <PasswordCriteriaList checks={passwordStrength.checks} />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="signup-confirm-password" className="block text-[11px] text-[#8B93A1] uppercase tracking-wider">
                    Confirm Password
                  </label>
                  {passwordsMatch && (
                    <span className="text-[10px] text-[#4ADE80] flex items-center gap-0.5">
                      <CheckIcon className="size-3" /> Match
                    </span>
                  )}
                  {passwordsMismatch && (
                    <span className="text-[10px] text-[#F87171] flex items-center gap-0.5">
                      <XIcon className="size-3" /> Mismatch
                    </span>
                  )}
                </div>
                <input
                  id="signup-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-lg bg-[#191D24] border border-[#262B33] p-2.5 text-[#E7EAEE] focus:border-[#4FD8C4] focus:outline-none placeholder-[#565D68] transition-colors"
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
