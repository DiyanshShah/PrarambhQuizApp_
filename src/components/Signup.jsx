import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Container, Typography, Box, Paper } from '@mui/material';
import axios from 'axios';

const Signup = () => {
    const [username, setUsername] = useState('');
    const [enrollmentNo, setEnrollmentNo] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (enrollmentNo.length !== 12 || !/^\d+$/.test(enrollmentNo)) {
            setError('Enrollment number must be a 12-digit number');
            return;
        }

        try {
            await axios.post('http://localhost:5000/api/signup', {
                username,
                enrollment_no: enrollmentNo,
                password
            });
            navigate('/login');
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
                        Sign Up
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
                            id="username"
                            label="Username"
                            name="username"
                            autoComplete="username"
                            autoFocus
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
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
                            id="enrollmentNo"
                            label="Enrollment Number (12 digits)"
                            name="enrollmentNo"
                            autoComplete="off"
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
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
                            name="confirmPassword"
                            label="Confirm Password"
                            type="password"
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
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
                            Sign Up
                        </Button>
                        <Button
                            fullWidth
                            variant="text"
                            onClick={() => navigate('/login')}
                            sx={{ color: 'primary.main' }}
                        >
                            Already have an account? Sign In
                        </Button>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
};

export default Signup; 