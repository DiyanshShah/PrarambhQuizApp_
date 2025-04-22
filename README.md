# Prarambh Quiz Application

A web-based quiz application that allows participants to take multi-round tests with different question formats. The application includes a user authentication system and an admin panel for managing questions, participants, and viewing results.

## Features

- **User Authentication**: Enrollment number based login
- **Multi-round Quiz System**:
  - Round 1: Language-specific MCQs (Python/C)
  - Round 2: Visual questions with images
  - Round 3: Track-specific challenges (DSA or Web Development)
- **Admin Panel**: 
  - Add and manage questions
  - Create and manage participants
  - Control user access to different rounds
  - Score Round 3 submissions
  - View participant results and leaderboard
- **Round Access Management**: Control which rounds are available to participants
- **Leaderboard**: Track top performers across all rounds
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Backend
- Flask (Python web framework)
- SQLAlchemy (ORM for database)
- SQLite (Database)

### Frontend
- React.js
- Material-UI
- Framer Motion (for animations)

## Project Structure

```
quiz-app/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── requirements.txt    # Python dependencies
│   ├── instance/           # SQLite database location
│   ├── uploads/            # Uploaded images for questions
│   │   ├── question_images/
│   │   └── option_images/
│   └── *_questions.json    # Question data files
├── src/                    # React frontend
│   ├── components/         # React components
│   ├── data/               # Challenge data for Round 3
│   ├── App.jsx             # Main application component
│   └── index.jsx           # Entry point
├── public/                 # Static assets
├── admin.json              # Admin credentials (not in repo)
└── participants.json       # Participant data (not in repo)
```

## Setup and Installation

### Backend

1. Navigate to the backend directory:
   ```
   cd quiz-app/backend
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   # On Windows
   venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Run the Flask application:
   ```
   python app.py
   ```

   The API will be available at http://localhost:5000

### Frontend

1. Navigate to the project root directory:
   ```
   cd quiz-app
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm start
   ```

   The application will be available at http://localhost:3000

### Setting Up Admin and Participants

Create an `admin.json` file in the root directory with the following structure:
```json
{
  "enrollment_no": "your_enrollment_no",
  "username": "your_username",
  "password": "your_password"
}
```

Optionally, create a `participants.json` file to pre-load participant accounts:
```json
[
  {
    "enrollment_no": "participant1_enrollment_no",
    "username": "participant1_username",
    "password": "participant1_password"
  },
  {
    "enrollment_no": "participant2_enrollment_no",
    "username": "participant2_username",
    "password": "participant2_password"
  }
]
```

### Default Users

If no admin.json file is found, the application creates a default admin:

- **Admin User**:
  - Enrollment Number: 231260107017
  - Username: admin
  - Password: admin

## Round Structure

1. **Round 1**: Multiple-choice questions on Python or C programming.
2. **Round 2**: Visual programming questions with images.
3. **Round 3**: 
   - Two tracks: Data Structures & Algorithms (DSA) or Web Development
   - Participants choose one track and solve challenges
   - Only top performers from Round 2 qualify for Round 3

## API Endpoints

### Authentication
- `POST /api/login`: Authenticate a user

### User
- `GET /api/user/<user_id>`: Get user details
- `GET /api/user/<user_id>/results`: Get user's quiz results
- `POST /api/user/set-round3-track`: Set a user's Round 3 track

### Quiz
- `POST /api/quiz/result`: Save a quiz result
- `GET /api/rounds/access`: Check which rounds are enabled
- `GET /api/leaderboard`: Get the participant leaderboard

### Round 3
- `POST /api/round3/submit-dsa`: Submit a solution for a DSA challenge
- `POST /api/round3/submit-web`: Submit a solution for a Web challenge
- `GET /api/round3/submissions`: Get user's Round 3 submissions
- `GET /api/round3/check-challenge`: Check if a user has completed a challenge

### Admin
- `POST /api/admin/participants/create`: Create a new participant
- `POST /api/admin/rounds/access`: Enable/disable round access
- `GET /api/admin/questions/<language>`: Get all questions for a language
- `POST /api/admin/questions/<language>`: Add a question for a language
- `GET /api/admin/questions/round2`: Get all Round 2 questions
- `POST /api/admin/questions/round2`: Add a question for Round 2
- `GET /api/admin/questions/round3`: Get all Round 3 questions
- `POST /api/admin/questions/round3`: Add a question for Round 3
- `POST /api/admin/questions/delete`: Delete a question
- `GET /api/admin/round3-submissions`: Get all Round 3 submissions
- `POST /api/admin/score-round3`: Score a Round 3 submission

## License

This project is licensed under the MIT License - see the LICENSE file for details. 