import React, { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import jwt_decode from 'jwt-decode';
import api from '../services/api';

const AuthContext = createContext();

// Inactivity timeout settings (in milliseconds)
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const WARNING_BEFORE_TIMEOUT = 1 * 60 * 1000; // Show warning 1 minute before logout
const TOKEN_CHECK_INTERVAL = 30 * 1000; // Check token every 30 seconds

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeoutCountdown, setTimeoutCountdown] = useState(60);

  // Refs for timers
  const inactivityTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const tokenCheckIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Logout function
  const logout = useCallback((reason = 'manual') => {
    // Clear all timers
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (tokenCheckIntervalRef.current) clearInterval(tokenCheckIntervalRef.current);

    localStorage.removeItem('token');
    localStorage.removeItem('lastActivity');
    setUser(null);
    setIsAuthenticated(false);
    setShowTimeoutWarning(false);

    if (reason === 'inactivity') {
      console.log('User logged out due to inactivity');
    } else if (reason === 'token_expired') {
      console.log('User logged out due to token expiration');
    }
  }, []);

  // Reset inactivity timer on user activity
  const resetInactivityTimer = useCallback(() => {
    if (!isAuthenticated) return;

    lastActivityRef.current = Date.now();
    localStorage.setItem('lastActivity', Date.now().toString());

    // Clear existing timers
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    // Hide warning if it was showing
    setShowTimeoutWarning(false);

    // Set warning timer (shows warning 1 minute before logout)
    warningTimerRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      setTimeoutCountdown(60);

      // Start countdown
      countdownIntervalRef.current = setInterval(() => {
        setTimeoutCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE_TIMEOUT);

    // Set logout timer
    inactivityTimerRef.current = setTimeout(() => {
      logout('inactivity');
    }, INACTIVITY_TIMEOUT);
  }, [isAuthenticated, logout]);

  // Check token expiration periodically
  const checkTokenExpiration = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      if (isAuthenticated) logout('token_expired');
      return;
    }

    try {
      const decoded = jwt_decode(token);
      if (decoded.exp * 1000 <= Date.now()) {
        logout('token_expired');
      }
    } catch (error) {
      console.error('Token validation error:', error);
      logout('token_expired');
    }
  }, [isAuthenticated, logout]);

  // Keep session alive - user clicked "Stay Logged In"
  const keepAlive = useCallback(() => {
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // Initial token check on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        const decoded = jwt_decode(storedToken);
        if (decoded.exp * 1000 > Date.now()) {
          setUser({
            username: decoded.sub,
            full_name: decoded.full_name,
            can_view_financials: decoded.can_view_financials || false
          });
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Token decode error:', error);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  // Set up activity listeners and timers when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    // Activity events to track
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    // Throttled activity handler (max once per second)
    let lastEventTime = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastEventTime > 1000) {
        lastEventTime = now;
        resetInactivityTimer();
      }
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start inactivity timer
    resetInactivityTimer();

    // Start periodic token check
    tokenCheckIntervalRef.current = setInterval(checkTokenExpiration, TOKEN_CHECK_INTERVAL);

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (tokenCheckIntervalRef.current) clearInterval(tokenCheckIntervalRef.current);
    };
  }, [isAuthenticated, resetInactivityTimer, checkTokenExpiration]);

  // Login function
  const login = async (username, password) => {
    console.log('AuthContext login called with', username);
    try {
      const response = await api.post('/auth/login', { username, password });
      const { access_token, user: userData } = response.data;
      const decoded = jwt_decode(access_token);

      localStorage.setItem('token', access_token);
      localStorage.setItem('lastActivity', Date.now().toString());

      setUser({
        username: userData.username,
        full_name: userData.full_name,
        can_view_financials: userData.can_view_financials
      });
      setIsAuthenticated(true);

      console.log('Login successful');
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      logout();
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      login,
      logout: () => logout('manual'),
      loading,
      showTimeoutWarning,
      timeoutCountdown,
      keepAlive
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

