import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Box, Paper, Button, 
  Radio, RadioGroup, FormControlLabel, FormControl, 
  CircularProgress, Dialog, DialogTitle, DialogContent, 
  DialogContentText, DialogActions,
  Alert
} from '@mui/material';
import axios from 'axios';
import Navbar from './Navbar';

const Round2 = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [isRoundEnabled, setIsRoundEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalQuestions = 20;

  // Load user from localStorage
  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (loggedInUser) {
      const parsedUser = JSON.parse(loggedInUser);
      
      // Check if user is allowed to access Round 2
      if (parsedUser.current_round < 2) {
        setDialogMessage('You need to complete Round 1 before accessing Round 2.');
        setDialogOpen(true);
        setTimeout(() => navigate('/participant-dashboard'), 2000);
        return;
      }
      
      setUser(parsedUser);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Check if round is still enabled
  const checkRoundAccess = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/rounds/access');
      return response.data?.round2?.enabled || false;
    } catch (error) {
      console.error('Error checking round access:', error);
      return false;
    }
  };

  // Start polling for round access status
  useEffect(() => {
    if (!user || isSubmitting) return;
    
    let intervalId;
    
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
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user, isSubmitting]);

  // Handle round being disabled during participation
  const handleRoundDisabled = () => {
    if (isSubmitting) return;
    
    console.log("Round 2 access revoked! Auto-submitting...");
    
    // Show dialog
    setDialogMessage("Round 2 access has been revoked by the administrator. Your progress will be automatically submitted.");
    setDialogOpen(true);
    
    // Auto-submit after a short delay
    setTimeout(() => {
      submitResults(true);
    }, 2000);
  };

  // Load round 2 questions
  useEffect(() => {
    if (user) {
      setLoading(true);
      axios.get('http://localhost:5000/api/admin/questions/round2')
        .then(response => {
          console.log("Round 2 questions loaded:", response.data);
          setQuestions(response.data);
          setLoading(false);
          setTimeLeft(60);
          setCurrentQuestionIndex(-1); // Start at introduction screen
          setScore(0);
          setSelectedAnswer(null);
        })
        .catch(error => {
          console.error('Error loading Round 2 questions:', error);
          setLoading(false);
          setDialogMessage('Error loading questions. Please try again.');
          setDialogOpen(true);
          navigate('/participant-dashboard');
        });
    }
  }, [user, navigate]);

  // Timer countdown
  useEffect(() => {
    let timer;
    if (questions.length > 0 && timeLeft > 0 && isRoundEnabled) {
      timer = setTimeout(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } else if (questions.length > 0 && timeLeft === 0) {
      // Time's up for current question
      handleNextQuestion();
    }

    return () => {
      clearTimeout(timer);
    };
  }, [timeLeft, questions, isRoundEnabled]);

  // Handle answer selection
  const handleAnswerSelect = (index) => {
    setSelectedAnswer(index);
  };

  // Handle next question or finish quiz
  const handleNextQuestion = () => {
    // Check if answer was correct and update score
    if (selectedAnswer !== null && questions[currentQuestionIndex]) {
      if (selectedAnswer === questions[currentQuestionIndex].correctAnswer) {
        setScore(prevScore => prevScore + 1);
      }
    }
    
    // Move to next question or finish quiz
    if (currentQuestionIndex < Math.min(totalQuestions - 1, questions.length - 1)) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setSelectedAnswer(null);
      setTimeLeft(60);
    } else {
      // Quiz completed - submit results
      submitResults();
    }
  };

  // Submit quiz results to backend
  const submitResults = async (isAutoSubmit = false) => {
    setIsSubmitting(true);
    try {
      // Calculate final score (adding the last answer if selected)
      let finalScore = score;
      if (selectedAnswer !== null && 
          currentQuestionIndex < questions.length && 
          selectedAnswer === questions[currentQuestionIndex].correctAnswer) {
        finalScore += 1;
      }

      console.log("Submitting Round 2 results:", {
        user_id: user.id,
        round_number: 2,
        score: finalScore,
        total_questions: Math.min(totalQuestions, questions.length)
      });

      const response = await axios.post('http://localhost:5000/api/quiz/result', {
        user_id: user.id,
        round_number: 2,
        // Round 2 doesn't have a language field, send empty string instead of null
        language: '',
        score: finalScore,
        total_questions: Math.min(totalQuestions, questions.length)
      });

      console.log("Round 2 results submitted successfully:", response.data);

      // Update the user in localStorage if received in response
      if (response.data.updated_user) {
        localStorage.setItem('user', JSON.stringify(response.data.updated_user));
        setUser(response.data.updated_user);
      }

      // Only show completion message if not auto-submitted due to access revocation
      if (!isAutoSubmit) {
        setDialogMessage(`Quiz completed! Your score: ${finalScore}/${Math.min(totalQuestions, questions.length)}`);
        setDialogOpen(true);
      }
      
      setTimeout(() => {
        navigate('/participant-dashboard');
      }, 3000);
    } catch (error) {
      console.error('Error submitting results:', error);
      console.error('Error details:', error.response?.data);
      
      // Handle already attempted error
      if (error.response && error.response.data && error.response.data.already_attempted) {
        setDialogMessage('You have already attempted this round and cannot retake it.');
      } else {
        setDialogMessage('Error submitting your results. Please try again.');
      }
      
      setDialogOpen(true);
      setTimeout(() => {
        navigate('/participant-dashboard');
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start the quiz
  const startQuiz = () => {
    setCurrentQuestionIndex(0);
    setTimeLeft(60);
  };

  // Show special UI when round is disabled
  if (!isRoundEnabled && user && !user.is_admin && !isSubmitting) {
    return (
      <Box sx={{ 
        width: '100%',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 3
      }}>
        <Alert severity="warning" sx={{ width: '80%', maxWidth: '600px' }}>
          Round 2 has been disabled by the administrator. Your progress is being submitted.
        </Alert>
        <CircularProgress />
      </Box>
    );
  }

  if (loading || !user) {
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
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <CircularProgress />
        </Box>
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
      {loading || currentQuestionIndex < 0 ? <Navbar isAdmin={false} /> : null}

      <Container maxWidth="md" sx={{ mt: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
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
          {/* Introduction Screen */}
          {currentQuestionIndex === -1 && questions.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <Typography variant="h4" sx={{ color: 'primary.main', mb: 3, fontWeight: 'bold' }}>
                Welcome to Round 2
              </Typography>
              
              {!isRoundEnabled && user?.is_admin && (
                <Alert severity="warning" sx={{ mb: 3, width: '100%' }}>
                  Round 2 is currently disabled for participants. As an admin, you can still proceed.
                </Alert>
              )}
              
              {isRoundEnabled && (
                <Alert severity="success" sx={{ mb: 3, width: '100%' }}>
                  Round 2 is enabled and ready to start!
                </Alert>
              )}
              
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  bgcolor: 'primary.main',
                  color: 'white',
                  borderRadius: 2,
                  mb: 4,
                  width: '100%'
                }}
              >
                <Typography variant="h6" gutterBottom>
                  Instructions:
                </Typography>
                <Typography variant="body1" align="left" sx={{ mb: 2 }}>
                  • You will be presented with {Math.min(totalQuestions, questions.length)} image-based questions.
                </Typography>
                <Typography variant="body1" align="left" sx={{ mb: 2 }}>
                  • You have 60 seconds to answer each question.
                </Typography>
                <Typography variant="body1" align="left" sx={{ mb: 2 }}>
                  • Once you move to the next question, you cannot go back.
                </Typography>
                <Typography variant="body1" align="left">
                  • Your final score will determine if you qualify for Round 3.
                </Typography>
              </Paper>
              
              <Box sx={{ mt: 3, width: '100%', display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={startQuiz}
                  disabled={!isRoundEnabled && !user?.is_admin}
                  sx={{ 
                    px: 6, 
                    py: 1.5, 
                    fontSize: '1.1rem'
                  }}
                >
                  {isRoundEnabled || user?.is_admin ? 'Start Round 2' : 'Waiting for Access...'}
                </Button>
              </Box>
              
              {user?.is_admin && (
                <Button
                  variant="outlined"
                  onClick={() => navigate('/admin-dashboard')}
                  sx={{ mt: 3 }}
                >
                  Return to Admin Dashboard
                </Button>
              )}
            </Box>
          )}
          
          {/* Quiz Questions */}
          {currentQuestionIndex >= 0 && questions.length > 0 ? (
            <>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 3
              }}>
                <Typography variant="h6" sx={{ color: 'primary.main' }}>
                  Question {currentQuestionIndex + 1}/{Math.min(totalQuestions, questions.length)}
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1, 
                  backgroundColor: timeLeft <= 10 ? 'error.dark' : 'primary.dark',
                  px: 2,
                  py: 1,
                  borderRadius: 2
                }}>
                  <CircularProgress 
                    variant="determinate" 
                    value={(timeLeft / 60) * 100} 
                    size={30} 
                    sx={{ 
                      color: 'primary.light',
                      '& .MuiCircularProgress-circle': {
                        transition: 'stroke-dashoffset 0.5s linear',
                      }
                    }}
                  />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {timeLeft}s
                  </Typography>
                </Box>
              </Box>

              {questions[currentQuestionIndex] && (
                <>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      color: 'text.primary', 
                      mb: 2, 
                      textAlign: 'left',
                      fontWeight: 600
                    }}
                  >
                    {questions[currentQuestionIndex].question}
                  </Typography>

                  {/* Question Image */}
                  {questions[currentQuestionIndex].questionImage && (
                    <Box sx={{ mb: 3, textAlign: 'center' }}>
                      <img 
                        src={`http://localhost:5000/${questions[currentQuestionIndex].questionImage}`}
                        alt="Question"
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '300px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px'
                        }}
                      />
                    </Box>
                  )}

                  <FormControl component="fieldset" sx={{ width: '100%', mb: 4 }}>
                    <RadioGroup 
                      value={selectedAnswer !== null ? selectedAnswer.toString() : ''} 
                      onChange={(e) => handleAnswerSelect(parseInt(e.target.value))}
                    >
                      {questions[currentQuestionIndex].options.map((option, index) => (
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
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                              <Typography sx={{ color: 'text.primary', fontSize: '1.1rem' }}>
                                {option}
                              </Typography>
                              {questions[currentQuestionIndex].optionImages && questions[currentQuestionIndex].optionImages[index] && (
                                <Box sx={{ mt: 1 }}>
                                  <img 
                                    src={`http://localhost:5000/${questions[currentQuestionIndex].optionImages[index]}`}
                                    alt={`Option ${index + 1}`}
                                    style={{ 
                                      maxWidth: '100%', 
                                      maxHeight: '150px',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      borderRadius: '4px'
                                    }}
                                  />
                                </Box>
                              )}
                            </Box>
                          }
                          sx={{
                            margin: '10px 0',
                            padding: '10px 16px',
                            borderRadius: 2,
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 107, 0, 0.08)',
                            },
                            ...(selectedAnswer === index && {
                              backgroundColor: 'rgba(255, 107, 0, 0.1)',
                              border: '1px solid',
                              borderColor: 'primary.main',
                            }),
                          }}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>

                  <Button 
                    variant="contained"
                    size="large"
                    onClick={handleNextQuestion}
                    sx={{ 
                      px: 6, 
                      py: 1.5, 
                      fontSize: '1.1rem',
                      mt: 'auto' 
                    }}
                  >
                    {currentQuestionIndex < Math.min(totalQuestions - 1, questions.length - 1) ? 'Next Question' : 'Finish Quiz'}
                  </Button>
                </>
              )}
            </>
          ) : questions.length === 0 && currentQuestionIndex === -1 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <Typography variant="h5" sx={{ color: 'primary.main', mb: 3 }}>
                No questions available for Round 2
              </Typography>
              <Button 
                variant="contained"
                onClick={() => navigate('/participant-dashboard')}
                sx={{ px: 4, py: 1.5 }}
              >
                Return to Dashboard
              </Button>
            </Box>
          ) : null}
        </Paper>
      </Container>

      {/* Dialog for messages */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
        PaperProps={{
          sx: {
            backgroundColor: 'background.paper',
            color: 'text.primary',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'primary.main',
          }
        }}
      >
        <DialogTitle id="alert-dialog-title" sx={{ color: 'primary.main' }}>
          Round 2 Information
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description" sx={{ color: 'text.secondary' }}>
            {dialogMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setDialogOpen(false);
              navigate('/participant-dashboard');
            }} 
            autoFocus
            sx={{ color: 'primary.main' }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Round2; 