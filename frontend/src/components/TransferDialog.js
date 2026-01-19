import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Autocomplete,
    Box,
    Typography,
    Alert,
    CircularProgress
} from '@mui/material';
import { SwapHoriz } from '@mui/icons-material';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

/**
 * TransferDialog - Dialog for transferring stock between warehouses
 * 
 * Props:
 * - open: boolean - whether dialog is open
 * - onClose: function - called when dialog should close
 * - onTransferComplete: function - called after successful transfer
 * - selectedProduct: object (optional) - pre-selected product for transfer
 */
const TransferDialog = ({ open, onClose, onTransferComplete, selectedProduct = null }) => {
    const notify = useNotification();

    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        product: null,
        fromWarehouse: null,
        toWarehouse: null,
        quantity: 1,
        notes: ''
    });

    const [error, setError] = useState('');
    const [availableStock, setAvailableStock] = useState(0);

    // Fetch warehouses and products on mount
    useEffect(() => {
        if (open) {
            fetchWarehouses();
            fetchProducts();

            // Pre-select product if provided
            if (selectedProduct) {
                setFormData(prev => ({ ...prev, product: selectedProduct }));
            }
        }
    }, [open, selectedProduct]);

    // Update available stock when product or source warehouse changes
    useEffect(() => {
        if (formData.product && formData.fromWarehouse) {
            const warehouseStocks = formData.product.warehouse_stocks || {};
            const stockAtWarehouse = warehouseStocks[formData.fromWarehouse.code];
            setAvailableStock(stockAtWarehouse?.quantity || 0);
        } else {
            setAvailableStock(0);
        }
    }, [formData.product, formData.fromWarehouse]);

    const fetchWarehouses = async () => {
        try {
            const response = await api.get('/warehouses');
            if (response.data.success) {
                setWarehouses(response.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch warehouses:', err);
        }
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const response = await api.get('/products');
            if (response.data.success) {
                // Only show products with stock > 0
                const productsWithStock = response.data.data.filter(p => p.stock_quantity > 0);
                setProducts(productsWithStock);
            }
        } catch (err) {
            console.error('Failed to fetch products:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field) => (event, newValue) => {
        if (newValue !== undefined) {
            setFormData(prev => ({ ...prev, [field]: newValue }));
        } else {
            setFormData(prev => ({ ...prev, [field]: event.target.value }));
        }
        setError('');
    };

    const handleSubmit = async () => {
        // Validation
        if (!formData.product) {
            setError('Please select a product');
            return;
        }
        if (!formData.fromWarehouse) {
            setError('Please select source warehouse');
            return;
        }
        if (!formData.toWarehouse) {
            setError('Please select destination warehouse');
            return;
        }
        if (formData.fromWarehouse.id === formData.toWarehouse.id) {
            setError('Source and destination warehouses must be different');
            return;
        }
        if (formData.quantity < 1) {
            setError('Quantity must be at least 1');
            return;
        }
        if (formData.quantity > availableStock) {
            setError(`Only ${availableStock} available at ${formData.fromWarehouse.name}`);
            return;
        }

        setSubmitting(true);
        try {
            const response = await api.post('/warehouses/transfers', {
                product_id: formData.product.id,
                from_warehouse_id: formData.fromWarehouse.id,
                to_warehouse_id: formData.toWarehouse.id,
                quantity: parseInt(formData.quantity),
                notes: formData.notes
            });

            if (response.data.success) {
                notify.success(response.data.msg, 'Transfer Complete');
                handleClose();
                if (onTransferComplete) {
                    onTransferComplete();
                }
            }
        } catch (err) {
            const errorMsg = err.response?.data?.msg || 'Failed to create transfer';
            setError(errorMsg);
            notify.error(errorMsg, 'Transfer Failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData({
            product: null,
            fromWarehouse: null,
            toWarehouse: null,
            quantity: 1,
            notes: ''
        });
        setError('');
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SwapHoriz color="primary" />
                Transfer Stock Between Warehouses
            </DialogTitle>

            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                    {error && (
                        <Alert severity="error">{error}</Alert>
                    )}

                    {/* Product Selection */}
                    <Autocomplete
                        options={products}
                        getOptionLabel={(option) => `${option.product_code} - ${option.name}`}
                        value={formData.product}
                        onChange={handleChange('product')}
                        loading={loading}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Select Product"
                                required
                                InputProps={{
                                    ...params.InputProps,
                                    endAdornment: (
                                        <>
                                            {loading && <CircularProgress size={20} />}
                                            {params.InputProps.endAdornment}
                                        </>
                                    )
                                }}
                            />
                        )}
                        renderOption={(props, option) => (
                            <li {...props}>
                                <Box>
                                    <Typography variant="body1">
                                        {option.product_code} - {option.name}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Total Stock: {option.stock_quantity}
                                        {option.warehouse_stocks && Object.keys(option.warehouse_stocks).length > 0 && (
                                            <> ({Object.entries(option.warehouse_stocks).map(([code, data]) =>
                                                `${data.warehouse_name}: ${data.quantity}`
                                            ).join(', ')})</>
                                        )}
                                    </Typography>
                                </Box>
                            </li>
                        )}
                    />

                    {/* Warehouse Selection */}
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <FormControl fullWidth required>
                            <InputLabel>From Warehouse</InputLabel>
                            <Select
                                value={formData.fromWarehouse?.id || ''}
                                label="From Warehouse"
                                onChange={(e) => {
                                    const warehouse = warehouses.find(w => w.id === e.target.value);
                                    setFormData(prev => ({ ...prev, fromWarehouse: warehouse }));
                                }}
                            >
                                {warehouses.map(w => (
                                    <MenuItem key={w.id} value={w.id}>
                                        {w.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <SwapHoriz />
                        </Box>

                        <FormControl fullWidth required>
                            <InputLabel>To Warehouse</InputLabel>
                            <Select
                                value={formData.toWarehouse?.id || ''}
                                label="To Warehouse"
                                onChange={(e) => {
                                    const warehouse = warehouses.find(w => w.id === e.target.value);
                                    setFormData(prev => ({ ...prev, toWarehouse: warehouse }));
                                }}
                            >
                                {warehouses.map(w => (
                                    <MenuItem key={w.id} value={w.id}>
                                        {w.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>

                    {/* Available Stock Info */}
                    {formData.product && formData.fromWarehouse && (
                        <Alert severity="info" sx={{ py: 0.5 }}>
                            Available at {formData.fromWarehouse.name}: <strong>{availableStock}</strong>
                        </Alert>
                    )}

                    {/* Quantity */}
                    <TextField
                        label="Quantity"
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                        required
                        inputProps={{ min: 1, max: availableStock }}
                        helperText={availableStock > 0 ? `Max: ${availableStock}` : ''}
                    />

                    {/* Notes */}
                    <TextField
                        label="Notes (optional)"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        multiline
                        rows={2}
                        placeholder="Reason for transfer..."
                    />
                </Box>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitting || !formData.product || !formData.fromWarehouse || !formData.toWarehouse}
                    startIcon={submitting ? <CircularProgress size={20} /> : <SwapHoriz />}
                >
                    {submitting ? 'Transferring...' : 'Transfer'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TransferDialog;
