import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Box, Paper, Table, TableBody, 
  TableCell, TableContainer, TableHead, TableRow, CircularProgress,
  Chip, TablePagination, Alert, Button, Snackbar
} from '@mui/material';
import axios from 'axios';
import Navbar from './Navbar';

const Leaderboard = ({ isAdmin }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [updating, setUpdating] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    const loggedInUser = localStorage.getItem('user');
    if (!loggedInUser) {
      navigate('/login');
      return;
    }

    const userObj = JSON.parse(loggedInUser);
    setUser(userObj);

    // Only admin can view the leaderboard
    if (!userObj.is_admin && isAdmin) {
      navigate('/participant-dashboard');
      return;
    }

    fetchLeaderboard();
  }, [navigate, isAdmin]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleUpdateRound3Participants = async () => {
    if (!user?.id || !isAdmin) return;
    
    try {
      setUpdating(true);
      const response = await axios.post('http://localhost:5000/api/leaderboard/update-round3', {
        user_id: user.id
      });
      
      setSnackbar({
        open: true,
        message: `Success! ${response.data.total_updated} participants updated to Round 3.`,
        severity: 'success'
      });
      
      // Refresh the leaderboard data
      fetchLeaderboard();
    } catch (err) {
      console.error('Error updating Round 3 participants:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Failed to update Round 3 participants',
        severity: 'error'
      });
    } finally {
      setUpdating(false);
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/leaderboard');
      setLeaderboardData(response.data.leaderboard || []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError('Failed to load leaderboard data. Please try again later.');
      setLoading(false);
    }
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
      
      <Container maxWidth="lg" sx={{ mt: 4, flex: 1, pb: 4 }}>
        <Paper 
          elevation={0}
          sx={{ 
            p: { xs: 2, sm: 4, md: 6 },
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
            Leaderboard
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 1 }}>
                Total Participants: {leaderboardData.length}
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                Top 20 participants will proceed to Round 3.
              </Typography>
            </Box>
            
            {isAdmin && (
              <Button 
                variant="contained"
                color="primary"
                disabled={updating}
                onClick={handleUpdateRound3Participants}
                sx={{ py: 1, px: 3 }}
              >
                {updating ? 'Updating...' : 'Promote Top 20 to Round 3'}
              </Button>
            )}
          </Box>

          {leaderboardData.length === 0 && !error ? (
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'text.secondary', 
                textAlign: 'center', 
                my: 4 
              }}
            >
              No participant data available yet.
            </Typography>
          ) : (
            <TableContainer component={Paper} sx={{ backgroundColor: 'background.default', mb: 2 }}>
              <Table sx={{ minWidth: 650 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'primary.main', fontWeight: 'bold' }}>Rank</TableCell>
                    <TableCell sx={{ color: 'primary.main', fontWeight: 'bold' }}>Username</TableCell>
                    <TableCell sx={{ color: 'primary.main', fontWeight: 'bold' }}>Enrollment No.</TableCell>
                    <TableCell sx={{ color: 'primary.main', fontWeight: 'bold' }}>Score</TableCell>
                    <TableCell sx={{ color: 'primary.main', fontWeight: 'bold' }}>Percentage</TableCell>
                    <TableCell sx={{ color: 'primary.main', fontWeight: 'bold' }}>Current Round</TableCell>
                    <TableCell sx={{ color: 'primary.main', fontWeight: 'bold' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaderboardData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((entry) => (
                      <TableRow 
                        key={entry.user_id}
                        sx={{ 
                          '&:nth-of-type(odd)': { 
                            backgroundColor: 'rgba(255, 255, 255, 0.05)' 
                          },
                          '&:hover': { 
                            backgroundColor: 'rgba(255, 107, 0, 0.1)' 
                          },
                          // Highlight top 20
                          ...(entry.rank <= 20 && {
                            borderLeft: '4px solid',
                            borderColor: 'success.main'
                          })
                        }}
                      >
                        <TableCell sx={{ color: 'text.primary', fontWeight: entry.rank <= 20 ? 'bold' : 'normal' }}>
                          {entry.rank}
                        </TableCell>
                        <TableCell sx={{ color: 'text.primary' }}>{entry.username}</TableCell>
                        <TableCell sx={{ color: 'text.primary' }}>{entry.enrollment_no}</TableCell>
                        <TableCell sx={{ color: 'text.primary' }}>{entry.total_score}/{entry.total_questions}</TableCell>
                        <TableCell sx={{ color: 'text.primary' }}>{entry.percentage}%</TableCell>
                        <TableCell sx={{ color: 'text.primary' }}>{entry.current_round}</TableCell>
                        <TableCell>
                          {entry.rank <= 20 ? (
                            <Chip 
                              label="Qualified for Round 3" 
                              color="success" 
                              size="small"
                              sx={{ fontWeight: 'bold' }}
                            />
                          ) : (
                            <Chip 
                              label="Not Qualified" 
                              color="error" 
                              size="small"
                              sx={{ fontWeight: 'bold' }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, 50]}
            component="div"
            count={leaderboardData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              color: 'text.primary',
              '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                color: 'text.secondary'
              }
            }}
          />
        </Paper>
      </Container>
      
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

export default Leaderboard; 