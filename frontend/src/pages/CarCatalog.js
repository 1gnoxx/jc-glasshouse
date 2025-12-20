import React, { useState, useEffect } from 'react';
import { 
    Box, Button, Typography, TextField, Grid, Paper, Dialog, DialogTitle, 
    DialogContent, DialogActions, Select, MenuItem, InputLabel, FormControl, 
    Avatar, Grow, Skeleton, Checkbox, FormControlLabel, Alert, IconButton, Divider
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import api, { uploadImages } from '../services/api';
import { AddPhotoAlternate, AddCircle, RemoveCircle, Edit } from '@mui/icons-material';

// Helper component for displaying read-only fields with black text
const ViewField = ({ label, value, children }) => (
    <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ textTransform: 'uppercase' }}>{label}</Typography>
        {children || <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500 }}>{value || 'N/A'}</Typography>}
    </Box>
);

const CustomLoadingOverlay = () => (
    <Box sx={{ position: 'absolute', top: 0, width: '100%', height: '100%' }}>
        {[...Array(10)].map((_, i) => <Skeleton key={i} variant="rectangular" height={70} sx={{ my: 0.5 }} />)}
    </Box>
);

const CarCatalog = () => {
    const [variants, setVariants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false); 
    const [isViewMode, setIsViewMode] = useState(true); 
    const [currentVariant, setCurrentVariant] = useState(null);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [saveError, setSaveError] = useState('');

    const sunroofTypes = ['Mono-Pane', 'Dual-Pane Front', 'Dual-Pane Rear', 'Panoramic', 'T-Top'];

    useEffect(() => {
        setLoading(true);
        const handler = setTimeout(() => {
            api.get(`/catalog/variants?search=${searchTerm}`)
                .then(res => setVariants(res.data))
                .catch(err => console.error('Failed to fetch variants:', err))
                .finally(() => setLoading(false));
        }, 500);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    const handleRowClick = (params) => {
        setSaveError('');
        setIsEditMode(true);
        setIsViewMode(true);
        setCurrentVariant({ ...params.row, clip_positions: params.row.clip_positions || [] });
        setDialogOpen(true);
    };

    const handleAddNew = () => {
        setSaveError('');
        setIsEditMode(false);
        setIsViewMode(false);
        setCurrentVariant({ 
            car_name: '', variant_name: '', sunroof_type: '', sunroof_length_in: '', sunroof_width_in: '',
            description: '', stock_level: 0, with_frame: false, images: [], clip_positions: [], 
            purchase_price: '', selling_price: ''
        });
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedFiles([]);
        setSaveError('');
    };

    const handleFileChange = (event) => {
        if (event.target.files.length > 0) {
            setSelectedFiles(prev => [...prev, ...Array.from(event.target.files)].slice(0, 4 - (currentVariant.images?.length || 0)));
        }
    };

    const handleClipChange = (index, field, value) => {
        const updatedClips = [...currentVariant.clip_positions];
        updatedClips[index][field] = value;
        setCurrentVariant({ ...currentVariant, clip_positions: updatedClips });
    };

    const addClip = () => {
        if (currentVariant.clip_positions.length < 4) {
            setCurrentVariant({ ...currentVariant, clip_positions: [...currentVariant.clip_positions, { x: '', y: '' }] });
        }
    };

    const removeClip = (index) => {
        const updatedClips = currentVariant.clip_positions.filter((_, i) => i !== index);
        setCurrentVariant({ ...currentVariant, clip_positions: updatedClips });
    };

    const handleSave = async () => {
        setSaveError('');
        let dataToSave = { ...currentVariant };
        if (selectedFiles.length > 0) {
            try {
                const newImageUrls = await uploadImages(selectedFiles);
                dataToSave.images = [...(dataToSave.images || []), ...newImageUrls];
            } catch (error) { 
                console.error('Image upload failed:', error); 
                setSaveError('Image upload failed. Please try again.');
                return; 
            }
        }
        try {
            if (isEditMode) {
                await api.put(`/catalog/variants/${dataToSave.id}`, dataToSave);
            } else {
                await api.post('/catalog/variants', dataToSave);
            }
            const response = await api.get(`/catalog/variants?search=${searchTerm}`);
            setVariants(response.data);
            handleCloseDialog();
        } catch (error) { 
            if (error.response && error.response.data && error.response.data.msg) {
                setSaveError(error.response.data.msg);
            } else {
                setSaveError('An unknown error occurred. Please try again.');
            }
        }
    };

    const columns = [
        { field: 'images', headerName: 'Image', width: 80, sortable: false, renderCell: (params) => <Avatar src={params.row.images?.[0]} sx={{ width: 56, height: 56 }} variant="rounded" /> },
        { field: 'car_name', headerName: 'Car Name', width: 200 },
        { field: 'variant_name', headerName: 'Sunroof Name', width: 200 },
        { field: 'sunroof_length_in', headerName: 'Length (in)', type: 'number', width: 120 },
        { field: 'sunroof_width_in', headerName: 'Width (in)', type: 'number', width: 120 },
        {
            field: 'clip_positions',
            headerName: 'Clip Placements (X, Y)',
            width: 250,
            sortable: false,
            renderCell: (params) => {
                if (!params.value || params.value.length === 0) {
                    return 'N/A';
                }
                return params.value.map(clip => `(${clip.x || '?'}, ${clip.y || '?'})`).join('; ');
            },
        },
        { field: 'stock_level', headerName: 'Stock', type: 'number', width: 80, cellClassName: (params) => params.value <= 5 ? 'low-stock' : '' },
    ];

    return (
        <Box sx={{ '& .low-stock': { color: '#FF6F00', fontWeight: 'bold' } }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary' }}>Car Sunroof Catalog & Inventory</Typography>
            <Paper sx={{ p: 2, mb: 3, backgroundColor: 'rgba(255, 255, 255, 0.8)' }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={8}><TextField fullWidth label="Search by Car or Sunroof Name" variant="outlined" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></Grid>
                    <Grid item xs={12} md={4} sx={{ textAlign: 'right' }}><Button variant="contained" color="primary" onClick={handleAddNew}>Add New Sunroof</Button></Grid>
                </Grid>
            </Paper>

            <Paper sx={{ height: 650, width: '100%', '& .MuiDataGrid-row:hover': { cursor: 'pointer', backgroundColor: 'rgba(0,0,0,0.05)' } }}>
                <DataGrid rows={variants} columns={columns} loading={loading} rowHeight={70} getRowId={(row) => row.id} onRowClick={handleRowClick} components={{ LoadingOverlay: CustomLoadingOverlay }} />
            </Paper>

            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth TransitionComponent={Grow}>
                <DialogTitle sx={{ fontWeight: 'bold' }}>
                    {isEditMode ? (isViewMode ? 'View Sunroof Details' : 'Edit Sunroof Details') : 'Add New Sunroof to Catalog'}
                </DialogTitle>
                <DialogContent>
                    {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}
                    
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        {isViewMode ? (
                            <>
                                <Grid item xs={12} sm={6}><ViewField label="Car Name" value={currentVariant?.car_name} /></Grid>
                                <Grid item xs={12} sm={6}><ViewField label="Sunroof Name" value={currentVariant?.variant_name} /></Grid>
                                <Grid item xs={12} sm={4}><ViewField label="Sunroof Type" value={currentVariant?.sunroof_type} /></Grid>
                                <Grid item xs={12} sm={2}><ViewField label="Length (in)" value={currentVariant?.sunroof_length_in} /></Grid>
                                <Grid item xs={12} sm={2}><ViewField label="Width (in)" value={currentVariant?.sunroof_width_in} /></Grid>
                                <Grid item xs={12} sm={2}><ViewField label="Stock" value={currentVariant?.stock_level} /></Grid>
                                <Grid item xs={12} sm={2}><ViewField label="Frame Included" value={currentVariant?.with_frame ? 'Yes' : 'No'} /></Grid>
                                <Grid item xs={12}><Divider sx={{ my: 1 }}>Clip Positions</Divider></Grid>
                                <Grid item xs={12}><ViewField label="Clips">{currentVariant?.clip_positions.length > 0 ? currentVariant.clip_positions.map(c => `(${c.x}, ${c.y})`).join('; ') : 'N/A'}</ViewField></Grid>
                                <Grid item xs={12}><Divider sx={{ my: 1 }}>Pricing & Details</Divider></Grid>
                                <Grid item xs={12} sm={6}><ViewField label="Purchase Price" value={currentVariant?.purchase_price ? `$${currentVariant.purchase_price}` : 'N/A'} /></Grid>
                                <Grid item xs={12} sm={6}><ViewField label="Selling Price" value={currentVariant?.selling_price ? `$${currentVariant.selling_price}` : 'N/A'} /></Grid>
                                <Grid item xs={12}><ViewField label="Description" value={currentVariant?.description} /></Grid>
                            </>
                        ) : (
                            <>
                                <Grid item xs={12} sm={6}><TextField required label="Car Name" fullWidth value={currentVariant?.car_name || ''} onChange={(e) => setCurrentVariant({ ...currentVariant, car_name: e.target.value })} helperText="e.g., Tata Nexon 2023" /></Grid>
                                <Grid item xs={12} sm={6}><TextField required label="Sunroof Name" fullWidth value={currentVariant?.variant_name || ''} onChange={(e) => setCurrentVariant({ ...currentVariant, variant_name: e.target.value })} helperText="e.g., XZ+ Front Sunroof" /></Grid>
                                <Grid item xs={12} sm={4}><FormControl fullWidth><InputLabel required>Sunroof Type</InputLabel><Select value={currentVariant?.sunroof_type || ''} label="Sunroof Type" onChange={(e) => setCurrentVariant({ ...currentVariant, sunroof_type: e.target.value })}>{sunroofTypes.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</Select></FormControl></Grid>
                                <Grid item xs={12} sm={2}><TextField label="Length (in)" type="number" fullWidth value={currentVariant?.sunroof_length_in || ''} onChange={(e) => setCurrentVariant({ ...currentVariant, sunroof_length_in: e.target.value })} /></Grid>
                                <Grid item xs={12} sm={2}><TextField label="Width (in)" type="number" fullWidth value={currentVariant?.sunroof_width_in || ''} onChange={(e) => setCurrentVariant({ ...currentVariant, sunroof_width_in: e.target.value })} /></Grid>
                                <Grid item xs={12} sm={2}><TextField label="Stock" type="number" fullWidth value={currentVariant?.stock_level || 0} onChange={(e) => setCurrentVariant({ ...currentVariant, stock_level: e.target.value })} /></Grid>
                                <Grid item xs={12} sm={2}><FormControlLabel control={<Checkbox checked={currentVariant?.with_frame || false} onChange={(e) => setCurrentVariant({ ...currentVariant, with_frame: e.target.checked })} />} label="With Frame" /></Grid>
                                <Grid item xs={12}><Divider sx={{ my: 1 }}>Clip Positions</Divider></Grid>
                                {currentVariant?.clip_positions.map((clip, index) => (
                                    <React.Fragment key={index}>
                                        <Grid item xs={5}><TextField label={`Clip ${index + 1} X (in)`} type="number" fullWidth value={clip.x} onChange={(e) => handleClipChange(index, 'x', e.target.value)} /></Grid>
                                        <Grid item xs={5}><TextField label={`Clip ${index + 1} Y (in)`} type="number" fullWidth value={clip.y} onChange={(e) => handleClipChange(index, 'y', e.target.value)} /></Grid>
                                        <Grid item xs={2}><IconButton onClick={() => removeClip(index)}><RemoveCircle color='error' /></IconButton></Grid>
                                    </React.Fragment>
                                ))}
                                <Grid item xs={12}><Button startIcon={<AddCircle />} onClick={addClip} disabled={currentVariant?.clip_positions.length >= 4}>Add Clip</Button></Grid>
                                <Grid item xs={12}><Divider sx={{ my: 1 }}>Pricing & Details</Divider></Grid>
                                <Grid item xs={12} sm={6}><TextField label="Purchase Price" type="number" fullWidth value={currentVariant?.purchase_price || ''} onChange={(e) => setCurrentVariant({ ...currentVariant, purchase_price: e.target.value })} /></Grid>
                                <Grid item xs={12} sm={6}><TextField label="Selling Price" type="number" fullWidth value={currentVariant?.selling_price || ''} onChange={(e) => setCurrentVariant({ ...currentVariant, selling_price: e.target.value })} /></Grid>
                                <Grid item xs={12}><TextField label="Description" fullWidth multiline rows={2} value={currentVariant?.description || ''} onChange={(e) => setCurrentVariant({ ...currentVariant, description: e.target.value })} /></Grid>
                            </>
                        )}
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" gutterBottom>Images</Typography>
                            <Paper variant="outlined" sx={{ p: 1, background: '#f7f7f7' }}>
                                <Box sx={{ display: 'flex', gap: 2, p: 1, overflowX: 'auto', minHeight: 320 }}>
                                    {currentVariant?.images?.map((url, i) => <Avatar key={i} src={url} sx={{ width: 300, height: 300 }} variant="rounded" />)}
                                    {selectedFiles.map((file, i) => <Avatar key={i} src={URL.createObjectURL(file)} sx={{ width: 300, height: 300 }} variant="rounded" />)}
                                    {!isViewMode && (
                                        <IconButton color="primary" component="label" disabled={(currentVariant?.images?.length || 0) + selectedFiles.length >= 4} sx={{ alignSelf: 'center', width: 300, height: 300, border: '2px dashed', borderRadius: 2 }}>
                                            <AddPhotoAlternate sx={{ fontSize: 50 }} />
                                            <input type="file" hidden multiple onChange={handleFileChange} accept="image/*" />
                                        </IconButton>
                                    )}
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{ p: '16px 24px' }}>
                    {isViewMode && isEditMode ? (
                        <>
                            <Button onClick={handleCloseDialog}>Close</Button>
                            <Button onClick={() => setIsViewMode(false)} variant="contained" startIcon={<Edit />}>Edit</Button>
                        </>
                    ) : (
                        <>
                            <Button onClick={handleCloseDialog}>Cancel</Button>
                            <Button onClick={handleSave} variant="contained">Save</Button>
                        </>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CarCatalog;
