# Prarambh Quiz Application

A web-based quiz application that allows participants to take multi-round tests with different question formats. The application includes a user authentication system and an admin panel for managing questions and viewing results.

## Features

- **User Authentication**: Enrollment number based signup and login
- **Multi-round Quiz System**:
  - Round 1: Language-specific questions (Python/C)
  - Round 2: Visual questions with images
- **Admin Panel**: 
  - Add and manage questions
  - View participant results
  - Control user access to different rounds
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Backend
- Flask (Python web framework)
- SQLAlchemy (ORM for database)
- SQLite (Database)

### Frontend
- React.js (not included in this repository)

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
└── frontend/              # React frontend (not included)
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

### Default Users

The application creates two default users on startup:

- **Admin User**:
  - Enrollment Number: 231260107017
  - Username: admin
  - Password: admin

- **Test User**:
  - Enrollment Number: test
  - Username: test
  - Password: test

## API Endpoints

### Authentication
- `POST /api/signup`: Register a new user
- `POST /api/login`: Authenticate a user

### User
- `GET /api/user/<user_id>`: Get user details
- `GET /api/user/<user_id>/results`: Get user's quiz results

### Quiz
- `POST /api/quiz/result`: Save a quiz result

### Admin
- `GET /api/admin/questions/<language>`: Get all questions for a language
- `POST /api/admin/questions/<language>`: Add a question for a language
- `GET /api/admin/questions/round2`: Get all round 2 questions
- `POST /api/admin/questions/round2`: Add a question for round 2
- `GET /api/debug/set_user_round/<user_id>/<round_number>`: Update a user's current round (debug endpoint)

## License

This project is licensed under the MIT License - see the LICENSE file for details. 