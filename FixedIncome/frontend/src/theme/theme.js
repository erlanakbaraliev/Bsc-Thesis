import { createTheme } from '@mui/material/styles';

const darkTokens = {
  navy: { 900: '#0A0F1E', 800: '#0D1426', 700: '#111B35', 600: '#172040', 500: '#1E2D55' },
  gold: { main: '#C9A84C', light: '#E5C76B', dark: '#A07830', contrastText: '#0A0F1E' },
  surface: { card: '#131C35', input: '#19223D', border: '#243056' },
  text: { primary: '#E8EAF0', secondary: '#8B94B8', disabled: '#4A5272' },
  secondary: { main: '#5B8DEF', light: '#7AAAF5', dark: '#3A6ACF', contrastText: '#FFFFFF' },
};

const lightTokens = {
  navy: { 900: '#EAF0FF', 800: '#F4F7FF', 700: '#FFFFFF', 600: '#DDE6FF', 500: '#C7D6FF' },
  gold: { main: '#A07830', light: '#C9A84C', dark: '#7A5924', contrastText: '#FFFFFF' },
  surface: { card: '#FFFFFF', input: '#F7F9FF', border: '#D9E0F2' },
  text: { primary: '#1C2540', secondary: '#4A5A86', disabled: '#8A95B2' },
  secondary: { main: '#4169E1', light: '#6A8AF0', dark: '#2C4FAF', contrastText: '#FFFFFF' },
};

export const createAppTheme = (mode = 'light') => {
  const isDark = mode === 'dark';
  const tokens = isDark ? darkTokens : lightTokens;
  const { navy, gold, surface, text, secondary } = tokens;

  return createTheme({
    palette: {
      mode,
      background: {
        default: navy[900],
        paper: navy[800],
      },
      primary: {
        main: gold.main,
        light: gold.light,
        dark: gold.dark,
        contrastText: gold.contrastText,
      },
      secondary,
      error: {
        main: '#EF5350',
      },
      success: {
        main: '#4CAF50',
      },
      divider: surface.border,
      text,
    },

  // ── Typography ───────────────────────────────────────────────────────────────
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.5px' },
      h5: { fontWeight: 700, letterSpacing: '-0.3px' },
      h6: { fontWeight: 600, letterSpacing: '-0.2px' },
      subtitle1: { fontWeight: 500 },
      button: { fontWeight: 600, textTransform: 'none', letterSpacing: '0.02em' },
      caption: { color: text.secondary },
    },

  // ── Shape ────────────────────────────────────────────────────────────────────
    shape: {
      borderRadius: 10,
    },

  // ── Component overrides ──────────────────────────────────────────────────────
    components: {
    // AppBar — deep navy with a subtle bottom border
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: navy[800],
            backgroundImage: 'none',
            borderBottom: `1px solid ${surface.border}`,
            boxShadow: isDark ? '0 1px 16px 0 rgba(0,0,0,0.45)' : '0 1px 16px 0 rgba(34,54,110,0.12)',
          },
        },
      },

    // Drawer — slightly darker than AppBar for depth
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: navy[900],
          borderRight: `1px solid ${surface.border}`,
          backgroundImage: 'none',
        },
      },
    },

    // Paper / Card — one shade lighter than the background
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: surface.card,
            border: `1px solid ${surface.border}`,
          },
          elevation3: {
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 24px rgba(34,54,110,0.12)',
          },
        },
      },

    // Buttons
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '6px 16px',
          transition: 'all 0.2s ease',
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${gold.main} 0%, ${gold.dark} 100%)`,
          color: gold.contrastText,
          boxShadow: `0 2px 12px rgba(201,168,76,0.35)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${gold.light} 0%, ${gold.main} 100%)`,
            boxShadow: `0 4px 20px rgba(201,168,76,0.5)`,
            transform: 'translateY(-1px)',
          },
        },
        outlinedPrimary: {
          borderColor: gold.main,
          color: gold.main,
          '&:hover': {
            borderColor: gold.light,
            color: gold.light,
            backgroundColor: 'rgba(201,168,76,0.08)',
          },
        },
        containedError: {
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 16px rgba(239,83,80,0.4)',
          },
        },
      },
    },

    // IconButton
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: text.secondary,
            transition: 'color 0.2s, background 0.2s',
            '&:hover': {
              color: gold.main,
              backgroundColor: isDark ? 'rgba(201,168,76,0.10)' : 'rgba(160,120,48,0.10)',
            },
          },
        },
      },

    // TextField / Input
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: surface.input,
          borderRadius: 8,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: surface.border,
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: gold.dark,
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: gold.main,
            borderWidth: '1.5px',
          },
        },
      },
    },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            color: text.secondary,
            '&.Mui-focused': {
              color: gold.main,
            },
          },
        },
      },

    // Select
      MuiSelect: {
        styleOverrides: {
          icon: {
            color: text.secondary,
          },
        },
      },

    // Menu & MenuItem (dropdowns)
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: navy[700],
            border: `1px solid ${surface.border}`,
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 24px rgba(34,54,110,0.16)',
            backgroundImage: 'none',
          },
        },
      },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          margin: '2px 6px',
          transition: 'background 0.15s',
          '&:hover': {
            backgroundColor: 'rgba(201,168,76,0.10)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(201,168,76,0.15)',
            '&:hover': {
              backgroundColor: 'rgba(201,168,76,0.20)',
            },
          },
        },
      },
    },

    // Sidebar navigation list items
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          transition: 'all 0.2s',
          '&:hover': {
            backgroundColor: 'rgba(201,168,76,0.08)',
            color: gold.light,
            '& .MuiListItemIcon-root': {
              color: gold.light,
            },
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(201,168,76,0.15)',
            color: gold.main,
            '& .MuiListItemIcon-root': {
              color: gold.main,
            },
            '&:hover': {
              backgroundColor: 'rgba(201,168,76,0.22)',
            },
          },
        },
      },
    },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            color: text.secondary,
            minWidth: 36,
            transition: 'color 0.2s',
          },
        },
      },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: '0.875rem',
          fontWeight: 500,
        },
      },
    },

    // Avatar
    MuiAvatar: {
      styleOverrides: {
        root: {
          background: `linear-gradient(135deg, ${gold.main}, ${gold.dark})`,
          color: gold.contrastText,
          fontWeight: 700,
          fontSize: '0.85rem',
        },
      },
    },

    // Tooltip
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: navy[600],
            border: `1px solid ${surface.border}`,
            fontSize: '0.75rem',
            fontWeight: 500,
          },
          arrow: {
            color: navy[600],
          },
        },
      },

    // Alert
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },

    // Chip
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 600,
          fontSize: '0.7rem',
        },
      },
    },

    // Dialog
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: navy[800],
            backgroundImage: 'none',
            border: `1px solid ${surface.border}`,
            boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.7)' : '0 24px 48px rgba(34,54,110,0.2)',
          },
        },
      },

    // Popover
      MuiPopover: {
        styleOverrides: {
          paper: {
            backgroundColor: navy[700],
            border: `1px solid ${surface.border}`,
            boxShadow: isDark ? '0 12px 40px rgba(0,0,0,0.6)' : '0 12px 28px rgba(34,54,110,0.16)',
            backgroundImage: 'none',
          },
        },
      },

    // Table cells inside MRT
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-root': {
              backgroundColor: navy[900],
              color: text.secondary,
              fontWeight: 600,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              borderBottom: `1px solid ${surface.border}`,
            },
          },
        },
      },
    MuiTableBody: {
      styleOverrides: {
        root: {
          '& .MuiTableRow-root': {
            transition: 'background 0.15s',
            '&:hover': {
              backgroundColor: 'rgba(201,168,76,0.05) !important',
            },
          },
          '& .MuiTableCell-root': {
            borderBottom: `1px solid ${surface.border}`,
            fontSize: '0.8rem',
          },
        },
      },
    },

    // Checkbox
    MuiCheckbox: {
      styleOverrides: {
        root: {
          color: '#4A5272',
          '&.Mui-checked': {
            color: gold.main,
          },
        },
      },
    },

    // Tabs (if used)
    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          textTransform: 'none',
          '&.Mui-selected': {
            color: gold.main,
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: gold.main,
        },
      },
    },

    // Toolbar
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: '56px !important',
        },
      },
    },
    },
  });
};
