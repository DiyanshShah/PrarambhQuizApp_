import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  Paper, 
  Alert, 
  InputAdornment, 
  IconButton 
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import { motion } from 'framer-motion';

// Animated components using motion.create for framer-motion v12
<<<<<<< HEAD
const MotionContainer = motion.create(Container);
const MotionPaper = motion.create(Paper);
const MotionBox = motion.create(Box);
const MotionTypography = motion.create(Typography);
=======
const MotionContainer = motion(Container);
const MotionPaper = motion(Paper);
const MotionBox = motion(Box);
const MotionTypography = motion(Typography);
>>>>>>> 9b20a592da3718e3710d8161a3294a561fb7fa64

// Styled components
const LoginButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: '12px 0',
  fontSize: '1.1rem',
  fontWeight: 600,
  marginTop: '24px',
  borderRadius: '10px',
  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
    transform: 'translateY(-3px)',
    boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  marginBottom: '20px',
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transition: 'all 0.3s ease',
    '&.Mui-focused': {
      boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.3)',
      transform: 'translateY(-2px)',
    },
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  },
  '& .MuiInputLabel-root': {
    color: theme.palette.text.secondary,
  },
  '& .MuiOutlinedInput-input': {
    padding: '16px',
  },
}));

const Login = () => {
  const navigate = useNavigate();
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!enrollmentNo || !password) {
      setError('Please enter both enrollment number and password.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        enrollment_no: enrollmentNo,
        password: password
      });
      
      // Store user data in localStorage
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Redirect to appropriate dashboard
      if (response.data.user.is_admin) {
        navigate('/admin-dashboard');
      } else {
        navigate('/participant-dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.error || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
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

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  const logoVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        type: "spring", 
        stiffness: 400, 
        damping: 17,
        duration: 0.7
      }
    }
  };

  return (
    <Box 
      sx={{ 
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
        py: 4
      }}
    >
      <MotionContainer 
        maxWidth="sm"
        component={motion.div}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <MotionPaper
          elevation={0}
          sx={{ 
            p: { xs: 4, md: 6 },
            backgroundColor: 'background.paper',
            borderRadius: 4,
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid',
            borderColor: 'divider',
            backdropFilter: 'blur(10px)',
            mx: 'auto',
          }}
          variants={itemVariants}
        >
          <MotionBox 
            sx={{ 
              textAlign: 'center', 
              mb: 4 
            }}
            variants={logoVariants}
          >
            <MotionTypography 
              variant="h3" 
              component="h1"
              sx={{ 
                color: 'primary.main',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                position: 'relative',
                display: 'inline-block',
                mb: 1
              }}
            >
              Prarambh
              <Box 
                component="span" 
                sx={{ 
                  position: 'absolute',
                  bottom: 0,
                  left: '20%',
                  width: '60%',
                  height: '4px',
                  backgroundColor: 'primary.main',
                  borderRadius: '2px'
                }}
              />
            </MotionTypography>
            <Typography 
              variant="body1"
              sx={{ 
                color: 'text.secondary',
                fontSize: '1.1rem',
                mt: 1
              }}
            >
              Log in to your account
            </Typography>
          </MotionBox>
          
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {error}
              </Alert>
            </motion.div>
          )}
          
          <form onSubmit={handleLogin}>
            <MotionBox variants={itemVariants}>
              <StyledTextField
                label="Enrollment Number"
                variant="outlined"
                fullWidth
                value={enrollmentNo}
                onChange={(e) => setEnrollmentNo(e.target.value)}
                InputProps={{
                  sx: { color: 'text.primary' }
                }}
              />
            </MotionBox>
            
            <MotionBox variants={itemVariants}>
              <StyledTextField
                label="Password"
                variant="outlined"
                fullWidth
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  sx: { color: 'text.primary' }
                }}
              />
            </MotionBox>
            
            <MotionBox 
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <LoginButton
                type="submit"
                fullWidth
                disabled={loading}
                sx={{
                  position: 'relative'
                }}
              >
                {loading ? 'Logging in...' : 'Log In'}
              </LoginButton>
            </MotionBox>
          </form>
          
          <MotionBox 
            sx={{ 
              mt: 4, 
              textAlign: 'center',
              py: 2,
              borderTop: '1px solid',
              borderColor: 'divider'
            }}
            variants={itemVariants}
          >
            <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 2 }}>
              Available Login Credentials:
            </Typography>
            <Box sx={{ 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'start',
              gap: 1,
              mx: 'auto',
              width: 'fit-content',
              backgroundColor: 'rgba(37, 99, 235, 0.05)',
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'primary.main',
              textAlign: 'left'
            }}>
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                <strong>Admin:</strong> 231260107017 / admin
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                <strong>Participant 1:</strong> 231260100001 / password123
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                <strong>Participant 2:</strong> 231260100002 / password123
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                <strong>Participant 3:</strong> 231260100003 / password123
              </Typography>
            </Box>
          </MotionBox>
        </MotionPaper>
      </MotionContainer>
    </Box>
  );
};

export default Login; 