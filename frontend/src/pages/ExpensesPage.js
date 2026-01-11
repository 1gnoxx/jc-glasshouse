import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Button, TextField, Grid, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent,
    DialogActions, Card, CardContent, CircularProgress, MenuItem, Chip, FormControl, Select, InputLabel
} from '@mui/material';
import { Add, Edit, Delete, AttachMoney } from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const ExpensesPage = () => {
    const notify = useNotification();
    const [expenses, setExpenses] = useState([]);
    const [summary, setSummary] = useState({ categories: {}, total: 0 });
    const [loading, setLoading] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [dialog, setDialog] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().slice(0, 10),
        category: '',
        amount: '',
        description: ''
    });
    const [editingId, setEditingId] = useState(null);

    const { user } = useAuth();
    const canViewFinancials = user?.can_view_financials || false;

    // Filter out stock_purchase expenses for non-financial users
    const filteredExpenses = canViewFinancials
        ? expenses
        : expenses.filter(exp => exp.category !== 'stock_purchase');

    const filteredSummaryCategories = canViewFinancials
        ? summary.categories
        : Object.fromEntries(
            Object.entries(summary.categories || {}).filter(([cat]) => cat !== 'stock_purchase')
        );

    const filteredSummaryTotal = canViewFinancials
        ? summary.total
        : Object.values(filteredSummaryCategories).reduce((sum, val) => sum + val, 0);

    useEffect(() => {
        fetchExpenses();
        fetchSummary();
    }, [selectedMonth]);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/expenses?month=${selectedMonth}`);
            setExpenses(response.data.data || []);
        } catch (err) {
            console.error('Error fetching expenses:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const response = await api.get(`/expenses/summary?month=${selectedMonth}`);
            setSummary(response.data.data);
        } catch (err) {
            console.error('Error fetching summary:', err);
        }
    };

    const handleSubmit = async () => {
        if (!formData.category || !formData.amount) {
            notify.warning('Category and amount are required', 'Validation');
            return;
        }

        try {
            if (editingId) {
                await api.put(`/expenses/${editingId}`, formData);
            } else {
                await api.post('/expenses', formData);
            }
            setDialog(false);
            setEditingId(null);
            setFormData({ date: new Date().toISOString().slice(0, 10), category: '', amount: '', description: '' });
            fetchExpenses();
            fetchSummary();
            notify.success(editingId ? 'Expense updated successfully!' : 'Expense recorded successfully!', 'Expense');
        } catch (err) {
            notify.error(err.response?.data?.msg || 'Failed to save expense');
        }
    };

    const handleEdit = (expense) => {
        setFormData({
            date: expense.date,
            category: expense.category,
            amount: expense.amount.toString(),
            description: expense.description || ''
        });
        setEditingId(expense.id);
        setDialog(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Delete this expense?')) {
            try {
                await api.delete(`/expenses/${id}`);
                fetchExpenses();
                fetchSummary();
                notify.success('Expense deleted successfully!', 'Expense');
            } catch (err) {
                notify.error('Failed to delete expense');
            }
        }
    };

    const categoryColors = {
        salary: '#1976d2',
        workers: '#0288d1',
        rent: '#d32f2f',
        transport: '#f57c00',
        stock_purchase: '#7b1fa2',
        utilities: '#388e3c',
        electricity_bill: '#ff9800',
        other: '#616161'
    };

    return (
        <Box p={3} sx={{ bgcolor: 'background.default', minHeight: '100vh', borderRadius: 4 }}>
            <Paper sx={{ p: 3, borderRadius: 4, bgcolor: 'background.paper' }}>
                <Box
                    display="flex"
                    flexDirection={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    gap={2}
                    mb={3}
                >
                    <Typography variant="h5" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' }, color: 'primary.main' }}>
                        Expenses
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Month</InputLabel>
                            <Select
                                value={parseInt(selectedMonth.split('-')[1])}
                                label="Month"
                                onChange={(e) => {
                                    const year = selectedMonth.split('-')[0];
                                    const month = String(e.target.value).padStart(2, '0');
                                    setSelectedMonth(`${year}-${month}`);
                                }}
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
                        <FormControl size="small" sx={{ minWidth: 90 }}>
                            <InputLabel>Year</InputLabel>
                            <Select
                                value={parseInt(selectedMonth.split('-')[0])}
                                label="Year"
                                onChange={(e) => {
                                    const month = selectedMonth.split('-')[1];
                                    setSelectedMonth(`${e.target.value}-${month}`);
                                }}
                            >
                                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((year) => (
                                    <MenuItem key={year} value={year}>{year}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button variant="contained" startIcon={<Add />} onClick={() => setDialog(true)}>
                            Add
                        </Button>
                    </Box>
                </Box>

                <Grid container spacing={3} sx={{ mb: 3 }}>
                    {Object.entries(filteredSummaryCategories || {}).map(([cat, amount]) => (
                        <Grid item xs={12} sm={6} md={4} key={cat}>
                            <Card>
                                <CardContent>
                                    <Typography variant="body2" color="text.secondary">
                                        {cat.replace('_', ' ').toUpperCase()}
                                    </Typography>
                                    <Typography variant="h5" sx={{ color: categoryColors[cat] }}>
                                        ₹{amount.toLocaleString()}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                    <Grid item xs={12} sm={6} md={4}>
                        <Card sx={{ bgcolor: 'action.selected' }}>
                            <CardContent>
                                <Typography variant="body2" color="text.secondary">TOTAL</Typography>
                                <Typography variant="h5" fontWeight="bold">₹{filteredSummaryTotal?.toLocaleString()}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                <TableContainer component={Paper} sx={{ maxWidth: '100%', overflowX: 'auto' }}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell align="right">Amount</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} align="center"><CircularProgress /></TableCell></TableRow>
                            ) : filteredExpenses.length === 0 ? (
                                <TableRow><TableCell colSpan={5} align="center">No expenses found</TableCell></TableRow>
                            ) : (
                                filteredExpenses.map((exp) => (
                                    <TableRow key={exp.id}>
                                        <TableCell>{new Date(exp.date).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Chip label={exp.category.replace('_', ' ')} size="small" sx={{ bgcolor: categoryColors[exp.category], color: 'white' }} />
                                        </TableCell>
                                        <TableCell>{exp.description || '-'}</TableCell>
                                        <TableCell align="right">₹{exp.amount.toLocaleString()}</TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" onClick={() => handleEdit(exp)}><Edit /></IconButton>
                                            <IconButton size="small" color="error" onClick={() => handleDelete(exp.id)}><Delete /></IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Dialog open={dialog} onClose={() => { setDialog(false); setEditingId(null); }} maxWidth="sm" fullWidth>
                    <DialogTitle>{editingId ? 'Edit' : 'Add'} Expense</DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12}>
                                <TextField fullWidth type="date" label="Date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} InputLabelProps={{ shrink: true }} />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField select fullWidth label="Category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                                    <MenuItem value="salary">Salary</MenuItem>
                                    <MenuItem value="workers">Workers</MenuItem>
                                    <MenuItem value="rent">Rent</MenuItem>
                                    <MenuItem value="transport">Transport</MenuItem>
                                    {canViewFinancials && <MenuItem value="stock_purchase">Stock Purchase</MenuItem>}
                                    <MenuItem value="utilities">Utilities</MenuItem>
                                    <MenuItem value="electricity_bill">Electricity Bill</MenuItem>
                                    <MenuItem value="other">Other</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField fullWidth type="number" label="Amount" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField fullWidth multiline rows={2} label="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => { setDialog(false); setEditingId(null); }}>Cancel</Button>
                        <Button onClick={handleSubmit} variant="contained">Save</Button>
                    </DialogActions>
                </Dialog>
            </Paper>
        </Box>
    );
};

export default ExpensesPage;
