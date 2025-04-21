import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';

// Create animated components with Framer Motion
const MotionToolbar = motion.create(Toolbar);
const MotionBox = motion.create(Box);
const MotionAppBar = motion.create(AppBar);

// Animated variants
const LogoMotion = motion.create(Typography);
const NavButtonMotion = motion.create(Button);
const LogoutButtonMotion = motion.create(Button);

const Logo = styled(LogoMotion)(({ theme }) => ({
    fontWeight: 800,
    cursor: 'pointer',
    fontSize: '2rem',
    color: theme.palette.primary.main,
    letterSpacing: '-0.02em',
    position: 'relative',
    display: 'inline-block',
    '&:hover': {
        color: theme.palette.primary.light,
    },
    '&::after': {
        content: '""',
        position: 'absolute',
        bottom: -4,
        left: 0,
        width: '40%',
        height: 4,
        backgroundColor: theme.palette.primary.main,
        borderRadius: 2,
        transition: 'width 0.3s ease'
    },
    '&:hover::after': {
        width: '100%'
    }
}));

const NavButton = styled(NavButtonMotion)(({ theme }) => ({
    color: theme.palette.text.primary,
    fontWeight: 600,
    fontSize: '1.1rem',
    padding: '8px 24px',
    position: 'relative',
    overflow: 'hidden',
    '&:hover': {
        backgroundColor: 'transparent',
        color: theme.palette.primary.main,
        '&::before': {
            transform: 'scaleX(1)',
        }
    },
    '&::before': {
        content: '""',
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '3px',
        backgroundColor: theme.palette.primary.main,
        transform: 'scaleX(0)',
        transformOrigin: 'left',
        transition: 'transform 0.3s ease'
    }
}));

const LogoutButton = styled(LogoutButtonMotion)(({ theme }) => ({
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    fontWeight: 600,
    fontSize: '1rem',
    padding: '10px 24px',
    borderRadius: 8,
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
    '&:hover': {
        backgroundColor: theme.palette.primary.dark,
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
    },
    '&:active': {
        transform: 'translateY(0)',
        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
    }
}));

const Navbar = ({ isAdmin }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    // Animation variants
    const navbarVariants = {
        hidden: { y: -100, opacity: 0 },
        visible: { 
            y: 0, 
            opacity: 1,
            transition: { 
                duration: 0.6, 
                ease: [0.22, 1, 0.36, 1] 
            }
        }
    };

    const logoVariants = {
        hidden: { opacity: 0, x: -20 },
        visible: { 
            opacity: 1, 
            x: 0,
            transition: { delay: 0.2, duration: 0.5 }
        }
    };

    const buttonVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: index => ({ 
            opacity: 1, 
            y: 0,
            transition: { 
                delay: 0.3 + (index * 0.1),
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1]
            }
        })
    };

    return (
        <MotionAppBar 
            position="static" 
            elevation={0}
            initial="hidden"
            animate="visible"
            variants={navbarVariants}
            sx={{ 
                backgroundColor: 'secondary.main',
                borderBottom: '2px solid',
                borderColor: 'primary.main',
                py: 2
            }}
        >
            <Container maxWidth="xl">
                <MotionToolbar 
                    sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        px: { xs: 2, sm: 4, md: 6 },
                        mx: 'auto',
                        maxWidth: '1400px',
                        width: '100%'
                    }}
                >
                    <MotionBox 
                        sx={{ flex: 1 }}
                        variants={logoVariants}
                    >
                        <Logo 
                            variant="h6" 
                            onClick={() => navigate(isAdmin ? '/admin-dashboard' : '/participant-dashboard')}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            Prarambh
                        </Logo>
                    </MotionBox>
                    <MotionBox 
                        sx={{ 
                            display: 'flex',
                            gap: 4,
                            alignItems: 'center',
                            justifyContent: 'center',
                            flex: 2
                        }}
                    >
                        <MotionBox
                            custom={0}
                            variants={buttonVariants}
                        >
                            <NavButton 
                                onClick={() => navigate(isAdmin ? '/admin-dashboard' : '/participant-dashboard')}
                                whileTap={{ scale: 0.95 }}
                            >
                                Dashboard
                            </NavButton>
                        </MotionBox>
                        <MotionBox
                            custom={1}
                            variants={buttonVariants}
                        >
                            <NavButton 
                                onClick={() => navigate(isAdmin ? '/leaderboard' : '/participant-results')}
                                whileTap={{ scale: 0.95 }}
                            >
                                {isAdmin ? 'Leaderboard' : 'Results'}
                            </NavButton>
                        </MotionBox>
                    </MotionBox>
                    <MotionBox 
                        sx={{ 
                            flex: 1,
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}
                        custom={2}
                        variants={buttonVariants}
                    >
                        <LogoutButton 
                            onClick={handleLogout}
                            whileTap={{ scale: 0.95 }}
                        >
                            Logout
                        </LogoutButton>
                    </MotionBox>
                </MotionToolbar>
            </Container>
        </MotionAppBar>
    );
};

export default Navbar; 