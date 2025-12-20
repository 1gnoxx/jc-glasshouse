import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Skeleton
} from '@mui/material';
import {
    Timeline, TimelineItem, TimelineSeparator, TimelineConnector,
    TimelineContent, TimelineOppositeContent, TimelineDot
} from '@mui/lab';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import api from '../services/api';

const ActivityTimeline = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            try {
                const response = await api.get('/timeline');
                setEvents(response.data);
            } catch (error) {
                console.error("Failed to fetch timeline events:", error);
            }
            setLoading(false);
        };
        fetchEvents();
    }, []);

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'text.primary' }}>Activity Timeline</Typography>
            
            {loading ? (
                <Box>{[...Array(5)].map((_, i) => <Skeleton key={i} variant="rectangular" height={80} sx={{ my: 2, borderRadius: 2 }} />)}</Box>
            ) : (
                <Timeline position="alternate">
                    {events.map((event, index) => (
                        <TimelineItem key={index}>
                            <TimelineOppositeContent color="text.secondary">
                                {new Date(event.date).toLocaleString()}
                            </TimelineOppositeContent>
                            <TimelineSeparator>
                                <TimelineDot color="primary" variant="outlined">
                                    <ShoppingCartIcon />
                                </TimelineDot>
                                {index < events.length - 1 && <TimelineConnector />}
                            </TimelineSeparator>
                            <TimelineContent sx={{ py: '12px', px: 2 }}>
                                <Paper elevation={3} sx={{ p: 2 }}>
                                    <Typography variant="h6" component="span">Sale Recorded</Typography>
                                    <Typography>{event.details}</Typography>
                                </Paper>
                            </TimelineContent>
                        </TimelineItem>
                    ))}
                </Timeline>
            )}
        </Box>
    );
};

export default ActivityTimeline;
