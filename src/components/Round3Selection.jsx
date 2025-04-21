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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Snackbar
} from '@mui/material';
import axios from 'axios';
import Navbar from './Navbar';

const Round3Selection = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, track: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Check if user is authenticated and has access to Round 3
  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      navigate('/login');
      return;
    }

    const userObj = JSON.parse(loggedInUser);
    // Check if user has access to Round 3
    if (userObj.current_round < 3) {
      navigate('/participant-dashboard');
      return;
    }
    
    // Check if quiz access is enabled for round 3
    if (!userObj.round3_access_enabled) {
      setSnackbar({
        open: true,
        message: 'Quiz access for Round 3 is currently disabled by the admin. Please return to the dashboard and try again later.',
        severity: 'warning'
      });
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/participant-dashboard');
      }, 3000);
      return;
    }
    
    setUser(userObj);
    setLoading(false);
  }, [navigate]);

  const handleTrackSelection = (track) => {
    // If user already has a track selected, navigate directly
    if (user.round3_track === track) {
      navigateToTrack(track);
      return;
    }
    
    // If user hasn't selected a track yet, open confirmation dialog
    if (!user.round3_track) {
      setConfirmDialog({ open: true, track });
      return;
    }
    
    // If user has selected a different track, show error
    setSnackbar({
      open: true,
      message: `You have already selected the ${user.round3_track.toUpperCase()} track. You cannot change your selection.`,
      severity: 'warning'
    });
  };

  const navigateToTrack = (track) => {
    if (track === 'dsa') {
      navigate('/round3/dsa');
    } else if (track === 'web') {
      navigate('/round3/web');
    }
  };

  const confirmTrackSelection = async () => {
    try {
      const response = await axios.post('http://localhost:5000/api/user/set-round3-track', {
        user_id: user.id,
        track: confirmDialog.track
      });
      
      // Update user in localStorage
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      // Close dialog and navigate to selected track
      setConfirmDialog({ open: false, track: null });
      navigateToTrack(updatedUser.round3_track);
      
    } catch (error) {
      console.error('Error setting track:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to set track. Please try again.',
        severity: 'error'
      });
      setConfirmDialog({ open: false, track: null });
    }
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return null;
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
      <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 6, 
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'primary.main',
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Round 3: Choose Your Track
          </Typography>
          
          <Box sx={{ mb: 4, mt: 3 }}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                bgcolor: 'primary.main', 
                color: 'white',
                borderRadius: 2
              }}
            >
              <Typography variant="subtitle1" gutterBottom>
                <strong>Important Note:</strong>
              </Typography>
              <Typography variant="body1">
                In Round 3, you must choose between DSA or Web Development. <strong>You can only participate in one track</strong>, and your choice is permanent. Each correct solution will earn you <strong>+4 points</strong>, while incorrect solutions will result in <strong>-1 point</strong>.
              </Typography>
            </Paper>
          </Box>
          
          {user.round3_track && (
            <Alert 
              severity="info" 
              sx={{ mb: 4 }}
            >
              You have selected the <strong>{user.round3_track === 'dsa' ? 'Data Structures & Algorithms' : 'Web Development'}</strong> track. You cannot change this selection.
            </Alert>
          )}
          
          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': user.round3_track === 'dsa' || !user.round3_track ? {
                    transform: 'translateY(-8px)',
                    boxShadow: 8
                  } : {},
                  border: '1px solid',
                  borderColor: user.round3_track === 'dsa' ? 'primary.main' : 'primary.light',
                  borderWidth: user.round3_track === 'dsa' ? 2 : 1,
                  borderRadius: 2,
                  opacity: user.round3_track && user.round3_track !== 'dsa' ? 0.6 : 1,
                  position: 'relative'
                }}
              >
                {user.round3_track === 'dsa' && (
                  <Box sx={{ 
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    bgcolor: 'primary.main',
                    color: 'white',
                    px: 2,
                    py: 0.5,
                    borderRadius: 10,
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    zIndex: 1
                  }}>
                    SELECTED
                  </Box>
                )}
                <CardActionArea 
                  onClick={() => handleTrackSelection('dsa')}
                  sx={{ 
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    height: '100%',
                    pointerEvents: user.round3_track && user.round3_track !== 'dsa' ? 'none' : 'auto'
                  }}
                  disabled={user.round3_track && user.round3_track !== 'dsa'}
                >
                  <CardMedia
                    component="img"
                    height="140"
                    image="https://img.freepik.com/free-vector/programming-concept-illustration_114360-1351.jpg"
                    alt="DSA Track"
                  />
                  <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography gutterBottom variant="h5" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      Data Structures & Algorithms
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1, mb: 2 }}>
                      Solve coding challenges that test your knowledge of algorithms and data structures. 
                      You'll tackle problems ranging from basic to advanced difficulty.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Manual Scoring:</strong> Your code will be evaluated by judges for correctness, efficiency, and style.
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': user.round3_track === 'web' || !user.round3_track ? {
                    transform: 'translateY(-8px)',
                    boxShadow: 8
                  } : {},
                  border: '1px solid',
                  borderColor: user.round3_track === 'web' ? 'primary.main' : 'primary.light',
                  borderWidth: user.round3_track === 'web' ? 2 : 1,
                  borderRadius: 2,
                  opacity: user.round3_track && user.round3_track !== 'web' ? 0.6 : 1,
                  position: 'relative'
                }}
              >
                {user.round3_track === 'web' && (
                  <Box sx={{ 
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    bgcolor: 'primary.main',
                    color: 'white',
                    px: 2,
                    py: 0.5,
                    borderRadius: 10,
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    zIndex: 1
                  }}>
                    SELECTED
                  </Box>
                )}
                <CardActionArea 
                  onClick={() => handleTrackSelection('web')}
                  sx={{ 
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    height: '100%',
                    pointerEvents: user.round3_track && user.round3_track !== 'web' ? 'none' : 'auto'
                  }}
                  disabled={user.round3_track && user.round3_track !== 'web'}
                >
                  <CardMedia
                    component="img"
                    height="140"
                    image="https://img.freepik.com/free-vector/web-development-programmer-engineering-coding-website-augmented-reality-interface-screens-developer-project-engineer-programming-software-application-design-cartoon-illustration_107791-3863.jpg"
                    alt="Web Development Track"
                  />
                  <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography gutterBottom variant="h5" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      Web Development
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1, mb: 2 }}>
                      Build interactive web components using HTML, CSS, and JavaScript. 
                      Demonstrate your frontend development skills by creating responsive, 
                      accessible, and visually appealing components.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Manual Scoring:</strong> Your web components will be evaluated based on functionality, design, and code quality.
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Button 
              variant="outlined" 
              onClick={() => navigate('/participant-dashboard')}
              sx={{ 
                mt: 2,
                px: 4
              }}
            >
              Back to Dashboard
            </Button>
          </Box>
        </Paper>
      </Container>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, track: null })}
      >
        <DialogTitle>Confirm Track Selection</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You are about to select the <strong>{confirmDialog.track === 'dsa' ? 'Data Structures & Algorithms' : 'Web Development'}</strong> track. 
            This choice is permanent and you will not be able to participate in the other track.
            Are you sure you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, track: null })} color="primary">
            Cancel
          </Button>
          <Button onClick={confirmTrackSelection} color="primary" variant="contained">
            Confirm Selection
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