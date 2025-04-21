import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Tabs,
  Tab,
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
  Alert,
  Container
} from '@mui/material';
import axios from 'axios';
import Navbar from './Navbar';

// Mock challenges data
const webChallenges = [
  {
    id: 1,
    title: "Responsive Navigation Bar",
    description: "Create a responsive navigation bar that collapses into a hamburger menu on mobile devices.",
    requirements: [
      "Navigation should be horizontal on desktop",
      "Should collapse into a hamburger menu on screens smaller than 768px",
      "Include at least 4 navigation items",
      "Add hover effects on navigation items",
      "Implement a smooth toggle animation for the mobile menu"
    ],
    htmlTemplate: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Responsive Navigation</title>
</head>
<body>
  <!-- Create your navigation bar here -->
  <nav>
    <!-- Your code here -->
  </nav>
  
  <div class="content">
    <h1>Welcome to My Website</h1>
    <p>This is a sample content area to show how your navigation works with content.</p>
  </div>
</body>
</html>`,
    cssTemplate: `/* Your CSS Styles here */
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}

/* Add your navigation styles here */

.content {
  padding: 20px;
  text-align: center;
}`,
    jsTemplate: `// Optional JavaScript for toggle functionality
document.addEventListener('DOMContentLoaded', function() {
  // Your JavaScript here
});`,
    expectedResultImage: "https://i.imgur.com/LwCzBEQ.png"
  },
  {
    id: 2,
    title: "Interactive Contact Form",
    description: "Create a styled interactive contact form with client-side validation.",
    requirements: [
      "Include fields for name, email, subject, and message",
      "Apply proper styling with CSS",
      "Implement client-side validation (JS)",
      "Display error messages for invalid inputs",
      "Show a success message when the form is valid"
    ],
    htmlTemplate: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact Form</title>
</head>
<body>
  <div class="container">
    <h1>Contact Us</h1>
    <!-- Create your form here -->
    <form id="contactForm">
      <!-- Your code here -->
    </form>
  </div>
</body>
</html>`,
    cssTemplate: `/* Your CSS Styles here */
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  background-color: #f5f5f5;
}

.container {
  max-width: 600px;
  margin: 40px auto;
  padding: 20px;
}

/* Add your form styles here */`,
    jsTemplate: `// Add your validation logic here
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('contactForm');
  
  // Your validation code here
});`,
    expectedResultImage: "https://i.imgur.com/e2JzJIN.png"
  },
  {
    id: 3,
    title: "Image Gallery with Lightbox",
    description: "Create a responsive image gallery with a lightbox feature when images are clicked.",
    requirements: [
      "Display at least 6 images in a grid layout",
      "Make the grid responsive",
      "Implement a lightbox that shows the full image when clicked",
      "Include navigation controls in the lightbox",
      "Add a close button for the lightbox"
    ],
    htmlTemplate: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Image Gallery</title>
</head>
<body>
  <div class="container">
    <h1>My Image Gallery</h1>
    <!-- Create your gallery here -->
    <div class="gallery">
      <!-- Your code here -->
    </div>
  </div>
  
  <!-- Lightbox container -->
  <div id="lightbox" class="lightbox">
    <!-- Your lightbox code here -->
  </div>
</body>
</html>`,
    cssTemplate: `/* Your CSS Styles here */
body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
  background-color: #f5f5f5;
}

.container {
  max-width: 1200px;
  margin: 40px auto;
  padding: 20px;
}

/* Add your gallery and lightbox styles here */`,
    jsTemplate: `// Add your lightbox functionality here
document.addEventListener('DOMContentLoaded', function() {
  // Your JavaScript here
});`,
    expectedResultImage: "https://i.imgur.com/8ZZ7QmD.png"
  }
];

// Function to submit challenge (real implementation)
const submitChallenge = async (challengeId, html, css, js) => {
  try {
    // Find the challenge by ID to get its name safely
    const challenge = webChallenges.find(c => c.id === challengeId) || webChallenges[0];
    
    const response = await axios.post('http://localhost:5000/api/round3/submit-web', {
      user_id: JSON.parse(localStorage.getItem('user')).id,
      challenge_id: challengeId,
      challenge_name: challenge.title,
      html_code: html,
      css_code: css,
      js_code: js
    });
    
    return {
      success: response.data.success,
      message: "Solution submitted successfully! It will be reviewed by an admin."
    };
  } catch (error) {
    console.error('Error submitting web challenge:', error);
    return {
      success: false,
      message: error.response?.data?.error || "Error submitting challenge. Please try again."
    };
  }
};

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ height: '100%', pt: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Round3Web = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentChallenge, setCurrentChallenge] = useState(0);
  const [htmlCode, setHtmlCode] = useState('');
  const [cssCode, setCssCode] = useState('');
  const [jsCode, setJsCode] = useState('');
  const [editorTab, setEditorTab] = useState(0);
  const [previewKey, setPreviewKey] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [completedChallenges, setCompletedChallenges] = useState([]);
<<<<<<< HEAD
  const [roundAccessPollingInterval, setRoundAccessPollingInterval] = useState(null);
  const [dialogMessage, setDialogMessage] = useState("You've completed all web challenges in Round 3! Your solution has been submitted for review.");
=======
>>>>>>> 9b20a592da3718e3710d8161a3294a561fb7fa64

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(loggedInUser);
    // Check if user has access to Round 3
    if (parsedUser.current_round < 3) {
      navigate('/participant-dashboard');
      return;
    }
    
    // Check if user has selected the Web track
    if (parsedUser.round3_track !== 'web') {
      // If they haven't selected a track yet, send them to selection page
      if (!parsedUser.round3_track) {
        navigate('/round3');
        return;
      }
      
      // If they've selected DSA track, show error and redirect
      setSnackbar({
        open: true,
        message: 'You have selected the DSA track and cannot access Web Development challenges.',
        severity: 'error'
      });
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/round3');
      }, 3000);
      return;
    }

    setCurrentUser(parsedUser);
    
    // Check for completed challenges
    const checkCompletedChallenges = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/round3/submissions?user_id=${parsedUser.id}&track_type=web`);
        if (response.data && response.data.submissions) {
          const completed = response.data.submissions.map(sub => parseInt(sub.challenge_id));
          setCompletedChallenges(completed);
          
          // Check if all challenges are completed
          if (completed.length === webChallenges.length && completed.length > 0) {
            setOpenDialog(true);
          } else if (completed.length > 0) {
            // Find the first uncompleted challenge
            for (let i = 0; i < webChallenges.length; i++) {
              if (!completed.includes(webChallenges[i].id)) {
                selectChallenge(i);
                break;
              }
            }
          } else {
            selectChallenge(0);
          }
        } else {
          selectChallenge(0);
        }
      } catch (error) {
        console.error('Error fetching completed challenges:', error);
        selectChallenge(0);
      }
    };
    
    checkCompletedChallenges();
    setLoading(false);
  }, [navigate]);

  const handleEditorTabChange = (_, newValue) => {
    setEditorTab(newValue);
  };

  const selectChallenge = (index) => {
    setCurrentChallenge(index);
    setHtmlCode(webChallenges[index].htmlTemplate);
    setCssCode(webChallenges[index].cssTemplate);
    setJsCode(webChallenges[index].jsTemplate);
    refreshPreview();
  };

  const updatePreview = () => {
    const previewFrame = document.getElementById('preview-frame');
    if (previewFrame) {
      const preview = previewFrame.contentDocument || previewFrame.contentWindow.document;
      preview.open();
      preview.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>${cssCode}</style>
          </head>
          <body>
            ${htmlCode}
            <script>${jsCode}</script>
          </body>
        </html>
      `);
      preview.close();
    }
  };

  const refreshPreview = () => {
    setPreviewKey(Date.now()); // Force iframe refresh
    setTimeout(updatePreview, 100); // Ensure iframe has loaded before updating content
  };

  // Check if round is still accessible - poll every 15 seconds
  useEffect(() => {
    // Only start polling after loading and when a challenge is selected
    if (!loading && currentChallenge !== null) {
      // Initial check
      checkRoundAccess();
      
      // Set up polling interval
      const interval = setInterval(checkRoundAccess, 15000); // Check every 15 seconds
      setRoundAccessPollingInterval(interval);
      
      // Clean up
      return () => {
        clearInterval(interval);
      };
    }
    
    return () => {
      if (roundAccessPollingInterval) {
        clearInterval(roundAccessPollingInterval);
      }
    };
  }, [loading, currentChallenge]);

  // Function to check if round is still accessible
  const checkRoundAccess = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/round-access?round_number=3');
      
      // If round is closed during the challenge, auto-submit
      if (!response.data.is_open && !loading && currentChallenge !== null) {
        console.log('Round 3 closed by admin, auto-submitting...');
        setDialogMessage('This round has been closed by the admin. Your current solution is being submitted automatically.');
        // Auto-submit the current challenge
        await handleSubmitChallenge(true);
        setOpenDialog(true);
        // Redirect to dashboard after showing the message
        setTimeout(() => {
          navigate('/participant-dashboard');
        }, 3000);
      }
    } catch (error) {
      console.error('Error checking round access:', error);
      // Don't disrupt the challenge if checking fails
    }
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    if (!htmlCode.trim() || !cssCode.trim()) {
      setSnackbar({
        open: true,
        message: 'HTML and CSS are required to submit.',
        severity: 'warning'
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const challenge = webChallenges[currentChallenge];
      const result = await submitChallenge(challenge.id, htmlCode, cssCode, jsCode);
      
<<<<<<< HEAD
      if (result.success) {
        // If this was an auto-submit due to round closure
        if (isAutoSubmit) {
          setSnackbar({
            open: true,
            message: 'Round closed by admin. Your solution has been automatically submitted.',
            severity: 'info'
          });
        } else {
          // Regular submission success message
          setSnackbar({
            open: true,
            message: result.message,
            severity: 'success'
          });
          
          // Clear the round access polling interval since we've completed the challenge
          if (roundAccessPollingInterval) {
            clearInterval(roundAccessPollingInterval);
            setRoundAccessPollingInterval(null);
          }
          
          // Add the challenge to completed challenges
          setCompletedChallenges([...completedChallenges, challenge.id]);
          // Show completion dialog
          setOpenDialog(true);
        }
      } else {
        setSnackbar({
          open: true,
          message: result.message,
          severity: 'error'
        });
=======
      setSnackbar({
        open: true,
        message: result.message,
        severity: result.success ? 'success' : 'error'
      });

      // Update completed challenges
      if (result.success && !completedChallenges.includes(challenge.id)) {
        setCompletedChallenges([...completedChallenges, challenge.id]);
      }
      
      // If this was the last challenge and it was successful, show completion dialog
      if (result.success && currentChallenge === webChallenges.length - 1) {
        setOpenDialog(true);
      } else if (result.success) {
        // Move to next challenge if successful
        setTimeout(() => {
          selectChallenge(currentChallenge + 1);
        }, 1500);
>>>>>>> 9b20a592da3718e3710d8161a3294a561fb7fa64
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Error submitting challenge. Please try again.',
        severity: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleRunCode = () => {
    refreshPreview();
  };

  const handleSubmitChallenge = async (isAutoSubmit = false) => {
    await handleSubmit(isAutoSubmit);
  };

  // Auto-update preview on code changes with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      const previewFrame = document.getElementById('preview-frame');
      if (previewFrame) {
        updatePreview();
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [htmlCode, cssCode, jsCode]);

  const handleDialogClose = () => {
    setOpenDialog(false);
<<<<<<< HEAD
    
    // If we've completed all challenges, redirect to dashboard
    if (completedChallenges.length === webChallenges.length) {
      // Clear the round access polling interval
      if (roundAccessPollingInterval) {
        clearInterval(roundAccessPollingInterval);
        setRoundAccessPollingInterval(null);
      }
      
      navigate('/participant-dashboard');
    }
=======
    navigate('/participant-dashboard');
>>>>>>> 9b20a592da3718e3710d8161a3294a561fb7fa64
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
      bgcolor: 'background.default',
      minHeight: '100vh',
      color: 'text.primary'
    }}>
      {loading && <Navbar isAdmin={false} />}
      
      <Container maxWidth="xl" sx={{ pt: 4, pb: 8 }}>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/participant-dashboard')}
          sx={{ mb: 3 }}
        >
          ← Back to Dashboard
        </Button>
        
        {/* Question Section with Scrolling */}
        <Paper elevation={3} sx={{ 
          mb: 4, 
          p: 3, 
          bgcolor: 'background.paper', 
          maxHeight: '200px',
          overflow: 'auto',
          borderRadius: 2
        }}>
          <Typography variant="h5" gutterBottom>
            Challenge {currentChallenge + 1}: {webChallenges[currentChallenge].title}
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {webChallenges[currentChallenge].description}
          </Typography>
          
          <Typography variant="h6" sx={{ mb: 1 }}>Requirements:</Typography>
          <ul>
            {webChallenges[currentChallenge].requirements.map((req, index) => (
              <li key={index}>
                <Typography variant="body2">{req}</Typography>
              </li>
            ))}
          </ul>
          
          {webChallenges[currentChallenge].expectedResultImage && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Expected Result:</Typography>
              <Box 
                component="img"
                src={webChallenges[currentChallenge].expectedResultImage}
                alt="Expected Result Visualization"
                sx={{ 
                  maxWidth: '100%', 
                  maxHeight: '250px', 
                  objectFit: 'contain',
                  border: '1px solid rgba(0, 0, 0, 0.12)',
                  borderRadius: 1,
                  p: 1,
                  bgcolor: '#fff'
                }}
              />
            </Box>
          )}
        </Paper>
        
        {/* Code Editor - Keep the VS Code styling */}
        <Paper elevation={3} sx={{ 
          mb: 4, 
          overflow: 'hidden',
          borderRadius: 2
        }}>
          {/* Editor Header */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            bgcolor: '#252526', 
            px: 2, 
            py: 1,
            borderBottom: '1px solid #1e1e1e',
            justifyContent: 'space-between'
          }}>
            <Tabs 
              value={editorTab} 
              onChange={handleEditorTabChange}
              sx={{
                minHeight: 'auto',
                '& .MuiTab-root': { 
                  color: 'rgba(255, 255, 255, 0.7)',
                  textTransform: 'none',
                  minHeight: 36,
                  px: 2,
                  '&.Mui-selected': { 
                    color: '#fff',
                    bgcolor: '#1e1e1e'
                  }
                },
                '& .MuiTabs-indicator': { 
                  display: 'none'
                }
              }}
            >
              <Tab label="index.html" />
              <Tab label="styles.css" />
              <Tab label="script.js" />
            </Tabs>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="text" 
                onClick={handleRunCode} 
                size="small"
                sx={{ 
                  color: '#cccccc',
                  minWidth: 'auto',
                  textTransform: 'none',
                  fontSize: 13,
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)'
                  }
                }}
              >
                Run
              </Button>
              <Button 
                variant="contained" 
                onClick={() => handleSubmitChallenge(false)}
                disabled={submitting}
                size="small"
                sx={{
                  backgroundColor: '#0078d4',
                  textTransform: 'none',
                  fontSize: 13,
                  '&:hover': {
                    backgroundColor: '#106ebe'
                  }
                }}
              >
                {submitting ? <CircularProgress size={20} /> : 'Submit'}
              </Button>
            </Box>
          </Box>
          
          {/* Code Editor Body - Keep the same */}
          <Box sx={{ position: 'relative', height: '60vh', bgcolor: '#1e1e1e' }}>
            {/* Line Numbers */}
            <Box 
              sx={{ 
                position: 'absolute', 
                left: 0, 
                top: 0, 
                bottom: 0, 
                width: '40px', 
                bgcolor: '#1e1e1e',
                borderRight: '1px solid #333',
                color: '#858585',
                fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
                fontSize: 14,
                lineHeight: 1.5,
                pt: 1,
                textAlign: 'right',
                pr: 1,
                userSelect: 'none'
              }}
            >
              {Array.from({ length: 50 }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </Box>
            
            {/* Editor Content - Keep the same */}
            <Box 
              sx={{ 
                position: 'absolute', 
                left: '40px', 
                top: 0, 
                bottom: 0, 
                right: 0 
              }}
            >
              <TabPanel value={editorTab} index={0} sx={{ height: '100%', m: 0, p: 0 }}>
                <TextField
                  multiline
                  fullWidth
                  value={htmlCode}
                  onChange={(e) => setHtmlCode(e.target.value)}
                  variant="standard"
                  sx={{ height: '100%' }}
                  InputProps={{
                    disableUnderline: true,
                    sx: { 
                      fontFamily: '"Consolas", "Monaco", "Courier New", monospace', 
                      height: '100%',
                      fontSize: '14px',
                      color: '#d4d4d4',
                      px: 1,
                      pt: 1,
                      '& textarea': {
                        height: '100% !important',
                        caretColor: '#fff'
                      }
                    }
                  }}
                />
              </TabPanel>
              
              <TabPanel value={editorTab} index={1} sx={{ height: '100%', m: 0, p: 0 }}>
                <TextField
                  multiline
                  fullWidth
                  value={cssCode}
                  onChange={(e) => setCssCode(e.target.value)}
                  variant="standard"
                  sx={{ height: '100%' }}
                  InputProps={{
                    disableUnderline: true,
                    sx: { 
                      fontFamily: '"Consolas", "Monaco", "Courier New", monospace', 
                      height: '100%',
                      fontSize: '14px',
                      color: '#d4d4d4',
                      px: 1,
                      pt: 1,
                      '& textarea': {
                        height: '100% !important',
                        caretColor: '#fff'
                      }
                    }
                  }}
                />
              </TabPanel>
              
              <TabPanel value={editorTab} index={2} sx={{ height: '100%', m: 0, p: 0 }}>
                <TextField
                  multiline
                  fullWidth
                  value={jsCode}
                  onChange={(e) => setJsCode(e.target.value)}
                  variant="standard"
                  sx={{ height: '100%' }}
                  InputProps={{
                    disableUnderline: true,
                    sx: { 
                      fontFamily: '"Consolas", "Monaco", "Courier New", monospace', 
                      height: '100%',
                      fontSize: '14px',
                      color: '#d4d4d4',
                      px: 1,
                      pt: 1,
                      '& textarea': {
                        height: '100% !important',
                        caretColor: '#fff'
                      }
                    }
                  }}
                />
              </TabPanel>
            </Box>
          </Box>
        </Paper>
        
        {/* Preview Section - Keep VS Code styling but match app theme */}
        <Paper elevation={3} sx={{ 
          width: '100%', 
          mb: 4,
          borderRadius: 2,
          overflow: 'hidden'
        }}>
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: '#252526',
            px: 2,
            py: 1,
          }}>
            <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 500 }}>
              Preview
            </Typography>
          </Box>
          <Box sx={{ 
            width: '100%',
            height: '400px',
            bgcolor: '#fff',
            overflow: 'hidden'
          }}>
            <iframe 
              id="preview-frame"
              key={previewKey}
              title="Preview" 
              style={{ 
                width: '100%', 
                height: '100%', 
                border: 'none'
              }}
              srcDoc={`<!DOCTYPE html><html><head></head><body></body></html>`}
            />
          </Box>
        </Paper>
      </Container>
      
      {/* Dialog for completion */}
      <Dialog
        open={openDialog}
        onClose={handleDialogClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
<<<<<<< HEAD
          {dialogMessage}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {dialogMessage}
=======
          Congratulations!
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            You've completed all Web Development challenges for Round 3! 
            Your submissions will be reviewed by our team.
>>>>>>> 9b20a592da3718e3710d8161a3294a561fb7fa64
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary" autoFocus>
            Return to Dashboard
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Round3Web; 