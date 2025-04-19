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

app = Flask(__name__)
CORS(app)

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
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    
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

    def __repr__(self):
        return f'<QuizResult {self.user_id}-{self.round_number}>'

# Create database tables and admin user
with app.app_context():
    # Drop and recreate all tables to apply schema changes
    db.drop_all()
    db.create_all()
    
    # Always create an admin user
    admin_password = generate_password_hash('admin')
    admin_user = User(
        enrollment_no='231260107017',
        username='admin',
        password=admin_password,
        is_admin=True,
        current_round=3,  # Admin has access to all rounds
        registered_at=datetime.utcnow()
    )
    db.session.add(admin_user)
    
    # Also create a test participant user
    participant_password = generate_password_hash('test')
    participant_user = User(
        enrollment_no='test',
        username='test',
        password=participant_password,
        is_admin=False,
        current_round=2,  # Give access to round 2 for testing
        registered_at=datetime.utcnow()
    )
    db.session.add(participant_user)
    
    db.session.commit()
    print("Default users created successfully!")

# Routes
@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    
    # Check if user already exists
    if User.query.filter_by(enrollment_no=data['enrollment_no']).first():
        return jsonify({'error': 'Enrollment number already exists'}), 400
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    # Create new user
    hashed_password = generate_password_hash(data['password'])
    new_user = User(
        enrollment_no=data['enrollment_no'],
        username=data['username'],
        password=hashed_password,
        is_admin=data.get('is_admin', False)
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({'message': 'User created successfully'}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(enrollment_no=data['enrollment_no']).first()
    
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'error': 'Invalid enrollment number or password'}), 401
    
    return jsonify({
        'message': 'Login successful',
        'user': {
            'id': user.id,
            'username': user.username,
            'enrollment_no': user.enrollment_no,
            'is_admin': user.is_admin,
            'current_round': user.current_round,
            'registered_at': user.registered_at.isoformat() if user.registered_at else None
        }
    })

@app.route('/api/quiz/result', methods=['POST'])
def save_quiz_result():
    data = request.get_json()
    print(f"Received quiz result data: {data}")
    
    # Check if user exists
    user = User.query.get(data['user_id'])
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
    
    existing_attempt = existing_query.first()
    
    if existing_attempt:
        print(f"User {user.username} has already attempted round {data['round_number']}")
        return jsonify({'error': 'You have already attempted this round', 'already_attempted': True}), 400
    
    # Create new quiz result
    try:
        new_result = QuizResult(
            user_id=data['user_id'],
            round_number=data['round_number'],
            language=data.get('language'),  # This can be None for Round 2
            score=data['score'],
            total_questions=data['total_questions'],
            completed_at=datetime.utcnow()
        )
        
        # Add the result to the database
        db.session.add(new_result)
        
        # Check if user passed the round (50% or more)
        passed = data['score'] >= (data['total_questions'] / 2)
        print(f"User {user.username} scored {data['score']}/{data['total_questions']} in Round {data['round_number']} - {'PASSED' if passed else 'FAILED'}")
        
        # Update user's current round if they passed and it's their current round
        if passed:
            if data['round_number'] == 1 and user.current_round <= 1:
                user.current_round = 2
                print(f"User {user.username} unlocked Round 2!")
            elif data['round_number'] == 2 and user.current_round <= 2:
                user.current_round = 3
                print(f"User {user.username} unlocked Round 3!")
        
        # Commit changes to the database
        db.session.commit()
        
        # Update the user in localStorage
        updated_user = {
            'id': user.id,
            'username': user.username,
            'enrollment_no': user.enrollment_no,
            'is_admin': user.is_admin,
            'current_round': user.current_round,
            'registered_at': user.registered_at.isoformat() if user.registered_at else None
        }
        
        return jsonify({
            'message': 'Quiz result saved successfully',
            'result': {
                'id': new_result.id,
                'user_id': new_result.user_id,
                'round_number': new_result.round_number,
                'language': new_result.language,
                'score': new_result.score,
                'total_questions': new_result.total_questions,
                'completed_at': new_result.completed_at.isoformat(),
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
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get user's quiz results
    results = QuizResult.query.filter_by(user_id=user_id).all()
    
    results_data = []
    for result in results:
        results_data.append({
            'id': result.id,
            'round_number': result.round_number,
            'language': result.language,
            'score': result.score,
            'total_questions': result.total_questions,
            'completed_at': result.completed_at.isoformat(),
            'passed': result.score >= (result.total_questions // 2)
        })
    
    return jsonify({
        'user_id': user_id,
        'username': user.username,
        'current_round': user.current_round,
        'results': results_data
    })

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
        
        return jsonify(questions), 200
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error fetching Round 2 questions: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return jsonify({'error': f'Failed to fetch Round 2 questions: {str(e)}'}), 500

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
            questions = json.load(file)
        
        return jsonify(questions), 200
        
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
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'enrollment_no': user.enrollment_no,
        'is_admin': user.is_admin,
        'current_round': user.current_round,
        'registered_at': user.registered_at.isoformat() if user.registered_at else None
    })

@app.route('/api/debug/set_user_round/<int:user_id>/<int:round_number>', methods=['GET'])
def debug_set_user_round(user_id, round_number):
    # This is a debug endpoint for development only
    # Should be removed or protected in production
    
    # Check if user exists
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Update user's round
    user.current_round = round_number
    db.session.commit()
    
    return jsonify({
        'message': f'User {user.username} round updated to {round_number}',
        'user': {
            'id': user.id,
            'username': user.username,
            'enrollment_no': user.enrollment_no,
            'is_admin': user.is_admin,
            'current_round': user.current_round,
            'registered_at': user.registered_at.isoformat() if user.registered_at else None
        }
    })

# Route to serve uploaded files
@app.route('/uploads/<path:folder>/<path:filename>')
def serve_uploads(folder, filename):
    return send_from_directory(os.path.join(UPLOAD_FOLDER, folder), filename)

if __name__ == '__main__':
    app.run(debug=True) 