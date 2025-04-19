import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Box, Paper, Divider, CircularProgress } from '@mui/material';
import axios from 'axios';
import Navbar from './Navbar';

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

    // Fetch user's quiz results
    const fetchResults = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`http://localhost:5000/api/user/${userObj.id}/results`);
        setResults(response.data.results || []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching results:', err);
        setError('Failed to load your quiz results. Please try again later.');
        setLoading(false);
      }
    };

    fetchResults();
  }, [navigate]);

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
      <Navbar isAdmin={isAdmin} />
      
      <Container maxWidth="md" sx={{ mt: 4, flex: 1 }}>
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
          }}
        >
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{
              color: 'primary.main',
              fontWeight: 700,
              mb: 4,
              textAlign: 'center'
            }}
          >
            Quiz Results
          </Typography>

          {error && (
            <Typography 
              variant="body1" 
              sx={{ 
                color: 'error.main', 
                textAlign: 'center', 
                my: 3 
              }}
            >
              {error}
            </Typography>
          )}

          {results.length === 0 && !error ? (
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'text.secondary', 
                textAlign: 'center', 
                my: 4 
              }}
            >
              You haven't taken any quizzes yet.
            </Typography>
          ) : (
            results.map((result, index) => (
              <Box 
                key={result.id} 
                sx={{ 
                  mb: index < results.length - 1 ? 4 : 0,
                  pb: index < results.length - 1 ? 4 : 0,
                  borderBottom: index < results.length - 1 ? '1px solid' : 'none',
                  borderColor: 'rgba(255, 255, 255, 0.12)'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      color: 'text.primary',
                      fontWeight: 600
                    }}
                  >
                    Round {result.round_number}
                  </Typography>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    bgcolor: result.passed ? 'success.dark' : 'error.dark',
                    px: 2,
                    py: 0.5,
                    borderRadius: 2
                  }}>
                    <Typography variant="body2" sx={{ color: 'white', fontWeight: 'bold' }}>
                      {result.passed ? 'PASSED' : 'FAILED'}
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Language
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500 }}>
                      {result.language ? (result.language.charAt(0).toUpperCase() + result.language.slice(1)) : 'N/A'}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Score
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500 }}>
                      {result.score}/{result.total_questions} ({Math.round((result.score / result.total_questions) * 100)}%)
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Completed on
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.primary', fontWeight: 500 }}>
                      {formatDate(result.completed_at)}
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>
                  {result.passed 
                    ? "Congratulations! You've passed this round." 
                    : "You need to score at least 50% to pass this round."}
                </Typography>
              </Box>
            ))
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default Results; 