import React, { useState } from 'react';
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
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export function AuthScreen() {
  const { login, demoLogin, register, theme, applyTheme } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register inputs
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [preloadSampleData, setPreloadSampleData] = useState(true);

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
      toast.error(err instanceof Error ? err.message : 'Sign-in failed');
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register({
        businessName,
        ownerName,
        mobileNumber,
        email,
        password,
        address,
        preloadSampleData,
      });
      toast.success('PUC centre account created successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest<{ message: string; previewResetToken?: string }>(
        '/api/auth/forgot-password',
        { method: 'POST', body: { email } },
      );
      toast.success(res.message);
      if (res.previewResetToken) {
        setResetToken(res.previewResetToken);
        setMode('reset');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Password reset request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiRequest<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: { token: resetToken, newPassword },
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Decorative background glow circles */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top right floating theme switch */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
          className="rounded-full shadow-xs border-slate-200 dark:border-slate-800"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-700" />
          )}
        </Button>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center z-10">
        {/* Left column: Brand Hero & Value proposition */}
        <div className="lg:col-span-5 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-900/60 dark:text-indigo-400 text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            <span>Automated IVR Voice Engine v2.0</span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Car className="h-7 w-7" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                PUC Flow
              </h1>
            </div>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              Automated PUC & Insurance renewal platform built for Indian vehicle testing centres.
            </p>
          </div>

          {/* Key Feature Highlights */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xs">
              <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Automated WhatsApp Alerts
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Instant formatted renewal reminders in Gujarati & Hindi on registration and expiry.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xs">
              <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  WhatsApp Direct Dispatch
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Formatted WhatsApp renewal alerts with center directions and expiry details.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xs">
              <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  TRAI Telecom Compliant
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
              className="w-full border-indigo-200 dark:border-indigo-900/80 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/60 text-indigo-700 dark:text-indigo-300 font-bold gap-2 cursor-pointer shadow-xs"
            >
              <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>One-Click Demo Center Login</span>
              <ArrowRight className="w-4 h-4 ml-auto" />
            </Button>
          </div>
        </div>

        {/* Right column: Auth Card with Tabs */}
        <div className="lg:col-span-7">
          <Card className="border-slate-200/80 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900/95">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold">
                    {mode === 'login' && 'Sign In to Your Center'}
                    {mode === 'register' && 'Register New PUC Center'}
                    {mode === 'forgot' && 'Reset Password'}
                    {mode === 'reset' && 'Set New Password'}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {mode === 'login' && 'Enter your credentials to access vehicle records and voice automations.'}
                    {mode === 'register' && 'Set up your testing centre profile and start automated voice reminders.'}
                    {mode === 'forgot' && 'Enter your registered email to receive password recovery token.'}
                    {mode === 'reset' && 'Enter the reset token sent to your email with your new password.'}
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
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full font-bold shadow-md shadow-indigo-600/20 gap-2 cursor-pointer"
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
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
                      <Label htmlFor="reg-email">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="reg-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="owner@example.com"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password">Password (min 8 chars) *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-9 pr-10"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reg-address">Center Location / Address (Optional)</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="reg-address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. Ring Road, Surat, Gujarat"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Preload sample data switch */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <div>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                        Preload Demo Customers & Vehicles
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        Seeds sample vehicles with upcoming expirations to test automated calls immediately.
                      </span>
                    </div>
                    <Switch
                      checked={preloadSampleData}
                      onCheckedChange={setPreloadSampleData}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full font-bold shadow-md shadow-indigo-600/20 gap-2 cursor-pointer"
                    size="lg"
                  >
                    {loading ? 'Creating Account...' : 'Register & Launch PUC Center'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </form>
              )}

              {/* FORGOT PASSWORD FORM */}
              {mode === 'forgot' && (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="forgot-email">Registered Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
                      Verification token loaded. Set your new security password below.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-1.5">
                    <Label htmlFor="reset-token">Reset Token</Label>
                    <Input
                      id="reset-token"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Paste reset token"
                      className="font-mono text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                      minLength={8}
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
