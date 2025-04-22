import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActionArea,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Chip
} from '@mui/material';
import axios from 'axios';
import Navbar from './Navbar';
import CodeIcon from '@mui/icons-material/Code';
import WebIcon from '@mui/icons-material/Web';

const apiUrl = import.meta.env.VITE_API_URL;


const Round3Selection = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, track: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [isRoundEnabled, setIsRoundEnabled] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  const [isAccessDisabledAlert, setIsAccessDisabledAlert] = useState(false);
  const [completedProblems, setCompletedProblems] = useState({
    dsa: [],
    web: []
  });
  const [accessPolling, setAccessPolling] = useState(null);

  // Load user from localStorage and check permissions
  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (loggedInUser) {
      const foundUser = JSON.parse(loggedInUser);
      setUser(foundUser);
      
      // User must be qualified for Round 3
      if (!foundUser.qualified_for_round3 && !foundUser.is_admin) {
        navigate('/participant-dashboard');
      }
      
      // If not qualified and not admin, redirect
      if (foundUser.current_round < 3 && !foundUser.is_admin) {
        navigate('/participant-dashboard');
      }
      
      // Get completed problems
      fetchCompletedProblems(foundUser.id);
    } else {
      navigate('/login');
    }
    
    setLoading(false);
    
    return () => {
      // Clear polling interval on unmount
      if (accessPolling) {
        clearInterval(accessPolling);
      }
    };
  }, [navigate]);
  
  // Fetch completed problems for this user
  const fetchCompletedProblems = async (userId) => {
    try {
      const response = await axios.get(`/api/round3/submissions?user_id=${userId}`);
      
      // Process the submissions to get completed problems by track
      const completedDSA = response.data.submissions
        .filter(sub => sub.track_type === 'dsa')
        .map(sub => sub.challenge_id);
      
      const completedWeb = response.data.submissions
        .filter(sub => sub.track_type === 'web')
        .map(sub => sub.challenge_id);
      
      setCompletedProblems({
        dsa: completedDSA,
        web: completedWeb 
      });
      
      // Check if user has completed all challenges in their selected track
      const currentUser = JSON.parse(localStorage.getItem('user'));
      if (currentUser && currentUser.round3_track) {
        const isTrackCompleted = currentUser.round3_track === 'dsa' ? 
          completedDSA.length >= 3 : 
          completedWeb.length >= 3;
          
        if (isTrackCompleted) {
          // If all problems are completed, go to dashboard instead
          navigate('/participant-dashboard');
        }
      }
      
    } catch (error) {
      console.error('Error fetching completed problems:', error);
    }
  };
  
  // Start polling for round access status
  useEffect(() => {
    // Initial check
    checkRoundAccess();
    
    // Set up polling
    const intervalId = setInterval(() => {
      checkRoundAccess();
    }, 5000); // Check every 5 seconds
    
    setAccessPolling(intervalId);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Check if round is enabled
  const checkRoundAccess = async () => {
    try {
      const response = await axios.get('/api/rounds/access');
      setAccessChecked(true);
      
      if (response.data && response.data.round3) {
        setIsRoundEnabled(response.data.round3.enabled);
        return response.data.round3.enabled;
      }
      
      setIsRoundEnabled(false);
      return false;
    } catch (error) {
      console.error('Error checking round access:', error);
      setIsRoundEnabled(false);
      setAccessChecked(true);
      return false;
    }
  };

  // Handle track selection
  const handleTrackSelection = (track) => {
    if (!isRoundEnabled && !user?.is_admin) {
      setSnackbar({
        open: true,
        message: 'Round 3 is currently disabled by the administrator.',
        severity: 'warning'
      });
      return;
    }
    
    // Check if the user has already completed all problems for this track
    const isTrackCompleted = track === 'dsa' ? 
      completedProblems.dsa.length >= 3 : 
      completedProblems.web.length >= 3;
      
    if (isTrackCompleted) {
      setSnackbar({
        open: true,
        message: `You have already completed all challenges in the ${track === 'dsa' ? 'DSA' : 'Web Development'} track.`,
        severity: 'info'
      });
      return;
    }
    
    setConfirmDialog({
      open: true,
      track: track
    });
  };

  // Navigate to selected track
  const navigateToTrack = (track) => {
    if (user && track) {
      if (track === 'dsa') {
        navigate('/round3/dsa/1');
      } else {
        navigate('/round3/web');
      }
    }
  };

  // Close the snackbar
  const closeSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };

  // Confirm track selection
  const confirmTrackSelection = async () => {
    const track = confirmDialog.track;
    setConfirmDialog({ open: false, track: null });
    
    if (!track) return;
    
    try {
      // Update user's round3_track selection in the database
      await axios.post('/api/user/set-round3-track', {
        user_id: user.id,
        track: track
      });
      
      // Update user in localStorage
      const updatedUser = {
        ...user,
        round3_track: track
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      // Navigate to the selected track
      navigateToTrack(track);
      
    } catch (error) {
      console.error('Error setting Round 3 track:', error);
      setSnackbar({
        open: true,
        message: 'Error setting track preference. Please try again.',
        severity: 'error'
      });
    }
  };

  // If user already has a track selected, navigate directly to that track
  useEffect(() => {
    if (user && user.round3_track && !loading) {
      // Check if the track is completed
      const isTrackCompleted = user.round3_track === 'dsa' ? 
        completedProblems.dsa.length >= 3 : 
        completedProblems.web.length >= 3;
        
      if (isTrackCompleted) {
        // If all problems are completed, go to dashboard instead
        navigate('/participant-dashboard');
        return;
      }
      
      // If not completed, navigate to the selected track
      if (user.round3_track === 'dsa') {
        navigate('/round3/dsa/1');
      } else {
        navigate('/round3/web');
      }
    }
  }, [user, loading, completedProblems, navigate]);

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show access disabled message
  if (accessChecked && !isRoundEnabled && !user?.is_admin) {
    return (
      <Box sx={{ 
        width: '100%',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Navbar isAdmin={false} />
        
        <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
          <Alert severity="warning" sx={{ mb: 4, p: 2 }}>
            Round 3 is currently disabled by the administrator. Please check back later.
          </Alert>
          
          <Button 
            variant="contained"
            onClick={() => navigate('/participant-dashboard')}
            sx={{ mt: 3 }}
          >
            Return to Dashboard
          </Button>
        </Container>
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
      
      <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
        <Paper 
          elevation={0}
          sx={{ 
            p: 5,
            textAlign: 'center',
            backgroundColor: 'background.paper',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'primary.main',
          }}
        >
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{
              color: 'primary.main',
              fontWeight: 700,
              mb: 2
            }}
          >
            Round 3: Choose Your Track
          </Typography>
          
          {user?.is_admin && !isRoundEnabled && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Round 3 is currently disabled for participants. As an admin, you can still proceed.
            </Alert>
          )}
          
          {isRoundEnabled && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Round 3 is enabled and ready to start!
            </Alert>
          )}
          
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'text.secondary',
              mb: 4
            }}
          >
            Select the track you want to compete in for Round 3
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 3
                  }
                }}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image="/dsa.jpg"
                  alt="Data Structures and Algorithms"
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                    Data Structures & Algorithms
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Solve algorithmic challenges by implementing efficient solutions in your chosen programming language. 
                    Test your problem-solving skills against complex computational problems.
                  </Typography>
                  {completedProblems.dsa.length > 0 && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Completed: {completedProblems.dsa.length}/3 challenges
                    </Alert>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                  <Button 
                    variant="contained" 
                    size="large" 
                    onClick={() => handleTrackSelection('dsa')}
                    sx={{ px: 4 }}
                    disabled={completedProblems.dsa.length >= 3}
                  >
                    {completedProblems.dsa.length >= 3 ? 'Completed' : 'Select Track'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 3
                  }
                }}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image="/web.jpg"
                  alt="Web Development"
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                    Web Development
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Demonstrate your frontend skills by completing web development challenges. 
                    Build responsive interfaces, implement features, and showcase your HTML, CSS, and JavaScript expertise.
                  </Typography>
                  {completedProblems.web.length > 0 && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                      Completed: {completedProblems.web.length}/3 challenges
                    </Alert>
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                  <Button 
                    variant="contained" 
                    size="large" 
                    onClick={() => handleTrackSelection('web')}
                    sx={{ px: 4 }}
                    disabled={completedProblems.web.length >= 3}
                  >
                    {completedProblems.web.length >= 3 ? 'Completed' : 'Select Track'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          </Grid>
          
          <Typography variant="body2" sx={{ mt: 4, color: 'warning.main', fontWeight: 500 }}>
            Important: Your track choice is permanent. You cannot change tracks once you select one.
          </Typography>
        </Paper>
      </Container>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, track: null })}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirm Track Selection
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            You are about to select the {confirmDialog.track === 'dsa' ? 'Data Structures & Algorithms' : 'Web Development'} track. 
            This choice is permanent and cannot be changed. Are you sure you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, track: null })}>
            Cancel
          </Button>
          <Button onClick={confirmTrackSelection} autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Round3Selection; 