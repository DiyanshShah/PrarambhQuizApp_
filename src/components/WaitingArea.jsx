import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Container,
  Alert
} from '@mui/material';
import axios from 'axios';
import Navbar from './Navbar';

const WaitingArea = () => {
  const navigate = useNavigate();
  const { roundNumber } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roundStatus, setRoundStatus] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  // Check if the user is logged in
  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  // Function to check round access status
  const checkRoundAccess = async () => {
    try {
      console.log(`Checking access for round ${roundNumber}`);
      const response = await axios.get(`http://localhost:5000/api/round-access?round_number=${roundNumber}`);
      setRoundStatus(response.data);
      console.log("Round access status:", response.data);
      
      // If the round is open, navigate to the appropriate quiz page
      if (response.data.is_open) {
        console.log(`Round ${roundNumber} is open, navigating...`);
        clearInterval(pollingInterval);
        navigateToRound();
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking round access:', error);
      setError('Failed to check round access status. Please try again later.');
      setLoading(false);
    }
  };

  // Set up polling to check access status every 10 seconds
  useEffect(() => {
    // Initial check
    checkRoundAccess();
    
    // Set up polling interval
    const interval = setInterval(checkRoundAccess, 10000);
    setPollingInterval(interval);
    
    // Clean up interval on unmount
    return () => {
      clearInterval(interval);
    };
  }, [roundNumber]);

  // Function to navigate to the appropriate round
  const navigateToRound = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    console.log(`Navigating to round ${roundNumber} for user:`, user);
    
    switch (parseInt(roundNumber)) {
      case 1:
        console.log("Navigating to round-1");
        navigate('/round-1');
        break;
      case 2:
        console.log("Navigating to round-2");
        navigate('/round-2');
        break;
      case 3:
        if (!user.round3_track) {
          console.log("Navigating to round3 selection");
          navigate('/round3');
        } else if (user.round3_track === 'dsa') {
          console.log("Navigating to round3 DSA");
          navigate('/round3/dsa/1');
        } else if (user.round3_track === 'web') {
          console.log("Navigating to round3 web");
          navigate('/round3/web');
        }
        break;
      default:
        console.log("Invalid round number, navigating to dashboard");
        navigate('/participant-dashboard');
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: 'background.default' 
    }}>
      <Navbar isAdmin={false} />
      
      <Container maxWidth="md" sx={{ pt: 4 }}>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/participant-dashboard')}
          sx={{ mb: 3 }}
        >
          ← Back to Dashboard
        </Button>
        
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          {loading ? (
            <CircularProgress sx={{ my: 4 }} />
          ) : error ? (
            <Alert severity="error" sx={{ width: '100%', mb: 3 }}>
              {error}
            </Alert>
          ) : (
            <>
              <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                Waiting for Round {roundNumber} to Start
              </Typography>
              
              <Box sx={{ mb: 4, position: 'relative', width: '100%', maxWidth: 400 }}>
                <CircularProgress 
                  size={100}
                  thickness={2}
                  sx={{ 
                    display: 'block',
                    margin: '0 auto',
                    mb: 2
                  }} 
                />
                <Typography variant="body1" sx={{ mt: 2, mb: 1 }}>
                  This round is currently not accessible.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  The admin has not yet opened access to this round.
                  We're automatically checking for updates every 10 seconds.
                </Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Last checked: {new Date().toLocaleTimeString()}
              </Typography>
              
              <Button
                variant="contained"
                color="primary"
                onClick={checkRoundAccess}
              >
                Check Again Now
              </Button>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default WaitingArea; 