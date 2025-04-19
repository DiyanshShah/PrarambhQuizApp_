import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Box, Paper, Button, 
  Radio, RadioGroup, FormControlLabel, FormControl, 
  CircularProgress, Dialog, DialogTitle, DialogContent, 
  DialogContentText, DialogActions
} from '@mui/material';
import axios from 'axios';
import Navbar from './Navbar';

const Round1 = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('language-select'); // 'language-select', 'quiz', 'results'
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  const totalQuestions = 20;

  // Load user from localStorage
  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (loggedInUser) {
      setUser(JSON.parse(loggedInUser));
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Load questions based on selected language
  useEffect(() => {
    if (step === 'quiz' && selectedLanguage) {
      setLoading(true);
      axios.get(`http://localhost:5000/api/admin/questions/${selectedLanguage}`)
        .then(response => {
          setQuestions(response.data);
          setLoading(false);
          setTimeLeft(60);
          setCurrentQuestionIndex(0);
          setScore(0);
          setSelectedAnswer(null);
        })
        .catch(error => {
          console.error('Error loading questions:', error);
          setLoading(false);
          setDialogMessage('Error loading questions. Please try again.');
          setDialogOpen(true);
          setStep('language-select');
        });
    }
  }, [step, selectedLanguage]);

  // Timer countdown
  useEffect(() => {
    let timer;
    if (step === 'quiz' && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } else if (step === 'quiz' && timeLeft === 0) {
      // Time's up for current question
      handleNextQuestion();
    }

    return () => {
      clearTimeout(timer);
    };
  }, [step, timeLeft]);

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
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
      setSelectedAnswer(null);
      setTimeLeft(60);
    } else {
      // Quiz completed - submit results
      submitResults();
    }
  };

  // Submit quiz results to backend
  const submitResults = async () => {
    try {
      // Calculate final score (adding the last answer if selected)
      let finalScore = score;
      if (selectedAnswer !== null && 
          currentQuestionIndex < questions.length && 
          selectedAnswer === questions[currentQuestionIndex].correctAnswer) {
        finalScore += 1;
      }

      console.log("Submitting Round 1 results:", {
        user_id: user.id,
        round_number: 1,
        language: selectedLanguage,
        score: finalScore,
        total_questions: totalQuestions
      });

      const response = await axios.post('http://localhost:5000/api/quiz/result', {
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
      setDialogMessage(`Quiz completed! Your score: ${finalScore}/${totalQuestions}`);
      setDialogOpen(true);
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
      setStep('language-select');
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
                  You will be presented with 20 questions.
                  <br />Each question has a 60-second time limit.
                </Typography>
                <Button 
                  variant="contained" 
                  size="large"
                  onClick={startQuiz}
                  sx={{ 
                    px: 6, 
                    py: 1.5, 
                    fontSize: '1.1rem'
                  }}
                >
                  Start Quiz
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
                    mb: 3
                  }}>
                    <Typography variant="h6" sx={{ color: 'primary.main' }}>
                      Question {currentQuestionIndex + 1}/{totalQuestions}
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
                          mb: 4, 
                          textAlign: 'left',
                          fontWeight: 600
                        }}
                      >
                        {questions[currentQuestionIndex].question}
                      </Typography>

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
                                <Typography sx={{ color: 'text.primary', fontSize: '1.1rem' }}>
                                  {option}
                                </Typography>
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
                        {currentQuestionIndex < totalQuestions - 1 ? 'Next Question' : 'Finish Quiz'}
                      </Button>
                    </>
                  )}
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
          Quiz Information
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
              if (step === 'results') {
                navigate('/participant-dashboard');
              }
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

export default Round1; 