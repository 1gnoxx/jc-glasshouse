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
    TablePagination,
    Button,
    TextField,
    IconButton,
    Chip,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    CircularProgress,
    Alert,
    Tooltip,
    Autocomplete,
    InputAdornment,
    TableSortLabel
} from '@mui/material';
import {
    Add,
    Edit,
    Delete,
    Search,
    Refresh,
    Warning,
    Inventory2,
    FilterList
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const InventoryPage = () => {
    const { user } = useAuth();
    const notify = useNotification();
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [tagFilter, setTagFilter] = useState([]);  // Multi-select array
    const [stockFilter, setStockFilter] = useState('');

    // Sorting
    const [order, setOrder] = useState('asc');
    const [orderBy, setOrderBy] = useState('name');

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const descendingComparator = (a, b, orderBy) => {
        if (b[orderBy] < a[orderBy]) {
            return -1;
        }
        if (b[orderBy] > a[orderBy]) {
            return 1;
        }
        return 0;
    };

    const getComparator = (order, orderBy) => {
        return order === 'desc'
            ? (a, b) => descendingComparator(a, b, orderBy)
            : (a, b) => -descendingComparator(a, b, orderBy);
    };

    const stableSort = (array, comparator) => {
        const stabilizedThis = array.map((el, index) => [el, index]);
        stabilizedThis.sort((a, b) => {
            const order = comparator(a[0], b[0]);
            if (order !== 0) return order;
            return a[1] - b[1];
        });
        return stabilizedThis.map((el) => el[0]);
    };

    // Dialog states
    const [openDialog, setOpenDialog] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    const canViewFinancials = user?.can_view_financials || false;

    const tags = ['sunroof', 'windshield', 'door_glass', 'backlight', 'quarter_glass', 'front', 'rear', 'left', 'right', 'strip', 'frame', 'middle', 'lami'];

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [products, searchTerm, tagFilter, stockFilter]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await api.get('/products');
            setProducts(response.data.data || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching products:', err);
            setError('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...products];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (p.compatible_vehicles && p.compatible_vehicles.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Tag filter - show products that have ANY of the selected tags
        if (tagFilter && tagFilter.length > 0) {
            filtered = filtered.filter(p => {
                if (!p.tags || p.tags.length === 0) return false;
                return tagFilter.some(selectedTag => p.tags.includes(selectedTag));
            });
        }

        // Stock filter
        if (stockFilter === 'out_of_stock') {
            filtered = filtered.filter(p => p.stock_quantity === 0);
        } else if (stockFilter === 'in_stock') {
            filtered = filtered.filter(p => p.stock_quantity > 0);
        }

        setFilteredProducts(filtered);
        setPage(0); // Reset to first page when filters change
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleAddProduct = () => {
        setEditingProduct(null);
        setOpenDialog(true);
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setOpenDialog(true);
    };

    const handleDeleteClick = (product) => {
        setProductToDelete(product);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!productToDelete) return;

        try {
            await api.delete(`/products/${productToDelete.id}`);
            setDeleteConfirmOpen(false);
            setProductToDelete(null);
            fetchProducts();
            notify.success('Product deleted successfully!', 'Product');
        } catch (err) {
            console.error('Error deleting product:', err);
            notify.error('Failed to delete product');
        }
    };

    const handleDialogClose = () => {
        setOpenDialog(false);
        setEditingProduct(null);
    };

    const handleSaveProduct = async (productData) => {
        try {
            if (editingProduct) {
                // Update existing product
                await api.put(`/products/${editingProduct.id}`, productData);
            } else {
                // Create new product
                await api.post('/products', productData);
            }
            handleDialogClose();
            fetchProducts();
            notify.success(editingProduct ? 'Product updated successfully!' : 'Product created successfully!', 'Product');
        } catch (err) {
            console.error('Error saving product:', err);
            throw err;
        }
    };

    const getStockStatusColor = (product) => {
        if (product.stock_quantity === 0) return 'error';
        if (product.is_low_stock) return 'warning';
        return 'success';
    };

    const getStockStatusLabel = (product) => {
        if (product.stock_quantity === 0) return 'Out of Stock';
        if (product.is_low_stock) return 'Low Stock';
        return 'In Stock';
    };

    // Helper for table headers
    const headCells = [
        { id: 'name', label: 'Name', align: 'left' },
        { id: 'category', label: 'Tags', align: 'left' },
        { id: 'length_mm', label: 'Length (inches)', align: 'center' },
        { id: 'width_mm', label: 'Width (inches)', align: 'center' },
        { id: 'stock_quantity', label: 'Stock', align: 'center' },
        ...(canViewFinancials ? [{ id: 'purchase_price', label: 'Purchase Price', align: 'right' }] : []),
        { id: 'actions', label: 'Actions', align: 'center', disableSort: true },
    ];

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 0, sm: 1 } }}>
            {/* Header */}
            <Box
                display="flex"
                flexDirection={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                gap={2}
                mb={3}
            >
                <Typography variant="h5" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                    <Inventory2 sx={{ mr: 1, verticalAlign: 'middle', fontSize: { xs: 20, sm: 24 } }} />
                    Inventory
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={fetchProducts}
                        sx={{ flex: { xs: 1, sm: 'none' } }}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleAddProduct}
                        sx={{ flex: { xs: 1, sm: 'none' } }}
                    >
                        Add Product
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            placeholder="Search products..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Search />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Tags</InputLabel>
                            <Select
                                multiple
                                value={tagFilter}
                                label="Tags"
                                onChange={(e) => setTagFilter(e.target.value)}
                                renderValue={(selected) => (
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {selected.map((value) => (
                                            <Chip
                                                key={value}
                                                label={value.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                                                size="small"
                                            />
                                        ))}
                                    </Box>
                                )}
                            >
                                {tags.map((tag) => (
                                    <MenuItem key={tag} value={tag}>
                                        {tag.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Stock Status</InputLabel>
                            <Select
                                value={stockFilter}
                                label="Stock Status"
                                onChange={(e) => setStockFilter(e.target.value)}
                            >
                                <MenuItem value="">All Stock</MenuItem>
                                <MenuItem value="in_stock">In Stock</MenuItem>
                                <MenuItem value="out_of_stock">Out of Stock</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <Button
                            fullWidth
                            variant="outlined"
                            startIcon={<FilterList />}
                            onClick={() => {
                                setSearchTerm('');
                                setTagFilter([]);  // Reset to empty array
                                setStockFilter('');
                            }}
                        >
                            Clear Filters
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Products Table */}
            <Paper sx={{ overflow: 'hidden' }}>
                <TableContainer sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                {headCells.map((headCell) => (
                                    <TableCell
                                        key={headCell.id}
                                        align={headCell.align}
                                        sortDirection={orderBy === headCell.id ? order : false}
                                    >
                                        {!headCell.disableSort ? (
                                            <TableSortLabel
                                                active={orderBy === headCell.id}
                                                direction={orderBy === headCell.id ? order : 'asc'}
                                                onClick={() => handleRequestSort(headCell.id)}
                                            >
                                                <strong>{headCell.label}</strong>
                                            </TableSortLabel>
                                        ) : (
                                            <strong>{headCell.label}</strong>
                                        )}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {stableSort(filteredProducts, getComparator(order, orderBy))
                                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                .map((product) => (
                                    <TableRow key={product.id} hover>
                                        <TableCell>
                                            <Typography variant="body2">{product.name}</Typography>
                                            {product.compatible_vehicles && (
                                                <Typography variant="caption" color="text.secondary">
                                                    {product.compatible_vehicles}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {(product.tags && product.tags.length > 0) ? (
                                                    product.tags.map((tag, idx) => (
                                                        <Chip
                                                            key={idx}
                                                            label={tag.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    ))
                                                ) : (
                                                    <Chip
                                                        label={product.category ? product.category.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ') : 'No tags'}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            {product.length_mm || 'N/A'}
                                        </TableCell>
                                        <TableCell align="center">
                                            {product.width_mm || 'N/A'}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Typography
                                                variant="body2"
                                                fontWeight="bold"
                                                color={product.stock_quantity === 0 ? 'error' : 'inherit'}
                                            >
                                                {product.stock_quantity}
                                            </Typography>
                                        </TableCell>
                                        {canViewFinancials && (
                                            <TableCell align="right">
                                                ₹{product.purchase_price?.toLocaleString() || 'N/A'}
                                            </TableCell>
                                        )}
                                        <TableCell align="center">
                                            <Tooltip title="Edit">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleEditProduct(product)}
                                                    color="primary"
                                                >
                                                    <Edit />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleDeleteClick(product)}
                                                    color="error"
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            {filteredProducts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={canViewFinancials ? 8 : 7} align="center">
                                        <Typography variant="body2" color="text.secondary" py={3}>
                                            No products found
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={filteredProducts.length}
                    page={page}
                    onPageChange={handleChangePage}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                />
            </Paper>

            {/* Add/Edit Product Dialog */}
            <ProductDialog
                open={openDialog}
                onClose={handleDialogClose}
                onSave={handleSaveProduct}
                product={editingProduct}
                canViewFinancials={canViewFinancials}
                tags={tags}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    Are you sure you want to delete "{productToDelete?.name}"?
                    {productToDelete && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            This action cannot be undone. If this product has sales history, it will be deactivated instead of deleted.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                    <Button onClick={handleDeleteConfirm} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box >
    );
};

// Product Dialog Component
const ProductDialog = ({ open, onClose, onSave, product, canViewFinancials, tags }) => {
    const [formData, setFormData] = useState({
        product_code: '',
        name: '',
        category: '',
        tags: [],  // Multi-select tags
        description: '',
        length_mm: '',
        width_mm: '',
        year: '',
        stock_quantity: 0,
        purchase_price: '',
        selling_price: '',
        image_url: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (product) {
            setFormData({
                product_code: product.product_code || '',
                name: product.name || '',
                category: product.category || '',
                tags: product.tags || [],  // Use tags array from product
                description: product.description || '',
                length_mm: product.length_mm || '',
                width_mm: product.width_mm || '',
                year: product.year || '',
                stock_quantity: product.stock_quantity || 0,
                purchase_price: product.purchase_price || '',
                selling_price: product.selling_price || '',
                image_url: product.image_url || ''
            });
        } else {
            // Reset for new product
            setFormData({
                product_code: '',
                name: '',
                category: 'windshield',
                tags: ['windshield'],  // Default tag
                description: '',
                length_mm: '',
                width_mm: '',
                year: '',
                stock_quantity: 0,
                purchase_price: '',
                selling_price: '',
                image_url: ''
            });
        }
        setError(null);
    }, [product, open]);

    const handleChange = (field) => (event) => {
        setFormData({ ...formData, [field]: event.target.value });
    };

    const handleSubmit = async () => {
        // Ensure tags has at least one value
        const dataToSubmit = { ...formData };
        if (!dataToSubmit.tags || dataToSubmit.tags.length === 0) {
            setError('Please select at least one tag');
            return;
        }

        // Validation - only name is required
        if (!dataToSubmit.name || !dataToSubmit.name.trim()) {
            setError('Please enter product name');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await onSave(dataToSubmit);
        } catch (err) {
            const errorMsg = err.response?.data?.msg || err.message || 'Failed to save product';
            setError(errorMsg);
            console.error('Save error details:', err.response?.data);
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogContent>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    {/* Row 1: Product Name and Year */}
                    <Grid item xs={12} sm={8}>
                        <TextField
                            fullWidth
                            label="Product Name"
                            value={formData.name}
                            onChange={handleChange('name')}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            fullWidth
                            label="Year"
                            value={formData.year}
                            onChange={handleChange('year')}
                            placeholder="e.g., 2020, 2018-2023"
                        />
                    </Grid>

                    {/* Row 2: Tags Multi-Select */}
                    <Grid item xs={12}>
                        <Autocomplete
                            multiple
                            options={tags}
                            value={formData.tags || []}
                            onChange={(event, newValue) => {
                                setFormData({ ...formData, tags: newValue });
                            }}
                            renderTags={(value, getTagProps) =>
                                value.map((option, index) => (
                                    <Chip
                                        label={option.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                                        {...getTagProps({ index })}
                                        key={index}
                                    />
                                ))
                            }
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Tags"
                                    placeholder="Select tags"
                                    helperText="Select one or more tags to categorize the product"
                                />
                            )}
                            getOptionLabel={(option) => option.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
                        />
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
                            value={formData.description}
                            onChange={handleChange('description')}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Length (inches)"
                            value={formData.length_mm}
                            onChange={handleChange('length_mm')}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Width (inches)"
                            value={formData.width_mm}
                            onChange={handleChange('width_mm')}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            type="number"
                            label="Stock Quantity"
                            value={formData.stock_quantity}
                            onChange={handleChange('stock_quantity')}
                        />
                    </Grid>

                    {canViewFinancials && (
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                type="number"
                                label="Purchase Price"
                                value={formData.purchase_price}
                                onChange={handleChange('purchase_price')}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                                }}
                            />
                        </Grid>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={saving}
                >
                    {saving ? <CircularProgress size={24} /> : (product ? 'Update' : 'Create')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default InventoryPage;
