import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Box,
    Paper,
    Tabs,
    Tab,
    Typography,
    Button,
    TextField,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Autocomplete,
    Alert,
    CircularProgress,
    Chip,
    Divider,
    MenuItem,
    InputAdornment,
    Card,
    CardContent,
    FormControl,
    InputLabel,
    Select,
    Stepper,
    Step,
    StepLabel,
    Snackbar
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
    ShoppingCart,
    Add,
    Remove,
    Delete,
    ArrowBack,
    ArrowForward,
    Check,
    Person,
    Assessment,
    Receipt,
    Visibility,
    Payment as PaymentIcon,
    Close,
    Edit,
    HourglassEmpty,
    Download,
    Phone,
    Business,
    LocationOn
} from '@mui/icons-material';
import { DataGrid } from '@mui/x-data-grid';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const steps = ['Customer Information', 'Select Products', 'Sale Details'];

// Payment Dialog Component (from Sales.js)
const PaymentDialog = ({ open, onClose, sale, onPaymentAdded }) => {
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cash');
    const [notes, setNotes] = useState('');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open && sale) {
            fetchHistory();
            setAmount('');
            setMethod('cash');
            setNotes('');
            setError('');
        }
    }, [open, sale]);

    const fetchHistory = async () => {
        try {
            const res = await api.get(`/sales/${sale.id}/payments`);
            setHistory(res.data.data);
        } catch (err) {
            console.error("Failed to fetch payment history:", err);
        }
    };

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError("Please enter a valid amount");
            return;
        }

        setLoading(true);
        setError('');

        try {
            await api.post(`/sales/${sale.id}/payments`, {
                amount: parseFloat(amount),
                payment_method: method,
                notes: notes
            });
            onPaymentAdded();
            onClose();
        } catch (err) {
            setError(err.response?.data?.msg || "Failed to record payment");
        } finally {
            setLoading(false);
        }
    };

    if (!sale) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                Manage Payments - #{sale.invoice_number}
                <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
                    <Close />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    <Grid container spacing={2}>
                        <Grid item xs={4}>
                            <Typography variant="caption">Total Amount</Typography>
                            <Typography variant="h6">₹{sale.total_amount.toFixed(2)}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                            <Typography variant="caption">Paid</Typography>
                            <Typography variant="h6" color="success.main">₹{sale.amount_paid.toFixed(2)}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                            <Typography variant="caption">Balance Due</Typography>
                            <Typography variant="h6" color="error.main">₹{sale.balance_due.toFixed(2)}</Typography>
                        </Grid>
                    </Grid>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                {sale.balance_due > 0 && (
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="subtitle2" gutterBottom>Record New Payment</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    label="Amount"
                                    type="number"
                                    fullWidth
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    InputProps={{ inputProps: { min: 0, max: sale.balance_due } }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    select
                                    label="Method"
                                    fullWidth
                                    value={method}
                                    onChange={(e) => setMethod(e.target.value)}
                                >
                                    <MenuItem value="cash">Cash</MenuItem>
                                    <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                                    <MenuItem value="upi">UPI</MenuItem>
                                    <MenuItem value="cheque">Cheque</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Notes (Optional)"
                                    fullWidth
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={handleSubmit}
                                    disabled={loading}
                                >
                                    Record Payment
                                </Button>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                <Typography variant="subtitle2" gutterBottom>Payment History</Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Method</TableCell>
                                <TableCell>Recorded By</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {history.length > 0 ? (
                                history.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                                        <TableCell>₹{payment.amount.toFixed(2)}</TableCell>
                                        <TableCell>{payment.method}</TableCell>
                                        <TableCell>{payment.created_by}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} align="center">No payments recorded</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>
        </Dialog>
    );
};

const SalesPage = () => {
    const { user } = useAuth();
    const notify = useNotification();
    const canViewFinancials = user?.can_view_financials || false;
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.tab || 0); // 0 = New Sale, 1 = Pending Sales, 2 = Sales History

    // ===== NEW SALE STATE (From NewSalePage) =====
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [openSnackbar, setOpenSnackbar] = useState(false);

    const [customerInfo, setCustomerInfo] = useState({
        customer_name: '',
        customer_phone: '',
        customer_company: ''
    });

    const [selectedProducts, setSelectedProducts] = useState([]);

    const [paymentInfo, setPaymentInfo] = useState({
        payment_method: 'cash',
        payment_status: 'unpaid',
        amount_paid: 0,
        discount_amount: 0,
        notes: ''
    });

    // ===== PENDING SALES STATE =====
    const [pendingSales, setPendingSales] = useState([]);
    const [pendingLoading, setPendingLoading] = useState(false);
    const [editingSale, setEditingSale] = useState(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editItems, setEditItems] = useState([]);
    const [editLoading, setEditLoading] = useState(false);
    const [newEditItems, setNewEditItems] = useState([]);
    const [deletedItemIds, setDeletedItemIds] = useState([]);
    const [editCurrentProduct, setEditCurrentProduct] = useState(null);
    const [editQuantity, setEditQuantity] = useState(1);
    const [editPrice, setEditPrice] = useState('');

    // ===== SALES HISTORY STATE (From Sales.js) =====
    const [sales, setSales] = useState([]);
    const [salesLoading, setSalesLoading] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [paymentOpen, setPaymentOpen] = useState(false);
    const [paymentSale, setPaymentSale] = useState(null);

    // ===== DELETE SALE STATE =====
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [saleToDelete, setSaleToDelete] = useState(null);

    useEffect(() => {
        fetchProducts();
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (activeTab === 1) {
            fetchPendingSales();
        } else if (activeTab === 2) {
            fetchSales();
        }
    }, [activeTab]);

    const fetchProducts = async () => {
        try {
            const response = await api.get('/products?stock_status=in_stock');
            setProducts(response.data.data || []);
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers');
            setCustomers(response.data.data || []);
        } catch (err) {
            console.error('Error fetching customers:', err);
        }
    };

    const fetchPendingSales = () => {
        setPendingLoading(true);
        api.get('/sales?status=pending')
            .then(res => {
                const salesData = res.data.data || res.data;
                setPendingSales(salesData);
            })
            .catch(err => {
                console.error("Failed to fetch pending sales:", err);
                setPendingSales([]);
            })
            .finally(() => setPendingLoading(false));
    };

    const fetchSales = () => {
        setSalesLoading(true);
        api.get('/sales?status=completed')
            .then(res => {
                const salesData = res.data.data || res.data;
                setSales(salesData);
            })
            .catch(err => {
                console.error("Failed to fetch sales:", err);
                setSales([]);
            })
            .finally(() => setSalesLoading(false));
    };

    // ===== NEW SALE HANDLERS =====
    const handleNext = () => {
        if (activeStep === 0 && !validateCustomerInfo()) {
            setError('Please enter customer name');
            return;
        }
        if (activeStep === 1 && selectedProducts.length === 0) {
            setError('Please add at least one product');
            return;
        }
        setError(null);
        setActiveStep((prevStep) => prevStep + 1);
    };

    const handleBack = () => {
        setError(null);
        setActiveStep((prevStep) => prevStep - 1);
    };

    const validateCustomerInfo = () => {
        return customerInfo.customer_name.trim().length > 0;
    };

    const handleCustomerChange = (field) => (event) => {
        setCustomerInfo({ ...customerInfo, [field]: event.target.value });
    };

    const handleAddProduct = (product) => {
        setSelectedProducts(prev => {
            const existing = prev.find(p => p.id === product.id);
            if (existing) {
                return prev.map(p =>
                    p.id === product.id
                        ? { ...p, quantity: p.quantity + 1 }
                        : p
                );
            }
            // Explicitly set unit_price: null to create pending sale
            return [...prev, { ...product, quantity: 1, unit_price: null }];
        });
        setError(null);
        setOpenSnackbar(true);
    };

    const handleQuantityChange = (productId, newQuantity) => {
        if (newQuantity <= 0) {
            handleRemoveProduct(productId);
            return;
        }

        const product = products.find(p => p.id === productId);
        if (product && newQuantity > product.stock_quantity) {
            setError(`Only ${product.stock_quantity} units available for ${product.name}`);
            return;
        }

        setSelectedProducts(
            selectedProducts.map(p =>
                p.id === productId ? { ...p, quantity: newQuantity } : p
            )
        );
        setError(null);
    };

    const handleRemoveProduct = (productId) => {
        setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
    };

    const calculateSubtotal = () => {
        // Use selling_price for display when unit_price is not set
        return selectedProducts.reduce((sum, p) => sum + (p.quantity * (p.unit_price ?? p.selling_price ?? 0)), 0);
    };

    const calculateTotal = () => {
        return calculateSubtotal() - paymentInfo.discount_amount;
    };

    const handlePaymentChange = (field) => (event) => {
        setPaymentInfo({ ...paymentInfo, [field]: event.target.value });
    };

    const resetNewSaleForm = () => {
        setActiveStep(0);
        setCustomerInfo({ customer_name: '', customer_phone: '', customer_company: '' });
        setSelectedProducts([]);
        setPaymentInfo({ payment_method: 'cash', payment_status: 'unpaid', amount_paid: 0, discount_amount: 0, notes: '' });
        setError(null);
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        try {
            // Explicitly send unit_price: null if not set - this creates a pending sale
            const saleData = {
                ...customerInfo,
                ...paymentInfo,
                items: selectedProducts.map(p => ({
                    product_id: p.id,
                    quantity: p.quantity,
                    unit_price: p.unit_price  // Explicitly send null to create pending sale
                }))
            };

            const response = await api.post('/sales', saleData);
            const statusMsg = response.data.data.status === 'pending'
                ? 'Pending sale created! Add prices in Pending Sales tab.'
                : 'Sale created successfully!';
            notify.success(`${statusMsg}`, `Invoice: ${response.data.data.invoice_number}`);

            // Reset form and switch to pending sales tab
            resetNewSaleForm();
            setActiveTab(1); // Switch to Pending Sales
            fetchPendingSales(); // Refresh the pending sales list
        } catch (err) {
            console.error('Error creating sale:', err);
            setError(err.response?.data?.msg || 'Failed to create sale');
        } finally {
            setLoading(false);
        }
    };

    // ===== PENDING SALES HANDLERS =====
    const handleEditPendingSale = async (sale) => {
        try {
            const response = await api.get(`/sales/${sale.id}`);
            const saleData = response.data.data || response.data;
            setEditingSale(saleData);
            setEditItems(saleData.items.map(item => ({
                ...item,
                unit_price: item.unit_price || ''
            })));
            // Reset new edit state
            setNewEditItems([]);
            setDeletedItemIds([]);
            setEditCurrentProduct(null);
            setEditQuantity(1);
            setEditPrice('');
            setEditDialogOpen(true);
        } catch (err) {
            console.error('Failed to fetch sale details:', err);
        }
    };

    const handleEditItemPriceChange = (itemId, newPrice) => {
        setEditItems(editItems.map(item =>
            item.id === itemId ? { ...item, unit_price: newPrice } : item
        ));
    };

    const handleEditItemQuantityChange = (itemId, newQuantity) => {
        setEditItems(editItems.map(item =>
            item.id === itemId ? { ...item, quantity: newQuantity } : item
        ));
    };

    const handleEditDeleteItem = (itemId) => {
        // Check if it's a new item or existing item
        if (String(itemId).startsWith('new_')) {
            setNewEditItems(newEditItems.filter(item => item.id !== itemId));
        } else {
            setDeletedItemIds([...deletedItemIds, itemId]);
            setEditItems(editItems.filter(item => item.id !== itemId));
        }
    };

    const handleEditAddItem = () => {
        if (!editCurrentProduct || editQuantity < 1) {
            notify.warning('Please select a product and enter a valid quantity', 'Validation');
            return;
        }

        const newItem = {
            id: `new_${Date.now()}`,
            product_id: editCurrentProduct.id,
            product_name: editCurrentProduct.name,
            product_code: editCurrentProduct.product_code,
            quantity: editQuantity,
            unit_price: editPrice || ''
        };

        setNewEditItems([...newEditItems, newItem]);
        setEditCurrentProduct(null);
        setEditQuantity(1);
        setEditPrice('');
    };

    const handleNewEditItemPriceChange = (itemId, newPrice) => {
        setNewEditItems(newEditItems.map(item =>
            item.id === itemId ? { ...item, unit_price: newPrice } : item
        ));
    };

    const handleNewEditItemQuantityChange = (itemId, newQuantity) => {
        setNewEditItems(newEditItems.map(item =>
            item.id === itemId ? { ...item, quantity: newQuantity } : item
        ));
    };

    const handleSavePendingSale = async () => {
        setEditLoading(true);
        try {
            await api.put(`/sales/${editingSale.id}`, {
                items: editItems.map(item => ({
                    id: item.id,
                    quantity: parseInt(item.quantity) || 1,
                    unit_price: item.unit_price ? parseFloat(item.unit_price) : null
                })),
                new_items: newEditItems.map(item => ({
                    product_id: item.product_id,
                    quantity: parseInt(item.quantity) || 1,
                    unit_price: item.unit_price ? parseFloat(item.unit_price) : null
                })),
                deleted_item_ids: deletedItemIds
            });
            setEditDialogOpen(false);
            setEditingSale(null);
            setNewEditItems([]);
            setDeletedItemIds([]);
            fetchPendingSales();
            fetchSales(); // Refresh in case sale moved to completed
            notify.success('Sale updated successfully!', 'Sale Updated');
        } catch (err) {
            console.error('Failed to update sale:', err);
            notify.error(err.response?.data?.msg || 'Failed to update sale');
        } finally {
            setEditLoading(false);
        }
    };

    // ===== SALES HISTORY HANDLERS =====
    const handleRowClick = async (params) => {
        try {
            const response = await api.get(`/sales/${params.id}`);
            setSelectedSale(response.data.data || response.data);
            setDetailsOpen(true);
        } catch (error) {
            console.error("Failed to fetch sale details:", error);
        }
    };

    const handlePaymentClick = (e, row) => {
        e.stopPropagation();
        setPaymentSale(row);
        setPaymentOpen(true);
    };

    const handleCloseDetails = () => {
        setDetailsOpen(false);
        setSelectedSale(null);
    };

    const handleDeleteSaleClick = (e, sale) => {
        e.stopPropagation();
        setSaleToDelete(sale);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteSaleConfirm = async () => {
        if (!saleToDelete) return;

        try {
            await api.delete(`/sales/${saleToDelete.id}`);
            notify.success('Sale deleted successfully!', 'Deleted');
            setDeleteConfirmOpen(false);
            setSaleToDelete(null);
            fetchSales(); // Refresh the list
        } catch (err) {
            console.error('Error deleting sale:', err);
            notify.error(err.response?.data?.msg || 'Failed to delete sale');
        }
    };

    // Generate and download bill as PDF
    const handleDownloadBill = (sale) => {
        if (!sale) return;

        const billContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Invoice - ${sale.invoice_number}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        font-size: 14px;
                        line-height: 1.5;
                        color: #333;
                        background: #f8f9fa;
                    }
                    .invoice-container {
                        max-width: 800px;
                        margin: 30px auto;
                        background: white;
                        box-shadow: 0 0 20px rgba(0,0,0,0.1);
                        border-radius: 8px;
                        overflow: hidden;
                    }
                    .invoice-header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 30px 40px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .company-info h1 {
                        font-size: 28px;
                        font-weight: 700;
                        margin-bottom: 5px;
                    }
                    .company-info p {
                        opacity: 0.9;
                        font-size: 13px;
                    }
                    .invoice-title {
                        text-align: right;
                    }
                    .invoice-title h2 {
                        font-size: 32px;
                        font-weight: 300;
                        letter-spacing: 2px;
                        margin-bottom: 5px;
                    }
                    .invoice-title .invoice-number {
                        font-size: 16px;
                        opacity: 0.9;
                    }
                    .invoice-body {
                        padding: 40px;
                    }
                    .invoice-meta {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 40px;
                        gap: 40px;
                    }
                    .invoice-details, .billing-info {
                        flex: 1;
                    }
                    .section-title {
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        color: #888;
                        margin-bottom: 10px;
                        font-weight: 600;
                    }
                    .billing-info .customer-name {
                        font-size: 20px;
                        font-weight: 600;
                        color: #475569;
                        margin-bottom: 8px;
                    }
                    .billing-info p {
                        color: #555;
                        margin: 4px 0;
                    }
                    .invoice-details-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                    }
                    .detail-item label {
                        display: block;
                        font-size: 11px;
                        text-transform: uppercase;
                        color: #888;
                        margin-bottom: 3px;
                    }
                    .detail-item span {
                        font-weight: 600;
                        color: #333;
                    }
                    .status-badge {
                        display: inline-block;
                        padding: 4px 12px;
                        border-radius: 4px;
                        font-size: 12px;
                        font-weight: 600;
                        text-transform: uppercase;
                    }
                    .status-paid { background: #e8f5e9; color: #2e7d32; }
                    .status-partial { background: #fff3e0; color: #ef6c00; }
                    .status-unpaid { background: #ffebee; color: #c62828; }
                    
                    .items-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 30px;
                    }
                    .items-table thead th {
                        background: #f5f5f5;
                        padding: 12px 15px;
                        text-align: left;
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        color: #555;
                        border-bottom: 2px solid #e0e0e0;
                    }
                    .items-table tbody td {
                        padding: 15px;
                        border-bottom: 1px solid #eee;
                        vertical-align: top;
                    }
                    .items-table tbody tr:last-child td {
                        border-bottom: 2px solid #e0e0e0;
                    }
                    .product-name {
                        font-weight: 600;
                        color: #333;
                    }
                    .product-code {
                        font-size: 12px;
                        color: #888;
                        margin-top: 2px;
                    }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    
                    .invoice-summary {
                        display: flex;
                        justify-content: flex-end;
                    }
                    .summary-table {
                        width: 320px;
                    }
                    .summary-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 10px 0;
                        border-bottom: 1px solid #eee;
                    }
                    .summary-row.subtotal {
                        color: #666;
                    }
                    .summary-row.discount span:last-child {
                        color: #2e7d32;
                    }
                    .summary-row.total {
                        border-top: 2px solid #475569;
                        border-bottom: none;
                        margin-top: 10px;
                        padding-top: 15px;
                    }
                    .summary-row.total span {
                        font-size: 20px;
                        font-weight: 700;
                        color: #475569;
                    }
                    .summary-row.paid span:last-child {
                        color: #2e7d32;
                        font-weight: 600;
                    }
                    .summary-row.balance {
                        background: ${sale.balance_due > 0 ? '#ffebee' : '#e8f5e9'};
                        padding: 12px;
                        border-radius: 6px;
                        margin-top: 10px;
                    }
                    .summary-row.balance span {
                        font-weight: 700;
                        color: ${sale.balance_due > 0 ? '#c62828' : '#2e7d32'};
                    }
                    
                    .invoice-footer {
                        background: #f8f9fa;
                        padding: 25px 40px;
                        border-top: 1px solid #eee;
                    }
                    .footer-content {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .payment-info h4 {
                        font-size: 12px;
                        text-transform: uppercase;
                        color: #888;
                        margin-bottom: 5px;
                    }
                    .payment-info p {
                        color: #555;
                        font-size: 13px;
                    }
                    .thank-you {
                        text-align: right;
                        color: #475569;
                        font-size: 18px;
                        font-weight: 600;
                    }
                    
                    @page { 
                        size: A4; 
                        margin: 0; 
                    }
                    @media print { 
                        body { 
                            background: white;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        .invoice-container {
                            margin: 0;
                            box-shadow: none;
                            border-radius: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="invoice-container">
                    <div class="invoice-header">
                        <div class="company-info">
                            <h1>JC Glasshouse</h1>
                            <p>Auto Glass Solutions</p>
                        </div>
                        <div class="invoice-title">
                            <h2>INVOICE</h2>
                            <p class="invoice-number">${sale.invoice_number}</p>
                        </div>
                    </div>
                    
                    <div class="invoice-body">
                        <div class="invoice-meta">
                            <div class="billing-info">
                                <p class="section-title">Bill To</p>
                                <p class="customer-name">${sale.customer_name || 'N/A'}</p>
                                ${sale.customer_company ? `<p>🏢 ${sale.customer_company}</p>` : ''}
                                ${sale.customer_phone ? `<p>📞 ${sale.customer_phone}</p>` : ''}
                                ${sale.customer_city ? `<p>📍 ${sale.customer_city}</p>` : ''}
                                ${sale.customer_address ? `<p style="margin-top: 5px; color: #777;">${sale.customer_address}</p>` : ''}
                            </div>
                            <div class="invoice-details">
                                <p class="section-title">Invoice Details</p>
                                <div class="invoice-details-grid">
                                    <div class="detail-item">
                                        <label>Invoice Date</label>
                                        <span>${new Date(sale.sale_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                    </div>
                                    <div class="detail-item">
                                        <label>Payment Status</label>
                                        <span class="status-badge status-${sale.payment_status}">${sale.payment_status}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th style="width: 5%">#</th>
                                    <th style="width: 45%">Product Description</th>
                                    <th class="text-center" style="width: 15%">Quantity</th>
                                    <th class="text-right" style="width: 15%">Unit Price</th>
                                    <th class="text-right" style="width: 20%">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(sale.items || []).map((item, index) => `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td>
                                            <div class="product-name">${item.product_name || 'N/A'}</div>
                                            ${item.product_code ? `<div class="product-code">${item.product_code}</div>` : ''}
                                        </td>
                                        <td class="text-center">${item.quantity}</td>
                                        <td class="text-right">₹${Number(item.unit_price || 0).toLocaleString('en-IN')}</td>
                                        <td class="text-right"><strong>₹${(item.quantity * (item.unit_price || 0)).toLocaleString('en-IN')}</strong></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        
                        <div class="invoice-summary">
                            <div class="summary-table">
                                <div class="summary-row subtotal">
                                    <span>Subtotal</span>
                                    <span>₹${Number((sale.total_amount || 0) + (sale.discount_amount || 0)).toLocaleString('en-IN')}</span>
                                </div>
                                ${sale.discount_amount > 0 ? `
                                <div class="summary-row discount">
                                    <span>Discount</span>
                                    <span>- ₹${Number(sale.discount_amount).toLocaleString('en-IN')}</span>
                                </div>
                                ` : ''}
                                <div class="summary-row total">
                                    <span>Total</span>
                                    <span>₹${Number(sale.total_amount || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div class="summary-row paid">
                                    <span>Amount Paid</span>
                                    <span>₹${Number(sale.amount_paid || 0).toLocaleString('en-IN')}</span>
                                </div>
                                <div class="summary-row balance">
                                    <span>Balance Due</span>
                                    <span>₹${Number(sale.balance_due || 0).toLocaleString('en-IN')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    

                </div>
            </body>
            </html>
        `;

        // Open in new window for print/save
        const printWindow = window.open('', '_blank');
        printWindow.document.write(billContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 250);
    };

    // ===== RENDER NEW SALE FORM =====
    const renderStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            <Person sx={{ verticalAlign: 'middle', mr: 1 }} />
                            Customer Details
                        </Typography>
                        <Grid container spacing={3} sx={{ mt: 1 }}>
                            <Grid item xs={12} md={6}>
                                <Autocomplete
                                    freeSolo
                                    options={customers}
                                    getOptionLabel={(option) => typeof option === 'string' ? option : option.name}
                                    value={customerInfo.customer_name}
                                    onChange={(event, newValue) => {
                                        if (typeof newValue === 'string') {
                                            setCustomerInfo({ ...customerInfo, customer_name: newValue });
                                        } else if (newValue && newValue.inputValue) {
                                            setCustomerInfo({ ...customerInfo, customer_name: newValue.inputValue });
                                        } else if (newValue) {
                                            setCustomerInfo({
                                                ...customerInfo,
                                                customer_id: newValue.id,
                                                customer_name: newValue.name,
                                                customer_phone: newValue.phone || '',
                                                customer_company: newValue.company || ''
                                            });
                                        } else {
                                            setCustomerInfo({ ...customerInfo, customer_name: '' });
                                        }
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            required
                                            label="Customer Name"
                                            placeholder="Search or enter new customer"
                                            onChange={(e) => setCustomerInfo({ ...customerInfo, customer_name: e.target.value })}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    fullWidth
                                    label="Phone Number"
                                    value={customerInfo.customer_phone}
                                    onChange={handleCustomerChange('customer_phone')}
                                    placeholder="e.g., 9876543210"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Company Name (Optional)"
                                    value={customerInfo.customer_company}
                                    onChange={handleCustomerChange('customer_company')}
                                    placeholder="Enter company name for B2B customers"
                                />
                            </Grid>
                        </Grid>
                    </Box>
                );

            case 1:
                return (
                    <Box>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom>
                                    Available Products
                                </Typography>
                                <Autocomplete
                                    options={products}
                                    getOptionLabel={(option) =>
                                        `${option.product_code} - ${option.name} (Stock: ${option.stock_quantity})`
                                    }
                                    renderOption={(props, option) => (
                                        <li {...props}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', width: '100%' }}>
                                                <span>{option.product_code} - {option.name} (Stock: {option.stock_quantity})</span>
                                                {option.tags && option.tags.length > 0 && (
                                                    <Box sx={{ display: 'flex', gap: 0.3, ml: 0.5 }}>
                                                        {option.tags.map((tag, idx) => (
                                                            <Chip
                                                                key={idx}
                                                                label={tag.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                                                                size="small"
                                                                sx={{ height: '18px', fontSize: '0.65rem' }}
                                                            />
                                                        ))}
                                                    </Box>
                                                )}
                                            </Box>
                                        </li>
                                    )}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Search and add products"
                                            placeholder="Type to search..."
                                        />
                                    )}
                                    onChange={(event, value) => {
                                        if (value) handleAddProduct(value);
                                    }}
                                    value={null}
                                />
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom>
                                    <ShoppingCart sx={{ verticalAlign: 'middle', mr: 1 }} />
                                    Cart ({selectedProducts.length} items)
                                </Typography>
                                {selectedProducts.length === 0 ? (
                                    <Alert severity="info">No products added yet</Alert>
                                ) : (
                                    <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Product</TableCell>
                                                    <TableCell align="center">Qty</TableCell>
                                                    <TableCell align="center">Action</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {selectedProducts.map((product) => (
                                                    <TableRow key={product.id}>
                                                        <TableCell>
                                                            <Typography variant="body2">{product.name}</Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {product.product_code}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Box display="flex" alignItems="center" justifyContent="center">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleQuantityChange(product.id, product.quantity - 1)}
                                                                >
                                                                    <Remove fontSize="small" />
                                                                </IconButton>
                                                                <Typography sx={{ mx: 1 }}>{product.quantity}</Typography>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => handleQuantityChange(product.id, product.quantity + 1)}
                                                                >
                                                                    <Add fontSize="small" />
                                                                </IconButton>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleRemoveProduct(product.id)}
                                                            >
                                                                <Delete fontSize="small" />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                <TableRow>
                                                    <TableCell align="right">
                                                        <strong>Total Items:</strong>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography variant="h6">
                                                            {selectedProducts.reduce((sum, p) => sum + p.quantity, 0)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell />
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                )}
                            </Grid>
                        </Grid>
                    </Box>
                );

            case 2:
                return (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            <Assessment sx={{ verticalAlign: 'middle', mr: 1 }} />
                            Sale Details
                        </Typography>
                        <Grid container spacing={3} sx={{ mt: 1 }}>
                            <Grid item xs={12}>
                                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default', mb: 2 }}>
                                    <Typography variant="h6" gutterBottom>
                                        <ShoppingCart sx={{ verticalAlign: 'middle', mr: 1 }} />
                                        Items Summary
                                    </Typography>
                                    <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Product</TableCell>
                                                    <TableCell align="right">Quantity</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {selectedProducts.map((product) => (
                                                    <TableRow key={product.id}>
                                                        <TableCell>
                                                            <Typography variant="body2">{product.name}</Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {product.product_code}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2" fontWeight="bold">
                                                                {product.quantity}
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                <TableRow>
                                                    <TableCell>
                                                        <Typography variant="subtitle1" fontWeight="bold">
                                                            Total Items
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <Typography variant="h6" color="primary">
                                                            {selectedProducts.reduce((sum, p) => sum + p.quantity, 0)}
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                                        Prices will be added in the Pending Sales section after creating this sale.
                                    </Typography>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Payment Method</InputLabel>
                                    <Select
                                        value={paymentInfo.payment_method}
                                        label="Payment Method"
                                        onChange={handlePaymentChange('payment_method')}
                                    >
                                        <MenuItem value="cash">Cash</MenuItem>
                                        <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                                        <MenuItem value="upi">UPI</MenuItem>
                                        <MenuItem value="credit">Credit</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Payment Status</InputLabel>
                                    <Select
                                        value={paymentInfo.payment_status}
                                        label="Payment Status"
                                        onChange={handlePaymentChange('payment_status')}
                                    >
                                        <MenuItem value="paid">Paid</MenuItem>
                                        <MenuItem value="partial">Partial</MenuItem>
                                        <MenuItem value="unpaid">Unpaid</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Notes (Optional)"
                                    value={paymentInfo.notes}
                                    onChange={handlePaymentChange('notes')}
                                    placeholder="Add any internal notes..."
                                />
                            </Grid>
                        </Grid>
                    </Box>
                );

            default:
                return 'Unknown step';
        }
    };

    const renderNewSaleForm = () => (
        <Box>
            <Paper sx={{ p: 3 }}>
                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                <Box sx={{ minHeight: 400 }}>
                    {renderStepContent(activeStep)}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                    <Button
                        variant="outlined"
                        onClick={resetNewSaleForm}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Box>
                        <Button
                            disabled={activeStep === 0 || loading}
                            onClick={handleBack}
                            sx={{ mr: 1 }}
                            startIcon={<ArrowBack />}
                        >
                            Back
                        </Button>
                        {activeStep === steps.length - 1 ? (
                            <Button
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={loading || selectedProducts.length === 0}
                                startIcon={loading ? <CircularProgress size={20} /> : <Check />}
                            >
                                {loading ? 'Creating...' : 'Create Sale'}
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                onClick={handleNext}
                                endIcon={<ArrowForward />}
                            >
                                Next
                            </Button>
                        )}
                    </Box>
                </Box>
            </Paper>
        </Box>
    );

    // ===== RENDER SALES HISTORY =====
    const columns = [
        { field: 'id', headerName: 'Sale ID', width: 90 },
        {
            field: 'customer_name',
            headerName: 'Customer',
            width: 180,
            valueFormatter: (params) => params.value || 'N/A'
        },
        ...(canViewFinancials ? [{
            field: 'total_amount',
            headerName: 'Total',
            width: 120,
            type: 'number',
            valueFormatter: (params) => params.value != null ? `₹${Number(params.value).toFixed(2)}` : '₹0.00'
        }] : []),
        ...(canViewFinancials ? [{
            field: 'balance_due',
            headerName: 'Balance',
            width: 120,
            type: 'number',
            renderCell: (params) => (
                <Typography color={params.value > 0 ? 'error.main' : 'success.main'} variant="body2">
                    ₹{Number(params.value).toFixed(2)}
                </Typography>
            )
        }] : []),
        {
            field: 'payment_status',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => {
                const statusColors = { paid: 'success', unpaid: 'error', partial: 'warning' };
                return <Chip label={params.value} color={statusColors[params.value] || 'default'} size="small" />;
            }
        },
        ...(canViewFinancials ? [{
            field: 'actions',
            headerName: 'Actions',
            width: 240,
            renderCell: (params) => (
                <Box display="flex" gap={0.5}>
                    <IconButton
                        size="small"
                        color="primary"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadBill(params.row);
                        }}
                        title="Download Bill"
                    >
                        <Download fontSize="small" />
                    </IconButton>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<PaymentIcon />}
                        onClick={(e) => handlePaymentClick(e, params.row)}
                    >
                        Pay
                    </Button>
                    <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => handleDeleteSaleClick(e, params.row)}
                        title="Delete Sale"
                    >
                        <Delete fontSize="small" />
                    </IconButton>
                </Box>
            )
        }] : []),
        {
            field: 'sale_date',
            headerName: 'Date',
            width: 180,
            type: 'dateTime',
            valueGetter: (params) => params.value ? new Date(params.value) : null
        },
    ];

    const renderSalesHistory = () => (
        <Box>
            <Paper sx={{ height: 600, width: '100%' }}>
                <DataGrid
                    rows={sales}
                    columns={columns}
                    loading={salesLoading}
                    getRowId={(row) => row.id}
                    onRowClick={handleRowClick}
                    sx={{
                        '& .MuiDataGrid-row': {
                            cursor: 'pointer'
                        }
                    }}
                />
            </Paper>

            {/* Enhanced Sale Details Dialog */}
            <Dialog open={detailsOpen} onClose={handleCloseDetails} maxWidth="md" fullWidth>
                <DialogTitle sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Receipt />
                        <Typography variant="h6">
                            Invoice {selectedSale?.invoice_number}
                        </Typography>
                    </Box>
                    <Box>
                        <Button
                            startIcon={<Download />}
                            onClick={() => handleDownloadBill(selectedSale)}
                            sx={{ color: 'white', mr: 1 }}
                            size="small"
                        >
                            Download Bill
                        </Button>
                        <IconButton onClick={handleCloseDetails} sx={{ color: 'white' }}>
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {selectedSale && (
                        <>
                            {/* Invoice Info Cards */}
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={12} sm={4}>
                                    <Paper sx={{ p: 2, bgcolor: 'grey.50', height: '100%' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                                            Invoice Date
                                        </Typography>
                                        <Typography variant="h6" fontWeight="bold" color="primary">
                                            {selectedSale.sale_date ? new Date(selectedSale.sale_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Paper sx={{ p: 2, bgcolor: 'grey.50', height: '100%' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                                            Sale Status
                                        </Typography>
                                        <Box mt={0.5}>
                                            <Chip
                                                label={selectedSale.status}
                                                color={selectedSale.status === 'completed' ? 'success' : 'warning'}
                                                size="small"
                                            />
                                        </Box>
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Paper sx={{ p: 2, bgcolor: 'grey.50', height: '100%' }}>
                                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                                            Payment Status
                                        </Typography>
                                        <Box mt={0.5}>
                                            <Chip
                                                label={selectedSale.payment_status}
                                                color={
                                                    selectedSale.payment_status === 'paid' ? 'success' :
                                                        selectedSale.payment_status === 'unpaid' ? 'error' : 'warning'
                                                }
                                                size="small"
                                            />
                                        </Box>
                                    </Paper>
                                </Grid>
                            </Grid>

                            {/* Customer Details Section */}
                            <Paper sx={{
                                p: 2.5,
                                mb: 3,
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                borderRadius: 2
                            }}>
                                <Typography variant="overline" sx={{ opacity: 0.9 }}>
                                    Bill To
                                </Typography>
                                <Typography variant="h5" fontWeight="bold" sx={{ mb: 1.5 }}>
                                    {selectedSale.customer_name || 'N/A'}
                                </Typography>
                                <Grid container spacing={2}>
                                    {selectedSale.customer_phone && (
                                        <Grid item xs={12} sm={6}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Phone fontSize="small" sx={{ opacity: 0.8 }} />
                                                <Typography variant="body2">{selectedSale.customer_phone}</Typography>
                                            </Box>
                                        </Grid>
                                    )}
                                    {selectedSale.customer_company && (
                                        <Grid item xs={12} sm={6}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Business fontSize="small" sx={{ opacity: 0.8 }} />
                                                <Typography variant="body2">{selectedSale.customer_company}</Typography>
                                            </Box>
                                        </Grid>
                                    )}
                                    {selectedSale.customer_city && (
                                        <Grid item xs={12} sm={6}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <LocationOn fontSize="small" sx={{ opacity: 0.8 }} />
                                                <Typography variant="body2">{selectedSale.customer_city}</Typography>
                                            </Box>
                                        </Grid>
                                    )}
                                    {selectedSale.customer_address && (
                                        <Grid item xs={12}>
                                            <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
                                                📮 {selectedSale.customer_address}
                                            </Typography>
                                        </Grid>
                                    )}
                                </Grid>
                            </Paper>

                            {/* Items Table */}
                            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ShoppingCart fontSize="small" />
                                Items Sold
                            </Typography>
                            <TableContainer component={Paper} variant="outlined" sx={{ mb: 3, maxWidth: '100%', overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ bgcolor: 'primary.main' }}>
                                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Product</TableCell>
                                            <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>Qty</TableCell>
                                            {canViewFinancials && (
                                                <>
                                                    <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Unit Price</TableCell>
                                                    <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Total</TableCell>
                                                </>
                                            )}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {selectedSale.items && selectedSale.items.length > 0 ? (
                                            selectedSale.items.map((item, index) => (
                                                <TableRow key={index} hover>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {item.product_name || 'Unknown Product'}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {item.product_code || ''}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip label={item.quantity} size="small" />
                                                    </TableCell>
                                                    {canViewFinancials && (
                                                        <>
                                                            <TableCell align="right">₹{Number(item.unit_price || 0).toLocaleString('en-IN')}</TableCell>
                                                            <TableCell align="right">
                                                                <Typography fontWeight="bold">
                                                                    ₹{(item.quantity * (item.unit_price || 0)).toLocaleString('en-IN')}
                                                                </Typography>
                                                            </TableCell>
                                                        </>
                                                    )}
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={canViewFinancials ? 4 : 2} align="center">No items found</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            {/* Payment Summary */}
                            {canViewFinancials && (
                                <Box display="flex" justifyContent="flex-end">
                                    <Paper sx={{ p: 2, minWidth: 280, bgcolor: 'grey.50' }}>
                                        <Box display="flex" justifyContent="space-between" mb={1}>
                                            <Typography color="text.secondary">Subtotal</Typography>
                                            <Typography>₹{Number((selectedSale.total_amount || 0) + (selectedSale.discount_amount || 0)).toLocaleString('en-IN')}</Typography>
                                        </Box>
                                        {selectedSale.discount_amount > 0 && (
                                            <Box display="flex" justifyContent="space-between" mb={1}>
                                                <Typography color="text.secondary">Discount</Typography>
                                                <Typography color="success.main">- ₹{Number(selectedSale.discount_amount).toLocaleString('en-IN')}</Typography>
                                            </Box>
                                        )}
                                        <Divider sx={{ my: 1 }} />
                                        <Box display="flex" justifyContent="space-between" mb={1}>
                                            <Typography fontWeight="bold" color="primary">Total Amount</Typography>
                                            <Typography fontWeight="bold" color="primary" variant="h6">
                                                ₹{Number(selectedSale.total_amount || 0).toLocaleString('en-IN')}
                                            </Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between" mb={1}>
                                            <Typography color="text.secondary">Amount Paid</Typography>
                                            <Typography color="success.main">₹{Number(selectedSale.amount_paid || 0).toLocaleString('en-IN')}</Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between" sx={{
                                            bgcolor: selectedSale.balance_due > 0 ? 'error.light' : 'success.light',
                                            p: 1,
                                            borderRadius: 1,
                                            mt: 1
                                        }}>
                                            <Typography fontWeight="bold">Balance Due</Typography>
                                            <Typography fontWeight="bold">
                                                ₹{Number(selectedSale.balance_due || 0).toLocaleString('en-IN')}
                                            </Typography>
                                        </Box>
                                    </Paper>
                                </Box>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    {canViewFinancials && selectedSale && (
                        <Button
                            variant="outlined"
                            startIcon={<PaymentIcon />}
                            onClick={() => {
                                handleCloseDetails();
                                setPaymentSale(selectedSale);
                                setPaymentOpen(true);
                            }}
                        >
                            Add Payment
                        </Button>
                    )}
                    <Button
                        variant="contained"
                        startIcon={<Download />}
                        onClick={() => handleDownloadBill(selectedSale)}
                    >
                        Download Bill
                    </Button>
                    <Button onClick={handleCloseDetails}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Payment Management Dialog */}
            <PaymentDialog
                open={paymentOpen}
                onClose={() => setPaymentOpen(false)}
                sale={paymentSale}
                onPaymentAdded={fetchSales}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete sale <strong>{saleToDelete?.invoice_number}</strong>?
                    </Typography>
                    <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                        This will also restore stock quantities for all products in this sale.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                    <Button onClick={handleDeleteSaleConfirm} variant="contained" color="error">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );

    // ===== RENDER PENDING SALES =====
    const renderPendingSales = () => (
        <Box>
            {pendingLoading ? (
                <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                </Box>
            ) : pendingSales.length === 0 ? (
                <Alert severity="info">No pending sales. Create a new sale to get started.</Alert>
            ) : (
                <Grid container spacing={2}>
                    {pendingSales.map((sale) => (
                        <Grid item xs={12} md={6} lg={4} key={sale.id}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Box>
                                            <Typography variant="h6" gutterBottom>
                                                {sale.invoice_number}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {sale.customer_name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(sale.sale_date).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label="Pending"
                                            color="warning"
                                            size="small"
                                            icon={<HourglassEmpty />}
                                        />
                                    </Box>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="body2" gutterBottom>
                                        <strong>Items:</strong> {sale.items_count}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                        Items needing prices: {sale.items?.filter(i => !i.unit_price || i.unit_price === 0).length || 'N/A'}
                                    </Typography>
                                    <Box mt={2}>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            startIcon={<Edit />}
                                            onClick={() => handleEditPendingSale(sale)}
                                            fullWidth
                                        >
                                            Add Prices
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Edit Pending Sale Dialog */}
            <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    Edit Pending Sale - {editingSale?.invoice_number}
                    <IconButton
                        onClick={() => setEditDialogOpen(false)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    {editingSale && (
                        <>
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" color="text.secondary">Customer</Typography>
                                <Typography variant="body1">{editingSale.customer_name}</Typography>
                            </Box>

                            {/* Add New Item Section */}
                            <Typography variant="subtitle1" gutterBottom>Add New Item</Typography>
                            <Grid container spacing={2} alignItems="flex-end" sx={{ mb: 3 }}>
                                <Grid item xs={12} md={5}>
                                    <Autocomplete
                                        options={products}
                                        getOptionLabel={(option) => option.name}
                                        value={editCurrentProduct}
                                        onChange={(e, newValue) => setEditCurrentProduct(newValue)}
                                        renderInput={(params) => (
                                            <TextField {...params} label="Select Product" placeholder="Search product" size="small" />
                                        )}
                                        renderOption={(props, option) => (
                                            <li {...props}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                                    <span>{option.product_code} - {option.name}</span>
                                                    {option.tags && option.tags.length > 0 && (
                                                        <Box sx={{ display: 'flex', gap: 0.3, ml: 0.5 }}>
                                                            {option.tags.map((tag, idx) => (
                                                                <Chip
                                                                    key={idx}
                                                                    label={tag.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                                                                    size="small"
                                                                    sx={{ height: '18px', fontSize: '0.65rem' }}
                                                                />
                                                            ))}
                                                        </Box>
                                                    )}
                                                    <Typography variant="caption" color="text.secondary">
                                                        (Stock: {option.stock_quantity})
                                                    </Typography>
                                                </Box>
                                            </li>
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Quantity"
                                        size="small"
                                        value={editQuantity}
                                        onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                                        inputProps={{ min: 1 }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Unit Price (Optional)"
                                        size="small"
                                        value={editPrice}
                                        onChange={(e) => setEditPrice(e.target.value)}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                                        }}
                                        placeholder="Enter price"
                                    />
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        startIcon={<Add />}
                                        onClick={handleEditAddItem}
                                        disabled={!editCurrentProduct}
                                    >
                                        Add
                                    </Button>
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="h6" sx={{ mb: 2 }}>Sale Items</Typography>
                            <TableContainer component={Paper} variant="outlined" sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Product</TableCell>
                                            <TableCell align="center">Quantity</TableCell>
                                            <TableCell align="right">Unit Price</TableCell>
                                            <TableCell align="right">Line Total</TableCell>
                                            <TableCell align="center">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {/* Existing Items */}
                                        {editItems.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <Typography variant="body2">{item.product_name}</Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {item.product_code}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <TextField
                                                        type="number"
                                                        size="small"
                                                        value={item.quantity}
                                                        onChange={(e) => handleEditItemQuantityChange(item.id, e.target.value)}
                                                        inputProps={{ min: 1 }}
                                                        sx={{ width: 80 }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <TextField
                                                        type="number"
                                                        size="small"
                                                        value={item.unit_price}
                                                        onChange={(e) => handleEditItemPriceChange(item.id, e.target.value)}
                                                        InputProps={{
                                                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                                                        }}
                                                        sx={{ width: 120 }}
                                                        placeholder="Enter price"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography>
                                                        {item.unit_price ? `₹${(item.quantity * parseFloat(item.unit_price)).toFixed(2)}` : '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleEditDeleteItem(item.id)}
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                        {/* Newly Added Items */}
                                        {newEditItems.map((item) => (
                                            <TableRow key={item.id} sx={{ bgcolor: 'action.hover' }}>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {item.product_name}
                                                        <Chip label="NEW" size="small" color="success" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {item.product_code}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <TextField
                                                        type="number"
                                                        size="small"
                                                        value={item.quantity}
                                                        onChange={(e) => handleNewEditItemQuantityChange(item.id, e.target.value)}
                                                        inputProps={{ min: 1 }}
                                                        sx={{ width: 80 }}
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <TextField
                                                        type="number"
                                                        size="small"
                                                        value={item.unit_price}
                                                        onChange={(e) => handleNewEditItemPriceChange(item.id, e.target.value)}
                                                        InputProps={{
                                                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                                                        }}
                                                        sx={{ width: 120 }}
                                                        placeholder="Enter price"
                                                    />
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography>
                                                        {item.unit_price ? `₹${(item.quantity * parseFloat(item.unit_price)).toFixed(2)}` : '-'}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleEditDeleteItem(item.id)}
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                        {/* Total Row */}
                                        <TableRow>
                                            <TableCell colSpan={3} align="right">
                                                <strong>Total:</strong>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Typography variant="h6">
                                                    ₹{[...editItems, ...newEditItems].reduce((sum, item) =>
                                                        sum + (item.unit_price ? item.quantity * parseFloat(item.unit_price) : 0), 0
                                                    ).toFixed(2)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell />
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Alert severity="info" sx={{ mt: 2 }}>
                                Once all items have prices, the sale will automatically move to Sales History.
                            </Alert>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSavePendingSale}
                        disabled={editLoading}
                        startIcon={editLoading ? <CircularProgress size={20} /> : <Check />}
                    >
                        {editLoading ? 'Saving...' : 'Save Prices'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );

    return (
        <Box p={3} sx={{ bgcolor: 'background.default', minHeight: '100vh', borderRadius: 4 }}>
            <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper' }}>
                <Typography variant="h4" gutterBottom sx={{ color: 'primary.main' }}>
                    <Receipt sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Sales
                </Typography>

                <Paper sx={{ mb: 3 }}>
                    <Tabs
                        value={activeTab}
                        onChange={(e, newValue) => setActiveTab(newValue)}
                        indicatorColor="primary"
                        textColor="primary"
                    >
                        <Tab label="Create New Sale" icon={<Add />} iconPosition="start" />
                        <Tab
                            label={`Pending Sales (${pendingSales.length})`}
                            icon={<HourglassEmpty />}
                            iconPosition="start"
                        />
                        {canViewFinancials && <Tab label="Sales History" icon={<Receipt />} iconPosition="start" />}
                    </Tabs>
                </Paper>

                {activeTab === 0 && renderNewSaleForm()}
                {activeTab === 1 && renderPendingSales()}
                {canViewFinancials && activeTab === 2 && renderSalesHistory()}

                <Snackbar
                    open={openSnackbar}
                    autoHideDuration={2000}
                    onClose={() => setOpenSnackbar(false)}
                    message="Product added to cart"
                />
            </Paper>
        </Box>
    );
};

export default SalesPage;

