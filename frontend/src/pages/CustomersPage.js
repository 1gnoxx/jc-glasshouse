import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    TextField,
    Typography,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    InputAdornment,
    Alert,
    CircularProgress,
    Chip,
    Divider,
    alpha
} from '@mui/material';
import {
    Add,
    Search,
    Edit,
    Delete,
    Person,
    Close,
    Receipt,
    ShoppingCart,
    Payment
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const CustomersPage = () => {
    const { user } = useAuth();
    const notify = useNotification();
    const canViewFinancials = user?.can_view_financials || false;

    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Dialog state
    const [openDialog, setOpenDialog] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        company: '',
        city: '',
        address: ''
    });

    // Sales history dialog state
    const [salesDialogOpen, setSalesDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerSales, setCustomerSales] = useState([]);
    const [salesLoading, setSalesLoading] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, [searchTerm]);

    const fetchCustomers = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/customers?search=${searchTerm}`);
            setCustomers(response.data.data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching customers:', err);
            setError('Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (customer = null) => {
        if (customer) {
            setEditingCustomer(customer);
            setFormData({
                name: customer.name,
                phone: customer.phone || '',
                company: customer.company || '',
                city: customer.city || '',
                address: customer.address || ''
            });
        } else {
            setEditingCustomer(null);
            setFormData({
                name: '',
                phone: '',
                company: '',
                city: '',
                address: ''
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingCustomer(null);
        setError(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            notify.warning('Customer Name is required', 'Validation');
            return;
        }

        try {
            if (editingCustomer) {
                await api.put(`/customers/${editingCustomer.id}`, formData);
            } else {
                await api.post('/customers', formData);
            }
            fetchCustomers();
            handleCloseDialog();
            notify.success(editingCustomer ? 'Customer updated successfully!' : 'Customer created successfully!', 'Customer');
        } catch (err) {
            console.error('Error saving customer:', err);
            notify.error('Failed to save customer');
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation(); // Prevent row click
        if (window.confirm('Are you sure you want to delete this customer?')) {
            try {
                await api.delete(`/customers/${id}`);
                fetchCustomers();
                notify.success('Customer deleted successfully!', 'Customer');
            } catch (err) {
                console.error('Error deleting customer:', err);
                notify.error(err.response?.data?.msg || 'Failed to delete customer');
            }
        }
    };

    const handleEditClick = (customer, e) => {
        e.stopPropagation(); // Prevent row click
        handleOpenDialog(customer);
    };

    const handleRowClick = async (customer) => {
        setSelectedCustomer(customer);
        setSalesDialogOpen(true);
        setSalesLoading(true);

        try {
            const response = await api.get('/sales');
            const allSales = response.data.data || [];
            // Filter sales for this customer - match by customer_id or customer_name
            const customerSalesData = allSales.filter(
                sale => sale.customer_id === customer.id ||
                    (sale.customer_name && sale.customer_name.toLowerCase() === customer.name.toLowerCase())
            ).sort((a, b) => new Date(b.sale_date) - new Date(a.sale_date));
            setCustomerSales(customerSalesData);
        } catch (err) {
            console.error('Error fetching customer sales:', err);
            setCustomerSales([]);
        } finally {
            setSalesLoading(false);
        }
    };

    const handleCloseSalesDialog = () => {
        setSalesDialogOpen(false);
        setSelectedCustomer(null);
        setCustomerSales([]);
    };

    const getPaymentStatusColor = (status) => {
        switch (status) {
            case 'paid': return '#10b981';
            case 'partial': return '#f59e0b';
            case 'unpaid': return '#ef4444';
            default: return '#64748b';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return '#10b981';
            case 'pending': return '#f59e0b';
            default: return '#64748b';
        }
    };

    // Calculate customer summary
    const getCustomerSummary = () => {
        if (customerSales.length === 0) return null;

        const totalSales = customerSales.length;
        const completedSales = customerSales.filter(s => s.status === 'completed').length;
        const totalAmount = customerSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);
        const totalPaid = customerSales.reduce((sum, s) => sum + (s.amount_paid || 0), 0);
        const outstanding = totalAmount - totalPaid;
        const totalItems = customerSales.reduce((sum, s) => sum + (s.items_count || 0), 0);

        return { totalSales, completedSales, totalAmount, totalPaid, outstanding, totalItems };
    };

    return (
        <Box sx={{ p: { xs: 0, sm: 1 } }}>
            <Box
                display="flex"
                flexDirection={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                gap={2}
                mb={3}
            >
                <Typography variant="h5" component="h1" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, color: 'primary.main' }}>
                    Customers
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenDialog()}
                    fullWidth
                    sx={{ maxWidth: { sm: 180 } }}
                >
                    Add Customer
                </Button>
            </Box>

            <Paper sx={{ mb: 3, p: { xs: 1.5, sm: 2 } }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    size="small"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search />
                            </InputAdornment>
                        ),
                    }}
                />
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Phone</TableCell>
                            <TableCell>Company</TableCell>
                            <TableCell>City</TableCell>
                            <TableCell>Address</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                    <CircularProgress />
                                </TableCell>
                            </TableRow>
                        ) : customers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                    <Typography color="textSecondary">
                                        No customers found
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            customers.map((customer) => (
                                <TableRow
                                    key={customer.id}
                                    hover
                                    sx={{ cursor: 'pointer' }}
                                    onClick={() => handleRowClick(customer)}
                                >
                                    <TableCell>
                                        <Box display="flex" alignItems="center">
                                            <Person sx={{ mr: 1, color: 'text.secondary' }} />
                                            <Typography variant="body1" fontWeight="medium">
                                                {customer.name}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>{customer.phone || '-'}</TableCell>
                                    <TableCell>{customer.company || '-'}</TableCell>
                                    <TableCell>{customer.city || '-'}</TableCell>
                                    <TableCell>{customer.address || '-'}</TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            color="primary"
                                            onClick={(e) => handleEditClick(customer, e)}
                                            size="small"
                                        >
                                            <Edit />
                                        </IconButton>
                                        <IconButton
                                            color="error"
                                            onClick={(e) => handleDelete(customer.id, e)}
                                            size="small"
                                        >
                                            <Delete />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Add/Edit Dialog */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label="Customer Name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            fullWidth
                            autoFocus
                        />
                        <TextField
                            label="Phone Number"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            fullWidth
                        />
                        <TextField
                            label="Company Name"
                            name="company"
                            value={formData.company}
                            onChange={handleInputChange}
                            fullWidth
                        />
                        <TextField
                            label="City"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            fullWidth
                        />
                        <TextField
                            label="Address"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="Full address (optional)"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {editingCustomer ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Customer Sales History Dialog */}
            <Dialog
                open={salesDialogOpen}
                onClose={handleCloseSalesDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center" gap={1}>
                            <Person color="primary" />
                            <Typography variant="h6">
                                {selectedCustomer?.name} - Sales History
                            </Typography>
                        </Box>
                        <IconButton onClick={handleCloseSalesDialog} size="small">
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent dividers>
                    {salesLoading ? (
                        <Box display="flex" justifyContent="center" py={4}>
                            <CircularProgress />
                        </Box>
                    ) : customerSales.length === 0 ? (
                        <Box py={4} textAlign="center">
                            <ShoppingCart sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                            <Typography color="text.secondary">
                                No sales found for this customer
                            </Typography>
                        </Box>
                    ) : (
                        <>
                            {/* Customer Summary */}
                            {(() => {
                                const summary = getCustomerSummary();
                                if (!summary) return null;
                                return (
                                    <Box mb={3}>
                                        <Box
                                            display="flex"
                                            flexWrap="wrap"
                                            gap={2}
                                            sx={{
                                                p: 2,
                                                bgcolor: 'grey.50',
                                                borderRadius: 2
                                            }}
                                        >
                                            <Box flex={1} minWidth={120}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Total Sales
                                                </Typography>
                                                <Typography variant="h6" fontWeight="bold">
                                                    {summary.totalSales}
                                                </Typography>
                                            </Box>
                                            <Box flex={1} minWidth={120}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Items Purchased
                                                </Typography>
                                                <Typography variant="h6" fontWeight="bold">
                                                    {summary.totalItems}
                                                </Typography>
                                            </Box>
                                            {canViewFinancials && (
                                                <>
                                                    <Box flex={1} minWidth={120}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Total Amount
                                                        </Typography>
                                                        <Typography variant="h6" fontWeight="bold">
                                                            ₹{summary.totalAmount.toLocaleString()}
                                                        </Typography>
                                                    </Box>
                                                    <Box flex={1} minWidth={120}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Amount Paid
                                                        </Typography>
                                                        <Typography variant="h6" fontWeight="bold" color="success.main">
                                                            ₹{summary.totalPaid.toLocaleString()}
                                                        </Typography>
                                                    </Box>
                                                    <Box flex={1} minWidth={120}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Outstanding
                                                        </Typography>
                                                        <Typography
                                                            variant="h6"
                                                            fontWeight="bold"
                                                            color={summary.outstanding > 0 ? 'error.main' : 'success.main'}
                                                        >
                                                            ₹{summary.outstanding.toLocaleString()}
                                                        </Typography>
                                                    </Box>
                                                </>
                                            )}
                                        </Box>
                                    </Box>
                                );
                            })()}

                            {/* Sales Table */}
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Invoice</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Items</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Payment</TableCell>
                                            {canViewFinancials && (
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                                            )}
                                            {canViewFinancials && (
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Balance</TableCell>
                                            )}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {customerSales.map((sale) => {
                                            const balance = (sale.total_amount || 0) - (sale.amount_paid || 0);
                                            return (
                                                <TableRow key={sale.id} hover>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {sale.invoice_number}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2">
                                                            {new Date(sale.sale_date).toLocaleDateString()}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={sale.items_count || 0}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Chip
                                                            label={sale.status}
                                                            size="small"
                                                            sx={{
                                                                bgcolor: alpha(getStatusColor(sale.status), 0.1),
                                                                color: getStatusColor(sale.status),
                                                                fontWeight: 500
                                                            }}
                                                        />
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
                                                    {canViewFinancials && (
                                                        <TableCell align="right">
                                                            <Typography variant="body2" fontWeight="bold">
                                                                ₹{sale.total_amount?.toLocaleString() || 0}
                                                            </Typography>
                                                        </TableCell>
                                                    )}
                                                    {canViewFinancials && (
                                                        <TableCell align="right">
                                                            <Typography
                                                                variant="body2"
                                                                fontWeight="bold"
                                                                color={balance > 0 ? 'error.main' : 'success.main'}
                                                            >
                                                                ₹{balance.toLocaleString()}
                                                            </Typography>
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseSalesDialog} variant="contained">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CustomersPage;
