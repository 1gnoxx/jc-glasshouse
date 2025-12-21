import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const ThemeContext = createContext();

// Light theme palette
const lightPalette = {
    mode: 'light',
    primary: {
        main: '#6366f1',
        light: '#818cf8',
        dark: '#4f46e5',
        contrastText: '#ffffff',
    },
    secondary: {
        main: '#ec4899',
        light: '#f472b6',
        dark: '#db2777',
        contrastText: '#ffffff',
    },
    background: {
        default: '#f8fafc',
        paper: 'rgba(255, 255, 255, 0.8)',
    },
    text: {
        primary: '#1e293b',
        secondary: '#64748b',
    },
    divider: 'rgba(148, 163, 184, 0.2)',
};

// Dark theme palette
const darkPalette = {
    mode: 'dark',
    primary: {
        main: '#818cf8',
        light: '#a5b4fc',
        dark: '#6366f1',
        contrastText: '#ffffff',
    },
    secondary: {
        main: '#f472b6',
        light: '#f9a8d4',
        dark: '#ec4899',
        contrastText: '#ffffff',
    },
    background: {
        default: '#0f172a',
        paper: 'rgba(30, 41, 59, 0.8)',
    },
    text: {
        primary: '#f1f5f9',
        secondary: '#94a3b8',
    },
    divider: 'rgba(148, 163, 184, 0.2)',
};

const getTheme = (mode) => createTheme({
    palette: mode === 'dark' ? darkPalette : lightPalette,
    typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        h1: { fontWeight: 700 },
        h2: { fontWeight: 700 },
        h3: { fontWeight: 600 },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        button: { fontWeight: 600, textTransform: 'none' },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backdropFilter: 'blur(12px)',
                    border: mode === 'dark'
                        ? '1px solid rgba(255, 255, 255, 0.1)'
                        : '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: mode === 'dark'
                        ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                        : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '10px',
                    padding: '8px 16px',
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4)',
                    },
                },
                containedPrimary: {
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                },
                containedSecondary: {
                    background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    background: mode === 'dark'
                        ? 'linear-gradient(135deg, #3730a3 0%, #581c87 100%)'
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: mode === 'dark'
                        ? '0 4px 20px rgba(55, 48, 163, 0.4)'
                        : '0 4px 20px rgba(102, 126, 234, 0.3)',
                    borderBottom: 'none',
                    color: '#ffffff',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    background: mode === 'dark'
                        ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)'
                        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                    backdropFilter: 'blur(12px)',
                    borderRight: mode === 'dark'
                        ? '1px solid rgba(99, 102, 241, 0.2)'
                        : '1px solid rgba(102, 126, 234, 0.1)',
                },
            },
        },
        MuiDataGrid: {
            styleOverrides: {
                root: {
                    border: 'none',
                    backgroundColor: mode === 'dark'
                        ? 'rgba(30, 41, 59, 0.6)'
                        : 'rgba(255, 255, 255, 0.6)',
                },
                columnHeaders: {
                    backgroundColor: mode === 'dark'
                        ? 'rgba(51, 65, 85, 0.5)'
                        : 'rgba(241, 245, 249, 0.5)',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
                },
                cell: {
                    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: {
                    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
                },
                head: {
                    fontWeight: 600,
                    backgroundColor: mode === 'dark'
                        ? 'rgba(51, 65, 85, 0.5)'
                        : 'rgba(241, 245, 249, 0.5)',
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    backgroundColor: mode === 'dark' ? '#1e293b' : '#ffffff',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: mode === 'dark'
                        ? 'rgba(30, 41, 59, 0.8)'
                        : 'rgba(255, 255, 255, 0.8)',
                },
            },
        },
    },
});

export const ThemeContextProvider = ({ children }) => {
    const [mode, setMode] = useState(() => {
        const saved = localStorage.getItem('themeMode');
        return saved || 'light';
    });

    useEffect(() => {
        localStorage.setItem('themeMode', mode);
    }, [mode]);

    const toggleTheme = () => {
        setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    const theme = useMemo(() => getTheme(mode), [mode]);

    const value = {
        mode,
        toggleTheme,
        isDark: mode === 'dark',
    };

    return (
        <ThemeContext.Provider value={value}>
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};

export const useThemeMode = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useThemeMode must be used within a ThemeContextProvider');
    }
    return context;
};

export default ThemeContext;
