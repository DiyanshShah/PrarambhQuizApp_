# This line was added to test Git change detection
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import os
import json
from datetime import datetime
from werkzeug.utils import secure_filename
import base64
import random  # Add import for shuffling questions
from flask_compress import Compress  # Import Flask-Compress
from sqlalchemy import inspect
import bcrypt

app = Flask(__name__)
CORS(app)
Compress(app)  # Initialize Flask-Compress to reduce response size

# Create directories for storing images
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
QUESTION_IMAGES_FOLDER = os.path.join(UPLOAD_FOLDER, 'question_images')
OPTION_IMAGES_FOLDER = os.path.join(UPLOAD_FOLDER, 'option_images')

# Create directories if they don't exist
os.makedirs(QUESTION_IMAGES_FOLDER, exist_ok=True)
os.makedirs(OPTION_IMAGES_FOLDER, exist_ok=True)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///quiz.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# User model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    enrollment_no = db.Column(db.String(12), unique=True, nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    current_round = db.Column(db.Integer, default=1)
    round3_track = db.Column(db.String(10), nullable=True)  # 'dsa' or 'web'
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    total_score = db.Column(db.Integer, default=0)  # Track total score across all rounds
    round2_completed_at = db.Column(db.DateTime, nullable=True)  # Track when Round 2 was completed
    qualified_for_round3 = db.Column(db.Boolean, default=False)  # Track if qualified for Round 3
    quiz_access_enabled = db.Column(db.Boolean, default=False)  # General quiz access flag (for backward compatibility)
    round1_access_enabled = db.Column(db.Boolean, default=False)  # Round 1 specific access
    round2_access_enabled = db.Column(db.Boolean, default=False)  # Round 2 specific access
    round3_access_enabled = db.Column(db.Boolean, default=False)  # Round 3 specific access
    
    # Relationship with QuizResult
    results = db.relationship('QuizResult', backref='user', lazy=True)

    def __repr__(self):
        return f'<User {self.username}>'

# Quiz Result model
class QuizResult(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    round_number = db.Column(db.Integer, nullable=False)
    language = db.Column(db.String(20), nullable=True)  # Now nullable for Round 2
    score = db.Column(db.Integer, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    completed_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed = db.Column(db.Boolean, default=True)  # Flag to indicate if the quiz was completed

    def __repr__(self):
        return f'<QuizResult {self.user_id}-{self.round_number}>'

# Create a model for Round 3 submissions
class Round3Submission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    challenge_id = db.Column(db.Integer, nullable=False)
    track_type = db.Column(db.String(10), nullable=False)  # 'dsa' or 'web'
    challenge_name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.Text, nullable=False)
    language = db.Column(db.String(20), nullable=True)  # For DSA track
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    scored = db.Column(db.Boolean, default=False)
    score = db.Column(db.Integer, nullable=True)

    def __repr__(self):
        return f'<Round3Submission {self.user_id}-{self.track_type}-{self.challenge_id}>'

def init_db():
    with app.app_context():
        inspector = inspect(db.engine)
        existing_tables = inspector.get_table_names()
        
        # Check if User table exists
        if 'user' in existing_tables:
            # Get columns in the User table
            columns = [column['name'] for column in inspector.get_columns('user')]
            
            # Check if the new columns exist
            if ('total_score' not in columns or 'round2_completed_at' not in columns or 
                'qualified_for_round3' not in columns or 'quiz_access_enabled' not in columns or
                'round1_access_enabled' not in columns or 'round2_access_enabled' not in columns or
                'round3_access_enabled' not in columns):
                
                print("Missing columns in User table, recreating tables...")
                db.drop_all()
                db.create_all()
                
                # Create admin user
                admin_password = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                admin = User(
                    enrollment_no='ADMIN',
                    username='admin',
                    password=admin_password,
                    is_admin=True,
                    current_round=3,
                    total_score=0,
                    qualified_for_round3=True,
                    quiz_access_enabled=True,  # Admin can always access quizzes
                    round1_access_enabled=True,
                    round2_access_enabled=True,
                    round3_access_enabled=True
                )
                db.session.add(admin)
                
                # Create predefined participants
                participants = [
                    {"enrollment_no": "CSE001", "username": "participant1", "password": "pass1234"},
                    {"enrollment_no": "CSE002", "username": "participant2", "password": "pass1234"},
                    {"enrollment_no": "CSE003", "username": "participant3", "password": "pass1234"},
                    {"enrollment_no": "CSE004", "username": "participant4", "password": "pass1234"},
                    {"enrollment_no": "CSE005", "username": "participant5", "password": "pass1234"}
                ]
                
                for p in participants:
                    hashed_pw = bcrypt.hashpw(p["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                    participant = User(
                        enrollment_no=p["enrollment_no"],
                        username=p["username"],
                        password=hashed_pw,
                        is_admin=False,
                        current_round=1,
                        total_score=0,
                        qualified_for_round3=False,  # Participants are not qualified for Round 3 by default
                        quiz_access_enabled=False,  # By default, participants cannot access quizzes until admin enables
                        round1_access_enabled=False,
                        round2_access_enabled=False,
                        round3_access_enabled=False
                    )
                    db.session.add(participant)
                
                db.session.commit()
                print("Database initialized with admin and participants.")
            else:
                print("Database already initialized.")
        else:
            print("Creating new database...")
            db.create_all()
            
            # Create admin user
            admin_password = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            admin = User(
                enrollment_no='ADMIN',
                username='admin',
                password=admin_password,
                is_admin=True,
                current_round=3,
                total_score=0,
                qualified_for_round3=True,
                quiz_access_enabled=True,  # Admin can always access quizzes
                round1_access_enabled=True,
                round2_access_enabled=True,
                round3_access_enabled=True
            )
            db.session.add(admin)
            
            # Create predefined participants
            participants = [
                {"enrollment_no": "CSE001", "username": "participant1", "password": "pass1234"},
                {"enrollment_no": "CSE002", "username": "participant2", "password": "pass1234"},
                {"enrollment_no": "CSE003", "username": "participant3", "password": "pass1234"},
                {"enrollment_no": "CSE004", "username": "participant4", "password": "pass1234"},
                {"enrollment_no": "CSE005", "username": "participant5", "password": "pass1234"}
            ]
            
            for p in participants:
                hashed_pw = bcrypt.hashpw(p["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                participant = User(
                    enrollment_no=p["enrollment_no"],
                    username=p["username"],
                    password=hashed_pw,
                    is_admin=False,
                    current_round=1,
                    total_score=0,
                    qualified_for_round3=False,  # Participants are not qualified for Round 3 by default
                    quiz_access_enabled=False,  # By default, participants cannot access quizzes until admin enables
                    round1_access_enabled=False,
                    round2_access_enabled=False,
                    round3_access_enabled=False
                )
                db.session.add(participant)
            
            db.session.commit()
            print("Database initialized with admin and participants.")

# Routes
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(enrollment_no=data['enrollment_no']).first()
    
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'error': 'Invalid enrollment number or password'}), 401
    
    # Generate user data for frontend
    user_data = {
        'id': user.id,
        'username': user.username,
        'enrollment_no': user.enrollment_no,
        'is_admin': user.is_admin,
        'current_round': user.current_round,
        'round3_track': user.round3_track,
        'qualified_for_round3': user.qualified_for_round3,
        'quiz_access_enabled': user.quiz_access_enabled,
        'round1_access_enabled': user.round1_access_enabled,
        'round2_access_enabled': user.round2_access_enabled,
        'round3_access_enabled': user.round3_access_enabled,
        'total_score': user.total_score,
        'registered_at': user.registered_at.isoformat() if user.registered_at else None
    }
    
    return jsonify({
        'message': 'Login successful',
        'user': user_data
    })

@app.route('/api/quiz/result', methods=['POST'])
def save_quiz_result():
    data = request.get_json()
    print(f"Received quiz result data: {data}")
    
    # Check if user exists
    user = db.session.get(User, data['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Check if user has already attempted this round
    language_filter = data.get('language') if data.get('language') else None
    
    existing_query = QuizResult.query.filter_by(
        user_id=data['user_id'],
        round_number=data['round_number']
    )
    
    # Only apply language filter for Round 1
    if data['round_number'] == 1 and language_filter:
        existing_query = existing_query.filter_by(language=language_filter)
    
    existing_result = existing_query.first()
    if existing_result:
        return jsonify({'error': 'You have already attempted this round', 'already_attempted': True}), 400
    
    # Save quiz result
    try:
        quiz_result = QuizResult(
            user_id=data['user_id'],
            round_number=data['round_number'],
            language=data.get('language', ''),
            score=data['score'],
            total_questions=data['total_questions'],
            completed=True,  # Mark as completed since this is a submission
            completed_at=datetime.utcnow()
        )
        db.session.add(quiz_result)
        
        # Update user's total score
        user.total_score += data['score']
        
        # If this is Round 2, update the completion timestamp
        if data['round_number'] == 2:
            user.round2_completed_at = datetime.utcnow()
            
            # Check if user qualifies for Round 3
            if data['score'] >= 10:  # At least 10 correct answers (50%)
                # Update user's current round to 3
                if user.current_round < 3:
                    user.current_round = 3
                    user.qualified_for_round3 = True
            
        # If this is Round 1, check if user can proceed to Round 2
        elif data['round_number'] == 1:
            # Check if user got at least 60% correct
            if data['score'] / data['total_questions'] >= 0.6:
                if user.current_round < 2:
                    user.current_round = 2
        
        # Commit all changes
        db.session.commit()
        
        # Construct response with updated user info
        updated_user = {
            'id': user.id,
            'username': user.username,
            'enrollment_no': user.enrollment_no,
            'is_admin': user.is_admin,
            'current_round': user.current_round,
            'round3_track': user.round3_track,
            'total_score': user.total_score,
            'qualified_for_round3': user.qualified_for_round3,
            'quiz_access_enabled': user.quiz_access_enabled
        }
        
        # Check if the user passed the quiz
        passed = False
        if data['round_number'] == 1 and data['score'] / data['total_questions'] >= 0.6:
            passed = True
        elif data['round_number'] == 2 and data['score'] >= 10:
            passed = True
        
        return jsonify({
            'message': 'Quiz result saved successfully',
            'result': {
                'id': quiz_result.id,
                'user_id': quiz_result.user_id,
                'round_number': quiz_result.round_number,
                'language': quiz_result.language,
                'score': quiz_result.score,
                'total_questions': quiz_result.total_questions,
                'completed_at': quiz_result.completed_at.isoformat(),
                'passed': passed
            },
            'updated_user': updated_user
        }), 201
    except Exception as e:
        db.session.rollback()
        print(f"Error saving quiz result: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to save quiz result: {str(e)}'}), 500

@app.route('/api/user/<int:user_id>/results', methods=['GET'])
def get_user_results(user_id):
    # Check if user exists
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get the requesting user from the query parameter
    requesting_user_id = request.args.get('requesting_user_id')
    is_admin = False
    
    if requesting_user_id:
        try:
            requesting_user_id = int(requesting_user_id)
            requesting_user = db.session.get(User, requesting_user_id)
            if requesting_user and requesting_user.is_admin:
                is_admin = True
        except (ValueError, TypeError):
            # Invalid requesting_user_id, treat as non-admin
            pass
    
    # Get user's quiz results
    results = QuizResult.query.filter_by(user_id=user_id).all()
    
    results_data = []
    for result in results:
        # Skip Round 3 results for non-admin users
        if result.round_number == 3 and not is_admin:
            continue
            
        results_data.append({
            'id': result.id,
            'round_number': result.round_number,
            'language': result.language,
            'score': result.score,
            'total_questions': result.total_questions,
            'completed_at': result.completed_at.isoformat(),
            'passed': result.score >= (result.total_questions // 2)
        })
    
    response_data = {
        'user_id': user_id,
        'username': user.username,
        'current_round': user.current_round,
        'total_score': user.total_score,
        'results': results_data
    }
    
    # Only include Round 3 qualification status for admin or the user themselves
    if is_admin or (requesting_user_id and requesting_user_id == user_id):
        response_data['qualified_for_round3'] = user.qualified_for_round3
    else:
        response_data['qualified_for_round3'] = False
    
    return jsonify(response_data)

@app.route('/api/admin/questions/<language>', methods=['POST'])
def add_question(language):
    # Validate language parameter
    if language not in ['python', 'c']:
        return jsonify({'error': 'Invalid language. Must be "python" or "c"'}), 400
    
    # Check if the request is from an admin
    auth_header = request.headers.get('Authorization')
    if auth_header:
        # In a real application, you would verify the token here
        pass
    
    # Get the question data from the request
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['id', 'question', 'options', 'correctAnswer']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Validate options (should be an array of 4 items)
    if not isinstance(data['options'], list) or len(data['options']) != 4:
        return jsonify({'error': 'Options must be an array of 4 items'}), 400
    
    # Validate correctAnswer (should be 0-3)
    if not isinstance(data['correctAnswer'], int) or data['correctAnswer'] < 0 or data['correctAnswer'] > 3:
        return jsonify({'error': 'Correct answer must be an integer between 0 and 3'}), 400
    
    # Store files directly in the backend directory for simplicity
    file_path = os.path.join(os.path.dirname(__file__), f'{language}_questions.json')
    
    try:
        # Check if file exists and read its contents
        questions = []
        if os.path.exists(file_path):
            with open(file_path, 'r') as file:
                questions = json.load(file)
        
        # Check if question with the same ID already exists
        for i, q in enumerate(questions):
            if q['id'] == data['id']:
                return jsonify({'error': f'Question with ID {data["id"]} already exists'}), 400
        
        # Add the new question to the list
        questions.append({
            'id': data['id'],
            'question': data['question'],
            'options': data['options'],
            'correctAnswer': data['correctAnswer']
        })
        
        # Sort questions by ID
        questions.sort(key=lambda x: x['id'])
        
        # Write the updated list back to the file
        with open(file_path, 'w') as file:
            json.dump(questions, file, indent=2)
        
        return jsonify({
            'message': 'Question added successfully',
            'question': data
        }), 201
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error adding question: {str(e)}")
        print(f"Traceback: {error_traceback}")
        print(f"File path attempted: {file_path}")
        return jsonify({'error': f'Failed to add question: {str(e)}'}), 500

@app.route('/api/admin/questions/round2', methods=['POST'])
def add_round2_question():
    # Get the question data from the request
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['id', 'question', 'questionImage', 'options', 'optionImages', 'correctAnswer']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Validate options (should be an array of 4 items)
    if not isinstance(data['options'], list) or len(data['options']) != 4:
        return jsonify({'error': 'Options must be an array of 4 items'}), 400
    
    # Validate option images (should be an array of 4 items)
    if not isinstance(data['optionImages'], list) or len(data['optionImages']) != 4:
        return jsonify({'error': 'Option images must be an array of 4 items'}), 400
    
    # Validate correctAnswer (should be 0-3)
    if not isinstance(data['correctAnswer'], int) or data['correctAnswer'] < 0 or data['correctAnswer'] > 3:
        return jsonify({'error': 'Correct answer must be an integer between 0 and 3'}), 400
    
    try:
        # Save question image if provided
        question_image_path = None
        if data['questionImage'] and data['questionImage'].startswith('data:image'):
            # Extract the base64 data
            image_data = data['questionImage'].split(',')[1]
            image_binary = base64.b64decode(image_data)
            
            # Save image to file with question ID in filename
            question_image_filename = f"question_{data['id']}.png"
            question_image_path = os.path.join(QUESTION_IMAGES_FOLDER, question_image_filename)
            
            with open(question_image_path, 'wb') as f:
                f.write(image_binary)
            
            # Set the relative path for storage in JSON
            question_image_path = f"uploads/question_images/{question_image_filename}"
        
        # Save option images if provided
        option_image_paths = []
        for idx, option_image in enumerate(data['optionImages']):
            option_image_path = None
            if option_image and option_image.startswith('data:image'):
                # Extract the base64 data
                image_data = option_image.split(',')[1]
                image_binary = base64.b64decode(image_data)
                
                # Save image to file with question ID and option index in filename
                option_image_filename = f"question_{data['id']}_option_{idx}.png"
                option_image_path = os.path.join(OPTION_IMAGES_FOLDER, option_image_filename)
                
                with open(option_image_path, 'wb') as f:
                    f.write(image_binary)
                
                # Set the relative path for storage in JSON
                option_image_path = f"uploads/option_images/{option_image_filename}"
            
            option_image_paths.append(option_image_path)
        
        # Store files directly in the backend directory
        file_path = os.path.join(os.path.dirname(__file__), 'round2_questions.json')
        
        # Check if file exists and read its contents
        questions = []
        if os.path.exists(file_path):
            with open(file_path, 'r') as file:
                questions = json.load(file)
        
        # Check if question with the same ID already exists
        for i, q in enumerate(questions):
            if q['id'] == data['id']:
                return jsonify({'error': f'Question with ID {data["id"]} already exists'}), 400
        
        # Add the new question to the list
        questions.append({
            'id': data['id'],
            'question': data['question'],
            'questionImage': question_image_path,
            'options': data['options'],
            'optionImages': option_image_paths,
            'correctAnswer': data['correctAnswer']
        })
        
        # Sort questions by ID
        questions.sort(key=lambda x: x['id'])
        
        # Write the updated list back to the file
        with open(file_path, 'w') as file:
            json.dump(questions, file, indent=2)
        
        return jsonify({
            'message': 'Round 2 question added successfully',
            'question': {
                'id': data['id'],
                'question': data['question'],
                'questionImage': question_image_path,
                'options': data['options'],
                'optionImages': option_image_paths,
                'correctAnswer': data['correctAnswer']
            }
        }), 201
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error adding Round 2 question: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return jsonify({'error': f'Failed to add Round 2 question: {str(e)}'}), 500

@app.route('/api/admin/questions/round2', methods=['GET'])
def get_round2_questions():
    try:
        file_path = os.path.join(os.path.dirname(__file__), 'round2_questions.json')
        
        if not os.path.exists(file_path):
            return jsonify([]), 200
        
        with open(file_path, 'r') as file:
            questions = json.load(file)
        
        # Shuffle questions for each participant
        random.shuffle(questions)
        
        return jsonify(questions), 200
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error fetching Round 2 questions: {str(e)}")
        print(f"Traceback: {error_traceback}")
        print(f"File path attempted: {file_path}")
        return jsonify({'error': f'Failed to fetch Round 2 questions: {str(e)}'}), 500

@app.route('/api/admin/questions/round3', methods=['POST'])
def add_round3_question():
    # Get the question data from the request
    data = request.get_json()
    
    # Validate request data
    if not data or not isinstance(data, dict):
        return jsonify({'error': 'Invalid request data'}), 400
    
    required_fields = ['question', 'options', 'correctAnswer']
    if not all(field in data for field in required_fields):
        return jsonify({'error': f'Missing required fields. Required: {", ".join(required_fields)}'}), 400
    
    # Validate options array
    if not isinstance(data['options'], list) or len(data['options']) < 2:
        return jsonify({'error': 'options must be an array with at least 2 items'}), 400
    
    # Validate correctAnswer is a valid index
    if not isinstance(data['correctAnswer'], int) or data['correctAnswer'] < 0 or data['correctAnswer'] >= len(data['options']):
        return jsonify({'error': 'correctAnswer must be a valid index into the options array'}), 400
    
    try:
        file_path = os.path.join(os.path.dirname(__file__), 'round3_questions.json')
        
        questions = []
        if os.path.exists(file_path):
            with open(file_path, 'r') as file:
                questions = json.load(file)
        
        # Add the new question
        questions.append(data)
        
        # Save back to the file
        with open(file_path, 'w') as file:
            json.dump(questions, file, indent=2)
        
        return jsonify({'message': 'Round 3 question added successfully', 'total_questions': len(questions)}), 201
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error adding Round 3 question: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return jsonify({'error': f'Failed to add Round 3 question: {str(e)}'}), 500

@app.route('/api/admin/questions/round3', methods=['GET'])
def get_round3_questions():
    try:
        file_path = os.path.join(os.path.dirname(__file__), 'round3_questions.json')
        
        print(f"Trying to access file: {file_path}")
        print(f"File exists: {os.path.exists(file_path)}")
        
        if not os.path.exists(file_path):
            print("File not found, returning empty array")
            return jsonify([]), 200
        
        with open(file_path, 'r') as file:
            questions = json.load(file)
        
        # Shuffle questions for each participant
        random.shuffle(questions)
        
        print(f"Successfully loaded {len(questions)} questions from round3_questions.json")
        return jsonify(questions), 200
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error fetching Round 3 questions: {str(e)}")
        print(f"Traceback: {error_traceback}")
        print(f"File path attempted: {file_path}")
        return jsonify({'error': f'Failed to fetch Round 3 questions: {str(e)}'}), 500

@app.route('/api/admin/questions/<language>', methods=['GET'])
def get_questions(language):
    # Validate language parameter
    if language not in ['python', 'c']:
        return jsonify({'error': 'Invalid language. Must be "python" or "c"'}), 400
    
    try:
        file_path = os.path.join(os.path.dirname(__file__), f'{language}_questions.json')
        
        if not os.path.exists(file_path):
            return jsonify([]), 200
        
        with open(file_path, 'r') as file:
            all_questions = json.load(file)
        
        # Shuffle all questions
        random.shuffle(all_questions)
        
        # Select only 20 questions for each participant
        selected_questions = all_questions[:20] if len(all_questions) > 20 else all_questions
        
        print(f"Total {language} questions: {len(all_questions)}, Selected: 20")
        
        return jsonify(selected_questions), 200
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error fetching {language} questions: {str(e)}")
        print(f"Traceback: {error_traceback}")
        print(f"File path attempted: {file_path}")
        return jsonify({'error': f'Failed to fetch {language} questions: {str(e)}'}), 500

@app.route('/api/user/<int:user_id>', methods=['GET'])
def get_user(user_id):
    # Check if user exists
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get the requesting user from the query parameter
    requesting_user_id = request.args.get('requesting_user_id')
    is_admin = False
    
    if requesting_user_id:
        try:
            requesting_user_id = int(requesting_user_id)
            requesting_user = db.session.get(User, requesting_user_id)
            if requesting_user and requesting_user.is_admin:
                is_admin = True
        except (ValueError, TypeError):
            # Invalid requesting_user_id, treat as non-admin
            pass
    
    response_data = {
        'id': user.id,
        'username': user.username,
        'enrollment_no': user.enrollment_no,
        'is_admin': user.is_admin,
        'current_round': user.current_round,
        'round3_track': user.round3_track,
        'total_score': user.total_score,
        'registered_at': user.registered_at.isoformat() if user.registered_at else None,
        'quiz_access_enabled': user.quiz_access_enabled,
        'round1_access_enabled': user.round1_access_enabled,
        'round2_access_enabled': user.round2_access_enabled,
        'round3_access_enabled': user.round3_access_enabled
    }
    
    # Only include Round 3 qualification for admin or the user themselves
    if is_admin or (requesting_user_id and requesting_user_id == user_id):
        response_data['qualified_for_round3'] = user.qualified_for_round3
    else:
        response_data['qualified_for_round3'] = False
    
    return jsonify(response_data)

@app.route('/api/debug/set_user_round/<int:user_id>/<int:round_number>', methods=['GET'])
@app.route('/api/debug/set_user_round/<int:user_id>/<int:round_number>/<string:track>', methods=['GET'])
def debug_set_user_round(user_id, round_number, track=None):
    # This is a debug endpoint for development only
    # Should be removed or protected in production
    
    # Check if user exists
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Update user's round
    user.current_round = round_number
    
    # Update track if provided and valid
    if track and round_number == 3:
        if track in ['dsa', 'web']:
            user.round3_track = track
    
    db.session.commit()
    
    return jsonify({
        'message': f'User {user.username} round updated to {round_number}' + (f' with track {track}' if track else ''),
        'user': {
            'id': user.id,
            'username': user.username,
            'enrollment_no': user.enrollment_no,
            'is_admin': user.is_admin,
            'current_round': user.current_round,
            'round3_track': user.round3_track,
            'registered_at': user.registered_at.isoformat() if user.registered_at else None
        }
    })

# Route to serve uploaded files
@app.route('/uploads/<path:folder>/<path:filename>')
def serve_uploads(folder, filename):
    return send_from_directory(os.path.join(UPLOAD_FOLDER, folder), filename)

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        # Check if the request is from an admin
        requesting_user_id = request.args.get('requesting_user_id')
        is_admin = False
        
        if requesting_user_id:
            try:
                requesting_user_id = int(requesting_user_id)
                requesting_user = db.session.get(User, requesting_user_id)
                if requesting_user and requesting_user.is_admin:
                    is_admin = True
            except (ValueError, TypeError):
                # Invalid requesting_user_id, treat as non-admin
                pass
        
        # Get all users who are not admins
        users = User.query.filter_by(is_admin=False).all()
        
        leaderboard_data = []
        for user in users:
            # Get all quiz results for this user
            if is_admin:
                # For admins, include all rounds
                results = QuizResult.query.filter_by(user_id=user.id).all()
            else:
                # For non-admins, exclude Round 3 results
                results = QuizResult.query.filter(
                    QuizResult.user_id == user.id,
                    QuizResult.round_number != 3
                ).all()
            
            # Calculate visible score (excluding Round 3 for non-admins)
            visible_score = sum(result.score for result in results)
            visible_questions = sum(result.total_questions for result in results)
            
            # Only include users who have attempted at least one quiz
            if results:
                user_data = {
                    'user_id': user.id,
                    'username': user.username,
                    'enrollment_no': user.enrollment_no,
                    'visible_score': visible_score,
                    'total_questions': visible_questions,
                    'percentage': round((visible_score / visible_questions * 100), 2) if visible_questions > 0 else 0,
                    'current_round': user.current_round,
                }
                
                # For admins, include the actual total score (including Round 3)
                if is_admin:
                    user_data['total_score'] = user.total_score
                    user_data['qualified_for_round3'] = user.qualified_for_round3
                
                leaderboard_data.append(user_data)
        
        # Sort by total_score for admins, visible_score for participants
        if is_admin:
            leaderboard_data.sort(key=lambda x: x['total_score'], reverse=True)
        else:
            leaderboard_data.sort(key=lambda x: x['visible_score'], reverse=True)
        
        # Add ranking
        for i, entry in enumerate(leaderboard_data):
            entry['rank'] = i + 1
        
        return jsonify({
            'leaderboard': leaderboard_data,
            'total_participants': len(leaderboard_data),
            'is_admin_view': is_admin
        }), 200
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error fetching leaderboard data: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return jsonify({'error': f'Failed to fetch leaderboard data: {str(e)}'}), 500

@app.route('/api/round3/submit-dsa', methods=['POST'])
def submit_dsa_solution():
    data = request.get_json()
    
    try:
        user_id = data.get('user_id')
        challenge_id = data.get('challenge_id')
        challenge_name = data.get('challenge_name')
        code = data.get('code')
        language = data.get('language')
        
        # Validate required fields
        if not all([user_id, challenge_id, challenge_name, code, language]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Check if user exists
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Check if user has qualified for Round 3
        if not user.qualified_for_round3:
            return jsonify({'error': 'User has not qualified for Round 3'}), 403
            
        # Check if user has selected the DSA track
        if user.round3_track != 'dsa':
            return jsonify({'error': 'User has not selected the DSA track'}), 403
            
        # Check if user has already submitted this challenge
        existing_submission = Round3Submission.query.filter_by(
            user_id=user_id,
            challenge_id=challenge_id,
            track_type='dsa'
        ).first()
        
        if existing_submission:
            # Update existing submission
            existing_submission.code = code
            existing_submission.language = language
            existing_submission.submitted_at = datetime.utcnow()
            existing_submission.scored = False
            existing_submission.score = None
            
            db.session.commit()
            
            return jsonify({
                'message': 'DSA solution updated successfully',
                'submission_id': existing_submission.id
            }), 200
        else:
            # Create new submission
            new_submission = Round3Submission(
                user_id=user_id,
                challenge_id=challenge_id,
                track_type='dsa',
                challenge_name=challenge_name,
                code=code,
                language=language,
                submitted_at=datetime.utcnow()
            )
            
            db.session.add(new_submission)
            db.session.commit()
            
            return jsonify({
                'message': 'DSA solution submitted successfully',
                'submission_id': new_submission.id
            }), 201
            
    except Exception as e:
        db.session.rollback()
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error submitting DSA solution: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return jsonify({'error': f'Failed to submit DSA solution: {str(e)}'}), 500

@app.route('/api/round3/submit-web', methods=['POST'])
def submit_web_solution():
    data = request.get_json()
    
    try:
        user_id = data.get('user_id')
        challenge_id = data.get('challenge_id')
        challenge_name = data.get('challenge_name')
        html_code = data.get('html_code')
        css_code = data.get('css_code')
        js_code = data.get('js_code')
        
        # Validate required fields
        if not all([user_id, challenge_id, challenge_name, html_code, css_code]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Check if user exists
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Check if user has qualified for Round 3
        if not user.qualified_for_round3:
            return jsonify({'error': 'User has not qualified for Round 3'}), 403
            
        # Check if user has selected the Web track
        if user.round3_track != 'web':
            return jsonify({'error': 'User has not selected the Web track'}), 403
            
        # Combine code for storage
        full_code = f"<-- HTML -->\n{html_code}\n\n<-- CSS -->\n{css_code}\n\n<-- JavaScript -->\n{js_code or '// No JavaScript'}"
        
        # Check if user has already submitted this challenge
        existing_submission = Round3Submission.query.filter_by(
            user_id=user_id,
            challenge_id=challenge_id,
            track_type='web'
        ).first()
        
        if existing_submission:
            # Update existing submission
            existing_submission.code = full_code
            existing_submission.submitted_at = datetime.utcnow()
            existing_submission.scored = False
            existing_submission.score = None
            
            db.session.commit()
            
            return jsonify({
                'message': 'Web solution updated successfully',
                'submission_id': existing_submission.id,
                'success': True
            }), 200
        else:
            # Create new submission
            new_submission = Round3Submission(
                user_id=user_id,
                challenge_id=challenge_id,
                track_type='web',
                challenge_name=challenge_name,
                code=full_code,
                submitted_at=datetime.utcnow()
            )
            
            db.session.add(new_submission)
            db.session.commit()
            
            return jsonify({
                'message': 'Web solution submitted successfully',
                'submission_id': new_submission.id,
                'success': True
            }), 201
            
    except Exception as e:
        db.session.rollback()
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error submitting web solution: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return jsonify({'error': f'Failed to submit web solution: {str(e)}', 'success': False}), 500

@app.route('/api/admin/round3-submissions', methods=['GET'])
def get_round3_submissions():
    try:
        # Verify the user is an admin (should be part of authentication middleware)
        # For simplicity, we'll assume the request is coming from an admin
        
        # Get all Round 3 submissions with user information
        submissions = db.session.query(
            Round3Submission, User.username
        ).join(
            User, Round3Submission.user_id == User.id
        ).all()
        
        submission_list = []
        for submission, username in submissions:
            submission_data = {
                'id': submission.id,
                'user_id': submission.user_id,
                'username': username,
                'track_type': submission.track_type,
                'challenge_id': submission.challenge_id,
                'challenge_name': submission.challenge_name,
                'code': submission.code,
                'language': submission.language,
                'submitted_at': submission.submitted_at.isoformat(),
                'scored': submission.scored,
                'score': submission.score
            }
            submission_list.append(submission_data)
        
        return jsonify({'submissions': submission_list}), 200
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error fetching Round 3 submissions: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return jsonify({'error': f'Failed to fetch Round 3 submissions: {str(e)}'}), 500

@app.route('/api/admin/score-round3', methods=['POST'])
def score_round3_submission():
    data = request.get_json()
    
    try:
        submission_id = data.get('submissionId')
        score = data.get('score')
        
        # Validate inputs
        if submission_id is None or score is None:
            return jsonify({'error': 'Missing required fields'}), 400
            
        if score not in [4, -1]:
            return jsonify({'error': 'Score must be either 4 or -1'}), 400
            
        # Find the submission
        submission = db.session.get(Round3Submission, submission_id)
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404
            
        # Update submission score
        submission.score = score
        submission.scored = True
        
        # Find the user
        user = db.session.get(User, submission.user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Update the user's total score
        user.total_score += score
        
        # For internal tracking, we still record the Round 3 score in QuizResult
        # But this won't be shown to participants
        existing_result = QuizResult.query.filter_by(
            user_id=submission.user_id,
            round_number=3
        ).first()
        
        if existing_result:
            # Update existing result
            existing_result.score += score
            if score > 0:
                existing_result.total_questions += 1
        else:
            # Create new result
            total_questions = 1 if score > 0 else 0
            new_result = QuizResult(
                user_id=submission.user_id,
                round_number=3,
                language='',  # Round 3 doesn't use language
                score=score,
                total_questions=total_questions,
                completed_at=datetime.utcnow()
            )
            db.session.add(new_result)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Submission scored successfully',
            'submission_id': submission_id,
            'score': score,
            'user_id': user.id,
            'username': user.username,
            'new_total_score': user.total_score
        }), 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error scoring Round 3 submission: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return jsonify({'error': f'Failed to score submission: {str(e)}'}), 500

@app.route('/api/user/set-round3-track', methods=['POST'])
def set_round3_track():
    data = request.get_json()
    
    try:
        user_id = data.get('user_id')
        track = data.get('track')
        
        # Validate inputs
        if user_id is None or track is None:
            return jsonify({'error': 'Missing required fields'}), 400
            
        if track not in ['dsa', 'web']:
            return jsonify({'error': 'Invalid track. Must be "dsa" or "web"'}), 400
            
        # Find the user
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Check if user has qualified for Round 3
        if not user.qualified_for_round3:
            return jsonify({'error': 'User has not qualified for Round 3'}), 403
            
        # Check if user already has a different track
        if user.round3_track and user.round3_track != track:
            existing_submissions = Round3Submission.query.filter_by(
                user_id=user_id,
                track_type=user.round3_track
            ).first()
            
            if existing_submissions:
                return jsonify({'error': f'User has already made submissions in the {user.round3_track} track'}), 400
        
        # Update user's track preference
        user.round3_track = track
        db.session.commit()
        
        return jsonify({
            'message': f'Round 3 track set to {track}',
            'user': {
                'id': user.id,
                'username': user.username,
                'enrollment_no': user.enrollment_no,
                'is_admin': user.is_admin,
                'current_round': user.current_round,
                'round3_track': user.round3_track,
                'qualified_for_round3': user.qualified_for_round3,
                'total_score': user.total_score,
                'registered_at': user.registered_at.isoformat() if user.registered_at else None
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error setting Round 3 track: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return jsonify({'error': f'Failed to set Round 3 track: {str(e)}'}), 500

# Add new endpoint for getting user's Round 3 submissions
@app.route('/api/round3/submissions', methods=['GET'])
def get_user_round3_submissions():
    try:
        user_id = request.args.get('user_id')
        track_type = request.args.get('track_type')
        
        # Validate parameters
        if not user_id:
            return jsonify({'error': 'Missing user_id parameter'}), 400
            
        # Optional track type filter
        query = Round3Submission.query.filter_by(user_id=user_id)
        if track_type:
            query = query.filter_by(track_type=track_type)
            
        # Get all submissions for this user
        submissions = query.all()
        
        submission_list = []
        for submission in submissions:
            submission_data = {
                'id': submission.id,
                'user_id': submission.user_id,
                'challenge_id': submission.challenge_id,
                'track_type': submission.track_type,
                'challenge_name': submission.challenge_name,
                'submitted_at': submission.submitted_at.isoformat(),
                'scored': submission.scored,
                'score': submission.score
            }
            submission_list.append(submission_data)
        
        return jsonify({
            'submissions': submission_list,
            'count': len(submission_list)
        }), 200
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error fetching Round 3 submissions: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return jsonify({'error': f'Failed to fetch Round 3 submissions: {str(e)}'}), 500

# Add an endpoint to get all participants
@app.route('/api/admin/participants', methods=['GET'])
def get_participants():
    # Validate that the request is from an admin
    admin_id = request.args.get('admin_id')
    
    if admin_id:
        admin = db.session.get(User, admin_id)
        if not admin or not admin.is_admin:
            return jsonify({'error': 'Unauthorized. Only admins can view participants.'}), 401
    
    try:
        # Get all non-admin users
        participants = User.query.filter_by(is_admin=False).all()
        
        # Format participants for response
        formatted_participants = []
        for participant in participants:
            formatted_participants.append({
                'id': participant.id,
                'username': participant.username,
                'enrollment_no': participant.enrollment_no,
                'current_round': participant.current_round,
                'total_score': participant.total_score,
                'round3_track': participant.round3_track,
                'qualified_for_round3': participant.qualified_for_round3,
                'quiz_access_enabled': participant.quiz_access_enabled,
                'round1_access_enabled': participant.round1_access_enabled,
                'round2_access_enabled': participant.round2_access_enabled,
                'round3_access_enabled': participant.round3_access_enabled,
                'registered_at': participant.registered_at.isoformat() if participant.registered_at else None
            })
        
        return jsonify({
            'success': True,
            'participants': formatted_participants
        })
    
    except Exception as e:
        return jsonify({'error': f"Failed to get participants: {str(e)}"}), 500

# Add the quiz access control API endpoint
@app.route('/api/toggle-quiz-access', methods=['POST'])
def toggle_quiz_access():
    data = request.get_json()
    
    # Ensure the request is from an admin
    admin_id = data.get('admin_id')
    admin_user = db.session.get(User, admin_id)
    
    if not admin_user or not admin_user.is_admin:
        return jsonify({'error': 'Unauthorized. Only admins can toggle quiz access.'}), 401
    
    # Get the round and access state from request
    round_number = data.get('round_number')
    enable_access = data.get('enable_access')
    
    if round_number is None or enable_access is None:
        return jsonify({'error': 'Missing required parameters: round_number or enable_access'}), 400
    
    # Update all non-admin users' quiz access for the specified round
    try:
        # If access is being disabled and we have ongoing submissions, mark them as completed
        if not enable_access:
            # Find any ongoing quiz attempts for this round
            ongoing_results = QuizResult.query.filter_by(round_number=round_number, completed=False).all()
            
            for result in ongoing_results:
                result.completed = True
                result.completed_at = datetime.utcnow()
                # The score will remain as is, based on what they answered before access was cut
        
        # Update all participants' quiz access flag for the specific round
        non_admin_users = User.query.filter_by(is_admin=False).all()
        for user in non_admin_users:
            # Set the round-specific access flag
            if round_number == 1:
                user.round1_access_enabled = enable_access
            elif round_number == 2:
                user.round2_access_enabled = enable_access
            elif round_number == 3:
                user.round3_access_enabled = enable_access
                
            # For backward compatibility, set the general flag if all rounds have the same status
            if user.round1_access_enabled == user.round2_access_enabled == user.round3_access_enabled:
                user.quiz_access_enabled = user.round1_access_enabled
            else:
                # If mixed access, default general flag to match the current round's status
                user.quiz_access_enabled = enable_access
        
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': f"Quiz access for Round {round_number} has been {'enabled' if enable_access else 'disabled'} for all participants."
        })
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f"Failed to update quiz access: {str(e)}"}), 500

# Initialize the database
init_db()

if __name__ == '__main__':
    app.run(debug=True) 