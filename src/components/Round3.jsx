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

const apiUrl = import.meta.env.VITE_API_URL;

const Round3 = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // More time for Round 3 (2 minutes per question)
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  const totalQuestions = 10; // Fewer, but more complex questions

  // Load user from localStorage
  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (loggedInUser) {
      const parsedUser = JSON.parse(loggedInUser);
      
      // Check if user is allowed to access Round 3
      if (parsedUser.current_round < 3) {
        setDialogMessage('You need to complete Round 2 before accessing Round 3.');
        setDialogOpen(true);
        setTimeout(() => navigate('/participant-dashboard'), 2000);
        return;
      }
      
      setUser(parsedUser);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // Load round 3 questions
  useEffect(() => {
    if (user) {
      setLoading(true);
      axios.get(`${apiUrl}/api/admin/questions/round3`)
        .then(response => {
          console.log("Round 3 questions loaded:", response.data);
          setQuestions(response.data);
          setLoading(false);
          setTimeLeft(120);
          setCurrentQuestionIndex(0);
          setScore(0);
          setSelectedAnswer(null);
        })
        .catch(error => {
          console.error('Error loading Round 3 questions:', error);
          
          // If server error occurs, use mock questions for testing
          if (error.response && error.response.status === 500) {
            console.log("Using mock questions due to server error");
            
            const mockQuestions = [
              {
                "question": "What is the time complexity of the following algorithm to find the nth Fibonacci number using dynamic programming?",
                "code": "function fibonacci(n) {\n  const dp = new Array(n + 1);\n  dp[0] = 0;\n  dp[1] = 1;\n  \n  for (let i = 2; i <= n; i++) {\n    dp[i] = dp[i - 1] + dp[i - 2];\n  }\n  \n  return dp[n];\n}",
                "options": [
                  "O(n²)",
                  "O(n)",
                  "O(log n)",
                  "O(2ⁿ)"
                ],
                "correctAnswer": 1
              },
              {
                "question": "Which data structure would be most efficient for implementing a system that needs to frequently find the minimum and maximum values as well as add and remove elements?",
                "options": [
                  "Array",
                  "Min-Max Heap",
                  "Balanced Binary Search Tree",
                  "Hash Table"
                ],
                "correctAnswer": 1
              },
              {
                "question": "What is the output of the following code?",
                "code": "class A {\n  constructor() {\n    this.value = 1;\n  }\n  \n  get() {\n    return this.value;\n  }\n}\n\nclass B extends A {\n  constructor() {\n    super();\n    this.value = 2;\n  }\n  \n  get() {\n    return super.get() + this.value;\n  }\n}\n\nconst b = new B();\nconsole.log(b.get());",
                "options": [
                  "1",
                  "2",
                  "3",
                  "4"
                ],
                "correctAnswer": 2
              }
            ];
            
            setQuestions(mockQuestions);
            setLoading(false);
            setTimeLeft(120);
            setCurrentQuestionIndex(0);
            setScore(0);
            setSelectedAnswer(null);
            return;
          }
          
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
      setTimeLeft(120); // Reset timer for next question
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

      console.log("Submitting Round 3 results:", {
        user_id: user.id,
        round_number: 3,
        score: finalScore,
        total_questions: Math.min(totalQuestions, questions.length)
      });

      const response = await axios.post(`${apiUrl}/api/quiz/result`, {
        user_id: user.id,
        round_number: 3,
        language: '', // Round 3 doesn't have a language field
        score: finalScore,
        total_questions: Math.min(totalQuestions, questions.length)
      });

      console.log("Round 3 results submitted successfully:", response.data);

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

  // Handle dialog close
  const handleCloseDialog = () => {
    setDialogOpen(false);
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
                  backgroundColor: timeLeft <= 20 ? 'error.dark' : 'primary.dark',
                  px: 2,
                  py: 1,
                  borderRadius: 2
                }}>
                  <CircularProgress 
                    variant="determinate" 
                    value={(timeLeft / 120) * 100} 
                    size={30} 
                    sx={{ 
                      color: 'primary.light',
                      '& .MuiCircularProgress-circle': {
                        transition: 'stroke-dashoffset 0.5s linear',
                      }
                    }}
                  />
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 4, textAlign: 'left' }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: 'text.primary' }}>
                  {questions[currentQuestionIndex].question}
                </Typography>
                
                {questions[currentQuestionIndex].code && (
                  <Paper 
                    elevation={0}
                    sx={{ 
                      p: 3, 
                      mb: 3, 
                      backgroundColor: 'rgba(0, 0, 0, 0.5)', 
                      borderRadius: 2,
                      fontFamily: 'monospace',
                      overflowX: 'auto',
                      maxWidth: '100%'
                    }}
                  >
                    <pre style={{ margin: 0, color: '#E0E0E0', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                      {questions[currentQuestionIndex].code}
                    </pre>
                  </Paper>
                )}
                
                <FormControl component="fieldset" sx={{ width: '100%' }}>
                  <RadioGroup 
                    value={selectedAnswer !== null ? selectedAnswer.toString() : ''}
                    onChange={(e) => handleAnswerSelect(parseInt(e.target.value))}
                  >
                    {questions[currentQuestionIndex].options.map((option, idx) => (
                      <FormControlLabel 
                        key={idx}
                        value={idx.toString()}
                        control={
                          <Radio 
                            sx={{ 
                              '&.Mui-checked': {
                                color: 'primary.main',
                              }
                            }}
                          />
                        }
                        label={
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              py: 1, 
                              color: 'text.primary'
                            }}
                          >
                            {option}
                          </Typography>
                        }
                        sx={{ 
                          mb: 1.5, 
                          p: 1.5, 
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: selectedAnswer === idx ? 'primary.main' : 'transparent',
                          backgroundColor: selectedAnswer === idx ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                          transition: 'all 0.2s ease-in-out',
                          '&:hover': {
                            backgroundColor: 'rgba(37, 99, 235, 0.05)',
                          }
                        }}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              </Box>

              <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="contained" 
                  size="large"
                  onClick={handleNextQuestion}
                  sx={{ 
                    px: 4, 
                    py: 1.5, 
                    borderRadius: 2,
                    backgroundColor: 'primary.main',
                  }}
                >
                  {currentQuestionIndex < Math.min(totalQuestions - 1, questions.length - 1) ? 'Next Question' : 'Finish Quiz'}
                </Button>
              </Box>
            </>
          ) : (
            <Box sx={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              py: 6
            }}>
              <Typography variant="h5" sx={{ color: 'text.secondary', mb: 4 }}>
                No questions available for Round 3 yet.
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => navigate('/participant-dashboard')}
              >
                Return to Dashboard
              </Button>
            </Box>
          )}
        </Paper>
      </Container>

      <Dialog open={dialogOpen} onClose={handleCloseDialog}>
        <DialogTitle sx={{ backgroundColor: 'background.paper', color: 'primary.main' }}>
          Round 3 Quiz
        </DialogTitle>
        <DialogContent sx={{ backgroundColor: 'background.paper' }}>
          <DialogContentText sx={{ color: 'text.primary' }}>
            {dialogMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ backgroundColor: 'background.paper' }}>
          <Button onClick={handleCloseDialog} color="primary" autoFocus>
            OK
          </Button>
        </DialogActions>
      </Dialog>
      
    </Box>
  );
};

export default Round3; 