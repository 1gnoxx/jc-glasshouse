import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Tabs, Tab } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import api from '../services/api';

const FinancialsPanel = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await api.get('/financials');
        setRecords(response.data);
      } catch (error) {
        console.error('Failed to fetch financial records:', error);
      }
      setLoading(false);
    };
    fetchRecords();
  }, []);

  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'product_name', headerName: 'Product', width: 150 },
    { field: 'purchase_price', headerName: 'Purchase Price', type: 'number', width: 150 },
    { field: 'selling_price', headerName: 'Selling Price', type: 'number', width: 150 },
    { field: 'payment_status', headerName: 'Payment Status', width: 150 },
    { field: 'timestamp', headerName: 'Date', width: 200, valueFormatter: params => new Date(params.value).toLocaleString() },
  ];

  return (
    <div style={{ height: 600, width: '100%' }}>
      <DataGrid rows={records} columns={columns} loading={loading} />
    </div>
  );
};

const UserManagementPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await api.get('/users');
        setUsers(response.data);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const columns = [
    { field: 'id', headerName: 'ID', width: 90 },
    { field: 'username', headerName: 'Username', width: 150 },
    { field: 'role', headerName: 'Role', width: 150 },
    // Add actions to change roles if needed
  ];

  return (
    <div style={{ height: 600, width: '100%' }}>
      <DataGrid rows={users} columns={columns} loading={loading} />
    </div>
  );
};

const AdminPanel = () => {
  const [tab, setTab] = useState(0);

  const handleChange = (event, newValue) => {
    setTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Admin Panel</Typography>
      <Paper>
        <Tabs value={tab} onChange={handleChange} centered>
          <Tab label="Financials" />
          <Tab label="User Management" />
        </Tabs>
        {tab === 0 && <FinancialsPanel />}
        {tab === 1 && <UserManagementPanel />}
      </Paper>
    </Box>
  );
};

export default AdminPanel;
