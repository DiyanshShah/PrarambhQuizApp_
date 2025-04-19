import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { styled } from '@mui/material/styles';

const Logo = styled(Typography)(({ theme }) => ({
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '1.8rem',
    color: theme.palette.primary.main,
    '&:hover': {
        color: theme.palette.primary.light,
    },
}));

const NavButton = styled(Button)(({ theme }) => ({
    color: theme.palette.text.primary,
    fontWeight: 600,
    fontSize: '1.1rem',
    padding: '8px 24px',
    '&:hover': {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
    },
}));

const Navbar = ({ isAdmin }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <AppBar 
            position="static" 
            elevation={0}
            sx={{ 
                backgroundColor: 'secondary.main',
                borderBottom: '2px solid',
                borderColor: 'primary.main',
                py: 2
            }}
        >
            <Container maxWidth="xl">
                <Toolbar 
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
                    <Box sx={{ flex: 1 }}>
                        <Logo 
                            variant="h6" 
                            onClick={() => navigate(isAdmin ? '/admin-dashboard' : '/participant-dashboard')}
                        >
                            Prarambh
                        </Logo>
                    </Box>
                    <Box sx={{ 
                        display: 'flex',
                        gap: 4,
                        alignItems: 'center',
                        justifyContent: 'center',
                        flex: 2
                    }}>
                        <NavButton 
                            onClick={() => navigate(isAdmin ? '/admin-dashboard' : '/participant-dashboard')}
                        >
                            Dashboard
                        </NavButton>
                        <NavButton 
                            onClick={() => navigate(isAdmin ? '/admin-results' : '/participant-results')}
                        >
                            Results
                        </NavButton>
                    </Box>
                    <Box sx={{ 
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'flex-end'
                    }}>
                        <NavButton 
                            onClick={handleLogout}
                            sx={{
                                backgroundColor: 'primary.main',
                                color: 'primary.contrastText',
                                px: 3,
                                '&:hover': {
                                    backgroundColor: 'primary.dark',
                                }
                            }}
                        >
                            Logout
                        </NavButton>
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    );
};

export default Navbar; 