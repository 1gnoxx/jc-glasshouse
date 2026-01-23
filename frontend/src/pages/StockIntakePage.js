import React, { useState, useEffect } from 'react';
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
    InputAdornment
} from '@mui/material';
import {
    Add,
    Delete,
    Edit,
    LocalShipping,
    Visibility,
    ShoppingCart
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const StockIntakePage = () => {
    const { user } = useAuth();
    const notify = useNotification();
    const canViewFinancials = user?.can_view_financials || false;
    const [activeTab, setActiveTab] = useState(0); // 0 = Record, 1 = Pending, 2 = History

    // Record form state
    const [supplierName, setSupplierName] = useState('');
    const [intakeDate, setIntakeDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [products, setProducts] = useState([]);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [productInputValue, setProductInputValue] = useState(''); // Add input value state
    const [quantity, setQuantity] = useState('');
    const [purchasePrice, setPurchasePrice] = useState('');

    // History state
    const [intakes, setIntakes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [detailDialog, setDetailDialog] = useState(false);
    const [selectedIntake, setSelectedIntake] = useState(null);

    // Edit pending intake state
    const [editDialog, setEditDialog] = useState(false);
    const [editingIntake, setEditingIntake] = useState(null);
    const [editItems, setEditItems] = useState([]);
    const [editCurrentProduct, setEditCurrentProduct] = useState(null);
    const [editProductInputValue, setEditProductInputValue] = useState('');
    const [editQuantity, setEditQuantity] = useState('');
    const [editPrice, setEditPrice] = useState('');
    const [deletedItemIds, setDeletedItemIds] = useState([]);
    const [newEditItems, setNewEditItems] = useState([]);

    // Delete confirmation state
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [intakeToDelete, setIntakeToDelete] = useState(null);

    // New product dialog state
    const [newProductDialog, setNewProductDialog] = useState(false);
    const [newProductData, setNewProductData] = useState({
        name: '',
        year: '',
        category: 'windshield',
        description: '',
        length_mm: '',
        width_mm: '',
        stock_quantity: 0,
        purchase_price: ''
    });
    const [creatingProduct, setCreatingProduct] = useState(false);

    useEffect(() => {
        fetchProducts();
        if (activeTab === 1 || activeTab === 2) {
            fetchIntakes();
        }
    }, [activeTab]);

    const fetchProducts = async () => {
        try {
            const response = await api.get('/products');
            setProducts(response.data.data || []);
        } catch (err) {
            console.error('Error fetching products:', err);
        }
    };

    const fetchIntakes = async () => {
        try {
            setLoading(true);
            // Fetch based on current tab: 1 = Pending, 2 = History (completed)
            const status = activeTab === 1 ? 'pending' : 'completed';
            const response = await api.get(`/stock-intake?status=${status}`);
            setIntakes(response.data.data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching intakes:', err);
            setError('Failed to load stock intake history');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNewProduct = async () => {
        if (!newProductData.name.trim()) {
            notify.warning('Please enter product name', 'Validation');
            return;
        }

        // Ensure category has a default value
        const dataToSubmit = { ...newProductData };
        if (!dataToSubmit.category || dataToSubmit.category.trim() === '') {
            dataToSubmit.category = 'windshield';
        }

        try {
            setCreatingProduct(true);
            const productPayload = {
                name: dataToSubmit.name,
                category: dataToSubmit.category,
                year: dataToSubmit.year || undefined,
                description: dataToSubmit.description || undefined,
                length_mm: dataToSubmit.length_mm ? parseFloat(dataToSubmit.length_mm) : undefined,
                width_mm: dataToSubmit.width_mm ? parseFloat(dataToSubmit.width_mm) : undefined,
                stock_quantity: dataToSubmit.stock_quantity || 0,
                purchase_price: dataToSubmit.purchase_price ? parseFloat(dataToSubmit.purchase_price) : undefined
            };

            const response = await api.post('/products', productPayload);

            const createdProduct = response.data.data;
            setProducts(prev => [...prev, createdProduct]);
            setCurrentProduct(createdProduct);
            setNewProductDialog(false);
            setNewProductData({
                name: '',
                year: '',
                category: 'windshield',
                description: '',
                length_mm: '',
                width_mm: '',
                stock_quantity: 0,
                purchase_price: ''
            });
            notify.success('Product created successfully!', 'Product Created');
        } catch (err) {
            console.error('Error creating product:', err);
            notify.error(err.response?.data?.msg || 'Failed to create product');
        } finally {
            setCreatingProduct(false);
        }
    };

    const handleAddProduct = () => {
        if (!currentProduct || !quantity) {
            notify.warning('Please select a product and quantity', 'Validation');
            return;
        }

        const existing = selectedProducts.find(p => p.id === currentProduct.id);
        if (existing) {
            setSelectedProducts(prev =>
                prev.map(p =>
                    p.id === currentProduct.id
                        ? { ...p, quantity: p.quantity + quantity }
                        : p
                )
            );
        } else {
            setSelectedProducts(prev => [
                ...prev,
                {
                    ...currentProduct,
                    quantity,
                    purchase_price_per_unit: purchasePrice ? parseFloat(purchasePrice) : null
                }
            ]);
        }

        setCurrentProduct(null);
        setProductInputValue(''); // Clear the input text
        setQuantity('');
        setPurchasePrice('');
    };

    const handleRemoveProduct = (productId) => {
        setSelectedProducts(prev => prev.filter(p => p.id !== productId));
    };

    const handleSubmitIntake = async () => {
        if (!supplierName.trim()) {
            notify.warning('Please enter supplier name', 'Validation');
            return;
        }
        if (selectedProducts.length === 0) {
            notify.warning('Please add at least one product', 'Validation');
            return;
        }

        try {
            setLoading(true);
            const intakeData = {
                supplier_name: supplierName,
                intake_date: intakeDate,
                notes: notes,
                items: selectedProducts.map(p => ({
                    product_id: p.id,
                    quantity: p.quantity,
                    purchase_price_per_unit: p.purchase_price_per_unit
                }))
            };

            await api.post('/stock-intake', intakeData);
            notify.success('Stock intake recorded successfully!', 'Stock Intake');

            // Reset form
            setSupplierName('');
            setIntakeDate(new Date().toISOString().split('T')[0]);
            setNotes('');
            setSelectedProducts([]);
            setError(null);
        } catch (err) {
            console.error('Error recording intake:', err);
            notify.error(err.response?.data?.msg || 'Failed to record stock intake');
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (intakeId) => {
        try {
            const response = await api.get(`/stock-intake/${intakeId}`);
            setSelectedIntake(response.data.data);
            setDetailDialog(true);
        } catch (err) {
            console.error('Error fetching intake details:', err);
            notify.error('Failed to load intake details');
        }
    };

    const handleEditPending = async (intakeId) => {
        try {
            const response = await api.get(`/stock-intake/${intakeId}`);
            const intake = response.data.data;
            setEditingIntake(intake);
            setEditItems(intake.items.map(item => ({
                ...item,
                purchase_price_per_unit: item.purchase_price_per_unit || '',
                quantity: item.quantity
            })));
            // Reset edit form state
            setEditCurrentProduct(null);
            setEditProductInputValue('');
            setEditQuantity('');
            setEditPrice('');
            setDeletedItemIds([]);
            setNewEditItems([]);
            setEditDialog(true);
        } catch (err) {
            console.error('Error fetching intake for edit:', err);
            notify.error('Failed to load intake for editing');
        }
    };

    const handleSaveEdit = async () => {
        try {
            await api.put(`/stock-intake/${editingIntake.id}`, {
                items: editItems.map(item => ({
                    id: item.id,
                    quantity: item.quantity,
                    purchase_price_per_unit: Number(item.purchase_price_per_unit) || null
                })),
                new_items: newEditItems.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    purchase_price_per_unit: Number(item.purchase_price_per_unit) || null
                })),
                deleted_item_ids: deletedItemIds
            });

            notify.success('Intake updated successfully!', 'Stock Intake');
            setEditDialog(false);
            setEditingIntake(null);
            setEditItems([]);
            setNewEditItems([]);
            setDeletedItemIds([]);
            fetchIntakes(); // Refresh the list
        } catch (err) {
            console.error('Error updating intake:', err);
            notify.error(err.response?.data?.msg || 'Failed to update intake');
        }
    };

    const handleEditItemPrice = (itemId, newPrice) => {
        setEditItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, purchase_price_per_unit: newPrice }
                : item
        ));
    };

    const handleEditItemQuantity = (itemId, newQuantity) => {
        setEditItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, quantity: newQuantity === '' ? '' : (parseInt(newQuantity) || '') }
                : item
        ));
    };

    const handleEditDeleteItem = (itemId) => {
        setDeletedItemIds(prev => [...prev, itemId]);
        setEditItems(prev => prev.filter(item => item.id !== itemId));
    };

    const handleEditAddItem = () => {
        if (!editCurrentProduct || !editQuantity || editQuantity < 1) {
            notify.warning('Please select a product and enter a valid quantity', 'Validation');
            return;
        }

        const newItem = {
            id: `new_${Date.now()}`, // Temporary ID for UI
            product_id: editCurrentProduct.id,
            product_name: editCurrentProduct.name,
            product_code: editCurrentProduct.product_code,
            quantity: editQuantity,
            purchase_price_per_unit: editPrice || ''
        };

        setNewEditItems(prev => [...prev, newItem]);
        setEditCurrentProduct(null);
        setEditProductInputValue('');
        setEditQuantity('');
        setEditPrice('');
    };

    const handleEditRemoveNewItem = (itemId) => {
        setNewEditItems(prev => prev.filter(item => item.id !== itemId));
    };

    const handleDeleteClick = (intake) => {
        setIntakeToDelete(intake);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!intakeToDelete) return;

        try {
            await api.delete(`/stock-intake/${intakeToDelete.id}`);
            notify.success('Stock intake deleted successfully!', 'Deleted');
            setDeleteConfirmOpen(false);
            setIntakeToDelete(null);
            fetchIntakes(); // Refresh the list
        } catch (err) {
            console.error('Error deleting intake:', err);
            notify.error(err.response?.data?.msg || 'Failed to delete stock intake');
        }
    };

    const renderRecordForm = () => (
        <Box>
            <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                <LocalShipping sx={{ verticalAlign: 'middle', mr: 1, fontSize: { xs: 20, sm: 24 } }} />
                Record Stock Intake
            </Typography>

            <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        required
                        label="Supplier Name"
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        placeholder="Enter supplier or person name"
                    />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextField
                        fullWidth
                        type="date"
                        label="Intake Date"
                        value={intakeDate}
                        onChange={(e) => setIntakeDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        multiline
                        rows={2}
                        label="Notes (Optional)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any additional notes about this stock intake"
                    />
                </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
                Add Products
            </Typography>

            <Grid container spacing={{ xs: 1, sm: 2 }} alignItems="flex-end" sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6} md={5}>
                    <Autocomplete
                        freeSolo
                        options={products}
                        getOptionLabel={(option) => {
                            if (typeof option === 'string') return option;
                            return option.name;
                        }}
                        value={currentProduct}
                        inputValue={productInputValue}
                        onInputChange={(e, newInputValue) => {
                            setProductInputValue(newInputValue);
                        }}
                        onChange={(e, newValue) => {
                            if (typeof newValue === 'string') {
                                // User typed a custom value
                                setNewProductData(prev => ({ ...prev, name: newValue }));
                                setNewProductDialog(true);
                            } else if (newValue && newValue.isNew) {
                                // User clicked "Create new" option
                                setNewProductData(prev => ({ ...prev, name: newValue.inputValue }));
                                setNewProductDialog(true);
                                setCurrentProduct(null);
                                setProductInputValue('');
                            } else {
                                setCurrentProduct(newValue);
                                // Sync inputValue with the selected product's display value
                                if (newValue) {
                                    setProductInputValue(newValue.name);
                                } else {
                                    setProductInputValue('');
                                }
                            }
                        }}
                        renderInput={(params) => (
                            <TextField {...params} label="Select Product" placeholder="Search or type new product name" />
                        )}
                        filterOptions={(options, params) => {
                            const filtered = options.filter(option =>
                                option.product_code.toLowerCase().includes(params.inputValue.toLowerCase()) ||
                                option.name.toLowerCase().includes(params.inputValue.toLowerCase())
                            );

                            if (params.inputValue !== '' && filtered.length === 0) {
                                filtered.push({
                                    inputValue: params.inputValue,
                                    name: `Create "${params.inputValue}"`,
                                    isNew: true
                                });
                            }

                            return filtered;
                        }}
                        renderOption={(props, option) => {
                            if (option.isNew) {
                                return (
                                    <li {...props} style={{ color: '#1976d2', fontWeight: 'bold' }}>
                                        + {option.name}
                                    </li>
                                );
                            }
                            return (
                                <li {...props}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                        <span>{option.name}</span>
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
                            );
                        }}
                    />
                </Grid>
                <Grid item xs={6} md={2}>
                    <TextField
                        fullWidth
                        type="number"
                        label="Quantity"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value === '' ? '' : parseInt(e.target.value))}
                        inputProps={{ min: 1 }}
                    />
                </Grid>
                <Grid item xs={6} md={3}>
                    <TextField
                        fullWidth
                        type="number"
                        label="Purchase Price (Optional)"
                        value={purchasePrice}
                        onChange={(e) => setPurchasePrice(e.target.value)}
                        inputProps={{ min: 0, step: 0.01 }}
                        helperText="Leave empty to add price later"
                    />
                </Grid>
                <Grid item xs={12} md={2}>
                    <Button
                        fullWidth
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleAddProduct}
                        disabled={!currentProduct || !quantity}
                    >
                        Add
                    </Button>
                </Grid>
            </Grid>

            {selectedProducts.length > 0 && (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                        <ShoppingCart sx={{ verticalAlign: 'middle', mr: 1 }} />
                        Selected Products ({selectedProducts.length})
                    </Typography>
                    <TableContainer component={Paper} sx={{ mt: 2, maxWidth: '100%', overflowX: 'auto' }}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Product</TableCell>
                                    <TableCell align="right">Quantity</TableCell>
                                    <TableCell align="right">Purchase Price</TableCell>
                                    <TableCell align="right">Total</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {selectedProducts.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell>{product.product_code} - {product.name}</TableCell>
                                        <TableCell align="right">{product.quantity}</TableCell>
                                        <TableCell align="right">
                                            {product.purchase_price_per_unit
                                                ? `₹${product.purchase_price_per_unit.toFixed(2)}`
                                                : 'Not set'}
                                        </TableCell>
                                        <TableCell align="right">
                                            {product.purchase_price_per_unit
                                                ? `₹${(product.quantity * product.purchase_price_per_unit).toFixed(2)}`
                                                : '-'}
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton
                                                color="error"
                                                size="small"
                                                onClick={() => handleRemoveProduct(product.id)}
                                            >
                                                <Delete />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow>
                                    <TableCell colSpan={3} align="right">
                                        <strong>Grand Total:</strong>
                                    </TableCell>
                                    <TableCell align="right">
                                        <strong>
                                            ₹{selectedProducts.reduce((sum, p) => sum + (p.quantity * p.purchase_price_per_unit), 0).toFixed(2)}
                                        </strong>
                                    </TableCell>
                                    <TableCell />
                                </TableRow>
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleSubmitIntake}
                            disabled={loading}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Record Stock Intake'}
                        </Button>
                    </Box>
                </Box>
            )}
        </Box>
    );

    const renderHistory = () => (
        <Box>
            <Typography variant="h6" gutterBottom>
                Stock Intake History
            </Typography>

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

            <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell>Supplier</TableCell>
                            <TableCell align="right">Total Items</TableCell>
                            <TableCell align="right">Total Quantity</TableCell>
                            {canViewFinancials && <TableCell align="right">Total Cost</TableCell>}
                            <TableCell>Created By</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                    <CircularProgress />
                                </TableCell>
                            </TableRow>
                        ) : intakes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                    <Typography color="textSecondary">
                                        No stock intake records found
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            intakes.map((intake) => (
                                <TableRow key={intake.id}>
                                    <TableCell>{new Date(intake.intake_date).toLocaleDateString()}</TableCell>
                                    <TableCell>{intake.supplier_name}</TableCell>
                                    <TableCell align="right">{intake.total_items}</TableCell>
                                    <TableCell align="right">{intake.total_quantity}</TableCell>
                                    {canViewFinancials && <TableCell align="right">₹{intake.total_cost.toFixed(2)}</TableCell>}
                                    <TableCell>{intake.created_by}</TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            color="primary"
                                            size="small"
                                            onClick={() => handleViewDetails(intake.id)}
                                            title="View Details"
                                        >
                                            <Visibility />
                                        </IconButton>
                                        <IconButton
                                            color="secondary"
                                            size="small"
                                            onClick={() => handleEditPending(intake.id)}
                                            title="Edit Prices"
                                        >
                                            <Edit />
                                        </IconButton>
                                        <IconButton
                                            color="error"
                                            size="small"
                                            onClick={() => handleDeleteClick(intake)}
                                            title="Delete"
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

            {/* Detail Dialog */}
            <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    Stock Intake Details
                </DialogTitle>
                <DialogContent>
                    {selectedIntake && (
                        <Box>
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="text.secondary">Supplier</Typography>
                                    <Typography variant="body1">{selectedIntake.supplier_name}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="text.secondary">Date</Typography>
                                    <Typography variant="body1">
                                        {new Date(selectedIntake.intake_date).toLocaleDateString()}
                                    </Typography>
                                </Grid>
                                {selectedIntake.notes && (
                                    <Grid item xs={12}>
                                        <Typography variant="body2" color="text.secondary">Notes</Typography>
                                        <Typography variant="body1">{selectedIntake.notes}</Typography>
                                    </Grid>
                                )}
                            </Grid>

                            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                                Items
                            </Typography>
                            <TableContainer component={Paper} variant="outlined">
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Product</TableCell>
                                            <TableCell align="right">Quantity</TableCell>
                                            <TableCell align="right">Purchase Price</TableCell>
                                            <TableCell align="right">Total</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {selectedIntake.items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.product_code} - {item.product_name}</TableCell>
                                                <TableCell align="right">{item.quantity}</TableCell>
                                                <TableCell align="right">
                                                    {item.purchase_price_per_unit != null
                                                        ? `₹${item.purchase_price_per_unit.toFixed(2)}`
                                                        : 'Not set'}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {item.total_cost != null
                                                        ? `₹${item.total_cost.toFixed(2)}`
                                                        : '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow>
                                            <TableCell colSpan={3} align="right"><strong>Grand Total:</strong></TableCell>
                                            <TableCell align="right">
                                                <strong>₹{selectedIntake.total_cost.toFixed(2)}</strong>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailDialog(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Edit Pending Intake Dialog */}
            <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="lg" fullWidth>
                <DialogTitle>Edit Pending Stock Intake</DialogTitle>
                <DialogContent>
                    {editingIntake && (
                        <Box>
                            {/* Intake Info */}
                            <Grid container spacing={2} sx={{ mb: 3, mt: 1 }}>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="text.secondary">Supplier</Typography>
                                    <Typography variant="body1">{editingIntake.supplier_name}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="text.secondary">Date</Typography>
                                    <Typography variant="body1">{new Date(editingIntake.intake_date).toLocaleDateString()}</Typography>
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 2 }} />

                            {/* Add New Item Section */}
                            <Typography variant="subtitle1" gutterBottom>Add New Item</Typography>
                            <Grid container spacing={2} alignItems="flex-end" sx={{ mb: 3 }}>
                                <Grid item xs={12} md={5}>
                                    <Autocomplete
                                        freeSolo
                                        options={products}
                                        getOptionLabel={(option) => {
                                            if (typeof option === 'string') return option;
                                            return option.name;
                                        }}
                                        value={editCurrentProduct}
                                        inputValue={editProductInputValue}
                                        onInputChange={(e, newInputValue) => {
                                            setEditProductInputValue(newInputValue);
                                        }}
                                        onChange={(e, newValue) => {
                                            setEditCurrentProduct(newValue);
                                            if (newValue && typeof newValue !== 'string') {
                                                setEditProductInputValue(newValue.name);
                                            } else {
                                                // Keep current input if string (freeSolo) or empty
                                            }
                                        }}
                                        renderInput={(params) => (
                                            <TextField {...params} label="Select Product" placeholder="Search product" />
                                        )}
                                    />
                                </Grid>
                                <Grid item xs={12} md={2}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Quantity"
                                        value={editQuantity}
                                        onChange={(e) => setEditQuantity(e.target.value === '' ? '' : parseInt(e.target.value))}
                                        inputProps={{ min: 1 }}
                                    />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Purchase Price (Optional)"
                                        value={editPrice}
                                        onChange={(e) => setEditPrice(e.target.value)}
                                        inputProps={{ min: 0, step: 0.01 }}
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
                                        Add Item
                                    </Button>
                                </Grid>
                            </Grid>

                            <Divider sx={{ my: 2 }} />

                            {/* Existing Items */}
                            <Typography variant="subtitle1" gutterBottom>Existing Items</Typography>
                            {editItems.length > 0 ? (
                                <TableContainer sx={{ mb: 3 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Product</TableCell>
                                                <TableCell align="right">Quantity</TableCell>
                                                <TableCell align="right">Purchase Price</TableCell>
                                                <TableCell align="right">Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {editItems.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.product_name}</TableCell>
                                                    <TableCell align="right">
                                                        <TextField
                                                            type="number"
                                                            size="small"
                                                            value={item.quantity}
                                                            onChange={(e) => handleEditItemQuantity(item.id, e.target.value)}
                                                            inputProps={{ min: 1 }}
                                                            sx={{ width: 100 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <TextField
                                                            type="number"
                                                            size="small"
                                                            value={item.purchase_price_per_unit}
                                                            onChange={(e) => handleEditItemPrice(item.id, e.target.value)}
                                                            inputProps={{ min: 0, step: 0.01 }}
                                                            placeholder="Enter price"
                                                            sx={{ width: 150 }}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">
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
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Alert severity="warning" sx={{ mb: 3 }}>No existing items</Alert>
                            )}

                            {/* New Items */}
                            {newEditItems.length > 0 && (
                                <>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="subtitle1" gutterBottom>Newly Added Items</Typography>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Product</TableCell>
                                                    <TableCell align="right">Quantity</TableCell>
                                                    <TableCell align="right">Purchase Price</TableCell>
                                                    <TableCell align="right">Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {newEditItems.map((item) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>{item.product_name}</TableCell>
                                                        <TableCell align="right">{item.quantity}</TableCell>
                                                        <TableCell align="right">
                                                            {item.purchase_price_per_unit ? `₹${parseFloat(item.purchase_price_per_unit).toFixed(2)}` : 'Not set'}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleEditRemoveNewItem(item.id)}
                                                            >
                                                                <Delete />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDialog(false)}>Cancel</Button>
                    <Button onClick={handleSaveEdit} variant="contained">Save Changes</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this stock intake record from <strong>{intakeToDelete?.supplier_name}</strong>?
                    </Typography>
                    <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                        This will also reverse the stock quantities for all products in this intake.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} variant="contained" color="error">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );

    return (
        <Box p={3} sx={{ bgcolor: 'background.default', minHeight: '100vh', borderRadius: 4 }}>
            <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper' }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'primary.main' }}>
                    Stock Intake
                </Typography>

                <Paper elevation={2} sx={{ mb: 3 }}>
                    <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
                        <Tab label="Record Stock Intake" />
                        <Tab label="Pending Intakes" />
                        {canViewFinancials && <Tab label="Intake History" />}
                    </Tabs>
                </Paper>
                <Box p={3}>
                    {activeTab === 0 && renderRecordForm()}
                    {activeTab === 1 && renderHistory()}
                    {canViewFinancials && activeTab === 2 && renderHistory()}
                </Box>

                {/* View Details Dialog */}
                <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} maxWidth="md" fullWidth>
                    <DialogTitle>Stock Intake Details</DialogTitle>
                    <DialogContent>
                        {selectedIntake && (
                            <Box>
                                <Grid container spacing={2} sx={{ mb: 3, mt: 1 }}>
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="text.secondary">Supplier</Typography>
                                        <Typography variant="body1">{selectedIntake.supplier_name}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="text.secondary">Date</Typography>
                                        <Typography variant="body1">{new Date(selectedIntake.intake_date).toLocaleDateString()}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="text.secondary">Status</Typography>
                                        <Chip
                                            label={selectedIntake.status}
                                            color={selectedIntake.status === 'completed' ? 'success' : 'warning'}
                                            size="small"
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="text.secondary">Created By</Typography>
                                        <Typography variant="body1">{selectedIntake.created_by}</Typography>
                                    </Grid>
                                    {selectedIntake.notes && (
                                        <Grid item xs={12}>
                                            <Typography variant="body2" color="text.secondary">Notes</Typography>
                                            <Typography variant="body1">{selectedIntake.notes}</Typography>
                                        </Grid>
                                    )}
                                </Grid>

                                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                                    Items
                                </Typography>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Product</TableCell>
                                                <TableCell align="right">Quantity</TableCell>
                                                <TableCell align="right">Purchase Price</TableCell>
                                                <TableCell align="right">Total</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {selectedIntake.items.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.product_code} - {item.product_name}</TableCell>
                                                    <TableCell align="right">{item.quantity}</TableCell>
                                                    <TableCell align="right">
                                                        {item.purchase_price_per_unit != null
                                                            ? `₹${item.purchase_price_per_unit.toFixed(2)}`
                                                            : 'Not set'}
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {item.total_cost != null
                                                            ? `₹${item.total_cost.toFixed(2)}`
                                                            : '-'}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            <TableRow>
                                                <TableCell colSpan={3} align="right"><strong>Grand Total:</strong></TableCell>
                                                <TableCell align="right">
                                                    <strong>₹{selectedIntake.total_cost.toFixed(2)}</strong>
                                                </TableCell>
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setDetailDialog(false)}>Close</Button>
                    </DialogActions>
                </Dialog>

                {/* Edit Pending Intake Dialog */}
                <Dialog open={editDialog} onClose={() => setEditDialog(false)} maxWidth="lg" fullWidth>
                    <DialogTitle>Edit Pending Stock Intake</DialogTitle>
                    <DialogContent>
                        {editingIntake && (
                            <Box>
                                {/* Intake Info */}
                                <Grid container spacing={2} sx={{ mb: 3, mt: 1 }}>
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="text.secondary">Supplier</Typography>
                                        <Typography variant="body1">{editingIntake.supplier_name}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="body2" color="text.secondary">Date</Typography>
                                        <Typography variant="body1">{new Date(editingIntake.intake_date).toLocaleDateString()}</Typography>
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 2 }} />

                                {/* Add New Item Section */}
                                <Typography variant="subtitle1" gutterBottom>Add New Item</Typography>
                                <Grid container spacing={2} alignItems="flex-end" sx={{ mb: 3 }}>
                                    <Grid item xs={12} md={5}>
                                        <Autocomplete
                                            options={products}
                                            getOptionLabel={(option) => option.name}
                                            value={editCurrentProduct}
                                            inputValue={editProductInputValue}
                                            onInputChange={(e, newInputValue) => {
                                                setEditProductInputValue(newInputValue);
                                            }}
                                            onChange={(e, newValue) => {
                                                setEditCurrentProduct(newValue);
                                                if (newValue) {
                                                    setEditProductInputValue(`${newValue.product_code} - ${newValue.name}`);
                                                } else {
                                                    setEditProductInputValue('');
                                                }
                                            }}
                                            renderInput={(params) => (
                                                <TextField {...params} label="Select Product" placeholder="Search product" />
                                            )}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={2}>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            label="Quantity"
                                            value={editQuantity}
                                            onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                                            inputProps={{ min: 1 }}
                                        />
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            label="Purchase Price (Optional)"
                                            value={editPrice}
                                            onChange={(e) => setEditPrice(e.target.value)}
                                            inputProps={{ min: 0, step: 0.01 }}
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
                                            Add Item
                                        </Button>
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 2 }} />

                                {/* Existing Items */}
                                <Typography variant="subtitle1" gutterBottom>Existing Items</Typography>
                                {editItems.length > 0 ? (
                                    <TableContainer sx={{ mb: 3 }}>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Product</TableCell>
                                                    <TableCell align="right">Quantity</TableCell>
                                                    <TableCell align="right">Purchase Price</TableCell>
                                                    <TableCell align="right">Actions</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {editItems.map((item) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>{item.product_name}</TableCell>
                                                        <TableCell align="right">
                                                            <TextField
                                                                type="number"
                                                                size="small"
                                                                value={item.quantity}
                                                                onChange={(e) => handleEditItemQuantity(item.id, e.target.value)}
                                                                inputProps={{ min: 1 }}
                                                                sx={{ width: 100 }}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <TextField
                                                                type="number"
                                                                size="small"
                                                                value={item.purchase_price_per_unit}
                                                                onChange={(e) => handleEditItemPrice(item.id, e.target.value)}
                                                                inputProps={{ min: 0, step: 0.01 }}
                                                                placeholder="Enter price"
                                                                sx={{ width: 150 }}
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
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
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Alert severity="warning" sx={{ mb: 3 }}>No existing items</Alert>
                                )}

                                {/* New Items */}
                                {newEditItems.length > 0 && (
                                    <>
                                        <Divider sx={{ my: 2 }} />
                                        <Typography variant="subtitle1" gutterBottom>Newly Added Items</Typography>
                                        <TableContainer>
                                            <Table size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>Product</TableCell>
                                                        <TableCell align="right">Quantity</TableCell>
                                                        <TableCell align="right">Purchase Price</TableCell>
                                                        <TableCell align="right">Actions</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {newEditItems.map((item) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell>{item.product_name}</TableCell>
                                                            <TableCell align="right">{item.quantity}</TableCell>
                                                            <TableCell align="right">
                                                                {item.purchase_price_per_unit ? `₹${parseFloat(item.purchase_price_per_unit).toFixed(2)}` : 'Not set'}
                                                            </TableCell>
                                                            <TableCell align="right">
                                                                <IconButton
                                                                    size="small"
                                                                    color="error"
                                                                    onClick={() => handleEditRemoveNewItem(item.id)}
                                                                >
                                                                    <Delete />
                                                                </IconButton>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </>
                                )}
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setEditDialog(false)}>Cancel</Button>
                        <Button onClick={handleSaveEdit} variant="contained">Save Changes</Button>
                    </DialogActions>
                </Dialog>

                {/* New Product Dialog */}
                <Dialog open={newProductDialog} onClose={() => setNewProductDialog(false)} maxWidth="md" fullWidth>
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            {/* Row 1: Product Name and Year */}
                            <Grid item xs={12} sm={8}>
                                <TextField
                                    fullWidth
                                    label="Product Name"
                                    value={newProductData.name}
                                    onChange={(e) => setNewProductData(prev => ({ ...prev, name: e.target.value }))}
                                    autoFocus
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="Year"
                                    value={newProductData.year}
                                    onChange={(e) => setNewProductData(prev => ({ ...prev, year: e.target.value }))}
                                    placeholder="e.g., 2020, 2018-2023"
                                />
                            </Grid>

                            {/* Row 2: Category Dropdown */}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    select
                                    fullWidth
                                    label="Category"
                                    value={newProductData.category}
                                    onChange={(e) => setNewProductData(prev => ({ ...prev, category: e.target.value }))}
                                >
                                    <MenuItem value="sunroof">Sunroof</MenuItem>
                                    <MenuItem value="windshield">Windshield</MenuItem>
                                    <MenuItem value="door_glass">Door Glass</MenuItem>
                                    <MenuItem value="rear_glass">Rear Glass</MenuItem>
                                    <MenuItem value="quarter_glass">Quarter Glass</MenuItem>
                                    <MenuItem value="strip">Strip</MenuItem>
                                    <MenuItem value="frame">Frame</MenuItem>
                                    <MenuItem value="middle">Middle</MenuItem>
                                    <MenuItem value="lami">Lami</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                {/* Empty for spacing */}
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={2}
                                    label="Description"
                                    value={newProductData.description}
                                    onChange={(e) => setNewProductData(prev => ({ ...prev, description: e.target.value }))}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Length (inches)"
                                    value={newProductData.length_mm}
                                    onChange={(e) => setNewProductData(prev => ({ ...prev, length_mm: e.target.value }))}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Width (inches)"
                                    value={newProductData.width_mm}
                                    onChange={(e) => setNewProductData(prev => ({ ...prev, width_mm: e.target.value }))}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Stock Quantity"
                                    value={newProductData.stock_quantity}
                                    onChange={(e) => setNewProductData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                                />
                            </Grid>

                            {user?.can_view_financials && (
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Purchase Price"
                                        value={newProductData.purchase_price}
                                        onChange={(e) => setNewProductData(prev => ({ ...prev, purchase_price: e.target.value }))}
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                                        }}
                                    />
                                </Grid>
                            )}
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setNewProductDialog(false)}>Cancel</Button>
                        <Button onClick={handleCreateNewProduct} variant="contained">Create Product</Button>
                    </DialogActions>
                </Dialog>
            </Paper>
        </Box>
    );
};

export default StockIntakePage;
