import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Button, Grid, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';

const ParticipantDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [attemptedRounds, setAttemptedRounds] = useState({});

    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            
            // Get user from localStorage
            const loggedInUser = localStorage.getItem('user');
            
            if (loggedInUser) {
                const parsedUser = JSON.parse(loggedInUser);
                setUser(parsedUser);
                
                try {
                    // Get updated user data including current rounds and progress
                    const userResponse = await axios.get(`http://localhost:5000/api/user/${parsedUser.id}`, {
                        params: {
                            requesting_user_id: parsedUser.id
                        }
                    });
                    
                    const updatedUser = userResponse.data;
                    setUser(updatedUser);
                    
                    // Get user results to know which rounds are already attempted
                    try {
                        const resultsResponse = await axios.get(`http://localhost:5000/api/user/${parsedUser.id}/results`, {
                            params: {
                                requesting_user_id: parsedUser.id
                            }
                        });
                        
                        const attempted = {};
                        
                        if (resultsResponse.data.results) {
                            resultsResponse.data.results.forEach(result => {
                                attempted[result.round_number] = true;
                            });
                        }
                        
                        setAttemptedRounds(attempted);
                    } catch (resultsError) {
                        console.error('Error fetching user results:', resultsError);
                        // If results can't be fetched, continue with empty attempted rounds
                        setAttemptedRounds({});
                    }
                    
                    console.log("Current user round:", updatedUser.current_round);
                } catch (error) {
                    console.error('Error fetching updated user data:', error);
                    
                    // If we get a 404, create a user for testing purposes
                    if (error.response && error.response.status === 404) {
                        console.log("Using local user data due to 404 error");
                        
                        // Ensure parsedUser has current_round property for testing
                        if (!parsedUser.hasOwnProperty('current_round')) {
                            parsedUser.current_round = 3; // Set to 3 for testing Round 3
                        }
                    }
                    
                    // Continue with the local user data
                    setUser(parsedUser);
                }
            } else {
                navigate('/login');
            }
            
            setLoading(false);
        };
        
        fetchUserData();
    }, [navigate]);

    const startRound = (roundNumber) => {
        // Check if the user has already attempted this round
        if (attemptedRounds[roundNumber]) {
            alert(`You have already attempted Round ${roundNumber} and cannot retake it.`);
            return;
        }
        
        // Check for round-specific access
        let roundAccessEnabled = false;
        if (roundNumber === 1) {
            roundAccessEnabled = user.round1_access_enabled;
        } else if (roundNumber === 2) {
            roundAccessEnabled = user.round2_access_enabled;
        } else if (roundNumber === 3) {
            roundAccessEnabled = user.round3_access_enabled;
        }
        
        // If access is enabled for this specific round, go directly to the round
        // Otherwise, send to waiting room
        if (roundAccessEnabled) {
            if (roundNumber === 1) {
                navigate('/round-1');
            } else if (roundNumber === 2) {
                navigate('/round-2');
            } else if (roundNumber === 3) {
                navigate('/round3'); // This goes to the track selection
            }
        } else {
            // Navigate to waiting room
            navigate(`/waiting-room/${roundNumber}`);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ 
            width: '100%',
            minHeight: '100vh',
            backgroundColor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <Navbar isAdmin={false} />
            <Box sx={{ 
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 4,
                width: '100%'
            }}>
                <Container 
                    maxWidth={false}
                    sx={{ 
                        width: '100%',
                        px: { xs: 2, sm: 4, md: 6 }
                    }}
                >
                    <Paper 
                        elevation={0}
                        sx={{ 
                            p: 6,
                            textAlign: 'center',
                            backgroundColor: 'background.paper',
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'primary.main',
                            width: '100%',
                            mx: 'auto'
                        }}
                    >
                        <Typography 
                            variant="h3" 
                            component="h1" 
                            gutterBottom
                            sx={{
                                color: 'primary.main',
                                fontWeight: 700,
                                mb: 4
                            }}
                        >
                            Participant Dashboard
                        </Typography>
                        <Typography 
                            variant="h6"
                            sx={{
                                color: 'text.secondary',
                                maxWidth: '1000px',
                                mx: 'auto',
                                lineHeight: 1.6,
                                mb: 6
                            }}
                        >
                            Welcome to your dashboard. Here you can participate in rounds and view your results.
                        </Typography>

                        <Grid container spacing={4} sx={{ mb: 6 }}>
                            <Grid item xs={12} md={4}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        backgroundColor: 'rgba(255, 107, 0, 0.1)',
                                        borderRadius: 3,
                                        border: '1px solid',
                                        borderColor: 'primary.main',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <Typography 
                                        variant="h5" 
                                        sx={{ 
                                            color: 'primary.main',
                                            fontWeight: 600,
                                            mb: 2
                                        }}
                                    >
                                        Round 1
                                    </Typography>
                                    <Typography 
                                        variant="body1"
                                        sx={{
                                            color: 'text.secondary',
                                            mb: 3,
                                            flex: 1
                                        }}
                                    >
                                        Multiple choice questions on programming languages. Choose between Python and C.
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                color: user && user.round1_access_enabled ? 'success.main' : 'error.main',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {user && user.round1_access_enabled ? 'Access Enabled' : 'Access Disabled'}
                                        </Typography>
                                    </Box>
                                    
                                    <Button 
                                        variant="contained"
                                        fullWidth
                                        onClick={() => startRound(1)}
                                        disabled={user && user.current_round < 1 || attemptedRounds[1] || !user.round1_access_enabled}
                                    >
                                        {attemptedRounds[1] ? 'Already Attempted' : !user.round1_access_enabled ? 'Access Disabled' : 'Start Round 1'}
                                    </Button>
                                </Paper>
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        backgroundColor: user && user.current_round >= 2 ? 'rgba(255, 107, 0, 0.1)' : 'rgba(100, 100, 100, 0.1)',
                                        borderRadius: 3,
                                        border: '1px solid',
                                        borderColor: user && user.current_round >= 2 ? 'primary.main' : 'grey.700',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <Typography 
                                        variant="h5" 
                                        sx={{ 
                                            color: user && user.current_round >= 2 ? 'primary.main' : 'grey.500',
                                            fontWeight: 600,
                                            mb: 2
                                        }}
                                    >
                                        Round 2
                                    </Typography>
                                    <Typography 
                                        variant="body1"
                                        sx={{
                                            color: user && user.current_round >= 2 ? 'text.secondary' : 'grey.600',
                                            mb: 3,
                                            flex: 1
                                        }}
                                    >
                                        Advanced programming challenges. Available after passing Round 1.
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                color: user && user.round2_access_enabled ? 'success.main' : 'error.main',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {user && user.round2_access_enabled ? 'Access Enabled' : 'Access Disabled'}
                                        </Typography>
                                    </Box>
                                    
                                    <Button 
                                        variant="contained"
                                        fullWidth
                                        onClick={() => startRound(2)}
                                        disabled={!user || user.current_round < 2 || attemptedRounds[2] || !user.round2_access_enabled}
                                    >
                                        {attemptedRounds[2] ? 'Already Attempted' : !user.round2_access_enabled ? 'Access Disabled' : (user && user.current_round >= 2 ? 'Start Round 2' : 'Locked')}
                                    </Button>
                                </Paper>
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        backgroundColor: user && user.current_round >= 3 ? 'rgba(255, 107, 0, 0.1)' : 'rgba(100, 100, 100, 0.1)',
                                        borderRadius: 3,
                                        border: '1px solid',
                                        borderColor: user && user.current_round >= 3 ? 'primary.main' : 'grey.700',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <Typography 
                                        variant="h5" 
                                        sx={{ 
                                            color: user && user.current_round >= 3 ? 'primary.main' : 'grey.500',
                                            fontWeight: 600,
                                            mb: 2
                                        }}
                                    >
                                        Round 3
                                    </Typography>
                                    <Typography 
                                        variant="body1"
                                        sx={{
                                            color: user && user.current_round >= 3 ? 'text.secondary' : 'grey.600',
                                            mb: 3,
                                            flex: 1
                                        }}
                                    >
                                        Expert-level programming challenges with advanced algorithms and problem-solving. Available after passing Round 2.
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                color: user && user.round3_access_enabled ? 'success.main' : 'error.main',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {user && user.round3_access_enabled ? 'Access Enabled' : 'Access Disabled'}
                                        </Typography>
                                    </Box>
                                    
                                    <Button 
                                        variant="contained"
                                        fullWidth
                                        onClick={() => startRound(3)}
                                        disabled={!user || user.current_round < 3 || attemptedRounds[3] || !user.round3_access_enabled}
                                    >
                                        {attemptedRounds[3] ? 'Already Attempted' : !user.round3_access_enabled ? 'Access Disabled' : (user && user.current_round >= 3 ? 'Start Round 3' : 'Locked')}
                                    </Button>
                                </Paper>
                            </Grid>
                        </Grid>

                        <Button 
                            variant="outlined"
                            size="large"
                            onClick={() => navigate('/participant-results')}
                            sx={{ 
                                px: 6, 
                                py: 1.5, 
                                fontSize: '1.1rem',
                                borderWidth: 2
                            }}
                        >
                            View All Results
                        </Button>
                    </Paper>
                </Container>
            </Box>
        </Box>
    );
};

export default ParticipantDashboard; 