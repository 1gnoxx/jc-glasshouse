import { createTheme } from '@mui/material/styles';

// A professional color palette
// A modern, premium color palette
const palette = {
    primary: {
        main: '#6366f1', // Indigo
        light: '#818cf8',
        dark: '#4f46e5',
        contrastText: '#ffffff',
    },
    secondary: {
        main: '#ec4899', // Pink
        light: '#f472b6',
        dark: '#db2777',
        contrastText: '#ffffff',
    },
    background: {
        default: '#f8fafc', // Slate 50 - Light background
        paper: 'rgba(255, 255, 255, 0.8)', // Glass effect
    },
    text: {
        primary: '#1e293b', // Slate 800
        secondary: '#64748b', // Slate 500
    },
    divider: 'rgba(148, 163, 184, 0.2)',
};

export const theme = createTheme({
    palette,
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
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
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
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
                    borderBottom: 'none',
                    color: '#ffffff',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                    backdropFilter: 'blur(12px)',
                    borderRight: '1px solid rgba(102, 126, 234, 0.1)',
                },
            },
        },
        MuiDataGrid: {
            styleOverrides: {
                root: {
                    border: 'none',
                    backgroundColor: 'rgba(255, 255, 255, 0.6)',
                },
                columnHeaders: {
                    backgroundColor: 'rgba(241, 245, 249, 0.5)',
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
                    backgroundColor: 'rgba(241, 245, 249, 0.5)',
                },
            },
        },
    },
});
