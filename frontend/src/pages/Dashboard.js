import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Button,
  Divider,
  LinearProgress,
  Avatar,
  alpha,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  Inventory,
  Warning,
  AttachMoney,
  Receipt,
  Assessment,
  Add,
  ShoppingCart,
  LocalShipping,
  ArrowForward,
  CheckCircle,
  Schedule,
  PointOfSale,
  Refresh,
  TrendingDown,
  Storefront,
  Category
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Gradient Metric Card Component
const MetricCard = ({ title, value, subtitle, icon: Icon, gradient, onClick }) => (
  <Card
    onClick={onClick}
    sx={{
      background: gradient,
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': onClick ? {
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 20px rgba(0,0,0,0.15)'
      } : {},
      '&::before': {
        content: '""',
        position: 'absolute',
        top: -30,
        right: -30,
        width: 100,
        height: 100,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        bottom: -40,
        right: 40,
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
      }
    }}
  >
    <CardContent sx={{ position: 'relative', zIndex: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 1, fontWeight: 500 }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold" sx={{ mb: 0.5 }}>
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            bgcolor: 'rgba(255,255,255,0.2)',
            borderRadius: 2,
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Icon sx={{ fontSize: 32 }} />
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// Quick Action Button Component
const QuickAction = ({ title, icon: Icon, color, onClick }) => (
  <Paper
    onClick={onClick}
    sx={{
      p: 2,
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: '1px solid',
      borderColor: alpha(color, 0.2),
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: `0 4px 12px ${alpha(color, 0.25)}`,
        borderColor: color,
        bgcolor: alpha(color, 0.05)
      }
    }}
  >
    <Box
      sx={{
        bgcolor: alpha(color, 0.1),
        borderRadius: '50%',
        width: 48,
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mx: 'auto',
        mb: 1.5
      }}
    >
      <Icon sx={{ color, fontSize: 24 }} />
    </Box>
    <Typography variant="body2" fontWeight="medium" color="text.primary">
      {title}
    </Typography>
  </Paper>
);

// Alert Card Component
const AlertCard = ({ title, count, color, icon: Icon, onClick, description }) => (
  <Paper
    onClick={onClick}
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      borderLeft: `4px solid ${color}`,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s',
      '&:hover': onClick ? {
        boxShadow: 2,
        bgcolor: alpha(color, 0.02)
      } : {}
    }}
  >
    <Box
      sx={{
        bgcolor: alpha(color, 0.1),
        borderRadius: 2,
        p: 1,
        display: 'flex'
      }}
    >
      <Icon sx={{ color, fontSize: 28 }} />
    </Box>
    <Box flex={1}>
      <Typography variant="body2" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h5" fontWeight="bold" color={color}>
        {count}
      </Typography>
      {description && (
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      )}
    </Box>
    {onClick && <ArrowForward sx={{ color: 'text.disabled' }} />}
  </Paper>
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [monthlySales, setMonthlySales] = useState([]);
  const [unpaidSales, setUnpaidSales] = useState([]);
  const [pendingSales, setPendingSales] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);

  const canViewFinancials = user?.can_view_financials || false;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Fetch all data in parallel
      const [productsRes, salesRes] = await Promise.all([
        api.get('/products'),
        api.get('/sales')
      ]);

      const products = productsRes.data.data || [];
      const allSales = salesRes.data.data || [];

      // Filter current month sales
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      const currentMonthSales = allSales.filter(s => {
        const saleDate = new Date(s.sale_date);
        return saleDate >= monthStart && saleDate <= monthEnd && s.status === 'completed';
      });
      setMonthlySales(currentMonthSales);

      // Get unpaid/partial sales (outstanding payments)
      const unpaid = allSales.filter(s =>
        s.status === 'completed' &&
        (s.payment_status === 'unpaid' || s.payment_status === 'partial')
      );
      setUnpaidSales(unpaid);

      // Get pending sales
      const pending = allSales.filter(s => s.status === 'pending');
      setPendingSales(pending);

      // Get low stock products
      const lowStock = products.filter(p => p.stock_quantity <= (p.low_stock_threshold || 5) && p.stock_quantity > 0);
      const outOfStock = products.filter(p => p.stock_quantity === 0);
      setLowStockProducts([...outOfStock, ...lowStock].slice(0, 5));

      // Calculate stats
      const totalProducts = products.length;
      const totalStock = products.reduce((sum, p) => sum + p.stock_quantity, 0);
      const monthlyRevenue = currentMonthSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

      const statsData = {
        totalProducts,
        totalStock,
        monthlySalesCount: currentMonthSales.length,
        monthlyRevenue,
        unpaidCount: unpaid.length,
        totalOutstanding: unpaid.reduce((sum, s) => sum + ((s.total_amount || 0) - (s.amount_paid || 0)), 0),
        pendingCount: pending.length,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length
      };

      setStats(statsData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'partial': return '#f59e0b';
      case 'unpaid': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress size={50} thickness={4} />
        <Typography variant="body1" color="text.secondary" mt={2}>
          Loading Dashboard...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={() => fetchDashboardData()}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={3} sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      {/* Header Section */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: 'primary.main' }}>
            {getTimeGreeting()}, {user?.full_name || user?.username}! 👋
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here's what's happening with your business today
          </Typography>
        </Box>
        <Tooltip title="Refresh Data">
          <IconButton
            onClick={handleRefresh}
            disabled={refreshing}
            sx={{ bgcolor: 'white', boxShadow: 1 }}
          >
            <Refresh sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Main Metric Cards */}
      <Grid container spacing={3} mb={4}>
        {canViewFinancials && (
          <Grid item xs={12} sm={6} md={4}>
            <MetricCard
              title="Monthly Sales"
              value={stats.monthlySalesCount || 0}
              subtitle={stats.monthlyRevenue ? `₹${stats.monthlyRevenue.toLocaleString()} revenue` : `${new Date().toLocaleDateString('en-US', { month: 'long' })}`}
              icon={PointOfSale}
              gradient="linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)"
              onClick={() => navigate('/sales', { state: { tab: 2 } })}
            />
          </Grid>
        )}
        <Grid item xs={12} sm={6} md={canViewFinancials ? 4 : 6}>
          <MetricCard
            title="Total Stock"
            value={stats.totalStock?.toLocaleString() || 0}
            subtitle={`${stats.totalProducts} product types`}
            icon={Inventory}
            gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
            onClick={() => navigate('/inventory')}
          />
        </Grid>
        {canViewFinancials && (
          <Grid item xs={12} sm={6} md={4}>
            <MetricCard
              title="Pending Sales"
              value={stats.pendingCount || 0}
              subtitle="Awaiting prices"
              icon={Schedule}
              gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              onClick={() => navigate('/sales', { state: { tab: 1 } })}
            />
          </Grid>
        )}
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          ⚡ Quick Actions
        </Typography>
        <Grid container spacing={2} mt={1}>
          <Grid item xs={6} sm={3}>
            <QuickAction
              title="New Sale"
              icon={Add}
              color="#6366f1"
              onClick={() => navigate('/sales')}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <QuickAction
              title="Stock Intake"
              icon={LocalShipping}
              color="#10b981"
              onClick={() => navigate('/stock-intake')}
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <QuickAction
              title="View Inventory"
              icon={Category}
              color="#f59e0b"
              onClick={() => navigate('/inventory')}
            />
          </Grid>
          {canViewFinancials && (
            <Grid item xs={6} sm={3}>
              <QuickAction
                title="View Reports"
                icon={Assessment}
                color="#8b5cf6"
                onClick={() => navigate('/reports')}
              />
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Financial sections - only for users with financial access */}
      {canViewFinancials && (
        <Grid container spacing={3}>
          {/* Unpaid Sales Section */}
          <Grid item xs={12}>
            {/* Unpaid Sales Table */}
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    💰 Outstanding Payments
                  </Typography>
                  {stats.totalOutstanding > 0 && (
                    <Typography variant="body2" color="error.main">
                      Total Outstanding: ₹{stats.totalOutstanding?.toLocaleString()}
                    </Typography>
                  )}
                </Box>
                <Button
                  size="small"
                  endIcon={<ArrowForward />}
                  onClick={() => navigate('/sales', { state: { tab: 2 } })}
                >
                  View All Sales
                </Button>
              </Box>

              {unpaidSales.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Invoice</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Date</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Paid</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'error.main' }}>Balance Due</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {unpaidSales.slice(0, 10).map((sale) => {
                        const balanceDue = (sale.total_amount || 0) - (sale.amount_paid || 0);
                        return (
                          <TableRow
                            key={sale.id}
                            hover
                            sx={{ cursor: 'pointer' }}
                            onClick={() => navigate('/sales', { state: { tab: 2 } })}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {sale.invoice_number}
                              </Typography>
                            </TableCell>
                            <TableCell>{sale.customer_name}</TableCell>
                            <TableCell align="center">
                              <Typography variant="caption">
                                {new Date(sale.sale_date).toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={sale.payment_status}
                                size="small"
                                sx={{
                                  bgcolor: alpha(getPaymentStatusColor(sale.payment_status), 0.1),
                                  color: getPaymentStatusColor(sale.payment_status),
                                  fontWeight: 500
                                }}
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2">
                                ₹{sale.total_amount?.toLocaleString() || 0}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" color="success.main">
                                ₹{sale.amount_paid?.toLocaleString() || 0}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" fontWeight="bold" color="error.main">
                                ₹{balanceDue.toLocaleString()}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box py={4} textAlign="center">
                  <CheckCircle sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                  <Typography color="text.secondary">
                    All payments received! No outstanding dues.
                  </Typography>
                </Box>
              )}
            </Paper>

            {/* Pending Sales */}
            {pendingSales.length > 0 && (
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" fontWeight="bold">
                    ⏳ Pending Sales
                  </Typography>
                  <Button
                    size="small"
                    endIcon={<ArrowForward />}
                    onClick={() => navigate('/sales', { state: { tab: 1 } })}
                  >
                    Complete All
                  </Button>
                </Box>
                <Grid container spacing={2}>
                  {pendingSales.slice(0, 4).map((sale) => (
                    <Grid item xs={12} sm={6} key={sale.id}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 2,
                          cursor: 'pointer',
                          borderColor: '#f59e0b',
                          bgcolor: alpha('#f59e0b', 0.02),
                          '&:hover': { boxShadow: 2 }
                        }}
                        onClick={() => navigate('/sales', { state: { tab: 1 } })}
                      >
                        <Typography variant="subtitle2" fontWeight="bold">
                          {sale.invoice_number}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {sale.customer_name}
                        </Typography>
                        <Typography variant="caption" color="warning.main">
                          {sale.items_count} items • Needs pricing
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}
          </Grid>
        </Grid>
      )}

      {/* CSS for refresh animation */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </Box>
  );
};

export default Dashboard;

