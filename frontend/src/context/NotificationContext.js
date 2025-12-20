import React, { createContext, useContext, useState, useCallback } from 'react';
import {
    Snackbar,
    Alert,
    AlertTitle,
    Slide,
    IconButton,
    Box,
    Typography,
    LinearProgress
} from '@mui/material';
import {
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Info as InfoIcon,
    Close as CloseIcon
} from '@mui/icons-material';

const NotificationContext = createContext();

// Slide transition from right
function SlideTransition(props) {
    return <Slide {...props} direction="left" />;
}

// Custom styled notification component
const CustomNotification = ({ notification, onClose }) => {
    const { id, type, title, message, duration, showProgress } = notification;
    const [progress, setProgress] = useState(100);

    // Progress bar countdown
    React.useEffect(() => {
        if (!showProgress || !duration) return;

        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);
            if (remaining <= 0) clearInterval(interval);
        }, 50);

        return () => clearInterval(interval);
    }, [duration, showProgress]);

    const getIcon = () => {
        switch (type) {
            case 'success': return <SuccessIcon />;
            case 'error': return <ErrorIcon />;
            case 'warning': return <WarningIcon />;
            case 'info': return <InfoIcon />;
            default: return <InfoIcon />;
        }
    };

    const getGradient = () => {
        switch (type) {
            case 'success': return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            case 'error': return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            case 'warning': return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
            case 'info': return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
            default: return 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
        }
    };

    return (
        <Box
            sx={{
                minWidth: { xs: 280, sm: 320 },
                maxWidth: { xs: 'calc(100vw - 32px)', sm: 400 },
                width: { xs: 'calc(100vw - 32px)', sm: 'auto' },
                background: getGradient(),
                borderRadius: 2,
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                position: 'relative',
            }}
        >
            <Box sx={{ p: 2, display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                {/* Icon */}
                <Box
                    sx={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        borderRadius: '50%',
                        p: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {React.cloneElement(getIcon(), { sx: { color: 'white', fontSize: 24 } })}
                </Box>

                {/* Content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {title && (
                        <Typography
                            variant="subtitle1"
                            sx={{
                                color: 'white',
                                fontWeight: 600,
                                lineHeight: 1.3,
                                mb: 0.5
                            }}
                        >
                            {title}
                        </Typography>
                    )}
                    <Typography
                        variant="body2"
                        sx={{
                            color: 'rgba(255,255,255,0.9)',
                            lineHeight: 1.4
                        }}
                    >
                        {message}
                    </Typography>
                </Box>

                {/* Close button */}
                <IconButton
                    size="small"
                    onClick={() => onClose(id)}
                    sx={{
                        color: 'rgba(255,255,255,0.7)',
                        '&:hover': {
                            color: 'white',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                        },
                    }}
                >
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            {/* Progress bar */}
            {showProgress && (
                <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                        height: 3,
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        '& .MuiLinearProgress-bar': {
                            backgroundColor: 'rgba(255,255,255,0.8)',
                        },
                    }}
                />
            )}
        </Box>
    );
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = useCallback((notification) => {
        const id = Date.now() + Math.random();
        const newNotification = {
            id,
            type: 'info',
            duration: 5000,
            showProgress: true,
            ...notification,
        };

        setNotifications((prev) => [...prev, newNotification]);

        // Auto remove after duration
        if (newNotification.duration > 0) {
            setTimeout(() => {
                removeNotification(id);
            }, newNotification.duration);
        }

        return id;
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    // Convenience methods
    const success = useCallback((message, title = 'Success') => {
        return addNotification({ type: 'success', title, message });
    }, [addNotification]);

    const error = useCallback((message, title = 'Error') => {
        return addNotification({ type: 'error', title, message, duration: 8000 });
    }, [addNotification]);

    const warning = useCallback((message, title = 'Warning') => {
        return addNotification({ type: 'warning', title, message, duration: 6000 });
    }, [addNotification]);

    const info = useCallback((message, title = 'Info') => {
        return addNotification({ type: 'info', title, message });
    }, [addNotification]);

    const notify = { success, error, warning, info, addNotification, removeNotification };

    return (
        <NotificationContext.Provider value={notify}>
            {children}

            {/* Notification Stack */}
            <Box
                sx={{
                    position: 'fixed',
                    top: { xs: 70, sm: 80 },
                    right: { xs: 16, sm: 16 },
                    left: { xs: 16, sm: 'auto' },
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    pointerEvents: 'none',
                    '& > *': {
                        pointerEvents: 'auto',
                    },
                }}
            >
                {notifications.map((notification, index) => (
                    <Slide
                        key={notification.id}
                        direction="left"
                        in={true}
                        mountOnEnter
                        unmountOnExit
                        timeout={300}
                    >
                        <Box>
                            <CustomNotification
                                notification={notification}
                                onClose={removeNotification}
                            />
                        </Box>
                    </Slide>
                ))}
            </Box>
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export default NotificationContext;
