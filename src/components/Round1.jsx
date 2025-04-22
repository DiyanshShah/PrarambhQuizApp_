import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Box, Paper, Button, 
  Radio, RadioGroup, FormControlLabel, FormControl, 
  CircularProgress, Dialog, DialogTitle, DialogContent, 
  DialogContentText, DialogActions,
  LinearProgress, Card, CardContent, Alert, 
  Grid, Divider, Chip
} from '@mui/material';
import axios from 'axios';
import Navbar from './Navbar';

const apiUrl = import.meta.env.VITE_API_URL;

const Round1 = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('language-select'); // 'language-select', 'quiz', 'results'
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20 * 60); // 20 minutes in seconds
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [penaltyPoints, setPenaltyPoints] = useState(0);
  const [isRoundEnabled, setIsRoundEnabled] = useState(true);
  
  const totalQuestions = 20;
  const gracePeriod = 5 * 60; // 5 minutes in seconds
  const timerRef = useRef(null);
  const accessCheckRef = useRef(null);

  // Load user from localStorage
  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (loggedInUser) {
      setUser(JSON.parse(loggedInUser));
    } else {
      navigate('/login');
    }
    
    // Check round access on initial load even at language-select stage
    if (step === 'language-select') {
      checkRoundAccess().then(enabled => {
        setIsRoundEnabled(enabled);
      });
    }
  }, [navigate, step]);
  
  // Enhanced polling - check access status even during language selection
  useEffect(() => {
    let intervalId;
    
    // Only poll if on language selection screen or during quiz
    if ((step === 'language-select' || step === 'quiz') && user && !user.is_admin) {
      // Set up polling
      intervalId = setInterval(async () => {
        const enabled = await checkRoundAccess();
        
        // If access status changed, show visual feedback
        if (enabled !== isRoundEnabled) {
          setIsRoundEnabled(enabled);
          
          // Show dialog if access was revoked during language selection
          if (!enabled && step === 'language-select') {
            setDialogMessage("Round 1 access has been revoked by the administrator. Please try again later.");
            setDialogOpen(true);
          }
          
          // If access was revoked during quiz, handle it
          if (!enabled && step === 'quiz') {
            handleRoundDisabled();
          }
        }
      }, 5000); // Check every 5 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [step, user, isRoundEnabled]);

  // Start polling for round access status when in quiz mode
  useEffect(() => {
    let intervalId;
    
    if (step === 'quiz') {
      // Initial check
      checkRoundAccess().then(enabled => {
        setIsRoundEnabled(enabled);
        
        if (!enabled && user && !user.is_admin) {
          // Round was disabled, auto-submit
          handleRoundDisabled();
        }
      });
      
      // Set up polling
      intervalId = setInterval(async () => {
        const enabled = await checkRoundAccess();
        setIsRoundEnabled(enabled);
        
        if (!enabled && user && !user.is_admin) {
          // Round was disabled, auto-submit
          handleRoundDisabled();
        }
      }, 10000); // Check every 10 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [step, user]);

  // Check if round is still enabled
  const checkRoundAccess = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/rounds/access`);
      return response.data?.round1?.enabled || false;
    } catch (error) {
      console.error('Error checking round access:', error);
      return false;
    }
  };

  // Handle round being disabled during participation
  const handleRoundDisabled = () => {
    console.log("Round access revoked! Auto-submitting...");
    
    // Clear any existing intervals
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Show dialog
    setDialogMessage("Round 1 access has been revoked by the administrator. Your progress will be automatically submitted.");
    setDialogOpen(true);
    
    // Auto-submit after a short delay
    setTimeout(() => {
      submitResults();
    }, 2000);
  };

  // Load questions based on selected language
  useEffect(() => {
    if (step === 'quiz' && selectedLanguage) {
      setLoading(true);
      axios.get(`${apiUrl}/api/admin/questions/${selectedLanguage}`)
        .then(response => {
          setQuestions(response.data);
          setLoading(false);
          setTimeLeft(20 * 60); // Reset to 20 minutes
          setSelectedAnswers({});
          setScore(0);
          setPenaltyPoints(0);
          
          // Start the timer
          startTimer();
        })
        .catch(error => {
          console.error('Error loading questions:', error);
          setLoading(false);
          setDialogMessage('Error loading questions. Please try again.');
          setDialogOpen(true);
          setStep('language-select');
        });
    }
    
    // Cleanup timer on unmount or when step changes
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [step, selectedLanguage]);
  
  // Function to start the timer
  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prevTime => {
        // Check if we should calculate penalty
        if (prevTime <= (20 * 60 - gracePeriod) && prevTime % 60 === 0) {
          // Add penalty point every minute after grace period
          setPenaltyPoints(prev => prev + 1);
        }
        
        // If time's up, auto-submit
        if (prevTime <= 1) {
          clearInterval(timerRef.current);
          submitResults();
          return 0;
        }
        
        return prevTime - 1;
      });
    }, 1000);
  };

  // Handle language selection
  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
  };

  // Start the quiz
  const startQuiz = () => {
    if (!selectedLanguage) {
      setDialogMessage('Please select a programming language.');
      setDialogOpen(true);
      return;
    }
    setStep('quiz');
  };

  // Handle answer selection
  const handleAnswerSelect = (questionIndex, answerIndex) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  };

  // Format time as mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Submit quiz results to backend
  const submitResults = async () => {
    try {
      // Clear timer if it's running
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      
      // Calculate score
      let totalScore = 0;
      questions.forEach((question, index) => {
        if (selectedAnswers[index] !== undefined && 
            selectedAnswers[index] === question.correctAnswer) {
          totalScore += 1;
        }
      });
      
      // Apply penalty (minimum score is 0)
      const finalScore = Math.max(0, totalScore - penaltyPoints);
      
      console.log("Submitting Round 1 results:", {
        user_id: user.id,
        round_number: 1,
        language: selectedLanguage,
        score: finalScore,
        total_questions: totalQuestions,
        time_taken: (20 * 60) - timeLeft, // In seconds
        penalty: penaltyPoints
      });

      const response = await axios.post(`${apiUrl}/api/quiz/result`, {
        user_id: user.id,
        round_number: 1,
        language: selectedLanguage,
        score: finalScore,
        total_questions: totalQuestions
      });

      console.log("Round 1 results submitted successfully:", response.data);

      // Update the user in localStorage if received in response
      if (response.data.updated_user) {
        localStorage.setItem('user', JSON.stringify(response.data.updated_user));
        setUser(response.data.updated_user);
      }

      setStep('results');
      setScore(finalScore);
      
      // Only show the completion dialog if we weren't auto-submitted due to access revocation
      if (isRoundEnabled) {
        setDialogMessage(`Quiz completed! Your raw score: ${totalScore}/${totalQuestions}
                          Penalty: -${penaltyPoints}
                          Final Score: ${finalScore}/${totalQuestions}`);
        setDialogOpen(true);
      } else {
        // If round was disabled, navigate back to dashboard
        navigate('/participant-dashboard');
      }
    } catch (error) {
      console.error('Error submitting results:', error);
      
      // Handle already attempted error
      if (error.response && error.response.data && error.response.data.already_attempted) {
        setDialogMessage('You have already attempted this round and cannot retake it.');
      } else if (error.response && error.response.status === 404) {
        setDialogMessage('User not found. Please log in again.');
        setTimeout(() => {
          localStorage.removeItem('user');
          navigate('/login');
        }, 2000);
      } else {
        setDialogMessage('Error submitting your results. Please try again.');
      }
      
      setDialogOpen(true);
      setTimeout(() => {
        navigate('/participant-dashboard');
      }, 2000);
    }
  };

  // Handle returning to dashboard
  const handleReturnToDashboard = () => {
    navigate('/participant-dashboard');
  };

  if (!user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Include additional UI - Show alert when round is disabled
  if (step === 'quiz' && !isRoundEnabled && user && !user.is_admin) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <Alert severity="warning" sx={{ mb: 3, width: '80%', maxWidth: '600px' }}>
          Round 1 has been disabled by the administrator. Your progress is being submitted.
        </Alert>
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
      {step !== 'quiz' && <Navbar isAdmin={false} />}

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Paper 
          elevation={0}
          sx={{ 
            p: 6,
            textAlign: 'center',
            backgroundColor: 'background.paper',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'primary.main',
            mx: 'auto',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            flex: 1
          }}
        >
          {/* Language Selection Step */}
          {step === 'language-select' && (
            <>
              <Typography 
                variant="h4" 
                component="h1" 
                gutterBottom
                sx={{
                  color: 'primary.main',
                  fontWeight: 700,
                  mb: 4
                }}
              >
                Round 1: Choose Your Language
              </Typography>
              
              {!isRoundEnabled && !user?.is_admin && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  Round 1 is currently disabled by the administrator. You can prepare your selection, but you'll need to wait for access to be granted.
                </Alert>
              )}
              
              {isRoundEnabled && (
                <Alert severity="success" sx={{ mb: 3 }}>
                  Round 1 is enabled! You can proceed with the quiz.
                </Alert>
              )}
              
              <Typography 
                variant="h6"
                sx={{
                  color: 'text.secondary',
                  mb: 4
                }}
              >
                Select a programming language for your quiz
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 6 }}>
                <Button 
                  variant={selectedLanguage === 'python' ? 'contained' : 'outlined'}
                  size="large"
                  onClick={() => handleLanguageSelect('python')}
                  sx={{ 
                    px: 4, 
                    py: 2,
                    borderWidth: 2, 
                    fontSize: '1.1rem'
                  }}
                >
                  Python
                </Button>
                <Button 
                  variant={selectedLanguage === 'c' ? 'contained' : 'outlined'}
                  size="large"
                  onClick={() => handleLanguageSelect('c')}
                  sx={{ 
                    px: 4, 
                    py: 2,
                    borderWidth: 2, 
                    fontSize: '1.1rem'
                  }}
                >
                  C
                </Button>
              </Box>

              <Box sx={{ mt: 'auto' }}>
                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
                  You will be presented with all 20 questions at once.
                  <br />You have 20 minutes to complete the entire quiz.
                  <br />After 5 minutes, a penalty of -1 point will be applied for each additional minute.
                </Typography>
                <Button 
                  variant="contained" 
                  size="large"
                  onClick={startQuiz}
                  disabled={!selectedLanguage || (!isRoundEnabled && !user?.is_admin)}
                  sx={{ 
                    px: 6, 
                    py: 1.5, 
                    fontSize: '1.1rem'
                  }}
                >
                  {isRoundEnabled || user?.is_admin ? 'Start Quiz' : 'Waiting for Access...'}
                </Button>
              </Box>
            </>
          )}

          {/* Quiz Questions Step */}
          {step === 'quiz' && (
            <>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    mb: 3,
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    py: 2,
                    bgcolor: 'background.paper'
                  }}>
                    <Box>
                      <Typography variant="h6" sx={{ color: 'primary.main', mb: 1 }}>
                        Round 1: {selectedLanguage.charAt(0).toUpperCase() + selectedLanguage.slice(1)}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Questions answered: {Object.keys(selectedAnswers).length}/{questions.length}
                      </Typography>
                    </Box>
                    
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end'
                    }}>
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1, 
                        backgroundColor: timeLeft <= 60 ? 'error.dark' : timeLeft <= 5 * 60 ? 'warning.dark' : 'primary.dark',
                        px: 2,
                        py: 1,
                        borderRadius: 2,
                        mb: 1
                      }}>
                        <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                          {formatTime(timeLeft)}
                        </Typography>
                      </Box>
                      
                      {penaltyPoints > 0 && (
                        <Chip 
                          label={`Penalty: -${penaltyPoints}`} 
                          color="error" 
                          variant="outlined" 
                          size="small"
                        />
                      )}
                    </Box>
                  </Box>
                  
                  <LinearProgress 
                    variant="determinate" 
                    value={(timeLeft / (20 * 60)) * 100} 
                    sx={{ 
                      mb: 3, 
                      height: 10, 
                      borderRadius: 5,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: timeLeft <= 60 ? 'error.main' : 
                                          timeLeft <= 5 * 60 ? 'warning.main' : 
                                          'primary.main',
                      }
                    }} 
                  />
                  
                  {timeLeft <= 5 * 60 && timeLeft > 60 && (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                      Grace period ended! You're now receiving a penalty of -{penaltyPoints} points.
                    </Alert>
                  )}
                  
                  {timeLeft <= 60 && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      Less than 1 minute remaining! Your quiz will be auto-submitted when time expires.
                    </Alert>
                  )}

                  <Grid container spacing={3}>
                    {questions.map((question, questionIndex) => (
                      <Grid item xs={12} key={questionIndex}>
                        <Card sx={{ 
                          mb: 2, 
                          border: selectedAnswers[questionIndex] !== undefined ? '1px solid' : 'none',
                          borderColor: 'primary.main',
                          bgcolor: 'background.paper',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                              <Typography 
                                variant="subtitle1" 
                                sx={{ 
                                  fontWeight: 600,
                                  color: 'primary.main' 
                                }}
                              >
                                Question {questionIndex + 1}
                              </Typography>
                              
                              {selectedAnswers[questionIndex] !== undefined && (
                                <Chip 
                                  label="Answered" 
                                  color="primary" 
                                  size="small" 
                                  variant="outlined"
                                />
                              )}
                            </Box>
                            
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                color: 'text.primary', 
                                mb: 3, 
                                textAlign: 'left',
                                fontWeight: 500
                              }}
                            >
                              {question.question}
                            </Typography>

                            <FormControl component="fieldset" sx={{ width: '100%' }}>
                              <RadioGroup 
                                value={selectedAnswers[questionIndex] !== undefined ? 
                                      selectedAnswers[questionIndex].toString() : ''} 
                                onChange={(e) => handleAnswerSelect(questionIndex, parseInt(e.target.value))}
                              >
                                {question.options.map((option, index) => (
                                  <FormControlLabel 
                                    key={index} 
                                    value={index.toString()} 
                                    control={
                                      <Radio 
                                        sx={{
                                          color: 'text.secondary',
                                          '&.Mui-checked': {
                                            color: 'primary.main',
                                          }
                                        }}
                                      />
                                    } 
                                    label={
                                      <Typography sx={{ color: 'text.primary' }}>
                                        {option}
                                      </Typography>
                                    }
                                    sx={{
                                      margin: '6px 0',
                                      padding: '8px 12px',
                                      borderRadius: 1,
                                      transition: 'all 0.2s',
                                      '&:hover': {
                                        backgroundColor: 'rgba(255, 107, 0, 0.08)',
                                      },
                                      ...(selectedAnswers[questionIndex] === index && {
                                        backgroundColor: 'rgba(255, 107, 0, 0.1)',
                                        border: '1px solid',
                                        borderColor: 'primary.main',
                                      }),
                                    }}
                                  />
                                ))}
                              </RadioGroup>
                            </FormControl>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                  
                  <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                    <Button 
                      variant="contained"
                      size="large"
                      onClick={submitResults}
                      sx={{ 
                        px: 6, 
                        py: 1.5, 
                        fontSize: '1.1rem'
                      }}
                    >
                      Submit Quiz
                    </Button>
                  </Box>
                </>
              )}
            </>
          )}

          {/* Results Display Step */}
          {step === 'results' && (
            <>
              <Typography 
                variant="h4" 
                component="h1" 
                gutterBottom
                sx={{
                  color: 'primary.main',
                  fontWeight: 700,
                  mb: 4
                }}
              >
                Quiz Completed!
              </Typography>
              
              <Typography 
                variant="h5"
                sx={{
                  color: 'text.primary',
                  mb: 2
                }}
              >
                Your Score: {score}/{totalQuestions}
              </Typography>
              
              {penaltyPoints > 0 && (
                <Typography 
                  variant="body1"
                  sx={{
                    color: 'error.main',
                    mb: 2
                  }}
                >
                  Time Penalty: -{penaltyPoints} points
                </Typography>
              )}
              
              <Typography 
                variant="h6"
                sx={{
                  color: 'text.secondary',
                  mb: 6
                }}
              >
                {score >= 10 ? 'Congratulations! You have qualified for Round 2.' : 'You need to score at least 10 points to advance to Round 2.'}
              </Typography>
              
              <Button 
                variant="contained" 
                size="large"
                onClick={handleReturnToDashboard}
                sx={{ 
                  px: 6, 
                  py: 1.5, 
                  fontSize: '1.1rem',
                  mt: 'auto' 
                }}
              >
                Return to Dashboard
              </Button>
            </>
          )}
        </Paper>
      </Container>

      {/* Dialog for messages */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Quiz Information</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {dialogMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} color="primary">
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Round1; 