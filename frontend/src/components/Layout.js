import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    List,
    Typography,
    Divider,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Button,
    IconButton,
    useMediaQuery,
    useTheme,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    DialogContentText,
    LinearProgress
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Inventory as InventoryIcon,
    People as PeopleIcon,
    LocalShipping as ShippingIcon,
    ShoppingCart as SalesIcon,
    Receipt as ExpensesIcon,
    Assessment as ReportsIcon,
    DirectionsCar as CatalogIcon,
    Timeline as TimelineIcon,
    Menu as MenuIcon,
    Logout as LogoutIcon,
    Timer as TimerIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 240;

const Layout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, showTimeoutWarning, timeoutCountdown, keepAlive } = useAuth();
    const canViewFinancials = user?.can_view_financials || false;
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [mobileOpen, setMobileOpen] = React.useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
        { text: 'Inventory', icon: <InventoryIcon />, path: '/inventory' },
        { text: 'Customers', icon: <PeopleIcon />, path: '/customers' },
        { text: 'Stock Intake', icon: <ShippingIcon />, path: '/stock-intake' },
        { text: 'Sales', icon: <SalesIcon />, path: '/sales' },
        ...(canViewFinancials ? [{ text: 'Expenses', icon: <ExpensesIcon />, path: '/expenses' }] : []),
        ...(canViewFinancials ? [{ text: 'Reports', icon: <ReportsIcon />, path: '/reports' }] : []),
    ];

    const drawer = (
        <Box>
            <Toolbar />
            <Divider />
            <List>
                {menuItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            component={Link}
                            to={item.path}
                            selected={location.pathname === item.path}
                            onClick={() => isMobile && setMobileOpen(false)}
                        >
                            <ListItemIcon
                                sx={{
                                    color: location.pathname === item.path ? 'primary.main' : 'inherit'
                                }}
                            >
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    {isMobile && (
                        <IconButton
                            color="inherit"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2 }}
                        >
                            <MenuIcon />
                        </IconButton>
                    )}
                    <Typography variant="h6" noWrap component="div" sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                        JC Glasshouse
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Typography variant="body2" sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
                        {user?.full_name || user?.username}
                    </Typography>
                    <Button
                        color="inherit"
                        onClick={handleLogout}
                        startIcon={<LogoutIcon />}
                        sx={{
                            minWidth: { xs: 'auto', sm: 'auto' },
                            px: { xs: 1, sm: 2 }
                        }}
                    >
                        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Logout</Box>
                    </Button>
                </Toolbar>
            </AppBar>

            {/* Mobile Drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{ keepMounted: true }}
                sx={{
                    display: { xs: 'block', md: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                }}
            >
                {drawer}
            </Drawer>

            {/* Desktop Drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', md: 'block' },
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                    },
                }}
            >
                {drawer}
            </Drawer>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: { xs: 1.5, sm: 2, md: 3 },
                    width: { md: `calc(100% - ${drawerWidth}px)` },
                    mt: { xs: 7, sm: 8 },
                    minHeight: 'calc(100vh - 64px)',
                    overflow: 'auto'
                }}
            >
                {children}
            </Box>

            {/* Session Timeout Warning Dialog */}
            <Dialog
                open={showTimeoutWarning}
                onClose={keepAlive}
                aria-labelledby="timeout-dialog-title"
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        minWidth: 350
                    }
                }}
            >
                <DialogTitle id="timeout-dialog-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TimerIcon color="warning" />
                    Session Timeout Warning
                </DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        You will be logged out in <strong>{timeoutCountdown}</strong> seconds due to inactivity.
                    </DialogContentText>
                    <LinearProgress
                        variant="determinate"
                        value={(timeoutCountdown / 60) * 100}
                        color="warning"
                        sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Click "Stay Logged In" to continue your session.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleLogout} color="inherit">
                        Logout Now
                    </Button>
                    <Button onClick={keepAlive} variant="contained" color="primary" autoFocus>
                        Stay Logged In
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Layout;
