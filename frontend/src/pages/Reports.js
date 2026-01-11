import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  alpha,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  Alert,
  FormControl,
  Select,
  InputLabel
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Receipt,
  Inventory,
  Download,
  CalendarMonth,
  LocalShipping,
  ShoppingCart,
  Payment,
  Warning,
  CheckCircle,
  Schedule,
  Refresh,
  TableChart,
  PictureAsPdf,
  ExpandMore
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import api from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

// Metric Card Component with gradient background
const MetricCard = ({ title, value, subtitle, icon: Icon, gradient, trend, trendValue }) => (
  <Card
    sx={{
      background: gradient,
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      '&::after': {
        content: '""',
        position: 'absolute',
        top: -20,
        right: -20,
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
      }
    }}
  >
    <CardContent sx={{ position: 'relative', zIndex: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ opacity: 0.8, mt: 1, display: 'block' }}>
              {subtitle}
            </Typography>
          )}
          {trend && (
            <Box display="flex" alignItems="center" mt={1}>
              {trend === 'up' ? (
                <TrendingUp sx={{ fontSize: 16, mr: 0.5 }} />
              ) : (
                <TrendingDown sx={{ fontSize: 16, mr: 0.5 }} />
              )}
              <Typography variant="caption">{trendValue}</Typography>
            </Box>
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

// Small Stat Card Component
const SmallStatCard = ({ title, value, color, icon: Icon }) => (
  <Paper
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      borderLeft: `4px solid ${color}`,
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: 3
      }
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
      <Icon sx={{ color, fontSize: 24 }} />
    </Box>
    <Box>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h6" fontWeight="bold">
        {value}
      </Typography>
    </Box>
  </Paper>
);

// Clickable Small Stat Card Component
const ClickableStatCard = ({ title, value, color, icon: Icon, onClick }) => (
  <Paper
    onClick={onClick}
    sx={{
      p: 2,
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      borderLeft: `4px solid ${color}`,
      cursor: 'pointer',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: 3,
        bgcolor: 'action.hover'
      }
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
      <Icon sx={{ color, fontSize: 24 }} />
    </Box>
    <Box>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>
      <Typography variant="h6" fontWeight="bold">
        {value}
      </Typography>
    </Box>
  </Paper>
);

const Reports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [analytics, setAnalytics] = useState({
    revenue: 0,
    expenses: 0,
    profit: 0,
    profitMargin: 0,
    salesCount: 0,
    totalItems: 0,
    topProducts: [],
    salesByCategory: {},
    stockByCategory: {},
    monthlyTrend: [],
    expenseBreakdown: {},
    paymentStatusCounts: { paid: 0, partial: 0, unpaid: 0 },
    monthSales: [],
    lowStockCount: 0,
    pendingSalesCount: 0,
    avgOrderValue: 0
  });

  // Export menu state
  const [exportMenuAnchor, setExportMenuAnchor] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    fetchAnalytics();
  }, [selectedMonth]);

  const fetchAnalytics = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [productsRes, salesRes, expensesRes, stockIntakeRes] = await Promise.all([
        api.get('/products'),
        api.get('/sales'),
        api.get(`/expenses/summary?month=${selectedMonth}`),
        api.get('/stock-intake?status=completed')
      ]);

      const products = productsRes.data.data || [];
      const sales = salesRes.data.data || [];
      const expenseSummary = expensesRes.data.data || { categories: {}, total: 0 };
      const stockIntakes = stockIntakeRes.data.data || [];

      // Parse selected month - handle full year option (month = 00)
      const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number);
      const isFullYear = selectedMonthNum === 0;

      // Filter sales based on selected period
      let monthStart, monthEnd;
      if (isFullYear) {
        // Full year: Jan 1 to Dec 31
        monthStart = new Date(selectedYear, 0, 1);
        monthEnd = new Date(selectedYear, 11, 31);
      } else {
        // Specific month
        monthStart = new Date(selectedYear, selectedMonthNum - 1, 1);
        monthEnd = new Date(selectedYear, selectedMonthNum, 0);
      }
      monthEnd.setHours(23, 59, 59, 999);

      const monthSales = sales.filter(s => {
        const saleDate = new Date(s.sale_date);
        return saleDate >= monthStart && saleDate <= monthEnd && s.status === 'completed';
      });

      const pendingSales = sales.filter(s => s.status === 'pending');

      const revenue = monthSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
      const expenses = expenseSummary.total || 0;
      const profit = revenue - expenses;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const totalItems = monthSales.reduce((sum, s) => sum + (s.items_count || 0), 0);
      const avgOrderValue = monthSales.length > 0 ? revenue / monthSales.length : 0;

      // Top 5 products by sales
      const productSales = {};
      sales.forEach(sale => {
        if (sale.status !== 'completed') return;
        sale.items?.forEach(item => {
          if (!item.unit_price) return;
          if (!productSales[item.product_id]) {
            productSales[item.product_id] = {
              name: item.product_name,
              code: item.product_code,
              quantity: 0,
              revenue: 0
            };
          }
          productSales[item.product_id].quantity += item.quantity;
          productSales[item.product_id].revenue += item.quantity * item.unit_price;
        });
      });
      const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
      const maxRevenue = topProducts.length > 0 ? topProducts[0].revenue : 1;
      topProducts.forEach(p => {
        p.percentage = (p.revenue / maxRevenue) * 100;
      });

      // Stock by category/tags
      const stockByTag = {};
      products.forEach(p => {
        const tags = p.tags || ['other'];
        tags.forEach(tag => {
          if (!stockByTag[tag]) stockByTag[tag] = 0;
          stockByTag[tag] += p.stock_quantity;
        });
      });

      // Low stock products
      const lowStockCount = products.filter(p => p.stock_quantity <= (p.low_stock_threshold || 5)).length;

      // Sales Trend - Monthly for full year, Daily for specific month
      let monthlyTrend, trendLabels;
      if (isFullYear) {
        // Monthly trend for full year (12 months)
        const monthlySales = {};
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let i = 0; i < 12; i++) {
          monthlySales[i] = 0;
        }
        monthSales.forEach(sale => {
          const month = new Date(sale.sale_date).getMonth();
          monthlySales[month] += sale.total_amount || 0;
        });
        monthlyTrend = Object.values(monthlySales);
        trendLabels = monthNames;
      } else {
        // Daily trend for specific month
        const dailySales = {};
        const daysInMonth = monthEnd.getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          dailySales[i] = 0;
        }
        monthSales.forEach(sale => {
          const day = new Date(sale.sale_date).getDate();
          dailySales[day] += sale.total_amount || 0;
        });
        monthlyTrend = Object.values(dailySales);
        trendLabels = Array.from({ length: daysInMonth }, (_, i) => i + 1);
      }

      // Payment Status Breakdown
      const paymentStatusCounts = { paid: 0, partial: 0, unpaid: 0 };
      monthSales.forEach(sale => {
        const status = sale.payment_status || 'unpaid';
        if (paymentStatusCounts[status] !== undefined) {
          paymentStatusCounts[status]++;
        }
      });

      setAnalytics({
        revenue,
        expenses,
        profit,
        profitMargin,
        salesCount: monthSales.length,
        totalItems,
        avgOrderValue,
        topProducts,
        stockByTag,
        monthlyTrend,
        trendLabels,
        isFullYear,
        paymentStatusCounts,
        monthSales,
        expenseBreakdown: expenseSummary.categories || {},
        lowStockCount,
        pendingSalesCount: pendingSales.length
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchAnalytics(true);
  };

  const salesTrendData = {
    labels: analytics.trendLabels || Array.from({ length: analytics.monthlyTrend.length }, (_, i) => i + 1),
    datasets: [{
      label: analytics.isFullYear ? 'Monthly Revenue (₹)' : 'Daily Revenue (₹)',
      data: analytics.monthlyTrend,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
      tension: 0.4,
      fill: true,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: '#6366f1',
      pointBorderColor: '#fff',
      pointBorderWidth: 2
    }]
  };

  const paymentStatusData = {
    labels: ['Paid', 'Partial', 'Unpaid'],
    datasets: [{
      data: [
        analytics.paymentStatusCounts?.paid || 0,
        analytics.paymentStatusCounts?.partial || 0,
        analytics.paymentStatusCounts?.unpaid || 0
      ],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderWidth: 0,
      hoverOffset: 10
    }]
  };

  const expenseBreakdownData = {
    labels: Object.keys(analytics.expenseBreakdown).map(k => k.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')),
    datasets: [{
      data: Object.values(analytics.expenseBreakdown),
      backgroundColor: [
        '#8b5cf6', '#06b6d4', '#f43f5e', '#f97316',
        '#84cc16', '#14b8a6', '#64748b'
      ],
      borderWidth: 0,
      hoverOffset: 10
    }]
  };

  // Filter to only show specific glass types
  const allowedTags = ['sunroof', 'windshield', 'door_glass', 'backlight', 'quarter_glass', 'strip', 'frame', 'middle', 'lami'];
  const filteredStockByTag = Object.fromEntries(
    Object.entries(analytics.stockByTag || {}).filter(([key]) => allowedTags.includes(key))
  );

  const stockByTagData = {
    labels: Object.keys(filteredStockByTag).map(k => k.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')),
    datasets: [{
      label: 'Stock Units',
      data: Object.values(filteredStockByTag),
      backgroundColor: [
        'rgba(99, 102, 241, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(139, 92, 246, 0.8)'
      ],
      borderRadius: 8,
      borderSkipped: false
    }]
  };

  const revenueVsExpensesData = {
    labels: ['Revenue', 'Expenses', 'Profit'],
    datasets: [{
      label: 'Amount (₹)',
      data: [analytics.revenue, analytics.expenses, Math.max(0, analytics.profit)],
      backgroundColor: [
        'rgba(16, 185, 129, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(59, 130, 246, 0.8)'
      ],
      borderRadius: 8,
      borderSkipped: false
    }]
  };

  // Export menu handlers
  const handleExportMenuOpen = (event) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getMonthName = () => {
    return new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Export to Excel with multiple sheets
  const handleExportExcel = async () => {
    handleExportMenuClose();
    setExporting(true);

    try {
      const workbook = XLSX.utils.book_new();
      const monthName = getMonthName();

      // Sheet 1: Summary
      const summaryData = [
        ['SunStock Analytics Report'],
        [''],
        ['Report Period:', monthName],
        ['Generated On:', new Date().toLocaleString()],
        [''],
        ['KEY METRICS'],
        ['Total Revenue', `₹${analytics.revenue.toLocaleString()}`],
        ['Total Expenses', `₹${analytics.expenses.toLocaleString()}`],
        ['Net Profit', `₹${analytics.profit.toLocaleString()}`],
        ['Profit Margin', `${analytics.profitMargin.toFixed(1)}%`],
        [''],
        ['SALES OVERVIEW'],
        ['Completed Sales', analytics.salesCount],
        ['Total Items Sold', analytics.totalItems],
        ['Average Order Value', `₹${analytics.avgOrderValue.toLocaleString()}`],
        ['Pending Sales', analytics.pendingSalesCount],
        [''],
        ['PAYMENT STATUS'],
        ['Paid Invoices', analytics.paymentStatusCounts?.paid || 0],
        ['Partial Payments', analytics.paymentStatusCounts?.partial || 0],
        ['Unpaid Invoices', analytics.paymentStatusCounts?.unpaid || 0],
        [''],
        ['INVENTORY'],
        ['Low Stock Items', analytics.lowStockCount]
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet['!cols'] = [{ wch: 20 }, { wch: 25 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

      // Sheet 2: Daily Sales Trend
      const dailySalesData = [
        ['Daily Sales Trend - ' + monthName],
        [''],
        ['Day', 'Revenue (₹)']
      ];
      analytics.monthlyTrend.forEach((amount, index) => {
        dailySalesData.push([index + 1, amount]);
      });
      dailySalesData.push(['']);
      dailySalesData.push(['Total', analytics.revenue]);
      const dailySheet = XLSX.utils.aoa_to_sheet(dailySalesData);
      dailySheet['!cols'] = [{ wch: 10 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, dailySheet, 'Daily Sales');

      // Sheet 3: Sales Details
      const salesDetailsData = [
        ['Sales Details - ' + monthName],
        [''],
        ['Date', 'Invoice #', 'Customer', 'Items', 'Total (₹)', 'Paid (₹)', 'Balance (₹)', 'Payment Status']
      ];
      (analytics.monthSales || []).forEach(sale => {
        salesDetailsData.push([
          new Date(sale.sale_date).toLocaleDateString(),
          sale.invoice_number,
          sale.customer_name,
          sale.items_count || 0,
          sale.total_amount || 0,
          sale.amount_paid || 0,
          (sale.total_amount || 0) - (sale.amount_paid || 0),
          sale.payment_status?.toUpperCase()
        ]);
      });
      const salesSheet = XLSX.utils.aoa_to_sheet(salesDetailsData);
      salesSheet['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, salesSheet, 'Sales Details');

      // Sheet 4: Top Products
      const topProductsData = [
        ['Top Selling Products'],
        [''],
        ['Rank', 'Product Name', 'Product Code', 'Units Sold', 'Revenue (₹)', 'Performance %']
      ];
      analytics.topProducts.forEach((product, index) => {
        topProductsData.push([
          index + 1,
          product.name,
          product.code,
          product.quantity,
          product.revenue,
          `${product.percentage.toFixed(1)}%`
        ]);
      });
      const productsSheet = XLSX.utils.aoa_to_sheet(topProductsData);
      productsSheet['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(workbook, productsSheet, 'Top Products');

      // Sheet 5: Payment Status Breakdown
      const paymentData = [
        ['Payment Status Breakdown - ' + monthName],
        [''],
        ['Status', 'Count', 'Percentage'],
        ['Paid', analytics.paymentStatusCounts?.paid || 0,
          analytics.salesCount > 0 ? `${((analytics.paymentStatusCounts?.paid || 0) / analytics.salesCount * 100).toFixed(1)}%` : '0%'],
        ['Partial', analytics.paymentStatusCounts?.partial || 0,
          analytics.salesCount > 0 ? `${((analytics.paymentStatusCounts?.partial || 0) / analytics.salesCount * 100).toFixed(1)}%` : '0%'],
        ['Unpaid', analytics.paymentStatusCounts?.unpaid || 0,
          analytics.salesCount > 0 ? `${((analytics.paymentStatusCounts?.unpaid || 0) / analytics.salesCount * 100).toFixed(1)}%` : '0%'],
        [''],
        ['Total Sales', analytics.salesCount, '100%']
      ];
      const paymentSheet = XLSX.utils.aoa_to_sheet(paymentData);
      paymentSheet['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(workbook, paymentSheet, 'Payment Status');

      // Sheet 6: Expense Breakdown
      const expenseData = [
        ['Expense Breakdown - ' + monthName],
        [''],
        ['Category', 'Amount (₹)', 'Percentage']
      ];
      const totalExpenses = analytics.expenses || 1;
      Object.entries(analytics.expenseBreakdown).forEach(([category, amount]) => {
        expenseData.push([
          category.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
          amount,
          `${((amount / totalExpenses) * 100).toFixed(1)}%`
        ]);
      });
      expenseData.push(['']);
      expenseData.push(['Total Expenses', analytics.expenses, '100%']);
      const expenseSheet = XLSX.utils.aoa_to_sheet(expenseData);
      expenseSheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Expenses');

      // Sheet 7: Stock Levels by Category
      const stockData = [
        ['Stock Levels by Category'],
        [''],
        ['Category', 'Stock Units']
      ];
      Object.entries(analytics.stockByTag || {}).forEach(([tag, count]) => {
        stockData.push([tag.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '), count]);
      });
      const stockSheet = XLSX.utils.aoa_to_sheet(stockData);
      stockSheet['!cols'] = [{ wch: 18 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(workbook, stockSheet, 'Stock Levels');

      // Download the workbook
      XLSX.writeFile(workbook, `SunStock_Report_${selectedMonth}.xlsx`);
      showSnackbar('Excel report downloaded successfully!', 'success');
    } catch (error) {
      console.error('Excel export failed:', error);
      showSnackbar('Failed to export Excel report', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Export to PDF with formatted tables
  const handleExportPDF = async () => {
    handleExportMenuClose();
    setExporting(true);

    try {
      const doc = new jsPDF();
      const monthName = getMonthName();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, pageWidth, 35, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('SunStock Analytics Report', 14, 20);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(monthName, 14, 30);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 60, 30);

      // Reset text color
      doc.setTextColor(0, 0, 0);
      let yPos = 50;

      // Key Metrics Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Key Financial Metrics', 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: [
          ['Total Revenue', `Rs.${analytics.revenue.toLocaleString()}`],
          ['Total Expenses', `Rs.${analytics.expenses.toLocaleString()}`],
          ['Net Profit', `Rs.${analytics.profit.toLocaleString()}`],
          ['Profit Margin', `${analytics.profitMargin.toFixed(1)}%`],
          ['Completed Sales', analytics.salesCount.toString()],
          ['Average Order Value', `Rs.${analytics.avgOrderValue.toLocaleString()}`]
        ],
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: 'bold' } }
      });

      yPos = doc.lastAutoTable.finalY + 15;

      // Payment Status Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Payment Status Breakdown', 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Status', 'Count', 'Percentage']],
        body: [
          ['Paid', (analytics.paymentStatusCounts?.paid || 0).toString(),
            analytics.salesCount > 0 ? `${((analytics.paymentStatusCounts?.paid || 0) / analytics.salesCount * 100).toFixed(1)}%` : '0%'],
          ['Partial Payment', (analytics.paymentStatusCounts?.partial || 0).toString(),
            analytics.salesCount > 0 ? `${((analytics.paymentStatusCounts?.partial || 0) / analytics.salesCount * 100).toFixed(1)}%` : '0%'],
          ['Unpaid', (analytics.paymentStatusCounts?.unpaid || 0).toString(),
            analytics.salesCount > 0 ? `${((analytics.paymentStatusCounts?.unpaid || 0) / analytics.salesCount * 100).toFixed(1)}%` : '0%']
        ],
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241], textColor: 255 },
        styles: { fontSize: 10, cellPadding: 4 }
      });

      yPos = doc.lastAutoTable.finalY + 15;

      // Check if we need a new page for Top Products
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      // Top Products Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Top Selling Products', 14, yPos);
      yPos += 8;

      if (analytics.topProducts.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Rank', 'Product', 'Code', 'Units', 'Revenue']],
          body: analytics.topProducts.map((product, index) => [
            `#${index + 1}`,
            product.name,
            product.code,
            product.quantity.toString(),
            `Rs.${product.revenue.toLocaleString()}`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241], textColor: 255 },
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: { 0: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
        });
        yPos = doc.lastAutoTable.finalY + 15;
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('No product sales data available for this period.', 14, yPos + 5);
        yPos += 20;
      }

      // Check if we need a new page for Expenses
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      // Expense Breakdown Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Expense Breakdown', 14, yPos);
      yPos += 8;

      const expenseEntries = Object.entries(analytics.expenseBreakdown);
      if (expenseEntries.length > 0) {
        const totalExp = analytics.expenses || 1;
        autoTable(doc, {
          startY: yPos,
          head: [['Category', 'Amount', 'Percentage']],
          body: expenseEntries.map(([category, amount]) => [
            category.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
            `Rs.${amount.toLocaleString()}`,
            `${((amount / totalExp) * 100).toFixed(1)}%`
          ]),
          theme: 'striped',
          headStyles: { fillColor: [239, 68, 68], textColor: 255 },
          styles: { fontSize: 10, cellPadding: 4 },
          columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } }
        });
        yPos = doc.lastAutoTable.finalY + 15;
      } else {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('No expenses recorded for this period.', 14, yPos + 5);
        yPos += 20;
      }

      // Check if we need a new page for Stock Levels
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      // Stock Levels Section
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Stock Levels by Category', 14, yPos);
      yPos += 8;

      const stockEntries = Object.entries(analytics.stockByTag || {});
      if (stockEntries.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [['Category', 'Stock Units']],
          body: stockEntries.map(([tag, count]) => [
            tag.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
            count.toString()
          ]),
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129], textColor: 255 },
          styles: { fontSize: 10, cellPadding: 4 },
          columnStyles: { 1: { halign: 'right' } }
        });
      }

      // Add page for Sales Details if there are sales
      if ((analytics.monthSales || []).length > 0) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Sales Details', 14, yPos);
        yPos += 8;

        autoTable(doc, {
          startY: yPos,
          head: [['Date', 'Invoice', 'Customer', 'Items', 'Total', 'Paid', 'Status']],
          body: (analytics.monthSales || []).map(sale => [
            new Date(sale.sale_date).toLocaleDateString(),
            sale.invoice_number,
            sale.customer_name?.substring(0, 20) || '-',
            (sale.items_count || 0).toString(),
            `Rs.${(sale.total_amount || 0).toLocaleString()}`,
            `Rs.${(sale.amount_paid || 0).toLocaleString()}`,
            sale.payment_status?.toUpperCase() || '-'
          ]),
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241], textColor: 255 },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            3: { halign: 'center' },
            4: { halign: 'right' },
            5: { halign: 'right' }
          }
        });
      }

      // Footer on all pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 25, doc.internal.pageSize.getHeight() - 10);
        doc.text('SunStock Inventory Management', 14, doc.internal.pageSize.getHeight() - 10);
      }

      doc.save(`SunStock_Report_${selectedMonth}.pdf`);
      showSnackbar('PDF report downloaded successfully!', 'success');
    } catch (error) {
      console.error('PDF export failed:', error);
      showSnackbar('Failed to export PDF report', 'error');
    } finally {
      setExporting(false);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0,0,0,0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      }
    },
    cutout: '65%'
  };

  if (loading) {
    return (
      <Box p={3} display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <Box textAlign="center">
          <CircularProgress size={60} thickness={4} />
          <Typography variant="h6" color="text.secondary" mt={2}>
            Loading Analytics...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box p={3} sx={{ bgcolor: 'background.default', minHeight: '100vh', borderRadius: 4 }}>
      <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper' }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
            flexWrap: 'wrap',
            gap: 2
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: 'primary.main' }}>
              📊 Analytics Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Financial overview and business insights for {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </Typography>
          </Box>
          <Box display="flex" gap={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 130, bgcolor: 'background.paper', borderRadius: 1 }}>
              <InputLabel>Month</InputLabel>
              <Select
                value={parseInt(selectedMonth.split('-')[1])}
                label="Month"
                onChange={(e) => {
                  const year = selectedMonth.split('-')[0];
                  const month = String(e.target.value).padStart(2, '0');
                  setSelectedMonth(`${year}-${month}`);
                }}
                sx={{ borderRadius: 2 }}
              >
                {[
                  { value: 0, label: '📅 Full Year' },
                  { value: 1, label: 'January' },
                  { value: 2, label: 'February' },
                  { value: 3, label: 'March' },
                  { value: 4, label: 'April' },
                  { value: 5, label: 'May' },
                  { value: 6, label: 'June' },
                  { value: 7, label: 'July' },
                  { value: 8, label: 'August' },
                  { value: 9, label: 'September' },
                  { value: 10, label: 'October' },
                  { value: 11, label: 'November' },
                  { value: 12, label: 'December' }
                ].map((m) => (
                  <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 90, bgcolor: 'background.paper', borderRadius: 1 }}>
              <InputLabel>Year</InputLabel>
              <Select
                value={parseInt(selectedMonth.split('-')[0])}
                label="Year"
                onChange={(e) => {
                  const month = selectedMonth.split('-')[1];
                  setSelectedMonth(`${e.target.value}-${month}`);
                }}
                sx={{ borderRadius: 2 }}
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                  <MenuItem key={year} value={year}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title="Refresh Data">
              <IconButton
                onClick={handleRefresh}
                disabled={refreshing}
                sx={{ bgcolor: 'background.paper', boxShadow: 1, '&:hover': { bgcolor: 'action.hover' } }}
              >
                <Refresh sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={exporting ? <CircularProgress size={18} color="inherit" /> : <Download />}
              endIcon={<ExpandMore />}
              onClick={handleExportMenuOpen}
              disabled={exporting}
              sx={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                borderRadius: 2,
                textTransform: 'none',
                px: 3,
                minWidth: 160
              }}
            >
              {exporting ? 'Exporting...' : 'Export Report'}
            </Button>
            <Menu
              anchorEl={exportMenuAnchor}
              open={Boolean(exportMenuAnchor)}
              onClose={handleExportMenuClose}
              PaperProps={{
                sx: {
                  mt: 1,
                  minWidth: 280,
                  borderRadius: 2,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                  overflow: 'visible',
                  '&::before': {
                    content: '""',
                    display: 'block',
                    position: 'absolute',
                    top: 0,
                    right: 20,
                    width: 10,
                    height: 10,
                    bgcolor: 'background.paper',
                    transform: 'translateY(-50%) rotate(45deg)',
                    zIndex: 0,
                  }
                }
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight="bold" color="text.secondary">
                  📥 Export Options
                </Typography>
              </Box>
              <MenuItem
                onClick={handleExportExcel}
                sx={{
                  py: 1.5,
                  px: 2,
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <ListItemIcon>
                  <TableChart sx={{ color: '#10b981' }} />
                </ListItemIcon>
                <ListItemText
                  primary={<Typography fontWeight="medium">Export to Excel</Typography>}
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      Multi-sheet workbook with all data
                    </Typography>
                  }
                />
              </MenuItem>
              <MenuItem
                onClick={handleExportPDF}
                sx={{
                  py: 1.5,
                  px: 2,
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                <ListItemIcon>
                  <PictureAsPdf sx={{ color: '#ef4444' }} />
                </ListItemIcon>
                <ListItemText
                  primary={<Typography fontWeight="medium">Export to PDF</Typography>}
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      Formatted report with tables
                    </Typography>
                  }
                />
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* Main Metric Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <MetricCard
              title="Total Revenue"
              value={`₹${analytics.revenue.toLocaleString()}`}
              subtitle={`${analytics.salesCount} completed sales`}
              icon={TrendingUp}
              gradient="linear-gradient(135deg, #10b981 0%, #059669 100%)"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <MetricCard
              title="Total Expenses"
              value={`₹${analytics.expenses.toLocaleString()}`}
              subtitle="Including stock purchases"
              icon={Receipt}
              gradient="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <MetricCard
              title="Net Profit"
              value={`₹${analytics.profit.toLocaleString()}`}
              subtitle={`${analytics.profitMargin.toFixed(1)}% margin`}
              icon={AccountBalance}
              gradient={analytics.profit >= 0
                ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
              }
            />
          </Grid>
        </Grid>

        {/* Quick Stats Row */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <SmallStatCard
              title="Paid Invoices"
              value={analytics.paymentStatusCounts?.paid || 0}
              color="#10b981"
              icon={CheckCircle}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <ClickableStatCard
              title="Pending Sales"
              value={analytics.pendingSalesCount}
              color="#f59e0b"
              icon={Schedule}
              onClick={() => navigate('/sales', { state: { tab: 1 } })}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <SmallStatCard
              title="Unpaid Invoices"
              value={analytics.paymentStatusCounts?.unpaid || 0}
              color="#ef4444"
              icon={Payment}
            />
          </Grid>
        </Grid>

        {/* Sales Trend Chart */}
        <Paper sx={{ p: 3, mb: 4, borderRadius: 3, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            📈 Daily Sales Trend
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Revenue performance throughout the month
          </Typography>
          <Box height={300}>
            <Line data={salesTrendData} options={chartOptions} />
          </Box>
        </Paper>

        {/* Charts Row */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Revenue vs Expenses */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                💰 Revenue vs Expenses
              </Typography>
              <Box height={280}>
                <Bar data={revenueVsExpensesData} options={chartOptions} />
              </Box>
            </Paper>
          </Grid>

          {/* Payment Status */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                💳 Payment Status
              </Typography>
              {(analytics.paymentStatusCounts?.paid || 0) +
                (analytics.paymentStatusCounts?.partial || 0) +
                (analytics.paymentStatusCounts?.unpaid || 0) > 0 ? (
                <Box height={280} display="flex" justifyContent="center">
                  <Doughnut data={paymentStatusData} options={doughnutOptions} />
                </Box>
              ) : (
                <Box height={280} display="flex" alignItems="center" justifyContent="center">
                  <Typography color="text.secondary">No sales data for this month</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Second Charts Row */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Expense Breakdown */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                📋 Expense Breakdown
              </Typography>
              {Object.keys(analytics.expenseBreakdown).length > 0 ? (
                <Box height={280} display="flex" justifyContent="center">
                  <Pie data={expenseBreakdownData} options={doughnutOptions} />
                </Box>
              ) : (
                <Box height={280} display="flex" alignItems="center" justifyContent="center">
                  <Typography color="text.secondary">No expenses recorded this month</Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Stock by Category */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3, height: '100%', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                📦 Stock Levels by Category
              </Typography>
              {Object.keys(analytics.stockByTag || {}).length > 0 ? (
                <Box height={280}>
                  <Bar data={stockByTagData} options={chartOptions} />
                </Box>
              ) : (
                <Box height={280} display="flex" alignItems="center" justifyContent="center">
                  <Typography color="text.secondary">No stock data available</Typography>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Top Products Table */}
        <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            🏆 Top Selling Products
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Best performing products by revenue
          </Typography>
          {analytics.topProducts.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Rank</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Units Sold</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Revenue</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>Performance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics.topProducts.map((product, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        <Chip
                          label={`#${index + 1}`}
                          size="small"
                          sx={{
                            bgcolor: index === 0 ? '#fef3c7' : index === 1 ? '#e5e7eb' : index === 2 ? '#fed7aa' : '#f1f5f9',
                            color: index === 0 ? '#92400e' : index === 1 ? '#374151' : index === 2 ? '#9a3412' : '#475569',
                            fontWeight: 'bold'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {product.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {product.code}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip label={product.quantity} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold" color="success.main">
                          ₹{product.revenue.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <LinearProgress
                            variant="determinate"
                            value={product.percentage}
                            sx={{
                              flex: 1,
                              height: 8,
                              borderRadius: 4,
                              bgcolor: 'rgba(99, 102, 241, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                borderRadius: 4,
                                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                              }
                            }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40 }}>
                            {product.percentage.toFixed(0)}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box py={4} textAlign="center">
              <Typography color="text.secondary">
                No sales data available. Complete some sales to see top products!
              </Typography>
            </Box>
          )}
        </Paper>

        {/* CSS for refresh animation */}
        <style>
          {`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}
        </style>

        {/* Export notification snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbar.severity}
            variant="filled"
            sx={{
              width: '100%',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Box >
  );
};

export default Reports;
