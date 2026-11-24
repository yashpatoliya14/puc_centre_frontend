import { createTheme, type PaletteMode, alpha } from '@mui/material';

export const getAppTheme = (mode: PaletteMode) => {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#6366F1', // Electric Indigo
        light: '#818CF8',
        dark: '#4F46E5',
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#0EA5E9', // Sky Cyan
        light: '#38BDF8',
        dark: '#0284C7',
        contrastText: '#FFFFFF',
      },
      success: {
        main: '#10B981', // Emerald green
        light: '#34D399',
        dark: '#059669',
        contrastText: '#FFFFFF',
      },
      warning: {
        main: '#F59E0B', // Amber
        light: '#FBBF24',
        dark: '#D97706',
        contrastText: '#FFFFFF',
      },
      error: {
        main: '#EF4444', // Rose Red
        light: '#F87171',
        dark: '#DC2626',
        contrastText: '#FFFFFF',
      },
      info: {
        main: '#3B82F6',
        light: '#60A5FA',
        dark: '#2563EB',
      },
      background: {
        default: isDark ? '#0A0E17' : '#F8FAFC',
        paper: isDark ? '#111827' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#F8FAFC' : '#0F172A',
        secondary: isDark ? '#94A3B8' : '#64748B',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)',
    },
    typography: {
      fontFamily: `'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
      h1: { fontWeight: 800, letterSpacing: '-0.03em' },
      h2: { fontWeight: 800, letterSpacing: '-0.025em' },
      h3: { fontWeight: 800, letterSpacing: '-0.025em' },
      h4: { fontWeight: 800, letterSpacing: '-0.02em' },
      h5: { fontWeight: 700, letterSpacing: '-0.015em' },
      h6: { fontWeight: 700, letterSpacing: '-0.01em' },
      subtitle1: { fontWeight: 600, fontSize: '0.9375rem', letterSpacing: '-0.01em' },
      subtitle2: { fontWeight: 600, fontSize: '0.84375rem' },
      body1: { fontSize: '0.9375rem', lineHeight: 1.6 },
      body2: { fontSize: '0.84375rem', lineHeight: 1.55 },
      button: { textTransform: 'none', fontWeight: 700, letterSpacing: '0.01em' },
      caption: { fontSize: '0.75rem', lineHeight: 1.4 },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: `
          @keyframes pulseGlow {
            0% {
              box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6);
            }
            70% {
              box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
            }
          }
          @keyframes pulseAmber {
            0% {
              box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.6);
            }
            70% {
              box-shadow: 0 0 0 8px rgba(245, 158, 11, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
            }
          }
        `,
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            textTransform: 'none',
            fontWeight: 700,
            padding: '8px 18px',
            boxShadow: 'none',
            transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
              transform: 'translateY(-1.5px)',
            },
            '&:active': {
              transform: 'translateY(0)',
            },
          },
          contained: {
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
            '&.MuiButton-containedSuccess': {
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              '&:hover': {
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              },
            },
            '&.MuiButton-containedSecondary': {
              background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
              '&:hover': {
                boxShadow: '0 4px 14px rgba(14, 165, 233, 0.35)',
              },
            },
          },
          outlined: {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(0, 0, 0, 0.14)',
            '&:hover': {
              borderColor: '#6366F1',
              backgroundColor: isDark ? alpha('#6366F1', 0.08) : alpha('#6366F1', 0.04),
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            backgroundImage: 'none',
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: isDark
              ? '0 4px 20px -2px rgba(0, 0, 0, 0.45)'
              : '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
          rounded: {
            borderRadius: 16,
            border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)',
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.06)',
            padding: '14px 18px',
          },
          head: {
            fontWeight: 800,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: isDark ? '#94A3B8' : '#64748B',
            backgroundColor: isDark ? '#0D131F' : '#F8FAFC',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: 'background-color 0.15s ease',
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(99, 102, 241, 0.02)',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 700,
            fontSize: '0.75rem',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            '& fieldset': {
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.14)',
            },
            '&:hover fieldset': {
              borderColor: '#6366F1',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#6366F1',
              borderWidth: 2,
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            width: 46,
            height: 26,
            padding: 0,
            display: 'flex',
          },
          switchBase: {
            padding: 2,
            '&.Mui-checked': {
              transform: 'translateX(20px)',
              color: '#fff',
              '& + .MuiSwitch-track': {
                opacity: 1,
                backgroundColor: '#10B981',
              },
            },
          },
          thumb: {
            width: 22,
            height: 22,
            boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.25)',
          },
          track: {
            borderRadius: 13,
            opacity: 1,
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
            boxSizing: 'border-box',
          },
        },
      },
    },
  });
};
