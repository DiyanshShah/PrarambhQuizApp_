import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Paper, TextField, Button, 
  FormControl, InputLabel, Select, MenuItem, Grid, 
  FormHelperText, Snackbar, Alert, RadioGroup, Radio, FormControlLabel 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './Navbar';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [showQuestionForm, setShowQuestionForm] = useState(false);
    const [showRound2QuestionForm, setShowRound2QuestionForm] = useState(false);
    
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
    
    useEffect(() => {
        // Check if user is logged in and is admin
        const loggedInUser = localStorage.getItem('user');
        if (loggedInUser) {
            const userObj = JSON.parse(loggedInUser);
            if (!userObj.is_admin) {
                navigate('/participant-dashboard');
                return;
            }
            setUser(userObj);
        } else {
            navigate('/login');
        }
    }, [navigate]);
    
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
    
    const handleCloseSnackbar = () => {
        setSnackbar({...snackbar, open: false});
    };

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
                >
                    <Paper 
                        elevation={0}
                        sx={{ 
                            p: 6,
                            textAlign: 'center',
                            backgroundColor: 'background.paper',
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'primary.main',
                            width: '100%',
                            mx: 'auto'
                        }}
                    >
                        <Typography 
                            variant="h3" 
                            component="h1" 
                            gutterBottom
                            sx={{
                                color: 'primary.main',
                                fontWeight: 700,
                                mb: 4
                            }}
                        >
                            Admin Dashboard
                        </Typography>
                        
                        <Grid container spacing={4} sx={{ mb: 6 }}>
                            <Grid item xs={12} md={4}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        backgroundColor: 'rgba(255, 107, 0, 0.1)',
                                        borderRadius: 3,
                                        border: '1px solid',
                                        borderColor: 'primary.main',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <Typography 
                                        variant="h5" 
                                        sx={{ 
                                            color: 'primary.main',
                                            fontWeight: 600,
                                            mb: 2
                                        }}
                                    >
                                        Round 1
                                    </Typography>
                                    <Typography 
                                        variant="body1"
                                        sx={{
                                            color: 'text.secondary',
                                            mb: 3,
                                            flex: 1
                                        }}
                                    >
                                        Manage Round 1 questions. Add new questions for Python and C programming.
                                    </Typography>
                                    <Button 
                                        variant="contained"
                                        fullWidth
                                        onClick={() => {
                                            setShowQuestionForm(!showQuestionForm);
                                            setShowRound2QuestionForm(false);
                                        }}
                                    >
                                        {showQuestionForm ? 'Hide Question Form' : 'Add Questions'}
                                    </Button>
                                </Paper>
                            </Grid>
                            
                            <Grid item xs={12} md={4}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        backgroundColor: 'rgba(255, 107, 0, 0.1)',
                                        borderRadius: 3,
                                        border: '1px solid',
                                        borderColor: 'primary.main',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <Typography 
                                        variant="h5" 
                                        sx={{ 
                                            color: 'primary.main',
                                            fontWeight: 600,
                                            mb: 2
                                        }}
                                    >
                                        Round 2
                                    </Typography>
                                    <Typography 
                                        variant="body1"
                                        sx={{
                                            color: 'text.secondary',
                                            mb: 3,
                                            flex: 1
                                        }}
                                    >
                                        Manage Round 2 questions. Add questions with images for both questions and options.
                                    </Typography>
                                    <Button 
                                        variant="contained"
                                        fullWidth
                                        onClick={() => {
                                            setShowRound2QuestionForm(!showRound2QuestionForm);
                                            setShowQuestionForm(false);
                                        }}
                                    >
                                        {showRound2QuestionForm ? 'Hide Question Form' : 'Add Questions'}
                                    </Button>
                                </Paper>
                            </Grid>
                            
                            <Grid item xs={12} md={4}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 4,
                                        backgroundColor: 'rgba(100, 100, 100, 0.1)',
                                        borderRadius: 3,
                                        border: '1px solid',
                                        borderColor: 'grey.700',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <Typography 
                                        variant="h5" 
                                        sx={{ 
                                            color: 'grey.500',
                                            fontWeight: 600,
                                            mb: 2
                                        }}
                                    >
                                        Round 3
                                    </Typography>
                                    <Typography 
                                        variant="body1"
                                        sx={{
                                            color: 'grey.600',
                                            mb: 3,
                                            flex: 1
                                        }}
                                    >
                                        Manage Round 3 questions. (Coming soon)
                                    </Typography>
                                    <Button 
                                        variant="contained"
                                        fullWidth
                                        disabled
                                    >
                                        Coming Soon
                                    </Button>
                                </Paper>
                            </Grid>
                        </Grid>
                        
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
                        
                        <Button 
                            variant="outlined"
                            size="large"
                            onClick={() => navigate('/leaderboard')}
                            sx={{ 
                                px: 6, 
                                py: 1.5, 
                                fontSize: '1.1rem',
                                borderWidth: 2
                            }}
                        >
                            View Leaderboard
                        </Button>
                    </Paper>
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