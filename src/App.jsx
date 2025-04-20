import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import AdminDashboard from './components/AdminDashboard';
import ParticipantDashboard from './components/ParticipantDashboard';
import Round1 from './components/Round1';
import Round2 from './components/Round2';
import Leaderboard from './components/Leaderboard';
import { ThemeProvider, createTheme } from '@mui/material';
import { CssBaseline } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#FF6B00', // Bold Orange
      light: '#FF8C33',
      dark: '#CC5500',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#1A1A2E', // Very Dark Blue
      light: '#2A2A3E',
      dark: '#0A0A1E',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#0F0F1A', // Dark Background
      paper: '#1A1A2E', // Dark Paper
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B8B8B8',
    },
    success: {
      main: '#4CAF50',
      dark: '#388E3C',
    },
    error: {
      main: '#F44336',
      dark: '#D32F2F',
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      color: '#FFFFFF',
    },
    h2: {
      fontWeight: 600,
      color: '#FFFFFF',
    },
    h3: {
      fontWeight: 600,
      color: '#FFFFFF',
    },
    h4: {
      fontWeight: 600,
      color: '#FFFFFF',
    },
    h5: {
      fontWeight: 600,
      color: '#FFFFFF',
    },
    h6: {
      fontWeight: 600,
      color: '#FFFFFF',
    },
    body1: {
      color: '#B8B8B8',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          padding: '8px 16px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1A1A2E',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/participant-dashboard" element={<ParticipantDashboard />} />
          <Route path="/round-1" element={<Round1 />} />
          <Route path="/round-2" element={<Round2 />} />
          <Route path="/leaderboard" element={<Leaderboard isAdmin={true} />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
