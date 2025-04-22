import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Paper, TextField, Button, 
  FormControl, InputLabel, Select, MenuItem, Grid, 
  FormHelperText, Snackbar, Alert, RadioGroup, Radio, FormControlLabel,
  Switch, FormGroup, Card, CardContent, Divider, CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';
import { motion } from 'framer-motion';

// Create animated components
const MotionPaper = motion(Paper);
const MotionBox = motion(Box);
const MotionGrid = motion(Grid);
const MotionTypography = motion(Typography);

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [showQuestionForm, setShowQuestionForm] = useState(false);
    const [showRound2QuestionForm, setShowRound2QuestionForm] = useState(false);
    const [showRound3Submissions, setShowRound3Submissions] = useState(false);
    const [showRoundAccessManager, setShowRoundAccessManager] = useState(false);
    
    // Form states for Round 1
    const [language, setLanguage] = useState('');
    const [questionId, setQuestionId] = useState('');
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctAnswer, setCorrectAnswer] = useState('');
    
    // Form states for Round 2
    const [round2QuestionId, setRound2QuestionId] = useState('');
    const [round2Question, setRound2Question] = useState('');
    const [round2QuestionImage, setRound2QuestionImage] = useState('');
    const [round2Options, setRound2Options] = useState(['', '', '', '']);
    const [round2OptionImages, setRound2OptionImages] = useState(['', '', '', '']);
    const [round2CorrectAnswer, setRound2CorrectAnswer] = useState('');
    
    // Validation and notification states
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success'
    });
    
    // States for Round 3
    const [round3Submissions, setRound3Submissions] = useState([]);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [submissionScore, setSubmissionScore] = useState(0);
    const [isSubmissionScoring, setIsSubmissionScoring] = useState(false);
    
    // State for rounds access
    const [roundsAccess, setRoundsAccess] = useState({
        round1: { enabled: false },
        round2: { enabled: false },
        round3: { enabled: false }
    });
    const [updatingAccess, setUpdatingAccess] = useState(false);
    
    useEffect(() => {
        // Check if the user is logged in and is an admin
        const loggedInUser = localStorage.getItem('user');
        if (loggedInUser) {
            const parsedUser = JSON.parse(loggedInUser);
            if (!parsedUser.is_admin) {
                // If not an admin, redirect to participant dashboard
                navigate('/participant-dashboard');
                return;
            }
            setUser(parsedUser);
            
            // Fetch round access data
            fetchRoundsAccess();
        } else {
            // If not logged in, redirect to login page
            navigate('/login');
        }
    }, [navigate]);
    
    const fetchRoundsAccess = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/rounds/access');
            setRoundsAccess(response.data);
        } catch (error) {
            console.error('Error fetching rounds access:', error);
            setSnackbar({
                open: true,
                message: 'Failed to fetch rounds access status',
                severity: 'error'
            });
        }
    };

    const toggleRoundAccess = async (roundNumber, enabled) => {
        if (!user) return;
        
        setUpdatingAccess(true);
        try {
            const response = await axios.post('http://localhost:5000/api/admin/rounds/access', {
                admin_user_id: user.id,
                round_number: roundNumber,
                is_enabled: enabled
            });
            
            // Update local state with the new access status
            const updatedRoundsAccess = { ...roundsAccess };
            updatedRoundsAccess[`round${roundNumber}`].enabled = enabled;
            setRoundsAccess(updatedRoundsAccess);
            
            setSnackbar({
                open: true,
                message: `Round ${roundNumber} ${enabled ? 'enabled' : 'disabled'} successfully`,
                severity: 'success'
            });
        } catch (error) {
            console.error('Error updating round access:', error);
            setSnackbar({
                open: true,
                message: `Failed to ${enabled ? 'enable' : 'disable'} Round ${roundNumber}`,
                severity: 'error'
            });
        } finally {
            setUpdatingAccess(false);
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    // Existing utility functions for question management
    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };
    
    const validateForm = () => {
        const newErrors = {};
        
        if (!language) newErrors.language = 'Language is required';
        if (!questionId) {
            newErrors.questionId = 'Question ID is required';
        } else if (isNaN(parseInt(questionId))) {
            newErrors.questionId = 'Question ID must be a number';
        }
        
        if (!question) newErrors.question = 'Question is required';
        
        options.forEach((option, index) => {
            if (!option) newErrors[`option${index}`] = `Option ${index + 1} is required`;
        });
        
        if (correctAnswer === '') newErrors.correctAnswer = 'Correct answer is required';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        setIsSubmitting(true);
        
        try {
            const questionData = {
                id: parseInt(questionId),
                question,
                options,
                correctAnswer: parseInt(correctAnswer)
            };
            
            // Call the backend API to add the question
            const response = await axios.post(`http://localhost:5000/api/admin/questions/${language}`, questionData);
            
            // Reset form
            setLanguage('');
            setQuestionId('');
            setQuestion('');
            setOptions(['', '', '', '']);
            setCorrectAnswer('');
            
            // Show success message
            setSnackbar({
                open: true,
                message: 'Question added successfully!',
                severity: 'success'
            });
        } catch (error) {
            console.error('Error adding question:', error);
            
            // Show error message
            setSnackbar({
                open: true,
                message: error.response?.data?.error || 'Failed to add question',
                severity: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleRound2OptionChange = (index, value) => {
        const newOptions = [...round2Options];
        newOptions[index] = value;
        setRound2Options(newOptions);
    };
    
    const handleQuestionImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setRound2QuestionImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleOptionImageUpload = (index, e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const newOptionImages = [...round2OptionImages];
                newOptionImages[index] = reader.result;
                setRound2OptionImages(newOptionImages);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const validateRound2Form = () => {
        const newErrors = {};
        
        if (!round2QuestionId) {
            newErrors.round2QuestionId = 'Question ID is required';
        } else if (isNaN(parseInt(round2QuestionId))) {
            newErrors.round2QuestionId = 'Question ID must be a number';
        }
        
        if (!round2Question) newErrors.round2Question = 'Question is required';
        if (!round2QuestionImage) newErrors.round2QuestionImage = 'Question image is required';
        
        round2Options.forEach((option, index) => {
            if (!option) newErrors[`round2Option${index}`] = `Option ${index + 1} is required`;
        });
        
        round2OptionImages.forEach((image, index) => {
            if (!image) newErrors[`round2OptionImage${index}`] = `Option ${index + 1} image is required`;
        });
        
        if (round2CorrectAnswer === '') newErrors.round2CorrectAnswer = 'Correct answer is required';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleRound2Submit = async (e) => {
        e.preventDefault();
        
        if (!validateRound2Form()) return;
        
        setIsSubmitting(true);
        
        try {
            const questionData = {
                id: parseInt(round2QuestionId),
                question: round2Question,
                questionImage: round2QuestionImage,
                options: round2Options,
                optionImages: round2OptionImages,
                correctAnswer: parseInt(round2CorrectAnswer)
            };
            
            // Call the backend API to add the Round 2 question
            const response = await axios.post('http://localhost:5000/api/admin/questions/round2', questionData);
            
            // Reset form
            setRound2QuestionId('');
            setRound2Question('');
            setRound2QuestionImage('');
            setRound2Options(['', '', '', '']);
            setRound2OptionImages(['', '', '', '']);
            setRound2CorrectAnswer('');
            
            // Show success message
            setSnackbar({
                open: true,
                message: 'Round 2 question added successfully!',
                severity: 'success'
            });
        } catch (error) {
            console.error('Error adding Round 2 question:', error);
            
            // Show error message
            setSnackbar({
                open: true,
                message: error.response?.data?.error || 'Failed to add Round 2 question',
                severity: 'error'
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSubmissionScoreChange = (event) => {
        // Only allow +4 or -1 as values
        const value = parseInt(event.target.value);
        if (value === 4 || value === -1) {
            setSubmissionScore(value);
        }
    };
 
    const submitScore = async (submissionId) => {
        setIsSubmissionScoring(true);
        try {
            await axios.post(`http://localhost:5000/api/admin/score-round3`, {
                submissionId,
                score: submissionScore
            });
             
            // Update local state
            setRound3Submissions(
                round3Submissions.map(sub => 
                    sub.id === submissionId ? {...sub, score: submissionScore, scored: true} : sub
                )
            );
             
            setSnackbar({
                open: true,
                message: 'Submission scored successfully!',
                severity: 'success'
            });
             
            // Reset selection
            setSelectedSubmission(null);
        } catch (error) {
            console.error('Error scoring submission:', error);
            setSnackbar({
                open: true,
                message: 'Failed to score submission',
                severity: 'error'
            });
        } finally {
            setIsSubmissionScoring(false);
        }
    };

    // Animations
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                when: "beforeChildren",
                staggerChildren: 0.1,
                duration: 0.5
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
                duration: 0.6,
                ease: [0.22, 1, 0.36, 1]
            }
        })
    };

    const buttonVariants = {
        hidden: { scale: 0.9, opacity: 0 },
        visible: {
            scale: 1,
            opacity: 1,
            transition: { delay: 0.4, duration: 0.5 }
        },
        tap: {
            scale: 0.95,
            transition: { duration: 0.1 }
        },
        hover: {
            scale: 1.05,
            transition: { duration: 0.3 }
        }
    };

    const fetchRound3Submissions = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/admin/round3-submissions');
            setRound3Submissions(response.data.submissions);
        } catch (error) {
            console.error('Error fetching Round 3 submissions:', error);
            setSnackbar({
                open: true,
                message: 'Failed to fetch Round 3 submissions',
                severity: 'error'
            });
        }
    };

    const viewSubmission = (submission) => {
        setSelectedSubmission(submission);
    };

    // Other existing functions for form handling...

    const showAccessManager = () => {
        setShowRoundAccessManager(true);
        setShowQuestionForm(false);
        setShowRound2QuestionForm(false);
        setShowRound3Submissions(false);
        fetchRoundsAccess();
    };

    // Other existing show/hide functions...

    return (
        <Box sx={{ 
            width: '100%',
            minHeight: '100vh',
            backgroundColor: 'background.default',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <Navbar isAdmin={true} />
            <Box sx={{ 
                flex: 1,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                py: 4,
                width: '100%'
            }}>
                <Container 
                    maxWidth={false}
                    sx={{ 
                        width: '100%',
                        px: { xs: 2, sm: 4, md: 6 }
                    }}
                    component={motion.div}
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    <MotionPaper 
                        elevation={0}
                        sx={{ 
                            p: 6,
                            textAlign: 'center',
                            backgroundColor: 'background.paper',
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'primary.main',
                            width: '100%',
                            mx: 'auto',
                            overflow: 'hidden',
                            position: 'relative',
                            '&::before': {
                                content: '""',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '4px',
                                background: 'linear-gradient(90deg, rgba(37,99,235,1) 0%, rgba(59,130,246,1) 100%)',
                            }
                        }}
                    >
                        <MotionTypography 
                            variant="h3" 
                            component="h1" 
                            gutterBottom
                            sx={{
                                color: 'primary.main',
                                fontWeight: 700,
                                mb: 4,
                                position: 'relative',
                                display: 'inline-block'
                            }}
                            variants={titleVariants}
                        >
                            Admin Dashboard
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
                        
                        {/* Action Buttons */}
                        <Grid 
                            container 
                            spacing={3} 
                            sx={{ mb: 6 }}
                        >
                            {/* Add Round 1 Question Card */}
                            <Grid item xs={12} sm={6} md={3}>
                                <MotionBox
                                custom={0}
                                variants={cardVariants}
                                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                                    whileTap={{ scale: 0.98 }}
                            >
                                    <Paper
                                        elevation={3}
                                    sx={{
                                            p: 3,
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                            borderRadius: 3,
                                            bgcolor: 'primary.light',
                                            color: 'white',
                                            transition: 'all 0.3s',
                                            cursor: 'pointer',
                                        '&:hover': {
                                            transform: 'translateY(-5px)',
                                                boxShadow: 6
                                            }
                                        }}
                                        onClick={() => {
                                            setShowQuestionForm(true);
                                            setShowRound2QuestionForm(false);
                                            setShowRound3Submissions(false);
                                            setShowRoundAccessManager(false);
                                        }}
                                    >
                                        <Typography variant="h6" gutterBottom>
                                            Add Round 1 Question
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 2, flex: 1 }}>
                                            Create new multiple-choice questions for Round 1 in Python or C.
                                        </Typography>
                                    </Paper>
                                </MotionBox>
                            </Grid>
                            
                            {/* Add Round 2 Question Card */}
                            <Grid item xs={12} sm={6} md={3}>
                                <MotionBox
                                custom={1}
                                variants={cardVariants}
                                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                                    whileTap={{ scale: 0.98 }}
                            >
                                    <Paper
                                        elevation={3}
                                    sx={{
                                            p: 3,
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                            borderRadius: 3,
                                            bgcolor: 'secondary.main',
                                            color: 'white',
                                            transition: 'all 0.3s',
                                            cursor: 'pointer',
                                        '&:hover': {
                                            transform: 'translateY(-5px)',
                                                boxShadow: 6
                                            }
                                        }}
                                        onClick={() => {
                                            setShowRound2QuestionForm(true);
                                            setShowQuestionForm(false);
                                            setShowRound3Submissions(false);
                                            setShowRoundAccessManager(false);
                                        }}
                                    >
                                        <Typography variant="h6" gutterBottom>
                                            Add Round 2 Question
                                    </Typography>
                                        <Typography variant="body2" sx={{ mb: 2, flex: 1 }}>
                                            Create diagram-based questions for Round 2 with images.
                                        </Typography>
                                    </Paper>
                                </MotionBox>
                            </Grid>
                            
                            {/* View Round 3 Submissions Card */}
                            <Grid item xs={12} sm={6} md={3}>
                                <MotionBox
                                    custom={2}
                                    variants={cardVariants}
                                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Paper
                                        elevation={3}
                                        sx={{
                                            p: 3,
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            borderRadius: 3,
                                            bgcolor: 'success.main',
                                            color: 'white',
                                            transition: 'all 0.3s',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                transform: 'translateY(-5px)',
                                                boxShadow: 6
                                            }
                                        }}
                                        onClick={() => {
                                            setShowRound3Submissions(true);
                                            setShowQuestionForm(false);
                                            setShowRound2QuestionForm(false);
                                            setShowRoundAccessManager(false);
                                            fetchRound3Submissions();
                                        }}
                                    >
                                        <Typography variant="h6" gutterBottom>
                                            Round 3 Submissions
                                        </Typography>
                                        <Typography variant="body2" sx={{ mb: 2, flex: 1 }}>
                                            View and score participant submissions for Round 3 challenges.
                                        </Typography>
                                    </Paper>
                                </MotionBox>
                            </Grid>
                            
                            {/* Manage Round Access Card */}
                            <Grid item xs={12} sm={6} md={3}>
                                <MotionBox
                                    custom={3}
                                variants={cardVariants}
                                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                                    whileTap={{ scale: 0.98 }}
                            >
                                    <Paper
                                        elevation={3}
                                    sx={{
                                            p: 3,
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                            borderRadius: 3,
                                            bgcolor: 'info.main',
                                            color: 'white',
                                            transition: 'all 0.3s',
                                            cursor: 'pointer',
                                        '&:hover': {
                                            transform: 'translateY(-5px)',
                                                boxShadow: 6
                                            }
                                        }}
                                        onClick={showAccessManager}
                                    >
                                        <Typography variant="h6" gutterBottom>
                                            Manage Round Access
                                    </Typography>
                                        <Typography variant="body2" sx={{ mb: 2, flex: 1 }}>
                                            Control participant access to competition rounds.
                                        </Typography>
                                    </Paper>
                                </MotionBox>
                            </Grid>
                        </Grid>
                        
                        {/* Show Round Access Manager */}
                        {showRoundAccessManager && (
                            <Paper
                                elevation={0}
                                        sx={{
                                    p: 4,
                                    mb: 4,
                                    borderRadius: 2,
                                    borderLeft: '4px solid',
                                    borderColor: 'info.main',
                                    bgcolor: 'background.paper'
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                    <Typography variant="h5" sx={{ color: 'info.main', fontWeight: 600 }}>
                                        Round Access Control
                                    </Typography>
                                    <Button 
                                        variant="outlined" 
                                        color="inherit"
                                        onClick={() => setShowRoundAccessManager(false)}
                                    >
                                        Close
                                    </Button>
                                </Box>
                                
                                <Typography variant="body1" sx={{ mb: 4, textAlign: 'left' }}>
                                    Enable or disable participant access to each round of the competition. 
                                    When a round is disabled, participants cannot start or submit answers 
                                    for that round, even if they are qualified.
                                </Typography>
                                
                                <Grid container spacing={3}>
                                    {/* Round 1 Access Control */}
                                    <Grid item xs={12} md={4}>
                                        <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}>
                                            <CardContent>
                                                <Typography variant="h6" gutterBottom>
                                                    Round 1
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                    Multiple choice questions on programming languages
                                                </Typography>
                                                <Divider sx={{ mb: 2 }} />
                                                <FormGroup>
                                                    <FormControlLabel 
                                                        control={
                                                            <Switch 
                                                                checked={roundsAccess.round1?.enabled || false} 
                                                                onChange={(e) => toggleRoundAccess(1, e.target.checked)}
                                                                disabled={updatingAccess}
                                                                color="primary"
                                                            />
                                                        } 
                                                        label={
                                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                <Typography>
                                                                    {roundsAccess.round1?.enabled ? "Enabled" : "Disabled"}
                                                                </Typography>
                                                                {updatingAccess && <CircularProgress size={16} sx={{ ml: 1 }} />}
                                                            </Box>
                                                        }
                                                    />
                                                </FormGroup>
                                                <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                                                    {roundsAccess.round1?.enabled 
                                                        ? `Enabled at: ${new Date(roundsAccess.round1.enabled_at).toLocaleString() || 'N/A'}`
                                                        : "Round is currently disabled"
                                                    }
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    
                                    {/* Round 2 Access Control */}
                                    <Grid item xs={12} md={4}>
                                        <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}>
                                            <CardContent>
                                                <Typography variant="h6" gutterBottom>
                                                    Round 2
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                    Advanced programming challenges with image-based questions
                                                </Typography>
                                                <Divider sx={{ mb: 2 }} />
                                                <FormGroup>
                                                    <FormControlLabel 
                                                        control={
                                                            <Switch 
                                                                checked={roundsAccess.round2?.enabled || false} 
                                                                onChange={(e) => toggleRoundAccess(2, e.target.checked)}
                                                                disabled={updatingAccess}
                                                                color="primary"
                                                            />
                                                        } 
                                                        label={
                                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                <Typography>
                                                                    {roundsAccess.round2?.enabled ? "Enabled" : "Disabled"}
                                                                </Typography>
                                                                {updatingAccess && <CircularProgress size={16} sx={{ ml: 1 }} />}
                                                            </Box>
                                                        }
                                                    />
                                                </FormGroup>
                                                <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                                                    {roundsAccess.round2?.enabled 
                                                        ? `Enabled at: ${new Date(roundsAccess.round2.enabled_at).toLocaleString() || 'N/A'}`
                                                        : "Round is currently disabled"
                                                    }
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                    
                                    {/* Round 3 Access Control */}
                                    <Grid item xs={12} md={4}>
                                        <Card variant="outlined" sx={{ bgcolor: 'background.paper' }}>
                                            <CardContent>
                                                <Typography variant="h6" gutterBottom>
                                                    Round 3
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                    Final round with DSA and Web Dev tracks
                                                </Typography>
                                                <Divider sx={{ mb: 2 }} />
                                                <FormGroup>
                                                    <FormControlLabel 
                                                        control={
                                                            <Switch 
                                                                checked={roundsAccess.round3?.enabled || false} 
                                                                onChange={(e) => toggleRoundAccess(3, e.target.checked)}
                                                                disabled={updatingAccess}
                                                                color="primary"
                                                            />
                                                        } 
                                                        label={
                                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                <Typography>
                                                                    {roundsAccess.round3?.enabled ? "Enabled" : "Disabled"}
                                                                </Typography>
                                                                {updatingAccess && <CircularProgress size={16} sx={{ ml: 1 }} />}
                                                            </Box>
                                                        }
                                                    />
                                                </FormGroup>
                                                <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
                                                    {roundsAccess.round3?.enabled 
                                                        ? `Enabled at: ${new Date(roundsAccess.round3.enabled_at).toLocaleString() || 'N/A'}`
                                                        : "Round is currently disabled"
                                                    }
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                </Grid>
                            </Paper>
                        )}
                        
                        {/* Round 1 Question Form */}
                        {showQuestionForm && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 4,
                                    backgroundColor: 'rgba(26, 26, 46, 0.8)',
                                    borderRadius: 3,
                                    border: '1px solid',
                                    borderColor: 'primary.main',
                                    mb: 4,
                                    textAlign: 'left'
                                }}
                            >
                                <Typography 
                                    variant="h5" 
                                    sx={{ 
                                        color: 'primary.main',
                                        fontWeight: 600,
                                        mb: 3,
                                        textAlign: 'center'
                                    }}
                                >
                                    Add New Question
                                </Typography>
                                
                                <form onSubmit={handleSubmit}>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} md={6}>
                                            <FormControl 
                                                fullWidth 
                                                error={!!errors.language}
                                                sx={{ mb: 2 }}
                                            >
                                                <InputLabel id="language-label">Programming Language</InputLabel>
                                                <Select
                                                    labelId="language-label"
                                                    value={language}
                                                    label="Programming Language"
                                                    onChange={(e) => setLanguage(e.target.value)}
                                                >
                                                    <MenuItem value="python">Python</MenuItem>
                                                    <MenuItem value="c">C</MenuItem>
                                                </Select>
                                                {errors.language && (
                                                    <FormHelperText>{errors.language}</FormHelperText>
                                                )}
                                            </FormControl>
                                        </Grid>
                                        
                                        <Grid item xs={12} md={6}>
                                            <TextField
                                                fullWidth
                                                label="Question ID"
                                                variant="outlined"
                                                value={questionId}
                                                onChange={(e) => setQuestionId(e.target.value)}
                                                error={!!errors.questionId}
                                                helperText={errors.questionId}
                                                sx={{ mb: 2 }}
                                                InputLabelProps={{
                                                    sx: { color: 'text.secondary' }
                                                }}
                                                inputProps={{
                                                    sx: { color: 'text.primary' }
                                                }}
                                            />
                                        </Grid>
                                        
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Question"
                                                variant="outlined"
                                                multiline
                                                rows={2}
                                                value={question}
                                                onChange={(e) => setQuestion(e.target.value)}
                                                error={!!errors.question}
                                                helperText={errors.question}
                                                sx={{ mb: 3 }}
                                                InputLabelProps={{
                                                    sx: { color: 'text.secondary' }
                                                }}
                                                inputProps={{
                                                    sx: { color: 'text.primary' }
                                                }}
                                            />
                                        </Grid>
                                        
                                        {options.map((option, index) => (
                                            <Grid item xs={12} md={6} key={index}>
                                                <TextField
                                                    fullWidth
                                                    label={`Option ${index + 1}`}
                                                    variant="outlined"
                                                    value={option}
                                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                                    error={!!errors[`option${index}`]}
                                                    helperText={errors[`option${index}`]}
                                                    sx={{ mb: 2 }}
                                                    InputLabelProps={{
                                                        sx: { color: 'text.secondary' }
                                                    }}
                                                    inputProps={{
                                                        sx: { color: 'text.primary' }
                                                    }}
                                                />
                                            </Grid>
                                        ))}
                                        
                                        <Grid item xs={12}>
                                            <Typography 
                                                variant="body1"
                                                sx={{ 
                                                    color: 'text.secondary',
                                                    mb: 1
                                                }}
                                            >
                                                Correct Answer:
                                            </Typography>
                                            <FormControl 
                                                component="fieldset" 
                                                error={!!errors.correctAnswer}
                                                sx={{ mb: 3 }}
                                            >
                                                <RadioGroup
                                                    row
                                                    value={correctAnswer}
                                                    onChange={(e) => setCorrectAnswer(e.target.value)}
                                                >
                                                    {[0, 1, 2, 3].map((index) => (
                                                        <FormControlLabel
                                                            key={index}
                                                            value={index.toString()}
                                                            control={
                                                                <Radio 
                                                                    sx={{
                                                                        color: 'text.secondary',
                                                                        '&.Mui-checked': {
                                                                            color: 'primary.main',
                                                                        }
                                                                    }}
                                                                />
                                                            }
                                                            label={`Option ${index + 1}`}
                                                            sx={{ color: 'text.primary' }}
                                                        />
                                                    ))}
                                                </RadioGroup>
                                                {errors.correctAnswer && (
                                                    <FormHelperText>{errors.correctAnswer}</FormHelperText>
                                                )}
                                            </FormControl>
                                        </Grid>
                                        
                                        <Grid item xs={12} sx={{ textAlign: 'center' }}>
                                            <Button
                                                type="submit"
                                                variant="contained"
                                                size="large"
                                                disabled={isSubmitting}
                                                sx={{ 
                                                    minWidth: 200,
                                                    py: 1.5
                                                }}
                                            >
                                                {isSubmitting ? 'Adding...' : 'Add Question'}
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </form>
                            </Paper>
                        )}
                        
                        {/* Round 2 Question Form */}
                        {showRound2QuestionForm && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 4,
                                    backgroundColor: 'rgba(26, 26, 46, 0.8)',
                                    borderRadius: 3,
                                    border: '1px solid',
                                    borderColor: 'primary.main',
                                    mb: 4,
                                    textAlign: 'left'
                                }}
                            >
                                <Typography 
                                    variant="h5" 
                                    sx={{ 
                                        color: 'primary.main',
                                        fontWeight: 600,
                                        mb: 3,
                                        textAlign: 'center'
                                    }}
                                >
                                    Add New Round 2 Question (with Images)
                                </Typography>
                                
                                <form onSubmit={handleRound2Submit}>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Question ID"
                                                variant="outlined"
                                                value={round2QuestionId}
                                                onChange={(e) => setRound2QuestionId(e.target.value)}
                                                error={!!errors.round2QuestionId}
                                                helperText={errors.round2QuestionId}
                                                sx={{ mb: 2 }}
                                                InputLabelProps={{
                                                    sx: { color: 'text.secondary' }
                                                }}
                                                inputProps={{
                                                    sx: { color: 'text.primary' }
                                                }}
                                            />
                                        </Grid>
                                        
                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Question"
                                                variant="outlined"
                                                multiline
                                                rows={2}
                                                value={round2Question}
                                                onChange={(e) => setRound2Question(e.target.value)}
                                                error={!!errors.round2Question}
                                                helperText={errors.round2Question}
                                                sx={{ mb: 3 }}
                                                InputLabelProps={{
                                                    sx: { color: 'text.secondary' }
                                                }}
                                                inputProps={{
                                                    sx: { color: 'text.primary' }
                                                }}
                                            />
                                        </Grid>
                                        
                                        <Grid item xs={12}>
                                            <Typography 
                                                variant="body1"
                                                sx={{ 
                                                    color: 'text.secondary',
                                                    mb: 1
                                                }}
                                            >
                                                Question Image:
                                            </Typography>
                                            <input
                                                accept="image/*"
                                                type="file"
                                                id="question-image-upload"
                                                onChange={handleQuestionImageUpload}
                                                style={{ display: 'none' }}
                                            />
                                            <label htmlFor="question-image-upload">
                                                <Button 
                                                    variant="contained" 
                                                    component="span"
                                                    sx={{ mb: 1 }}
                                                >
                                                    Upload Image
                                                </Button>
                                            </label>
                                            {errors.round2QuestionImage && (
                                                <FormHelperText error>{errors.round2QuestionImage}</FormHelperText>
                                            )}
                                            {round2QuestionImage && (
                                                <Box sx={{ mt: 2, mb: 3, textAlign: 'center' }}>
                                                    <img 
                                                        src={round2QuestionImage} 
                                                        alt="Question Preview" 
                                                        style={{ 
                                                            maxWidth: '100%', 
                                                            maxHeight: '200px',
                                                            border: '1px solid #ccc' 
                                                        }} 
                                                    />
                                                </Box>
                                            )}
                                        </Grid>
                                        
                                        {round2Options.map((option, index) => (
                                            <Grid item xs={12} key={index}>
                                                <Box sx={{ mb: 3, p: 2, border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: 1 }}>
                                                    <Typography 
                                                        variant="h6"
                                                        sx={{ 
                                                            color: 'primary.main',
                                                            mb: 2
                                                        }}
                                                    >
                                                        Option {index + 1}
                                                    </Typography>
                                                    
                                                    <TextField
                                                        fullWidth
                                                        label={`Option ${index + 1} Text`}
                                                        variant="outlined"
                                                        value={option}
                                                        onChange={(e) => handleRound2OptionChange(index, e.target.value)}
                                                        error={!!errors[`round2Option${index}`]}
                                                        helperText={errors[`round2Option${index}`]}
                                                        sx={{ mb: 2 }}
                                                        InputLabelProps={{
                                                            sx: { color: 'text.secondary' }
                                                        }}
                                                        inputProps={{
                                                            sx: { color: 'text.primary' }
                                                        }}
                                                    />
                                                    
                                                    <Typography 
                                                        variant="body1"
                                                        sx={{ 
                                                            color: 'text.secondary',
                                                            mb: 1
                                                        }}
                                                    >
                                                        Option Image:
                                                    </Typography>
                                                    <input
                                                        accept="image/*"
                                                        type="file"
                                                        id={`option-image-upload-${index}`}
                                                        onChange={(e) => handleOptionImageUpload(index, e)}
                                                        style={{ display: 'none' }}
                                                    />
                                                    <label htmlFor={`option-image-upload-${index}`}>
                                                        <Button 
                                                            variant="contained" 
                                                            component="span"
                                                            sx={{ mb: 1 }}
                                                        >
                                                            Upload Image
                                                        </Button>
                                                    </label>
                                                    {errors[`round2OptionImage${index}`] && (
                                                        <FormHelperText error>{errors[`round2OptionImage${index}`]}</FormHelperText>
                                                    )}
                                                    {round2OptionImages[index] && (
                                                        <Box sx={{ mt: 2, textAlign: 'center' }}>
                                                            <img 
                                                                src={round2OptionImages[index]} 
                                                                alt={`Option ${index + 1} Preview`} 
                                                                style={{ 
                                                                    maxWidth: '100%', 
                                                                    maxHeight: '150px',
                                                                    border: '1px solid #ccc' 
                                                                }} 
                                                            />
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Grid>
                                        ))}
                                        
                                        <Grid item xs={12}>
                                            <Typography 
                                                variant="body1"
                                                sx={{ 
                                                    color: 'text.secondary',
                                                    mb: 1
                                                }}
                                            >
                                                Correct Answer:
                                            </Typography>
                                            <FormControl 
                                                component="fieldset" 
                                                error={!!errors.round2CorrectAnswer}
                                                sx={{ mb: 3 }}
                                            >
                                                <RadioGroup
                                                    row
                                                    value={round2CorrectAnswer}
                                                    onChange={(e) => setRound2CorrectAnswer(e.target.value)}
                                                >
                                                    {[0, 1, 2, 3].map((index) => (
                                                        <FormControlLabel
                                                            key={index}
                                                            value={index.toString()}
                                                            control={
                                                                <Radio 
                                                                    sx={{
                                                                        color: 'text.secondary',
                                                                        '&.Mui-checked': {
                                                                            color: 'primary.main',
                                                                        }
                                                                    }}
                                                                />
                                                            }
                                                            label={`Option ${index + 1}`}
                                                            sx={{ color: 'text.primary' }}
                                                        />
                                                    ))}
                                                </RadioGroup>
                                                {errors.round2CorrectAnswer && (
                                                    <FormHelperText>{errors.round2CorrectAnswer}</FormHelperText>
                                                )}
                                            </FormControl>
                                        </Grid>
                                        
                                        <Grid item xs={12} sx={{ textAlign: 'center' }}>
                                            <Button
                                                type="submit"
                                                variant="contained"
                                                size="large"
                                                disabled={isSubmitting}
                                                sx={{ 
                                                    minWidth: 200,
                                                    py: 1.5
                                                }}
                                            >
                                                {isSubmitting ? 'Adding...' : 'Add Round 2 Question'}
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </form>
                            </Paper>
                        )}
                        
                        {/* Round 3 Submissions */}
                        {showRound3Submissions && (
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 4,
                                    backgroundColor: 'rgba(26, 26, 46, 0.8)',
                                    borderRadius: 3,
                                    border: '1px solid',
                                    borderColor: 'primary.main',
                                    mb: 4
                                }}
                            >
                                <Typography 
                                    variant="h5" 
                                    sx={{ 
                                        color: 'primary.main',
                                        fontWeight: 600,
                                        mb: 3,
                                        textAlign: 'center'
                                    }}
                                >
                                    Round 3 Submissions
                                </Typography>
                                
                                {round3Submissions.length === 0 ? (
                                    <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary' }}>
                                        No submissions found for Round 3.
                                    </Typography>
                                ) : (
                                    <>
                                        <Grid container spacing={3}>
                                            <Grid item xs={12} md={6}>
                                                <Typography variant="h6" sx={{ mb: 2, color: 'primary.light' }}>
                                                    Submission List
                                                </Typography>
                                                <Paper 
                                                    elevation={0}
                                                    sx={{ 
                                                        maxHeight: '500px', 
                                                        overflow: 'auto',
                                                        bgcolor: 'background.paper',
                                                        borderRadius: 2
                                                    }}
                                                >
                                                    {round3Submissions.map((submission) => (
                                                        <Box
                                                            key={submission.id}
                                                            sx={{
                                                                p: 2,
                                                                borderBottom: '1px solid',
                                                                borderColor: 'divider',
                                                                cursor: 'pointer',
                                                                '&:hover': {
                                                                    bgcolor: 'action.hover'
                                                                },
                                                                ...(selectedSubmission?.id === submission.id && {
                                                                    bgcolor: 'action.selected'
                                                                })
                                                            }}
                                                            onClick={() => viewSubmission(submission)}
                                                        >
                                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <Typography variant="subtitle1" fontWeight={600}>
                                                                    {submission.username} - {submission.track_type}
                                                                </Typography>
                                                                {submission.scored ? (
                                                                    <Box 
                                                                        sx={{ 
                                                                            px: 1.5, 
                                                                            py: 0.5, 
                                                                            borderRadius: 10, 
                                                                            bgcolor: submission.score > 0 ? 'success.main' : 'error.main',
                                                                            color: 'white',
                                                                            fontSize: '0.8rem',
                                                                            fontWeight: 'bold'
                                                                        }}
                                                                    >
                                                                        {submission.score > 0 ? '+4' : '-1'}
                                                                    </Box>
                                                                ) : (
                                                                    <Box 
                                                                        sx={{ 
                                                                            px: 1.5, 
                                                                            py: 0.5, 
                                                                            borderRadius: 10, 
                                                                            bgcolor: 'warning.main',
                                                                            color: 'text.primary',
                                                                            fontSize: '0.8rem',
                                                                            fontWeight: 'bold'
                                                                        }}
                                                                    >
                                                                        Pending
                                                                    </Box>
                                                                )}
                                                            </Box>
                                                            <Typography variant="body2" color="text.secondary">
                                                                Submitted: {new Date(submission.submitted_at).toLocaleString()}
                                                            </Typography>
                                                        </Box>
                                                    ))}
                                                </Paper>
                                            </Grid>
                                            
                                            <Grid item xs={12} md={6}>
                                                {selectedSubmission ? (
                                                    <Box>
                                                        <Typography variant="h6" sx={{ mb: 2, color: 'primary.light' }}>
                                                            Submission Details
                                                        </Typography>
                                                        <Paper 
                                                            elevation={0}
                                                            sx={{ 
                                                                p: 3, 
                                                                borderRadius: 2,
                                                                bgcolor: 'background.paper',
                                                                mb: 3
                                                            }}
                                                        >
                                                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                                                {selectedSubmission.username} - {selectedSubmission.track_type}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                                Challenge: {selectedSubmission.challenge_name}
                                                            </Typography>
                                                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                                                Submitted: {new Date(selectedSubmission.submitted_at).toLocaleString()}
                                                            </Typography>
                                                            
                                                            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                                                                Code Submission:
                                                            </Typography>
                                                            <Paper 
                                                                sx={{ 
                                                                    p: 2, 
                                                                    bgcolor: '#1e1e1e', 
                                                                    borderRadius: 1,
                                                                    maxHeight: '300px',
                                                                    overflow: 'auto'
                                                                }}
                                                            >
                                                                <Typography 
                                                                    variant="body2" 
                                                                    component="pre" 
                                                                    sx={{ 
                                                                        color: '#d4d4d4',
                                                                        fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
                                                                        fontSize: '0.875rem',
                                                                        whiteSpace: 'pre-wrap',
                                                                        wordBreak: 'break-all'
                                                                    }}
                                                                >
                                                                    {selectedSubmission.code}
                                                                </Typography>
                                                            </Paper>
                                                            
                                                            {!selectedSubmission.scored && (
                                                                <Box sx={{ mt: 3 }}>
                                                                    <Typography variant="subtitle1" gutterBottom>
                                                                        Score this submission:
                                                                    </Typography>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                                        <FormControl component="fieldset">
                                                                            <RadioGroup
                                                                                row
                                                                                value={submissionScore}
                                                                                onChange={handleSubmissionScoreChange}
                                                                            >
                                                                                <FormControlLabel
                                                                                    value={4}
                                                                                    control={<Radio />}
                                                                                    label="Correct (+4)"
                                                                                />
                                                                                <FormControlLabel
                                                                                    value={-1}
                                                                                    control={<Radio />}
                                                                                    label="Incorrect (-1)"
                                                                                />
                                                                            </RadioGroup>
                                                                        </FormControl>
                                                                        <Button
                                                                            variant="contained"
                                                                            color="primary"
                                                                            onClick={() => submitScore(selectedSubmission.id)}
                                                                            disabled={isSubmissionScoring}
                                                                        >
                                                                            {isSubmissionScoring ? 'Submitting...' : 'Submit Score'}
                                                                        </Button>
                                                                    </Box>
                                                                </Box>
                                                            )}
                                                        </Paper>
                                                    </Box>
                                                ) : (
                                                    <Typography variant="body1" sx={{ textAlign: 'center', color: 'text.secondary', mt: 8 }}>
                                                        Select a submission from the list to view details
                                                    </Typography>
                                                )}
                                            </Grid>
                                        </Grid>
                                    </>
                                )}
                            </Paper>
                        )}
                        
                        <motion.div
                            variants={buttonVariants}
                            whileHover="hover"
                            whileTap="tap"
                        >
                            <Button 
                                variant="outlined"
                                size="large"
                                onClick={() => navigate('/leaderboard')}
                                sx={{ 
                                    px: 6, 
                                    py: 1.5, 
                                    fontSize: '1.1rem',
                                    borderWidth: 2,
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%',
                                        background: 'rgba(37, 99, 235, 0.1)',
                                        transform: 'translateX(-100%)',
                                        transition: 'transform 0.4s ease',
                                    },
                                    '&:hover::before': {
                                        transform: 'translateX(0)',
                                    }
                                }}
                            >
                                View Leaderboard
                            </Button>
                        </motion.div>
                    </MotionPaper>
                </Container>
            </Box>
            
            {/* Snackbar for notifications */}
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

export default AdminDashboard; 