import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Snackbar,
  TextField
} from '@mui/material';
import { dsaProblems } from '../data/dsaProblems';
import axios from 'axios';
import Navbar from './Navbar';

const Round3DSA = () => {
  const navigate = useNavigate();
  const { problemId } = useParams();
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [completedProblems, setCompletedProblems] = useState([]);
  
  // Initialize with default template based on language
  const templates = {
    cpp: `#include <iostream>\nusing namespace std;\n\n// Your solution here\n\nint main() {\n  // Test your solution\n  return 0;\n}`,
    java: `public class Solution {\n  // Your solution here\n\n  public static void main(String[] args) {\n    // Test your solution\n  }\n}`,
    python: `# Your solution here\n\n# Test your solution`,
    c: `#include <stdio.h>\n\n// Your solution here\n\nint main() {\n  // Test your solution\n  return 0;\n}`
  };

  // Check for completed problems
  useEffect(() => {
    const checkCompletedProblems = async () => {
      try {
        const userId = JSON.parse(localStorage.getItem('user')).id;
        const response = await axios.get(`http://localhost:5000/api/round3/submissions?user_id=${userId}&track_type=dsa`);
        if (response.data && response.data.submissions) {
          const completed = response.data.submissions.map(sub => parseInt(sub.challenge_id));
          setCompletedProblems(completed);
          
          // Check if all problems are completed
          if (completed.length === dsaProblems.length && completed.length > 0) {
            setOpenDialog(true);
          }
        }
      } catch (error) {
        console.error('Error fetching completed problems:', error);
      }
    };
    
    if (!loading) {
      checkCompletedProblems();
    }
  }, [loading]);

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
    
    // Check if quiz access is enabled for round 3
    if (!parsedUser.round3_access_enabled) {
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
    
    // Check if user has selected the DSA track
    if (parsedUser.round3_track !== 'dsa') {
      // If they haven't selected a track yet, send them to selection page
      if (!parsedUser.round3_track) {
        navigate('/round3');
        return;
      }
      
      // If they've selected web track, show error and redirect
      setSnackbar({
        open: true,
        message: 'You have selected the Web Development track and cannot access DSA challenges.',
        severity: 'error'
      });
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/round3');
      }, 3000);
      return;
    }
    
    if (problemId && problemId > 0 && problemId <= dsaProblems.length) {
      setProblem(dsaProblems[problemId - 1]);
      setCode(templates[language]);
    } else {
      navigate('/round3/dsa/1'); // Redirect to first problem if invalid problem ID
    }
    
    setLoading(false);
  }, [navigate, problemId, language]);

  useEffect(() => {
    // Reset code when language changes
    setCode(templates[language]);
  }, [language]);

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };

  const handleCodeChange = (e) => {
    setCode(e.target.value);
  };

  const runCode = () => {
    setIsRunning(true);
    setOutput('Running code...');
    
    // Mock API call to compile and run code
    setTimeout(() => {
      // This is a placeholder for actual code execution logic
      // In a real app, you would send the code to a backend service
      setOutput('Code execution completed.\nMock output: Your solution runs but may not be correct.');
      setIsRunning(false);
    }, 2000);
  };

  const submitSolution = async () => {
    setIsRunning(true);
    
    try {
      // Submit solution to the backend
      const response = await axios.post('http://localhost:5000/api/round3/submit-dsa', {
        user_id: JSON.parse(localStorage.getItem('user')).id,
        challenge_id: parseInt(problemId),
        challenge_name: problem.title,
        code: code,
        language: language
      });
      
      setSnackbar({
        open: true,
        message: 'Solution submitted successfully! It will be reviewed by an admin.',
        severity: 'success'
      });
      
      // Update completed problems
      if (!completedProblems.includes(parseInt(problemId))) {
        setCompletedProblems([...completedProblems, parseInt(problemId)]);
      }
      
      // Navigate to next problem or completion page
      if (parseInt(problemId) < dsaProblems.length) {
        navigate(`/round3/dsa/${parseInt(problemId) + 1}`);
      } else {
        // All problems completed
        setOpenDialog(true);
      }
      
    } catch (error) {
      console.error('Error submitting solution:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Error submitting solution. Please try again.',
        severity: 'error'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    navigate('/participant-dashboard');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!problem) {
    return (
      <Box sx={{ p: 3 }}>
        <Navbar isAdmin={false} />
        <Typography variant="h5">Problem not found</Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/participant-dashboard')}
          sx={{ mt: 2 }}
        >
          ← Back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Only show navbar if needed */}
      
      <Button 
        variant="outlined" 
        onClick={() => navigate('/participant-dashboard')}
        sx={{ mb: 2 }}
      >
        ← Back to Dashboard
      </Button>
      
      <Box sx={{ display: 'flex', mb: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ flexGrow: 1 }}>
          Problem {problemId}: {problem.title}
        </Typography>
        
        <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
          <Select
            value={language}
            onChange={handleLanguageChange}
            displayEmpty
          >
            <MenuItem value="cpp">C++</MenuItem>
            <MenuItem value="java">Java</MenuItem>
            <MenuItem value="python">Python</MenuItem>
            <MenuItem value="c">C</MenuItem>
          </Select>
        </FormControl>
      </Box>
      
      <Grid container spacing={2} direction="column">
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ 
            p: 3, 
            maxHeight: '30vh',
            overflow: 'auto'
          }}>
            <Typography variant="body1" sx={{ 
              whiteSpace: 'pre-line', 
              mb: 3,
              lineHeight: 1.6
            }}>
              {problem.description}
            </Typography>
            
            {problem.examples && problem.examples.map((example, index) => (
              <Box key={index} sx={{ mb: 3, bgcolor: 'background.paper', p: 3, borderRadius: 2 }}>
                <Typography variant="h6">Example {index + 1}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Input:</Typography>
                <Typography variant="body2" sx={{ 
                  fontFamily: 'monospace', 
                  bgcolor: 'action.hover', 
                  p: 2,
                  borderRadius: 1,
                  fontSize: '14px' 
                }}>
                  {example.input}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 2 }}>Output:</Typography>
                <Typography variant="body2" sx={{ 
                  fontFamily: 'monospace', 
                  bgcolor: 'action.hover', 
                  p: 2,
                  borderRadius: 1,
                  fontSize: '14px' 
                }}>
                  {example.output}
                </Typography>
                {example.explanation && (
                  <>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>Explanation:</Typography>
                    <Typography variant="body2">{example.explanation}</Typography>
                  </>
                )}
              </Box>
            ))}
            
            {problem.constraints && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6">Constraints:</Typography>
                <ul>
                  {problem.constraints.map((constraint, index) => (
                    <li key={index}>
                      <Typography variant="body2">{constraint}</Typography>
                    </li>
                  ))}
                </ul>
              </Box>
            )}

            {problem.expectedResultImage && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6">Expected Result:</Typography>
                <Box 
                  component="img"
                  src={problem.expectedResultImage}
                  alt="Expected Result Visualization"
                  sx={{ 
                    width: '100%', 
                    maxHeight: '300px', 
                    objectFit: 'contain',
                    border: '1px solid #ddd',
                    borderRadius: 1,
                    mt: 1
                  }}
                />
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ 
            p: 3, 
            display: 'flex', 
            flexDirection: 'column',
            borderWidth: 2,
            borderColor: '#1e1e1e',
            borderStyle: 'solid',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            bgcolor: '#1e1e1e'
          }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              mb: 2,
              borderBottom: 1,
              borderColor: 'rgba(255, 255, 255, 0.2)',
              pb: 1
            }}>
              <Button 
                variant="outlined" 
                onClick={runCode} 
                disabled={isRunning} 
                sx={{ 
                  mr: 1,
                  color: '#fff',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  '&:hover': {
                    borderColor: '#fff',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)'
                  }
                }}
              >
                Run
              </Button>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={submitSolution}
                disabled={isRunning}
                sx={{
                  backgroundColor: '#007acc',
                  '&:hover': {
                    backgroundColor: '#0062a3'
                  }
                }}
              >
                Submit
              </Button>
            </Box>
            
            <Box sx={{ flexGrow: 1, mb: 2 }}>
              <TextField
                multiline
                fullWidth
                value={code}
                onChange={handleCodeChange}
                variant="outlined"
                sx={{ 
                  height: '60vh',
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' }
                }}
                InputProps={{
                  sx: { 
                    fontFamily: '"Consolas", "Monaco", "Courier New", monospace', 
                    height: '100%',
                    fontSize: '14px',
                    backgroundColor: '#1e1e1e',
                    color: '#d4d4d4',
                    '& .MuiOutlinedInput-input': { 
                      height: '100%',
                      padding: 2,
                      caretColor: '#fff'
                    }
                  }
                }}
              />
            </Box>
            
            <Typography variant="h6" sx={{ color: '#d4d4d4', mb: 1 }}>Output:</Typography>
            <Box 
              sx={{ 
                bgcolor: '#1f1f1f', 
                color: '#cccccc', 
                p: 3, 
                borderRadius: 1, 
                fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
                fontSize: '14px',
                minHeight: '150px',
                maxHeight: '250px',
                overflow: 'auto',
                border: '1px solid #333'
              }}
            >
              {isRunning ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CircularProgress size={20} sx={{ mr: 1, color: '#007acc' }} />
                  <Typography variant="body2">Running...</Typography>
                </Box>
              ) : (
                output || 'Run your code to see output'
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
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
      
      <Dialog
        open={openDialog}
        onClose={handleDialogClose}
      >
        <DialogTitle>Congratulations!</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You've completed all DSA problems in Round 3! Your score has been recorded.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary" autoFocus>
            Return to Dashboard
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Round3DSA; 