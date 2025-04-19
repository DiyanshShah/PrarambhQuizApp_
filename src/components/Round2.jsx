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
          setCurrentQuestionIndex(0);
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
    if (questions.length > 0 && timeLeft > 0) {
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
  }, [timeLeft, questions]);

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
  const submitResults = async () => {
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

      setDialogMessage(`Quiz completed! Your score: ${finalScore}/${Math.min(totalQuestions, questions.length)}`);
      setDialogOpen(true);
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
    }
  };

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
          ) : (
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