import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Box, Paper, Button, 
  Radio, RadioGroup, FormControlLabel, FormControl, 
  CircularProgress, Dialog, DialogTitle, DialogContent, 
  DialogContentText, DialogActions,
  Alert, Card, CardContent, Grid
} from '@mui/material';
import axios from 'axios';
import Navbar from './Navbar';
import CodeIcon from '@mui/icons-material/Code';
import PythonIcon from '@mui/icons-material/IntegrationInstructions';

const apiUrl = import.meta.env.VITE_API_URL;

// Helper function to get the correct image URL format
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // If it's already a full URL, return it as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // For round2 images, try the new direct route
  if (imagePath.startsWith('round2/')) {
    return `${apiUrl}/${imagePath}`;
  }
  
  // Default case - use uploads path
  return `${apiUrl}/${imagePath}`;
};

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
  const [step, setStep] = useState('language-select'); // 'language-select', 'quiz', 'intro'
  const [selectedLanguage, setSelectedLanguage] = useState('');

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
      const response = await axios.get(`${apiUrl}/api/rounds/access`);
      return response.data?.round2?.enabled || false;
    } catch (error) {
      console.error('Error checking round access:', error);
      return false;
    }
  };

  // Enhanced polling - check access status even during language selection
  useEffect(() => {
    let intervalId;
    
    // Only poll if on language selection screen or during quiz
    if ((step === 'language-select' || step === 'intro' || step === 'quiz') && user && !user.is_admin) {
      // Set up polling
      intervalId = setInterval(async () => {
        const enabled = await checkRoundAccess();
        
        // If access status changed, show visual feedback
        if (enabled !== isRoundEnabled) {
          setIsRoundEnabled(enabled);
          
          // Show dialog if access was revoked during language selection
          if (!enabled && (step === 'language-select' || step === 'intro')) {
            setDialogMessage("Round 2 access has been revoked by the administrator. Please try again later.");
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

  // Load round 2 questions based on selected language
  useEffect(() => {
    if (user && step === 'quiz' && selectedLanguage) {
      setLoading(true);
      // Use the quiz-specific endpoint for participants, which has better image path handling
      axios.get(`${apiUrl}/api/quiz/round2?language=${selectedLanguage}`)
        .then(response => {
          console.log(`Round 2 ${selectedLanguage} questions loaded:`, response.data);
          setQuestions(response.data);
          setLoading(false);
          setTimeLeft(60);
          setCurrentQuestionIndex(0);
          setScore(0);
          setSelectedAnswer(null);
        })
        .catch(error => {
          console.error('Error loading Round 2 questions:', error);
          setLoading(false);
          setDialogMessage('Error loading questions. Please try again.');
          setDialogOpen(true);
          setStep('language-select');
        });
    }
  }, [user, step, selectedLanguage]);

  // Timer countdown
  useEffect(() => {
    let timer;
    if (step === 'quiz' && questions.length > 0 && timeLeft > 0 && isRoundEnabled) {
      timer = setTimeout(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } else if (step === 'quiz' && questions.length > 0 && timeLeft === 0) {
      // Time's up for current question
      handleNextQuestion();
    }

    return () => {
      clearTimeout(timer);
    };
  }, [timeLeft, questions, step, isRoundEnabled]);

  // Handle language selection and start quiz introduction
  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language);
    setStep('intro');
  };

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
        language: selectedLanguage,
        score: finalScore,
        total_questions: Math.min(totalQuestions, questions.length)
      });

      const response = await axios.post(`${apiUrl}/api/quiz/result`, {
        user_id: user.id,
        round_number: 2,
        language: selectedLanguage,
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

  // Start the quiz after intro
  const startQuiz = () => {
    setStep('quiz');
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

  if (loading && step === 'quiz') {
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
  
  // Language selection screen
  if (step === 'language-select') {
    return (
      <Box sx={{ 
        width: '100%',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Navbar isAdmin={user?.is_admin || false} />
        <Container maxWidth="md" sx={{ mt: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 6,
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
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <Typography variant="h4" sx={{ color: 'primary.main', mb: 4, fontWeight: 'bold' }}>
                Round 2: Select Programming Language
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
              
              <Typography variant="body1" sx={{ mb: 4, textAlign: 'center' }}>
                Please select the programming language you would like to be tested on:
              </Typography>
              
              <Grid container spacing={3} justifyContent="center">
                <Grid item xs={12} md={6}>
                  <Paper 
                    elevation={3} 
                    sx={{ 
                      p: 3, 
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'scale(1.03)',
                        boxShadow: 6,
                      }
                    }}
                    onClick={() => handleLanguageSelect('python')}
                  >
                    <PythonIcon sx={{ fontSize: 60, color: '#3776AB', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>Python</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Select Python for Round 2 questions focused on Python programming concepts.
                    </Typography>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      sx={{ mt: 2 }}
                      onClick={() => handleLanguageSelect('python')}
                    >
                      Choose Python
                    </Button>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper 
                    elevation={3} 
                    sx={{ 
                      p: 3, 
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'scale(1.03)',
                        boxShadow: 6,
                      }
                    }}
                    onClick={() => handleLanguageSelect('c')}
                  >
                    <CodeIcon sx={{ fontSize: 60, color: '#A8B9CC', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>C</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Select C for Round 2 questions focused on C programming concepts.
                    </Typography>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      sx={{ mt: 2 }}
                      onClick={() => handleLanguageSelect('c')}
                    >
                      Choose C
                    </Button>
                  </Paper>
                </Grid>
              </Grid>
              
              <Button
                variant="outlined"
                onClick={() => navigate('/participant-dashboard')}
                sx={{ mt: 4 }}
              >
                Return to Dashboard
              </Button>
            </Box>
          </Paper>
        </Container>
      </Box>
    );
  }

  // Intro screen after language selection
  if (step === 'intro') {
    return (
      <Box sx={{ 
        width: '100%',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Navbar isAdmin={false} />
        <Container maxWidth="md" sx={{ mt: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 6,
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
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <Typography variant="h4" sx={{ color: 'primary.main', mb: 3, fontWeight: 'bold' }}>
                Welcome to Round 2: {selectedLanguage === 'python' ? 'Python' : 'C'} Track
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
                  • You will be presented with a series of image-based coding questions on {selectedLanguage === 'python' ? 'Python' : 'C'}.
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
              
              <Button
                variant="outlined"
                onClick={() => setStep('language-select')}
                sx={{ mt: 3 }}
              >
                Change Language
              </Button>
              
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
          </Paper>
        </Container>
      </Box>
    );
  }

  // Quiz Questions UI (the existing quiz UI from the previous code)
  return (
    <Box sx={{ 
      width: '100%',
      minHeight: '100vh',
      backgroundColor: 'background.default',
      display: 'flex',
      flexDirection: 'column',
    }}>
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
          {/* Quiz Questions */}
          {questions.length > 0 ? (
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
                        src={getImageUrl(questions[currentQuestionIndex].questionImage)}
                        alt="Question"
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '300px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px'
                        }}
                        onError={(e) => {
                          console.error("Image failed to load:", questions[currentQuestionIndex].questionImage);
                          // Try an alternative URL format if the first one fails
                          const currentSrc = e.target.src;
                          if (currentSrc.includes('/uploads/round2/')) {
                            // Try direct path
                            e.target.src = currentSrc.replace('/uploads/round2/', '/round2/');
                          } else if (currentSrc.includes(`${apiUrl}/round2/`)) {
                            // Already tried both formats, show placeholder
                            e.target.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWltYWdlLW9mZiI+PHBhdGggZD0iTTIwLjc0IDIxSE0uMjYgQS4yNCkgTDMgMy41MSBMNi43MSA3LjIxYTMgMyAwIDAgMSAuMjkgNCBsLS43MS43MSBhMSAxIDAgMCAwIDAgMS40MSBhLS43IDEgMCAwIDAgMS41MyAtLjExIGw0LjQgNC40MCBMMyAxOVoiLz48cGF0aCBkPSJNMTguMDUgMTNoMS45OWEuMi4yIDAgMCAxIC4yLjJ2Mi4yNSIvPjxwYXRoIGQ9Ik0xNC42OSA5LjYgTDExLjcyIDYuNjIgYTUgNSAwIDAgMC03LjAyIC4wMZYv3JHRoIG9mIFEgIiA+ID48L3BhdGg+PHBhdGggZD0iTTAgN2g5bTYgMGg5Ii8+PHBhdGggZD0iTTEgMWgyMXYyMkgxeiIvPjwvc3ZnPg==";
                          }
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
                                    src={getImageUrl(questions[currentQuestionIndex].optionImages[index])}
                                    alt={`Option ${index + 1}`}
                                    style={{ 
                                      maxWidth: '100%', 
                                      maxHeight: '150px',
                                      border: '1px solid rgba(255, 255, 255, 0.1)',
                                      borderRadius: '4px'
                                    }}
                                    onError={(e) => {
                                      console.error("Option image failed to load:", questions[currentQuestionIndex].optionImages[index]);
                                      const currentSrc = e.target.src;
                                      if (currentSrc.includes('/uploads/round2/')) {
                                        // Try direct path
                                        e.target.src = currentSrc.replace('/uploads/round2/', '/round2/');
                                      } else if (currentSrc.includes(`${apiUrl}/round2/`)) {
                                        // Already tried both formats, show placeholder
                                        e.target.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWltYWdlLW9mZiI+PHBhdGggZD0iTTIwLjc0IDIxSE0uMjYgQS4yNCkgTDMgMy41MSBMNi43MSA3LjIxYTMgMyAwIDAgMSAuMjkgNCBsLS43MS43MSBhMSAxIDAgMCAwIDAgMS40MSBhLS43IDEgMCAwIDAgMS41MyAtLjExIGw0LjQgNC40MCBMMyAxOVoiLz48cGF0aCBkPSJNMTguMDUgMTNoMS45OWEuMi4yIDAgMCAxIC4yLjJ2Mi4yNSIvPjxwYXRoIGQ9Ik0xNC42OSA5LjYgTDExLjcyIDYuNjIgYTUgNSAwIDAgMC03LjAyIC4wMZYv3JHRoIG9mIFEgIiA+ID48L3BhdGg+PHBhdGggZD0iTTAgN2g5bTYgMGg5Ii8+PHBhdGggZD0iTTEgMWgyMXYyMkgxeiIvPjwvc3ZnPg==";
                                      }
                                    }}
                                  />
                                </Box>
                              )}
                            </Box>
                          }
                          sx={{
                            margin: '10px 0',
                            padding: '10px 16px',
                            borderRadius: '8px',
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)'
                            }
                          }}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>

                  <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'center' }}>
                    <Button 
                      variant="contained" 
                      onClick={handleNextQuestion}
                      disabled={selectedAnswer === null}
                      sx={{ 
                        py: 1.5, 
                        px: 5, 
                        fontSize: '1rem',
                        borderRadius: '8px'
                      }}
                    >
                      {currentQuestionIndex < Math.min(totalQuestions - 1, questions.length - 1) ? 'Next Question' : 'Finish Quiz'}
                    </Button>
                  </Box>
                </>
              )}
            </>
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
              <CircularProgress />
            </Box>
          )}
        </Paper>
      </Container>

      {/* Dialog for messages */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Round 2</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {dialogMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>OK</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Round2; 