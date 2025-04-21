import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import ParticipantDashboard from './components/ParticipantDashboard';
import Round1 from './components/Round1';
import Round2 from './components/Round2';
import Round3 from './components/Round3';
import Round3Selection from './components/Round3Selection';
import Round3DSA from './components/Round3DSA';
import Round3Web from './components/Round3Web';
import Leaderboard from './components/Leaderboard';
import Results from './components/Results';
import WaitingRoom from './components/WaitingRoom';
import { ThemeProvider, createTheme } from '@mui/material';
import { CssBaseline } from '@mui/material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2563EB', // Bold Blue
      light: '#3B82F6',
      dark: '#1D4ED8',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#1E293B', // Dark Slate Blue
      light: '#334155',
      dark: '#0F172A',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#0F172A', // Dark Background
      paper: '#1E293B', // Dark Paper
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
    },
    success: {
      main: '#10B981',
      dark: '#059669',
    },
    error: {
      main: '#EF4444',
      dark: '#DC2626',
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 800,
      color: '#F8FAFC',
    },
    h2: {
      fontWeight: 700,
      color: '#F8FAFC',
    },
    h3: {
      fontWeight: 700,
      color: '#F8FAFC',
    },
    h4: {
      fontWeight: 700,
      color: '#F8FAFC',
    },
    h5: {
      fontWeight: 600,
      color: '#F8FAFC',
    },
    h6: {
      fontWeight: 600,
      color: '#F8FAFC',
    },
    body1: {
      color: '#94A3B8',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 20px',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 20px rgba(37, 99, 235, 0.3)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        contained: {
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
        },
        outlined: {
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            boxShadow: '0 14px 30px rgba(0, 0, 0, 0.4)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1E293B',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          transition: 'transform 0.3s ease',
          '& .MuiOutlinedInput-root': {
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#3B82F6',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#2563EB',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 12px 20px rgba(0, 0, 0, 0.4)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'scale(1.05)',
          },
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
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/participant-dashboard" element={<ParticipantDashboard />} />
          <Route path="/waiting-room/:roundNumber" element={<WaitingRoom />} />
          <Route path="/round-1" element={<Round1 />} />
          <Route path="/round-2" element={<Round2 />} />
          <Route path="/round-3" element={<Round3 />} />
          <Route path="/round3" element={<Round3Selection />} />
          <Route path="/round3/dsa/:problemId" element={<Round3DSA />} />
          <Route path="/round3/dsa" element={<Navigate to="/round3/dsa/1" replace />} />
          <Route path="/round3/web" element={<Round3Web />} />
          <Route path="/leaderboard" element={<Leaderboard isAdmin={true} />} />
          <Route path="/participant-results" element={<Results isAdmin={false} />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
