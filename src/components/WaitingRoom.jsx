import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import axios from 'axios';
import Navbar from './Navbar';

const WaitingRoom = () => {
  const navigate = useNavigate();
  const { roundNumber } = useParams();
  const [user, setUser] = useState(null);
  const [countdown, setCountdown] = useState(15); // seconds until next check
  const [checkCount, setCheckCount] = useState(0);
  const [message, setMessage] = useState('');
  
  // Use refs to avoid dependency issues with timers
  const timerRef = useRef(null);
  const checkCountRef = useRef(0);

  // Check user auth and initial access status
  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(loggedInUser);
    setUser(parsedUser);

    // Validate user has access to this round
    if (parsedUser.current_round < parseInt(roundNumber)) {
      navigate('/participant-dashboard');
      return;
    }
    
    // Set initial message
    setMessage(`Waiting for admin to enable access to Round ${roundNumber}`);
  }, [navigate, roundNumber]);

  // Function to check access status
  const checkAccess = async () => {
    if (!user) return;
    
    try {
      // Get updated user data
      const userResponse = await axios.get(`http://localhost:5000/api/user/${user.id}`, {
        params: { requesting_user_id: user.id }
      });
      
      const updatedUser = userResponse.data;
      
      // Update localStorage with latest user data
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      // Check round-specific access based on the round number
      let hasAccess = false;
      const roundNum = parseInt(roundNumber);
      
      if (roundNum === 1) {
        hasAccess = updatedUser.round1_access_enabled;
      } else if (roundNum === 2) {
        hasAccess = updatedUser.round2_access_enabled;
      } else if (roundNum === 3) {
        hasAccess = updatedUser.round3_access_enabled;
      }

      // If access is enabled for the specific round, redirect to the appropriate round
      if (hasAccess) {
        // Clear timer before navigating
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        let roundPath;
        
        if (roundNum === 1) {
          roundPath = '/round-1';
        } else if (roundNum === 2) {
          roundPath = '/round-2';
        } else if (roundNum === 3) {
          roundPath = '/round3'; // This goes to Round3Selection
        }
        
        navigate(roundPath);
      } else {
        // Increment check count and display message
        checkCountRef.current += 1;
        setCheckCount(checkCountRef.current);
        
        if (checkCountRef.current > 5) {
          setMessage(`Still waiting for the admin to enable access to Round ${roundNumber}. Please be patient.`);
        }
      }
    } catch (error) {
      console.error('Error checking quiz access:', error);
    }
  };

  // Set up timer effect
  useEffect(() => {
    if (!user) return;

    // Perform initial check
    checkAccess();
    
    // Set up the countdown timer
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          checkAccess();
          return 15; // Reset countdown after checking
        }
        return prev - 1;
      });
    }, 1000);

    // Clean up on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [user]); // Only re-run when user changes, not checkCount

  return (
    <Box sx={{ 
      width: '100%',
      minHeight: '100vh',
      backgroundColor: 'background.default',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <Navbar isAdmin={false} />
      <Container maxWidth="md" sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            backgroundColor: 'background.paper',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'primary.main',
            maxWidth: '600px',
            width: '100%'
          }}
        >
          <Typography 
            variant="h4" 
            component="h1" 
            sx={{ 
              color: 'primary.main',
              fontWeight: 700,
              mb: 4
            }}
          >
            Waiting Room
          </Typography>

          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={80} thickness={4} />
          </Box>

          <Typography variant="h6" sx={{ mb: 3, color: 'text.primary' }}>
            {message}
          </Typography>

          <Alert severity="info" sx={{ mb: 4, textAlign: 'left' }}>
            You'll be automatically redirected when access is granted. Checking again in {countdown} seconds...
          </Alert>

          <Typography variant="body2" color="text.secondary">
            Please do not close this window. You can return to the dashboard by clicking the logo in the navigation bar.
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default WaitingRoom; 