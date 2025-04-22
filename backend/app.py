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
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
# Enable CORS for all routes with additional options
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]}})

# Add CORS headers to all responses
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    return response

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
app.secret_key = os.getenv('SECRET_KEY')
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
    
    # Relationship with QuizResult
    results = db.relationship('QuizResult', backref='user', lazy=True)
    # Relationship with UserScore - removing backref to avoid circular reference
    scores = db.relationship('UserScore', lazy=True)

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

# Model to track which rounds are enabled
class RoundAccess(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    round_number = db.Column(db.Integer, nullable=False, unique=True)
    is_enabled = db.Column(db.Boolean, default=False)
    enabled_at = db.Column(db.DateTime, nullable=True)
    
    def __repr__(self):
        return f'<RoundAccess {self.round_number}>'

# New UserScore model to track detailed scoring
class UserScore(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    round_number = db.Column(db.Integer, nullable=False)
    raw_score = db.Column(db.Integer, default=0)
    penalty_points = db.Column(db.Integer, default=0)
    total_score = db.Column(db.Integer, default=0)
    completion_time = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<UserScore {self.id} for User {self.user_id} Round {self.round_number}>'

# Create database tables and admin user
with app.app_context():
    # Check if we need to migrate data
    need_to_migrate = False
    inspector = db.inspect(db.engine)
    
    # Check if the new columns exist in the User table
    if 'user' in inspector.get_table_names():
        columns = [column['name'] for column in inspector.get_columns('user')]
        if 'total_score' not in columns or 'round2_completed_at' not in columns or 'qualified_for_round3' not in columns:
            need_to_migrate = True
            print("New columns detected, need to migrate data...")
    
    # Drop and recreate all tables to apply schema changes
    db.drop_all()
    db.create_all()
    
    # Initialize round access settings - by default, only round 1 is enabled
    round1_access = RoundAccess(round_number=1, is_enabled=True, enabled_at=datetime.utcnow())
    round2_access = RoundAccess(round_number=2, is_enabled=False)
    round3_access = RoundAccess(round_number=3, is_enabled=False)
    
    db.session.add(round1_access)
    db.session.add(round2_access)
    db.session.add(round3_access)
    
    # Load admin credentials from admin.json file
    admin_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'admin.json')
    admin_created = False
    
    if os.path.exists(admin_file_path):
        try:
            with open(admin_file_path, 'r') as file:
                admin_data = json.load(file)
                
                # Create admin user from file data
                admin_password = generate_password_hash(os.getenv('ADMIN_PASSWORD'))
                admin_user = User(
                    enrollment_no=os.getenv('ADMIN_ENROLLMENT'),
                    username=os.getenv('ADMIN_USERNAME'),
                    password=admin_password,
                    is_admin=True,
                    current_round=3,  # Admin has access to all rounds
                    registered_at=datetime.utcnow(),
                    total_score=0,
                    qualified_for_round3=True  # Admin is always qualified
                )
                db.session.add(admin_user)
                admin_created = True
                print(f"Admin user created from admin.json: {admin_data['username']}")
        except Exception as e:
            print(f"Error loading admin credentials from JSON: {str(e)}")
    
    # Create default admin if no admin.json file or error loading it
    if not admin_created:
        print("Warning: No admin.json file found or error loading it. Creating default admin.")
        admin_password = generate_password_hash(os.getenv('ADMIN_PASSWORD'))
        admin_user = User(
            enrollment_no=os.getenv('ADMIN_ENROLLMENT'),
            username=os.getenv('ADMIN_USERNAME'),
            password=admin_password,
            is_admin=True,
            current_round=3,  # Admin has access to all rounds
            registered_at=datetime.utcnow(),
            total_score=0,
            qualified_for_round3=True  # Admin is always qualified
        )
        db.session.add(admin_user)
    
    # Load participants from JSON file
    participants_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'participants.json')
    if os.path.exists(participants_file_path):
        try:
            with open(participants_file_path, 'r') as file:
                participants_data = json.load(file)
                print(f"Loaded {len(participants_data)} participants from JSON file")
                
                # Track enrollment numbers to avoid duplicates
                seen_enrollment_numbers = set()
                created_count = 0
                skipped_count = 0
                
                # Create user accounts for each participant
                for participant in participants_data:
                    enrollment_no = participant['enrollment_no']
                    
                    # Skip if this enrollment number already exists
                    if enrollment_no in seen_enrollment_numbers:
                        print(f"Warning: Skipping duplicate enrollment number: {enrollment_no} ({participant['username']})")
                        skipped_count += 1
                        continue
                    
                    # Add to tracking set
                    seen_enrollment_numbers.add(enrollment_no)
                    
                    # Check if user with this enrollment number already exists in DB
                    existing_user = User.query.filter_by(enrollment_no=enrollment_no).first()
                    if existing_user:
                        print(f"Warning: User with enrollment number {enrollment_no} already exists in database")
                        skipped_count += 1
                        continue
                    
                    # Create new user
                    hashed_password = generate_password_hash(participant['password'])
                    user = User(
                        enrollment_no=enrollment_no,
                        username=participant['username'],
                        password=hashed_password,
                        is_admin=False,
                        current_round=1,
                        total_score=0,
                        qualified_for_round3=False  # New users are not qualified for Round 3 by default
                    )
                    db.session.add(user)
                    created_count += 1
                
                print(f"Created {created_count} participant accounts from JSON file (Skipped {skipped_count} duplicates)")
        except Exception as e:
            print(f"Error loading participants from JSON: {str(e)}")
    else:
        print(f"Participants file not found at {participants_file_path}")
    
    # Load predefined test participants if available
    predefined_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'predefined_participants.json')
    if os.path.exists(predefined_file_path):
        try:
            with open(predefined_file_path, 'r') as file:
                predefined_data = json.load(file)
                print(f"Loaded {len(predefined_data)} predefined test participants")
                
                # Track enrollment numbers to avoid duplicates
                predefined_count = 0
                predefined_skipped = 0
                
                # Create user accounts for each predefined participant
                for participant in predefined_data:
                    enrollment_no = participant['enrollment_no']
                    
                    # Check if user with this enrollment number already exists in DB
                    existing_user = User.query.filter_by(enrollment_no=enrollment_no).first()
                    if existing_user:
                        predefined_skipped += 1
                        continue
                    
                    # Create new user
                    hashed_password = generate_password_hash(participant['password'])
                    user = User(
                        enrollment_no=enrollment_no,
                        username=participant['username'],
                        password=hashed_password,
                        is_admin=False,
                        current_round=1,
                        total_score=0,
                        qualified_for_round3=False
                    )
                    db.session.add(user)
                    predefined_count += 1
                
                if predefined_count > 0:
                    print(f"Created {predefined_count} predefined test participant accounts (Skipped {predefined_skipped})")
        except Exception as e:
            print(f"Error loading predefined test participants: {str(e)}")
    
    db.session.commit()
    print("Admin user and participant accounts created successfully!")

# Helper function to check if a round is currently enabled
def is_round_enabled(round_number):
    round_access = RoundAccess.query.filter_by(round_number=round_number).first()
    if not round_access:
        return False
    return round_access.is_enabled

# Routes
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(enrollment_no=data['enrollment_no']).first()
    
    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'error': 'Invalid enrollment number or password'}), 401
    
    # Get round access information
    rounds_access = {}
    for round_num in range(1, 4):  # For rounds 1, 2, and 3
        round_access = RoundAccess.query.filter_by(round_number=round_num).first()
        rounds_access[f'round{round_num}_enabled'] = round_access.is_enabled if round_access else False
    
    return jsonify({
        'message': 'Login successful',
        'user': {
            'id': user.id,
            'username': user.username,
            'enrollment_no': user.enrollment_no,
            'is_admin': user.is_admin,
            'current_round': user.current_round,
            'round3_track': user.round3_track,
            'total_score': user.total_score,
            'qualified_for_round3': user.qualified_for_round3,
            'registered_at': user.registered_at.isoformat() if user.registered_at else None
        },
        'rounds_access': rounds_access
    })

# New endpoint to check round access status
@app.route('/api/rounds/access', methods=['GET'])
def get_rounds_access():
    rounds_access = {}
    for round_num in range(1, 4):  # For rounds 1, 2, and 3
        round_access = RoundAccess.query.filter_by(round_number=round_num).first()
        rounds_access[f'round{round_num}'] = {
            'enabled': round_access.is_enabled if round_access else False,
            'enabled_at': round_access.enabled_at.isoformat() if round_access and round_access.enabled_at else None
        }
    
    return jsonify(rounds_access)

# Admin endpoint to enable/disable round access
@app.route('/api/admin/rounds/access', methods=['POST'])
def update_round_access():
    data = request.get_json()
    
    # Check if request is from an admin (should be handled by middleware)
    user_id = data.get('admin_user_id')
    if not user_id:
        return jsonify({'error': 'Admin user ID is required'}), 400
    
    admin = User.query.get(user_id)
    if not admin or not admin.is_admin:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    round_number = data.get('round_number')
    is_enabled = data.get('is_enabled')
    
    if round_number is None or is_enabled is None:
        return jsonify({'error': 'Round number and enabled status are required'}), 400
    
    if round_number < 1 or round_number > 3:
        return jsonify({'error': 'Invalid round number'}), 400
    
    # Update round access
    round_access = RoundAccess.query.filter_by(round_number=round_number).first()
    if not round_access:
        round_access = RoundAccess(round_number=round_number)
        db.session.add(round_access)
    
    round_access.is_enabled = bool(is_enabled)
    if is_enabled:
        round_access.enabled_at = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        'message': f'Round {round_number} access {"enabled" if is_enabled else "disabled"} successfully',
        'round_number': round_number,
        'is_enabled': round_access.is_enabled,
        'enabled_at': round_access.enabled_at.isoformat() if round_access.enabled_at else None
    })

@app.route('/api/quiz/result', methods=['POST'])
def save_quiz_result():
    data = request.get_json()
    print(f"Received quiz result data: {data}")
    
    # Check if user exists
    user = User.query.get(data['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Check if the round is enabled
    round_number = data.get('round_number')
    if not is_round_enabled(round_number) and not user.is_admin:
        return jsonify({'error': f'Round {round_number} is currently not enabled'}), 403
    
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
        # Get raw score and penalty (if any)
        raw_score = data['score']
        penalty_points = data.get('penalty_points', 0)
        total_score = raw_score - penalty_points
        completion_time = datetime.utcnow()
        
        # Create QuizResult for backward compatibility
        new_result = QuizResult(
            user_id=data['user_id'],
            round_number=data['round_number'],
            language=data.get('language'),  # This can be None for Round 2
            score=total_score,  # Use total score after penalty
            total_questions=data['total_questions'],
            completed_at=completion_time
        )
        
        # Create new UserScore record with detailed scoring
        new_score = UserScore(
            user_id=data['user_id'],
            round_number=data['round_number'],
            raw_score=raw_score,
            penalty_points=penalty_points,
            total_score=total_score,
            completion_time=completion_time
        )
        
        # Add the records to the database
        db.session.add(new_result)
        db.session.add(new_score)
        
        # Update user's total score
        user.total_score += total_score
        
        # Check if user passed the round (30% or more)
        passed_threshold = data['total_questions'] * 0.3  # 30% threshold
        passed = total_score >= passed_threshold
        print(f"User {user.username} scored {total_score}/{data['total_questions']} in Round {data['round_number']} - {'PASSED' if passed else 'FAILED'}")
        
        if passed:
            # Update current round if user passed and it's their current round
            if user.current_round == data['round_number']:
                user.current_round = data['round_number'] + 1
                print(f"User {user.username} unlocked Round {user.current_round}!")
            
            # Handle Round 2 completion timestamp
            if data['round_number'] == 2:
                user.round2_completed_at = completion_time
        
        # Commit changes to the database
        db.session.commit()
        
        # Check if we should update qualification status
        # Get count of submissions for this round
        round_submissions_count = QuizResult.query.filter_by(round_number=data['round_number']).count()
        # Get count of non-admin users
        non_admin_users_count = User.query.filter_by(is_admin=False).count()
        
        # If all or most users have completed this round, update qualifications
        # Using 90% threshold to account for potential dropouts
        if round_submissions_count >= non_admin_users_count * 0.9:
            # For Round 2, update Round 3 qualification
            if data['round_number'] == 2:
                _update_round_qualifications(3)
            # For Round 1, update Round 2 qualification (already handled by default)
            # This could be expanded for future rounds
        
        # Update the user in localStorage
        updated_user = {
            'id': user.id,
            'username': user.username,
            'enrollment_no': user.enrollment_no,
            'is_admin': user.is_admin,
            'current_round': user.current_round,
            'round3_track': user.round3_track,
            'total_score': user.total_score,
            'qualified_for_round3': user.qualified_for_round3,
            'registered_at': user.registered_at.isoformat() if user.registered_at else None
        }
        
        return jsonify({
            'message': 'Quiz result saved successfully',
            'result': {
                'id': new_result.id,
                'user_id': new_result.user_id,
                'round_number': new_result.round_number,
                'language': new_result.language,
                'raw_score': raw_score,
                'penalty_points': penalty_points,
                'total_score': total_score,
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

# Helper function to update qualifications for next round
def _update_round_qualifications(target_round):
    try:
        # Get all scores for the previous round
        previous_round = target_round - 1
        previous_round_scores = UserScore.query.filter_by(round_number=previous_round).all()
        
        # Group scores by user
        user_scores = {}
        for score in previous_round_scores:
            user_scores[score.user_id] = score
            
        qualified_users = []
        
        # Get the corresponding quiz results to check total questions
        for user_id, score in user_scores.items():
            user = User.query.get(user_id)
            if not user or user.is_admin:
                continue
                
            # Get total questions from QuizResult
            result = QuizResult.query.filter_by(user_id=user_id, round_number=previous_round).first()
            if not result:
                continue
                
            # Calculate percentage
            percentage = (score.total_score / result.total_questions) * 100
            
            # Check if user scored above 30%
            if percentage >= 30:
                qualified_users.append({
                    'user_id': user_id,
                    'score': score.total_score,
                    'percentage': percentage,
                    'completion_time': score.completion_time
                })
        
        # Sort by score (descending) and completion time (ascending)
        qualified_users.sort(key=lambda x: (-x['score'], x['completion_time']))
        
        # Add ranking to all users
        for i, user_data in enumerate(qualified_users):
            user_data['rank'] = i + 1
        
        # Take the top 10 participants
        top_participants = qualified_users[:10]
        
        # Update qualification status
        if target_round == 3:
            # For Round 3, update the qualified_for_round3 flag
            for participant in top_participants:
                user = User.query.get(participant['user_id'])
                if user:
                    user.qualified_for_round3 = True
            
            # Reset qualification for users not in the top 10
            for user in User.query.filter_by(is_admin=False).all():
                if not any(p['user_id'] == user.id for p in top_participants):
                    user.qualified_for_round3 = False
        else:
            # For other rounds, handle accordingly (future extension)
            pass
            
        db.session.commit()
        print(f"Updated qualifications for Round {target_round}")
        print(f"Top 10 participants: {[p['user_id'] for p in top_participants]}")
        return True
    except Exception as e:
        db.session.rollback()
        print(f"Error updating qualifications: {str(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return False

# Update round3 submission endpoint to check round access
@app.route('/api/round3/submit-dsa', methods=['POST'])
def submit_dsa_solution():
    data = request.get_json()
    
    try:
        # Extract data from the request
        user_id = data.get('user_id')
        challenge_id = data.get('challenge_id')
        challenge_name = data.get('challenge_name')
        code = data.get('code')
        language = data.get('language', 'unknown')
        auto_submit = data.get('auto_submit', False)
        
        # Check if Round 3 is enabled
        round3_enabled = is_round_enabled(3)
        if not round3_enabled:
            # Check if the user is an admin (they can submit even if round is disabled)
            user = User.query.get(user_id)
            if not user or not user.is_admin:
                return jsonify({
                    'error': 'Round 3 is currently not enabled.',
                    'round_not_enabled': True
                }), 403
        
        # Validate the input data
        if not user_id or not challenge_id or not challenge_name or not code:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Check if this user has already submitted this challenge
        existing_submission = Round3Submission.query.filter_by(
            user_id=user_id,
            challenge_id=challenge_id,
            track_type='dsa'
        ).first()
        
        if existing_submission:
            return jsonify({
                'success': False,
                'message': 'You have already submitted this challenge.'
            }), 400
        
        # Create a new submission record
        submission = Round3Submission(
            user_id=user_id,
            challenge_id=challenge_id,
            track_type='dsa',
            challenge_name=challenge_name,
            code=code,
            language=language,
            submitted_at=datetime.utcnow(),
            scored=False  # Will be marked as scored when an admin reviews it
        )
        
        db.session.add(submission)
        db.session.commit()
        
        # For development/testing purposes only: auto-score if specified
        # In production, submissions should be manually reviewed by admins
        response_data = {
            'success': True,
            'message': 'Your solution has been submitted successfully!'
        }
        
        # Only return minimal information to participants
        # Don't include any score information
        return jsonify(response_data), 201
        
    except Exception as e:
        db.session.rollback()
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error submitting DSA solution: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return jsonify({'error': f'Failed to submit solution: {str(e)}'}), 500

# Update Web submission endpoint to check round access
@app.route('/api/round3/submit-web', methods=['POST'])
def submit_web_solution():
    data = request.get_json()
    
    try:
        # Extract data from the request
        user_id = data.get('user_id')
        challenge_id = data.get('challenge_id')
        challenge_name = data.get('challenge_name')
        html_code = data.get('html_code')
        css_code = data.get('css_code')
        js_code = data.get('js_code')
        is_auto_submission = data.get('is_auto_submission', False)
        
        # Check if Round 3 is enabled
        round3_enabled = is_round_enabled(3)
        if not round3_enabled:
            # Check if the user is an admin (they can submit even if round is disabled)
            user = User.query.get(user_id)
            if not user or not user.is_admin:
                return jsonify({
                    'error': 'Round 3 is currently not enabled.',
                    'round_not_enabled': True
                }), 403
        
        # Validate the input data
        if not user_id or not challenge_id or not challenge_name or not html_code:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Check if this user has already submitted this challenge
        existing_submission = Round3Submission.query.filter_by(
            user_id=user_id,
            challenge_id=challenge_id,
            track_type='web'
        ).first()
        
        if existing_submission:
            return jsonify({
                'success': False,
                'message': 'You have already submitted this challenge.'
            }), 400
        
        # Combine all the code into a single field for storage
        combined_code = f"""
HTML:
{html_code}

CSS:
{css_code}

JavaScript:
{js_code}
"""
        
        # Create a new submission record
        submission = Round3Submission(
            user_id=user_id,
            challenge_id=challenge_id,
            track_type='web',
            challenge_name=challenge_name,
            code=combined_code,
            submitted_at=datetime.utcnow(),
            scored=False  # Will be marked as scored when an admin reviews it
        )
        
        db.session.add(submission)
        db.session.commit()
        
        response_data = {
            'success': True,
            'message': 'Your solution has been submitted successfully!'
        }
        
        # Only return minimal information to participants
        # Don't include any score information
        return jsonify(response_data), 201
        
    except Exception as e:
        db.session.rollback()
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error submitting web solution: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return jsonify({'error': f'Failed to submit solution: {str(e)}'}), 500

@app.route('/api/user/<int:user_id>/results', methods=['GET'])
def get_user_results(user_id):
    # Check if user exists
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get the requesting user from the query parameter
    requesting_user_id = request.args.get('requesting_user_id')
    is_admin = False
    
    if requesting_user_id:
        try:
            requesting_user_id = int(requesting_user_id)
            requesting_user = User.query.get(requesting_user_id)
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
    required_fields = ['question', 'options', 'correctAnswer']
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
        
        # Auto-generate question ID if not provided
        question_id = data.get('id')
        if not question_id:
            question_id = 1
            if questions:
                # Find the max ID and increment by 1
                question_id = max(q.get('id', 0) for q in questions) + 1
        else:
            question_id = int(question_id)
            # Check if question with the same ID already exists
            for q in questions:
                if q['id'] == question_id:
                    return jsonify({'error': f'Question with ID {question_id} already exists'}), 400
        
        # Add the new question to the list
        questions.append({
            'id': question_id,
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
            'question': {
                'id': question_id,
                'question': data['question'],
                'options': data['options'],
                'correctAnswer': data['correctAnswer']
            }
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
    required_fields = ['question', 'questionImage', 'options', 'optionImages', 'correctAnswer', 'language']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Validate language
    if data['language'] not in ['python', 'c']:
        return jsonify({'error': 'Invalid language. Must be "python" or "c"'}), 400
            
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
        # Auto-generate question ID if not provided
        question_id = data.get('id')
        language = data['language']
        
        # Store files directly in the backend directory with language prefix
        file_path = os.path.join(os.path.dirname(__file__), f'round2_{language}_questions.json')
        
        # Check if file exists and read its contents
        questions = []
        if os.path.exists(file_path):
            with open(file_path, 'r') as file:
                questions = json.load(file)
        
        # Auto-generate ID if not provided
        if not question_id:
            question_id = 1
            if questions:
                # Find the max ID and increment by 1
                question_id = max(q.get('id', 0) for q in questions) + 1
        else:
            # Check if question with the same ID already exists
            for q in questions:
                if q['id'] == question_id:
                    return jsonify({'error': f'Question with ID {question_id} already exists'}), 400
        
        # Save question image if provided
        question_image_path = None
        if data['questionImage'] and data['questionImage'].startswith('data:image'):
            # Extract the base64 data
            image_data = data['questionImage'].split(',')[1]
            image_binary = base64.b64decode(image_data)
            
            # Save image to file with question ID and language in filename
            question_image_filename = f"question_{language}_{question_id}.png"
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
                
                # Save image to file with question ID, language and option index in filename
                option_image_filename = f"question_{language}_{question_id}_option_{idx}.png"
                option_image_path = os.path.join(OPTION_IMAGES_FOLDER, option_image_filename)
                
                with open(option_image_path, 'wb') as f:
                    f.write(image_binary)
                
                # Set the relative path for storage in JSON
                option_image_path = f"uploads/option_images/{option_image_filename}"
            
            option_image_paths.append(option_image_path)
        
        # Add the new question to the list
        questions.append({
            'id': question_id,
            'question': data['question'],
            'language': language,
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
                'id': question_id,
                'question': data['question'],
                'language': language,
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
        # Get language parameter (optional)
        language = request.args.get('language')
        
        questions = []
        
        if language and language in ['python', 'c']:
            # If language is specified, only get questions for that language
            file_path = os.path.join(os.path.dirname(__file__), f'round2_{language}_questions.json')
            
            if os.path.exists(file_path):
                with open(file_path, 'r') as file:
                    questions = json.load(file)
        else:
            # If no language specified or invalid language, try to load both languages
            python_path = os.path.join(os.path.dirname(__file__), 'round2_python_questions.json')
            c_path = os.path.join(os.path.dirname(__file__), 'round2_c_questions.json')
            
            # Legacy path for backward compatibility
            legacy_path = os.path.join(os.path.dirname(__file__), 'round2_questions.json')
            
            if os.path.exists(python_path):
                with open(python_path, 'r') as file:
                    questions.extend(json.load(file))
            
            if os.path.exists(c_path):
                with open(c_path, 'r') as file:
                    questions.extend(json.load(file))
                    
            # Check legacy path for backward compatibility
            if os.path.exists(legacy_path):
                with open(legacy_path, 'r') as file:
                    legacy_questions = json.load(file)
                    # Add language field if missing
                    for q in legacy_questions:
                        if 'language' not in q:
                            q['language'] = 'python'  # Default to python for legacy questions
                    questions.extend(legacy_questions)
        
        # Shuffle questions for each participant
        random.shuffle(questions)
        
        return jsonify(questions), 200
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error fetching Round 2 questions: {str(e)}")
        print(f"Traceback: {error_traceback}")
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
            questions = json.load(file)
        
        # Shuffle questions for each participant
        random.shuffle(questions)
        
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
    
    # Get the requesting user from the query parameter
    requesting_user_id = request.args.get('requesting_user_id')
    is_admin = False
    
    if requesting_user_id:
        try:
            requesting_user_id = int(requesting_user_id)
            requesting_user = User.query.get(requesting_user_id)
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
        'registered_at': user.registered_at.isoformat() if user.registered_at else None
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
    user = User.query.get(user_id)
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
    print(f"Attempting to serve file from uploads: folder={folder}, filename={filename}")
    
    # First try the standard uploads directory
    upload_path = os.path.join(UPLOAD_FOLDER, folder)
    full_path = os.path.join(upload_path, filename)
    if os.path.exists(full_path):
        print(f"File found in uploads directory: {full_path}")
        return send_from_directory(upload_path, filename)
    
    print(f"File not found in uploads directory: {full_path}")
    
    # If not found, try the root directory structure as fallback
    app_root = os.path.dirname(__file__)
    if folder.startswith('round2/'):
        # Handle the case where files are in backend/round2 directly
        alt_path = os.path.join(app_root, folder)
        alt_full_path = os.path.join(alt_path, filename)
        if os.path.exists(alt_full_path):
            print(f"File found in alternate path: {alt_full_path}")
            return send_from_directory(alt_path, filename)
        print(f"File not found in alternate path: {alt_full_path}")
    
    # If still not found, return a 404 error
    print(f"File not found in any location: {folder}/{filename}")
    return "File not found", 404

# Add a direct route for round2 files to handle both paths
@app.route('/round2/<path:subfolder>/<path:filename>')
def serve_round2_files(subfolder, filename):
    print(f"Attempting to serve file from round2: subfolder={subfolder}, filename={filename}")
    
    # First check in backend/uploads/round2
    uploads_path = os.path.join(UPLOAD_FOLDER, 'round2', subfolder)
    uploads_full_path = os.path.join(uploads_path, filename)
    if os.path.exists(uploads_full_path):
        print(f"File found in uploads/round2: {uploads_full_path}")
        return send_from_directory(uploads_path, filename)
    
    print(f"File not found in uploads/round2: {uploads_full_path}")
    
    # Then check in backend/round2 directly
    app_root = os.path.dirname(__file__)
    direct_path = os.path.join(app_root, 'round2', subfolder)
    direct_full_path = os.path.join(direct_path, filename)
    if os.path.exists(direct_full_path):
        print(f"File found in direct round2 path: {direct_full_path}")
        return send_from_directory(direct_path, filename)
    
    print(f"File not found in direct round2 path: {direct_full_path}")
    
    # If still not found, return a 404 error
    print(f"File not found in any location: round2/{subfolder}/{filename}")
    return "File not found", 404

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        # Check if the request is from an admin
        requesting_user_id = request.args.get('requesting_user_id')
        is_admin = False
        
        if requesting_user_id:
            try:
                requesting_user_id = int(requesting_user_id)
                requesting_user = User.query.get(requesting_user_id)
                if requesting_user and requesting_user.is_admin:
                    is_admin = True
            except (ValueError, TypeError):
                # Invalid requesting_user_id, treat as non-admin
                pass
        
        # Get all users who are not admins
        users = User.query.filter_by(is_admin=False).all()
        
        # Filter round for the leaderboard (optional parameter)
        round_filter = request.args.get('round')
        if round_filter:
            try:
                round_filter = int(round_filter)
            except (ValueError, TypeError):
                round_filter = None
        
        leaderboard_data = []
        for user in users:
            # Get scores for this user
            query = UserScore.query.filter_by(user_id=user.id)
            
            # Apply round filter if specified
            if round_filter:
                query = query.filter_by(round_number=round_filter)
            elif not is_admin:
                # For non-admins, exclude Round 3 scores
                query = query.filter(UserScore.round_number != 3)
            
            scores = query.all()
            
            # Only include users who have at least one score
            if scores:
                # Calculate total score across all rounds
                total_score = sum(score.total_score for score in scores)
                total_raw_score = sum(score.raw_score for score in scores)
                total_penalty = sum(score.penalty_points for score in scores)
                
                # Calculate total questions (from QuizResult for compatibility)
                results = QuizResult.query.filter_by(user_id=user.id)
                if round_filter:
                    results = results.filter_by(round_number=round_filter)
                elif not is_admin:
                    results = results.filter(QuizResult.round_number != 3)
                
                total_questions = sum(result.total_questions for result in results.all())
                
                # Get the latest completion time (for tie-breaking)
                latest_completion = max(score.completion_time for score in scores)
                
                # Calculate percentage
                percentage = round((total_score / total_questions * 100), 2) if total_questions > 0 else 0
                
                # Build user data for leaderboard
                user_data = {
                    'user_id': user.id,
                    'username': user.username,
                    'enrollment_no': user.enrollment_no,
                    'total_score': total_score,
                    'raw_score': total_raw_score,
                    'penalty_points': total_penalty,
                    'total_questions': total_questions,
                    'percentage': percentage,
                    'current_round': user.current_round,
                    'qualified_for_round3': user.qualified_for_round3,
                    'latest_completion': latest_completion
                }
                
                leaderboard_data.append(user_data)
        
        # Sort by:
        # 1. Total score (descending)
        # 2. Completion time (ascending) - earlier submissions rank higher
        leaderboard_data.sort(key=lambda x: (-x['total_score'], x['latest_completion']))
        
        # Add ranking
        for i, entry in enumerate(leaderboard_data):
            entry['rank'] = i + 1
            # Convert datetime to string for JSON serialization
            entry['latest_completion'] = entry['latest_completion'].isoformat()
        
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
        submission = Round3Submission.query.get(submission_id)
        if not submission:
            return jsonify({'error': 'Submission not found'}), 404
            
        # Update submission score
        submission.score = score
        submission.scored = True
        
        # Find the user
        user = User.query.get(submission.user_id)
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
        user = User.query.get(user_id)
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

@app.route('/api/round3/check-challenge', methods=['GET'])
def check_round3_challenge():
    try:
        user_id = request.args.get('user_id')
        challenge_id = request.args.get('challenge_id')
        track_type = request.args.get('track_type')
        
        # Validate parameters
        if not user_id or not challenge_id or not track_type:
            return jsonify({'error': 'Missing required parameters: user_id, challenge_id, track_type'}), 400
            
        # Convert to integers
        try:
            user_id = int(user_id)
            challenge_id = int(challenge_id)
        except ValueError:
            return jsonify({'error': 'Invalid user_id or challenge_id format'}), 400
            
        # Check if user has already completed this challenge
        submission = Round3Submission.query.filter_by(
            user_id=user_id,
            challenge_id=challenge_id,
            track_type=track_type
        ).first()
        
        # Return result
        return jsonify({
            'challenge_completed': submission is not None,
            'submission_id': submission.id if submission else None,
            'submitted_at': submission.submitted_at.isoformat() if submission else None
        }), 200
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error checking Round 3 challenge completion: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return jsonify({'error': f'Failed to check challenge completion: {str(e)}'}), 500

# Add a new endpoint to delete questions
@app.route('/api/admin/questions/delete', methods=['POST'])
def delete_question():
    data = request.get_json()
    
    # Validate required fields
    if not data or 'round' not in data or 'question_id' not in data:
        return jsonify({'error': 'Missing required fields: round, question_id'}), 400
    
    round_number = data['round']
    question_id = int(data['question_id'])
    language = data.get('language')
    
    try:
        if round_number == 1:
            if not language or language not in ['python', 'c']:
                return jsonify({'error': 'Language is required for Round 1 questions'}), 400
                
            file_path = os.path.join(os.path.dirname(__file__), f'{language}_questions.json')
        elif round_number == 2:
            if not language or language not in ['python', 'c']:
                return jsonify({'error': 'Language is required for Round 2 questions'}), 400
                
            file_path = os.path.join(os.path.dirname(__file__), f'round2_{language}_questions.json')
        elif round_number == 3:
            file_path = os.path.join(os.path.dirname(__file__), 'round3_questions.json')
        else:
            return jsonify({'error': 'Invalid round number'}), 400
        
        # Check if file exists
        if not os.path.exists(file_path):
            return jsonify({'error': f'No questions found for the specified round and language'}), 404
            
        # Read existing questions
        with open(file_path, 'r') as file:
            questions = json.load(file)
        
        # Find the question to delete
        question_to_delete = None
        for i, q in enumerate(questions):
            if q.get('id') == question_id:
                question_to_delete = questions.pop(i)
                break
        
        if not question_to_delete:
            return jsonify({'error': f'Question with ID {question_id} not found'}), 404
        
        # Save the updated questions list
        with open(file_path, 'w') as file:
            json.dump(questions, file, indent=2)
            
        return jsonify({
            'message': f'Question {question_id} deleted successfully',
            'deleted_question': question_to_delete
        }), 200
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error deleting question: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return jsonify({'error': f'Failed to delete question: {str(e)}'}), 500

# Add a new endpoint to create a participant
@app.route('/api/admin/participants/create', methods=['POST'])
def create_participant():
    data = request.get_json()
    
    # Validate request is from an admin
    admin_id = data.get('admin_id')
    if not admin_id:
        return jsonify({'error': 'Admin ID is required'}), 400
    
    admin = User.query.get(admin_id)
    if not admin or not admin.is_admin:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    # Validate required fields
    required_fields = ['enrollment_no', 'username', 'password']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    enrollment_no = data.get('enrollment_no')
    username = data.get('username')
    password = data.get('password')
    
    # Check if enrollment number already exists
    existing_user = User.query.filter_by(enrollment_no=enrollment_no).first()
    if existing_user:
        return jsonify({'error': f'User with enrollment number {enrollment_no} already exists'}), 400
    
    # Check if username already exists
    existing_username = User.query.filter_by(username=username).first()
    if existing_username:
        return jsonify({'error': f'Username {username} is already taken'}), 400
    
    try:
        # Create new participant user
        hashed_password = generate_password_hash(password)
        new_user = User(
            enrollment_no=enrollment_no,
            username=username,
            password=hashed_password,
            is_admin=False,
            current_round=1,
            total_score=0,
            qualified_for_round3=False
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Participant {username} created successfully',
            'user': {
                'id': new_user.id,
                'enrollment_no': new_user.enrollment_no,
                'username': new_user.username,
                'is_admin': new_user.is_admin,
                'current_round': new_user.current_round
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error creating participant: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return jsonify({'error': f'Failed to create participant: {str(e)}'}), 500


@app.route('/api/quiz/round2', methods=['GET'])
def get_round2_quiz_questions():
    try:
        # Get language parameter from query string
        language = request.args.get('language')
        if not language or language not in ['python', 'c']:
            return jsonify({'error': 'Invalid or missing language parameter. Must be "python" or "c"'}), 400
        
        # Load questions for the specified language
        file_path = os.path.join(os.path.dirname(__file__), f'round2_{language}_questions.json')
        
        if not os.path.exists(file_path):
            return jsonify({'error': f'No questions found for {language}'}), 404
        
        with open(file_path, 'r') as file:
            questions = json.load(file)
        
        # Process image paths to ensure they're correct
        for question in questions:
            # Handle question image path
            if 'questionImage' in question and question['questionImage']:
                # Make sure the path is correct
                if question['questionImage'].startswith('round2/'):
                    # This is the original format, keep it as is
                    pass
                elif not question['questionImage'].startswith(('http', '/')):
                    # This is a relative path, ensure it points to correct location
                    question['questionImage'] = f"round2/{language}/{question['questionImage']}"
            
            # Handle option image paths
            if 'optionImages' in question and question['optionImages']:
                for i, img_path in enumerate(question['optionImages']):
                    if img_path:
                        if img_path.startswith('round2/'):
                            # This is the original format, keep it as is
                            pass
                        elif not img_path.startswith(('http', '/')):
                            # This is a relative path, ensure it points to correct location
                            question['optionImages'][i] = f"round2/{language}/{img_path}"
        
        # Limit to 20 questions for performance and fairness
        if len(questions) > 20:
            # Shuffle questions and take first 20
            random.shuffle(questions)
            questions = questions[:20]
        else:
            # Shuffle questions
            random.shuffle(questions)
        
        return jsonify(questions), 200
        
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print(f"Error fetching Round 2 quiz questions: {str(e)}")
        print(f"Traceback: {error_traceback}")
        return jsonify({'error': f'Failed to fetch Round 2 quiz questions: {str(e)}'}), 500

@app.route('/api/admin/all-data', methods=['GET'])
def get_all_data():
    # Check if user is admin (implement your actual auth check)
    # if not current_user.is_admin:
    #    return jsonify({'error': 'Unauthorized access'}), 403
    
    try:
        # Get all users
        users = User.query.all()
        
        # Get all quiz results
        quiz_results = QuizResult.query.all()
        
        # Get all round 3 submissions
        round3_submissions = Round3Submission.query.all()
        
        # Get round access settings
        round_access = RoundAccess.query.all()
        
        # Get user scores
        user_scores = UserScore.query.all()
        
        # Format the data
        data = {
            'users': [
                {
                    'id': user.id,
                    'enrollment_no': user.enrollment_no,
                    'username': user.username,
                    'is_admin': user.is_admin,
                    'current_round': user.current_round,
                    'round3_track': user.round3_track,
                    'registered_at': user.registered_at.isoformat() if user.registered_at else None,
                    'total_score': user.total_score,
                    'round2_completed_at': user.round2_completed_at.isoformat() if user.round2_completed_at else None,
                    'qualified_for_round3': user.qualified_for_round3
                } for user in users
            ],
            'quiz_results': [
                {
                    'id': result.id,
                    'user_id': result.user_id,
                    'round_number': result.round_number,
                    'language': result.language,
                    'score': result.score,
                    'total_questions': result.total_questions,
                    'completed_at': result.completed_at.isoformat() if result.completed_at else None
                } for result in quiz_results
            ],
            'round3_submissions': [
                {
                    'id': submission.id,
                    'user_id': submission.user_id,
                    'challenge_id': submission.challenge_id,
                    'track_type': submission.track_type,
                    'challenge_name': submission.challenge_name,
                    'code': submission.code,
                    'language': submission.language,
                    'submitted_at': submission.submitted_at.isoformat() if submission.submitted_at else None,
                    'scored': submission.scored,
                    'score': submission.score
                } for submission in round3_submissions
            ],
            'round_access': [
                {
                    'id': access.id,
                    'round_number': access.round_number,
                    'is_enabled': access.is_enabled,
                    'enabled_at': access.enabled_at.isoformat() if access.enabled_at else None
                } for access in round_access
            ],
            'user_scores': [
                {
                    'id': score.id,
                    'user_id': score.user_id,
                    'round_number': score.round_number,
                    'raw_score': score.raw_score,
                    'penalty_points': score.penalty_points,
                    'total_score': score.total_score,
                    'completion_time': score.completion_time.isoformat() if score.completion_time else None
                } for score in user_scores
            ]
        }
        
        return jsonify(data), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')