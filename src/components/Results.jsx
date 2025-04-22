import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Box, Paper, Divider, CircularProgress, 
  Card, CardContent, Chip
} from '@mui/material';
import axios from 'axios';
import Navbar from './Navbar';
import { motion } from 'framer-motion';

const apiUrl = import.meta.env.VITE_API_URL;

// Create animated components
const MotionContainer = motion(Container);
const MotionPaper = motion(Paper);
const MotionCard = motion(Card);
const MotionBox = motion(Box);
const MotionTypography = motion(Typography);

const Results = ({ isAdmin }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      navigate('/login');
      return;
    }

    const userObj = JSON.parse(loggedInUser);
    setUser(userObj);

    // Redirect admin users (they should use leaderboard)
    if (userObj.is_admin && !isAdmin) {
      navigate('/admin-dashboard');
      return;
    }

    // Fetch user's quiz results
    const fetchResults = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${apiUrl}/api/user/${userObj.id}/results`, {
          params: {
            requesting_user_id: userObj.id
          }
        });
        setResults(response.data.results || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching results:', err);
        setError('Failed to load your quiz results. Please try again later.');
        setLoading(false);
      }
    };

    fetchResults();
  }, [navigate, isAdmin]);

  // Format date string
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
        duration: 0.3
      }
    }
  };

  const titleVariants = {
    hidden: { y: -20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const cardVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: i => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1]
      }
    })
  };

  if (loading) {
    return (
      <Box sx={{ 
        width: '100%',
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Navbar isAdmin={isAdmin} />
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
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
      <Navbar isAdmin={isAdmin} />
      
      <MotionContainer 
        maxWidth="md" 
        sx={{ mt: 4, flex: 1, pb: 5 }}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <MotionPaper 
          elevation={0}
          sx={{ 
            p: { xs: 3, md: 6 },
            backgroundColor: 'background.paper',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'primary.main',
            mx: 'auto',
            width: '100%',
            overflow: 'hidden',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '4px',
              background: 'linear-gradient(90deg, rgba(37,99,235,1) 0%, rgba(59,130,246,1) 100%)'
            }
          }}
        >
          <MotionTypography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{
              color: 'primary.main',
              fontWeight: 700,
              mb: 4,
              textAlign: 'center',
              position: 'relative',
              display: 'inline-block',
              margin: '0 auto 2rem',
              left: '50%',
              transform: 'translateX(-50%)'
            }}
            variants={titleVariants}
          >
            Your Quiz Results
            <Box 
              component="span" 
              sx={{ 
                position: 'absolute',
                bottom: -4,
                left: '25%',
                width: '50%',
                height: '4px',
                backgroundColor: 'primary.main',
                borderRadius: '2px'
              }}
            />
          </MotionTypography>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Box 
                sx={{ 
                  color: 'error.main', 
                  textAlign: 'center', 
                  my: 3,
                  p: 2,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: 2
                }}
              >
                {error}
              </Box>
            </motion.div>
          )}

          {results.length === 0 && !error ? (
            <MotionBox
              sx={{ 
                color: 'text.secondary', 
                textAlign: 'center', 
                my: 6,
                p: 4,
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.03)'
              }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1 }}>
                No Results Yet
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                You haven't taken any quizzes yet. Complete a round to see your results here.
              </Typography>
            </MotionBox>
          ) : (
            <Box>
              {results.map((result, index) => (
                <MotionCard 
                  key={result.id}
                  sx={{ 
                    mb: 3,
                    backgroundColor: 'background.default',
                    borderRadius: 3,
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                    border: '1px solid',
                    borderColor: 'divider',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)'
                    }
                  }}
                  custom={index}
                  variants={cardVariants}
                  whileHover={{ y: -5 }}
                >
                  <Box 
                    sx={{ 
                      height: '6px', 
                      width: '100%', 
                      backgroundColor: result.passed ? 'success.main' : 'error.main',
                      position: 'absolute',
                      top: 0,
                      left: 0
                    }}
                  />
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          color: 'text.primary',
                          fontWeight: 700
                        }}
                      >
                        {result.round_number === 1 ? 'Round 1' : 
                         result.round_number === 2 ? 'Round 2' : 'Round 3'}
                        {result.language && (
                          <Typography 
                            component="span"
                            sx={{ 
                              ml: 1, 
                              color: 'primary.light',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              textTransform: 'capitalize'
                            }}
                          >
                            ({result.language})
                          </Typography>
                        )}
                      </Typography>
                      <Chip
                        label={result.passed ? 'PASSED' : 'FAILED'}
                        color={result.passed ? 'success' : 'error'}
                        size="small"
                        sx={{ 
                          fontWeight: 'bold',
                          px: 1,
                          '& .MuiChip-label': { px: 1 }
                        }}
                      />
                    </Box>
                    
                    <Box 
                      sx={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.04)', 
                        borderRadius: 2,
                        p: 2,
                        mb: 2
                      }}
                    >
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, md: 4 } }}>
                        <Box>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                            Score
                          </Typography>
                          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                            {result.score}/{result.total_questions} <Typography component="span" sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
                              ({Math.round((result.score / result.total_questions) * 100)}%)
                            </Typography>
                          </Typography>
                        </Box>
                        
                        <Box>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                            Completed on
                          </Typography>
                          <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500 }}>
                            {formatDate(result.completed_at)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    <Typography variant="body2" sx={{ 
                      color: result.passed ? 'success.main' : 'text.secondary', 
                      fontWeight: result.passed ? 600 : 400,
                      mt: 2 
                    }}>
                      {result.passed 
                        ? "Congratulations! You've passed this round and unlocked the next one." 
                        : "You need to score at least 50% to pass this round and advance."}
                    </Typography>
                  </CardContent>
                </MotionCard>
              ))}
            </Box>
          )}
        </MotionPaper>
      </MotionContainer>
    </Box>
  );
};

export default Results; 