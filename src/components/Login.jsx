import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Container, Typography, Box, Paper } from '@mui/material';
import axios from 'axios';

const Login = () => {
    const [enrollmentNo, setEnrollmentNo] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:5000/api/login', {
                enrollment_no: enrollmentNo,
                password
            });
            
            localStorage.setItem('user', JSON.stringify(response.data.user));
            
            if (response.data.user.is_admin) {
                navigate('/admin-dashboard');
            } else {
                navigate('/participant-dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred');
        }
    };

    return (
        <Container component="main" maxWidth="xs">
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Paper elevation={0} sx={{ 
                    p: 4, 
                    width: '100%',
                    backgroundColor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'primary.main',
                    borderRadius: 3,
                }}>
                    <Typography 
                        component="h1" 
                        variant="h4" 
                        align="center"
                        sx={{
                            color: 'primary.main',
                            fontWeight: 700,
                            mb: 3
                        }}
                    >
                        Login
                    </Typography>
                    {error && (
                        <Typography color="error" align="center" sx={{ mt: 2 }}>
                            {error}
                        </Typography>
                    )}
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="enrollmentNo"
                            label="Enrollment Number"
                            name="enrollmentNo"
                            autoComplete="off"
                            autoFocus
                            value={enrollmentNo}
                            onChange={(e) => setEnrollmentNo(e.target.value)}
                            InputLabelProps={{
                                sx: { color: 'text.secondary' }
                            }}
                            inputProps={{
                                sx: { color: 'text.primary' }
                            }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            InputLabelProps={{
                                sx: { color: 'text.secondary' }
                            }}
                            inputProps={{
                                sx: { color: 'text.primary' }
                            }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                        >
                            Sign In
                        </Button>
                        <Button
                            fullWidth
                            variant="text"
                            onClick={() => navigate('/signup')}
                            sx={{ color: 'primary.main' }}
                        >
                            Don't have an account? Sign Up
                        </Button>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
};

export default Login; 