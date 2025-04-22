import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Button, Grid, CircularProgress, Chip, Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';

const ParticipantDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [attemptedRounds, setAttemptedRounds] = useState({});
    const [roundsAccess, setRoundsAccess] = useState({
        round1: { enabled: false },
        round2: { enabled: false },
        round3: { enabled: false }
    });
    const [accessPolling, setAccessPolling] = useState(true); // Changed to true by default
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info'
    });
    const [previousAccess, setPreviousAccess] = useState({
        round1: { enabled: false },
        round2: { enabled: false },
        round3: { enabled: false }
    });

    // Function to check rounds access status
    const checkRoundsAccess = async () => {
        try {
            const response = await axios.get('/api/rounds/access');
            return response.data;
        } catch (error) {
            console.error('Error checking rounds access:', error);
            return roundsAccess;
        }
    };

    // Check for access changes and show notifications
    const handleAccessChange = (newAccess) => {
        // Check for changes in access status
        let hasChanges = false;
        let changeMessage = '';
        let changeSeverity = 'info';

        Object.keys(newAccess).forEach(roundKey => {
            const round = roundKey.charAt(5); // Extract round number (1, 2, or 3)
            const wasEnabled = previousAccess[roundKey]?.enabled;
            const isEnabled = newAccess[roundKey]?.enabled;
            
            if (wasEnabled !== isEnabled) {
                hasChanges = true;
                if (isEnabled) {
                    changeMessage = `Round ${round} is now enabled! You can participate.`;
                    changeSeverity = 'success';
                } else {
                    changeMessage = `Round ${round} has been disabled by the administrator.`;
                    changeSeverity = 'warning';
                }
            }
        });

        if (hasChanges) {
            setSnackbar({
                open: true,
                message: changeMessage,
                severity: changeSeverity
            });
        }

        // Update previous access for next comparison
        setPreviousAccess(newAccess);
    };

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
                    const userResponse = await axios.get(`/api/user/${parsedUser.id}`, {
                        params: {
                            requesting_user_id: parsedUser.id
                        }
                    });
                    
                    const updatedUser = userResponse.data;
                    setUser(updatedUser);
                    
                    // Check rounds access status
                    const access = await checkRoundsAccess();
                    setRoundsAccess(access);
                    setPreviousAccess(access); // Initialize previous access
                    
                    // Get user results to know which rounds are already attempted
                    try {
                        const resultsResponse = await axios.get(`/api/user/${parsedUser.id}/results`, {
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

    // Enhanced polling for round access - continuous polling whether waiting or not
    useEffect(() => {
        let intervalId;
        
        if (user) {
            // Set up continuous polling
            intervalId = setInterval(async () => {
                const access = await checkRoundsAccess();
                
                // Compare with previous state to detect changes
                const hasChanged = 
                    access.round1.enabled !== roundsAccess.round1.enabled ||
                    access.round2.enabled !== roundsAccess.round2.enabled ||
                    access.round3.enabled !== roundsAccess.round3.enabled;
                
                if (hasChanged) {
                    console.log("Round access status changed:", access);
                    handleAccessChange(access);
                    setRoundsAccess(access);
                }
            }, 5000); // Check every 5 seconds for more responsiveness
        }
        
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [user, roundsAccess]);

    const startRound = (roundNumber) => {
        // Check if the user has already attempted this round
        if (attemptedRounds[roundNumber]) {
            setSnackbar({
                open: true,
                message: `You have already attempted Round ${roundNumber} and cannot retake it.`,
                severity: 'error'
            });
            return;
        }
        
        // Check if the round is enabled by admin
        const roundEnabled = roundsAccess[`round${roundNumber}`]?.enabled;
        if (!roundEnabled && (!user || !user.is_admin)) {
            setSnackbar({
                open: true,
                message: `Round ${roundNumber} is not yet enabled by the administrator. Please wait for access.`,
                severity: 'warning'
            });
            setAccessPolling(true);
            return;
        }
        
        // Navigate to the appropriate round
        if (roundNumber === 3) {
            navigate('/round3'); // This will go to Round3Selection
        } else {
            navigate(`/round-${roundNumber}`);
        }
    };

    const renderAccessStatus = (roundNumber) => {
        const roundEnabled = roundsAccess[`round${roundNumber}`]?.enabled;
        
        if (user && user.is_admin) {
            return <Chip label="Admin Access" color="info" size="small" sx={{ ml: 1 }} />;
        }
        
        if (roundEnabled) {
            return <Chip label="Enabled" color="success" size="small" sx={{ ml: 1 }} />;
        } else {
            return <Chip label="Waiting for access..." color="warning" size="small" sx={{ ml: 1 }} />;
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
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
                                mb: 3
                            }}
                        >
                            Welcome to your dashboard. Here you can participate in rounds and view your results.
                        </Typography>
                        
                        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
                            <Chip 
                                icon={<CircularProgress size={16} sx={{ color: 'inherit' }} />}
                                label="Auto-refreshing round access status" 
                                color="primary" 
                                variant="outlined"
                            />
                        </Box>

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
                                        flexDirection: 'column',
                                        transition: 'all 0.3s ease',
                                        // Pulse animation when enabled
                                        ...(roundsAccess.round1?.enabled && {
                                            animation: 'pulse 2s infinite',
                                            '@keyframes pulse': {
                                                '0%': {
                                                    boxShadow: '0 0 0 0 rgba(255, 107, 0, 0.4)'
                                                },
                                                '70%': {
                                                    boxShadow: '0 0 0 10px rgba(255, 107, 0, 0)'
                                                },
                                                '100%': {
                                                    boxShadow: '0 0 0 0 rgba(255, 107, 0, 0)'
                                                }
                                            }
                                        })
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Typography 
                                            variant="h5" 
                                            sx={{ 
                                                color: 'primary.main',
                                                fontWeight: 600,
                                            }}
                                        >
                                            Round 1
                                        </Typography>
                                        {renderAccessStatus(1)}
                                    </Box>
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
                                    <Button 
                                        variant="contained"
                                        fullWidth
                                        onClick={() => startRound(1)}
                                        disabled={user && user.current_round < 1 || attemptedRounds[1] || (!roundsAccess.round1?.enabled && !user?.is_admin)}
                                    >
                                        {attemptedRounds[1] ? 'Already Attempted' : 'Start Round 1'}
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
                                        flexDirection: 'column',
                                        transition: 'all 0.3s ease',
                                        // Pulse animation when enabled and available
                                        ...(roundsAccess.round2?.enabled && user && user.current_round >= 2 && !attemptedRounds[2] && {
                                            animation: 'pulse 2s infinite',
                                            '@keyframes pulse': {
                                                '0%': {
                                                    boxShadow: '0 0 0 0 rgba(255, 107, 0, 0.4)'
                                                },
                                                '70%': {
                                                    boxShadow: '0 0 0 10px rgba(255, 107, 0, 0)'
                                                },
                                                '100%': {
                                                    boxShadow: '0 0 0 0 rgba(255, 107, 0, 0)'
                                                }
                                            }
                                        })
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Typography 
                                            variant="h5" 
                                            sx={{ 
                                                color: user && user.current_round >= 2 ? 'primary.main' : 'grey.500',
                                                fontWeight: 600,
                                            }}
                                        >
                                            Round 2
                                        </Typography>
                                        {user && user.current_round >= 2 && renderAccessStatus(2)}
                                    </Box>
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
                                    <Button 
                                        variant="contained"
                                        fullWidth
                                        onClick={() => startRound(2)}
                                        disabled={user && user.current_round < 2 || attemptedRounds[2] || (!roundsAccess.round2?.enabled && !user?.is_admin)}
                                        sx={{
                                            opacity: user && user.current_round >= 2 ? 1 : 0.6
                                        }}
                                    >
                                        {user && user.current_round < 2 ? 'Locked' : 
                                         attemptedRounds[2] ? 'Already Attempted' : 'Start Round 2'}
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
                                        flexDirection: 'column',
                                        transition: 'all 0.3s ease',
                                        // Pulse animation when enabled and qualified
                                        ...(roundsAccess.round3?.enabled && user && user.qualified_for_round3 && {
                                            animation: 'pulse 2s infinite',
                                            '@keyframes pulse': {
                                                '0%': {
                                                    boxShadow: '0 0 0 0 rgba(255, 107, 0, 0.4)'
                                                },
                                                '70%': {
                                                    boxShadow: '0 0 0 10px rgba(255, 107, 0, 0)'
                                                },
                                                '100%': {
                                                    boxShadow: '0 0 0 0 rgba(255, 107, 0, 0)'
                                                }
                                            }
                                        })
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <Typography 
                                            variant="h5" 
                                            sx={{ 
                                                color: user && user.current_round >= 3 ? 'primary.main' : 'grey.500',
                                                fontWeight: 600,
                                            }}
                                        >
                                            Round 3
                                        </Typography>
                                        {user && user.current_round >= 3 && renderAccessStatus(3)}
                                    </Box>
                                    <Typography 
                                        variant="body1"
                                        sx={{
                                            color: user && user.current_round >= 3 ? 'text.secondary' : 'grey.600',
                                            mb: 3,
                                            flex: 1
                                        }}
                                    >
                                        Final round with DSA and Web Dev tracks. Only the top 10 participants from Round 2 qualify.
                                    </Typography>
                                    <Button 
                                        variant="contained"
                                        fullWidth
                                        onClick={() => startRound(3)}
                                        disabled={user && (!user.qualified_for_round3 && !user.is_admin) || (!roundsAccess.round3?.enabled && !user?.is_admin)}
                                        sx={{
                                            opacity: user && user.current_round >= 3 ? 1 : 0.6
                                        }}
                                    >
                                        {user && !user.qualified_for_round3 && !user.is_admin ? 'Not Qualified' : 'Start Round 3'}
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

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ParticipantDashboard; 