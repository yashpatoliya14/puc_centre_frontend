import React, { useEffect, useState } from 'react';
import {
  Car,
  Sparkles,
  PhoneCall,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ArrowRight,
  MapPin,
  Flame,
  Radio,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';

type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

export function AuthScreen() {
  const { login, demoLogin, register, verifyEmail, theme, applyTheme } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');

  // Register inputs & pre-verification OTP state
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [regOtpSent, setRegOtpSent] = useState(false);
  const [regOtpCode, setRegOtpCode] = useState('');
  const [regEmailVerified, setRegEmailVerified] = useState(false);
  const [sendingRegOtp, setSendingRegOtp] = useState(false);
  const [verifyingRegOtp, setVerifyingRegOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Forgot password inputs
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Signed in successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      if (msg.toLowerCase().includes('verify your email')) {
        toast.info(msg);
        setVerifyCode('');
        setMode('verify');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      await demoLogin();
      toast.success('Loaded Shree Ganesh PUC Testing Centre');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load demo account');
    } finally {
      setLoading(false);
    }
  };

  const isStrongId = (val: string) => {
    const trimmed = val.trim().toLowerCase();
    const atIdx = trimmed.indexOf('@');
    if (atIdx < 4) return false;
    return /^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(trimmed);
  };

  const isStrongPass = (val: string) =>
    val.length >= 10 &&
    /[A-Z]/.test(val) &&
    /[a-z]/.test(val) &&
    /[0-9]/.test(val) &&
    /[^A-Za-z0-9]/.test(val);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStrongId(email)) {
      toast.error('Owner ID (Email) must be a valid email with at least 4 characters before @');
      return;
    }
    if (!isStrongPass(password)) {
      toast.error(
        'Strong password required: min 10 chars with uppercase, lowercase, number, and special character',
      );
      return;
    }
    if (!regEmailVerified) {
      if (!regOtpSent || !regOtpCode.trim()) {
        toast.error('Email is not verified. Click "Verify" next to your email and confirm the 6-digit OTP before registering.');
        return;
      }
      setLoading(true);
      try {
        const otpRes = await apiRequest<{ ok: boolean; verified: boolean }>('/api/auth/verify-registration-otp', {
          method: 'POST',
          body: { email: email.trim().toLowerCase(), code: regOtpCode.trim() },
        });
        if (!otpRes.verified) {
          toast.error('Email is not verified. Invalid verification code.');
          setLoading(false);
          return;
        }
        setRegEmailVerified(true);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Email is not verified. Invalid or expired OTP code.');
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    try {
      const res = await register({
        businessName,
        ownerName,
        mobileNumber,
        email,
        password,
        address,
      });
      if (res.requiresVerification) {
        toast.success(res.message || 'Verification code sent to your email!');
        setVerifyCode('');
        setMode('verify');
      } else {
        toast.success('PUC centre account created successfully!');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) {
      toast.error('Please enter the verification code from your email');
      return;
    }
    setLoading(true);
    try {
      await verifyEmail(email, verifyCode.trim());
      toast.success('Email verified! Launching your PUC dashboard...');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRegistrationOtp = async () => {
    if (!isStrongId(email)) {
      toast.error('Owner ID (Email) must be a valid email with at least 4 characters before @');
      return;
    }
    setSendingRegOtp(true);
    try {
      const res = await apiRequest<{
        ok: boolean;
        emailSent?: boolean;
        message: string;
        previewOtpCode?: string;
      }>('/api/auth/send-registration-otp', {
        method: 'POST',
        body: {
          email: email.trim().toLowerCase(),
          ownerName: ownerName.trim() || undefined,
          businessName: businessName.trim() || undefined,
        },
      });
      setRegOtpSent(true);
      setResendCooldown(30);
      if (res.previewOtpCode) {
        setRegOtpCode(res.previewOtpCode);
      }
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send verification OTP');
    } finally {
      setSendingRegOtp(false);
    }
  };

  const handleConfirmRegistrationOtp = async () => {
    if (!regOtpCode.trim()) {
      toast.error('Enter the 6-digit verification code sent to your email');
      return;
    }
    setVerifyingRegOtp(true);
    try {
      const res = await apiRequest<{ ok: boolean; verified: boolean; message: string }>(
        '/api/auth/verify-registration-otp',
        {
          method: 'POST',
          body: {
            email: email.trim().toLowerCase(),
            code: regOtpCode.trim(),
          },
        },
      );
      if (res.verified) {
        setRegEmailVerified(true);
        toast.success(res.message || 'Email verified!');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid or expired OTP code');
    } finally {
      setVerifyingRegOtp(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      toast.error('Enter your registered email address first');
      return;
    }
    setResendingCode(true);
    try {
      const res = await apiRequest<{ message: string; alreadyVerified?: boolean }>('/api/auth/resend-verification', {
        method: 'POST',
        body: { email },
      });
      setResendCooldown(30);
      toast.success(res.message);
      if (res.alreadyVerified) {
        setMode('login');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not resend verification code');
    } finally {
      setResendingCode(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest<{ message: string; emailSent?: boolean; previewResetToken?: string }>(
        '/api/auth/forgot-password',
        { method: 'POST', body: { email } },
      );
      toast.success(res.message);
      setResetToken(res.previewResetToken || '');
      setMode('reset');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Password reset request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStrongPass(newPassword)) {
      toast.error(
        'Strong password required: min 10 chars with uppercase, lowercase, number, and special character',
      );
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: { email: email.trim().toLowerCase() || undefined, token: resetToken.trim(), newPassword },
      });
      toast.success(res.message);
      setMode('login');
      setPassword(newPassword);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Decorative background glow circles */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top right floating theme switch */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-full shadow-xs border-zinc-200 dark:border-zinc-800"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-blue-400" />
          ) : (
            <Moon className="h-4 w-4 text-zinc-700" />
          )}
        </Button>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        {/* Left column: Brand Hero & Value proposition */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-950/60 dark:border-blue-900/60 dark:text-blue-400 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
            <span>Automated IVR Voice Engine v2.0</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Car className="h-7 w-7" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
                PUC Flow
              </h1>
            </div>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
              Automated PUC & Insurance renewal platform built for Indian vehicle testing centres.
            </p>
          </div>

          {/* Key Feature Highlights */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/70 dark:bg-[#0e0e11] border border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-xs">
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  Automated WhatsApp Alerts
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Instant formatted renewal reminders in Gujarati & Hindi on registration and expiry.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/70 dark:bg-[#0e0e11] border border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-xs">
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  WhatsApp Direct Dispatch
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Formatted WhatsApp renewal alerts with center directions and expiry details.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/70 dark:bg-[#0e0e11] border border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-xs">
              <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  TRAI Telecom Compliant
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Strict 09:30 - 19:30 calling windows with automated retry throttles and audit trails.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Demo Button */}
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleDemoLogin}
              disabled={loading}
              className="w-full border-blue-200 dark:border-blue-900/80 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/60 text-blue-700 dark:text-blue-300 font-bold gap-2 cursor-pointer shadow-xs"
            >
              <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>One-Click Demo Center Login</span>
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          </div>
        </div>

        {/* Right column: Auth Card with Tabs */}
        <div className="lg:col-span-7">
          <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-xl bg-white dark:bg-[#0e0e11]">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">
                    {mode === 'login' && 'Sign In to Your Center'}
                    {mode === 'register' && 'Register New PUC Center'}
                    {mode === 'verify' && 'Verify Your Email'}
                    {mode === 'forgot' && 'Reset Password'}
                    {mode === 'reset' && 'Set New Password'}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {mode === 'login' && 'Enter your credentials to access vehicle records and automations.'}
                    {mode === 'register' && 'Set up your testing centre profile and verify your owner email.'}
                    {mode === 'verify' && `Enter the 6-digit verification code sent to ${email || 'your email'}.`}
                    {mode === 'forgot' && 'Enter your registered email to receive a 6-digit reset code.'}
                    {mode === 'reset' && 'Enter the 6-digit reset code sent to your email with your new password.'}
                  </CardDescription>
                </div>
              </div>

              {/* Mode Switcher Tabs */}
              {(mode === 'login' || mode === 'register') && (
                <div className="pt-3">
                  <Tabs value={mode} onValueChange={(val) => setMode(val as AuthMode)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="login" className="font-semibold text-xs">
                        Sign In
                      </TabsTrigger>
                      <TabsTrigger value="register" className="font-semibold text-xs">
                        Register Center
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4 pt-0">
              {/* LOGIN FORM */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <Input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="owner@ganeshpuc.com"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-9 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full font-bold shadow-md shadow-blue-600/20 gap-2 cursor-pointer"
                    size="lg"
                  >
                    {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
              )}

              {/* REGISTER FORM */}
              {mode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-center">PUC Center Name *</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                          id="reg-center"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="e.g. Maruti PUC Center"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg-owner">Owner Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                          id="reg-owner"
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                          placeholder="e.g. Rajeshbhai Patel"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-mobile">10-Digit Mobile *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <Input
                          id="reg-mobile"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value)}
                          placeholder="9876543210"
                          className="pl-9 font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor="reg-email">Strong Owner ID (Email) *</Label>
                        {regEmailVerified && (
                          <Badge className="text-[10px] bg-blue-600 text-white gap-1 px-1.5 py-0">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <div className="relative flex-1">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                          <Input
                            id="reg-email"
                            type="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              setRegEmailVerified(false);
                              setRegOtpSent(false);
                              setRegOtpCode('');
                            }}
                            placeholder="centre.owner@example.com"
                            className="pl-9"
                            required
                          />
                        </div>
                        {!regEmailVerified && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSendRegistrationOtp}
                            disabled={sendingRegOtp || (regOtpSent && resendCooldown > 0)}
                            className="h-9 px-2.5 text-xs font-semibold shrink-0 cursor-pointer border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/50"
                          >
                            {sendingRegOtp
                              ? 'Sending...'
                              : regOtpSent
                                ? resendCooldown > 0
                                  ? `Resend (${resendCooldown}s)`
                                  : 'Resend'
                                : 'Verify'}
                          </Button>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500">Min 4 characters before @</p>
                    </div>
                  </div>

                  {regOtpSent && !regEmailVerified && (
                    <div className="rounded-lg border border-blue-200 dark:border-blue-900/70 bg-blue-50/70 dark:bg-blue-950/30 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                          Verify code sent to {email}
                        </span>
                        <button
                          type="button"
                          onClick={handleSendRegistrationOtp}
                          disabled={sendingRegOtp || resendCooldown > 0}
                          className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 cursor-pointer"
                        >
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={regOtpCode}
                          onChange={(e) => setRegOtpCode(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleConfirmRegistrationOtp();
                            }
                          }}
                          placeholder="Enter 6-digit OTP"
                          maxLength={10}
                          className="h-8 font-mono text-xs bg-white dark:bg-black"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleConfirmRegistrationOtp}
                          disabled={verifyingRegOtp || !regOtpCode.trim()}
                          className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white shrink-0 cursor-pointer"
                        >
                          {verifyingRegOtp ? 'Checking...' : 'Confirm OTP'}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password">Strong Password (min 10 chars) *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Upper, lower, number & symbol"
                        className="pl-9 pr-10"
                        required
                        minLength={10}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-address">Center Location / Address (Optional)</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <Input
                        id="reg-address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. Ring Road, Surat, Gujarat"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full font-bold shadow-md shadow-blue-600/20 gap-2 cursor-pointer"
                    size="lg"
                  >
                    {loading ? 'Creating Account...' : 'Register & Launch PUC Center'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
              )}

              {/* VERIFY EMAIL FORM (First-time PUC Owner) */}
              {mode === 'verify' && (
                <form onSubmit={handleVerifyEmail} className="space-y-4">
                  <Alert variant="info" className="py-2.5">
                    <AlertDescription>
                      We sent a 6-digit verification code via email to <strong>{email}</strong>. Enter it below to activate your PUC centre account.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-1.5">
                    <Label htmlFor="verify-code">6-Digit Verification Code</Label>
                    <Input
                      id="verify-code"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="font-mono text-center text-lg tracking-widest"
                      maxLength={32}
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResendVerification}
                      disabled={resendingCode || resendCooldown > 0}
                      className="w-2/5 cursor-pointer"
                    >
                      {resendingCode
                        ? 'Sending...'
                        : resendCooldown > 0
                          ? `Resend (${resendCooldown}s)`
                          : 'Resend Code'}
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-3/5 font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                    >
                      {loading ? 'Verifying...' : 'Verify & Launch Dashboard'}
                    </Button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-xs text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 underline block mx-auto cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </form>
              )}

              {/* FORGOT PASSWORD FORM */}
              {mode === 'forgot' && (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="forgot-email">Registered Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <Input
                        id="forgot-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="owner@example.com"
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMode('login')}
                      className="w-1/3"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-2/3 font-bold"
                    >
                      {loading ? 'Sending...' : 'Send Reset Code'}
                    </Button>
                  </div>
                </form>
              )}

              {/* RESET PASSWORD FORM */}
              {mode === 'reset' && (
                <form onSubmit={handleReset} className="space-y-4">
                  <Alert variant="info" className="py-2.5">
                    <AlertDescription>
                      Check <strong>{email || 'your inbox'}</strong> for the 6-digit password reset code and enter your new strong password below.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-1.5">
                    <Label htmlFor="reset-token">Reset Code</Label>
                    <Input
                      id="reset-token"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Enter 6-digit code from email"
                      className="font-mono text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">New Strong Password (min 10 chars)</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Upper, lower, number & symbol"
                      required
                      minLength={10}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMode('login')}
                      className="w-1/3"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-2/3 font-bold"
                    >
                      {loading ? 'Saving...' : 'Set New Password'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
