import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import {
  DirectionsCar,
  LockOutlined,
  MailOutlined,
  PersonOutlined,
  PhoneIphone,
  StorefrontOutlined,
  Visibility,
  VisibilityOff,
  Brightness4,
  Brightness7,
  FlashOn,
  Security,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';

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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2.5,
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'radial-gradient(circle at 50% 0%, #1e1b4b 0%, #0b0f19 75%)'
            : 'radial-gradient(circle at 50% 0%, #e0e7ff 0%, #f8fafc 75%)',
      }}
    >
      {/* Theme Toggle Top Right */}
      <Box sx={{ position: 'absolute', top: 20, right: 20 }}>
        <IconButton
          onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark', true)}
          sx={{
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
          }}
        >
          {theme === 'dark' ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
        </IconButton>
      </Box>

      <Card
        sx={{
          maxWidth: 460,
          width: '100%',
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 4,
          boxShadow: (t) =>
            t.palette.mode === 'dark'
              ? '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
              : '0 25px 50px -12px rgba(79, 70, 229, 0.15)',
        }}
      >
        <CardContent sx={{ p: 0 }}>
          {/* Logo & Header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 3,
                bgcolor: 'primary.main',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                mb: 1.5,
                boxShadow: '0 8px 16px rgba(79, 70, 229, 0.35)',
              }}
            >
              <DirectionsCar fontSize="medium" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              PucFlow
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              PUC & Insurance Renewal Automation SaaS
            </Typography>
          </Box>

          {/* Quick Demo Login Button */}
          <Button
            fullWidth
            variant="outlined"
            onClick={handleDemoLogin}
            disabled={loading}
            startIcon={<FlashOn sx={{ color: 'warning.main' }} />}
            sx={{
              mb: 3,
              py: 1.2,
              borderRadius: 2.5,
              borderColor: 'primary.main',
              bgcolor: (t) =>
                t.palette.mode === 'dark' ? 'rgba(79, 70, 229, 0.12)' : 'rgba(79, 70, 229, 0.05)',
              '&:hover': {
                bgcolor: (t) =>
                  t.palette.mode === 'dark' ? 'rgba(79, 70, 229, 0.2)' : 'rgba(79, 70, 229, 0.1)',
              },
            }}
          >
            One-Click Login with Demo Account
          </Button>

          <Divider sx={{ mb: 2.5 }}>
            <Typography variant="caption" color="text.secondary">
              OR LOGIN WITH CREDENTIALS
            </Typography>
          </Divider>

          {/* Tabs: Sign In / Register */}
          <Tabs
            value={mode === 'register' ? 1 : 0}
            onChange={(_, val) => setMode(val === 1 ? 'register' : 'login')}
            variant="fullWidth"
            sx={{
              mb: 3,
              minHeight: 40,
              bgcolor: (t) =>
                t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              borderRadius: 2,
              p: 0.5,
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTab-root': {
                borderRadius: 1.5,
                minHeight: 34,
                py: 0.5,
                fontWeight: 600,
                fontSize: '0.8125rem',
                '&.Mui-selected': {
                  bgcolor: 'background.paper',
                  color: 'primary.main',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                },
              },
            }}
          >
            <Tab label="Sign In" />
            <Tab label="New PUC Centre" />
          </Tabs>

          {/* Mode: LOGIN */}
          {mode === 'login' && (
            <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@pucflow.in"
                required
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <MailOutlined fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                fullWidth
                size="small"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setMode('forgot')}
                  sx={{ fontSize: '0.75rem', p: 0 }}
                >
                  Forgot password?
                </Button>
              </Box>

              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{ py: 1.2, mt: 1, borderRadius: 2.5 }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In to Dashboard'}
              </Button>
            </Box>
          )}

          {/* Mode: REGISTER */}
          {mode === 'register' && (
            <Box component="form" onSubmit={handleRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                size="small"
                label="Centre Business Name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Shree Ganesh Auto PUC"
                required
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <StorefrontOutlined fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                fullWidth
                size="small"
                label="Owner / Operator Name"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Ramesh Patel"
                required
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlined fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                fullWidth
                size="small"
                label="Mobile Number (10 Digits)"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder="7043333359"
                required
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIphone fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                fullWidth
                size="small"
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@centre.com"
                required
              />

              <TextField
                fullWidth
                size="small"
                label="Password (min 8 chars)"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={preloadSampleData}
                    onChange={(e) => setPreloadSampleData(e.target.checked)}
                    color="primary"
                    size="small"
                  />
                }
                label={<Typography variant="caption">Preload realistic sample customer data</Typography>}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{ py: 1.2, borderRadius: 2.5 }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Create Centre Account'}
              </Button>
            </Box>
          )}

          {/* Mode: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <Box component="form" onSubmit={handleForgot} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Enter your registered email address to receive a secure reset link.
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button fullWidth type="submit" variant="contained" disabled={loading} sx={{ py: 1.2 }}>
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Send Reset Link'}
              </Button>
              <Button fullWidth variant="text" size="small" onClick={() => setMode('login')}>
                Back to Sign In
              </Button>
            </Box>
          )}

          {/* Mode: RESET PASSWORD */}
          {mode === 'reset' && (
            <Box component="form" onSubmit={handleReset} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                Reset token generated! Enter your new password below.
              </Alert>
              <TextField
                fullWidth
                size="small"
                label="Reset Token"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
              />
              <TextField
                fullWidth
                size="small"
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Button fullWidth type="submit" variant="contained" disabled={loading} sx={{ py: 1.2 }}>
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Update Password'}
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
