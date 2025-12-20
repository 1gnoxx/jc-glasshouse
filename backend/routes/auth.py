from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from models import db, User

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user (Abbas or Irfan)"""
    data = request.get_json()
    if not data.get('username') or not data.get('password'):
        return jsonify({"msg": "Missing username or password"}), 400
    if User.query.filter_by(username=data['username']).first():
        return jsonify({"msg": "Username already exists"}), 400
    
    # Create user with full_name and financial access control
    full_name = data.get('full_name', data['username'].capitalize())
    can_view_financials = data.get('can_view_financials', False)
    
    new_user = User(
        username=data['username'],
        full_name=full_name,
        can_view_financials=can_view_financials
    )
    new_user.set_password(data['password'])
    db.session.add(new_user)
    db.session.commit()
    return jsonify({"msg": "User created successfully"}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login and get JWT token"""
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()

    if user and user.check_password(data.get('password')):
        # Include financial access in token claims
        additional_claims = {
            "can_view_financials": user.can_view_financials,
            "full_name": user.full_name
        }
        access_token = create_access_token(identity=user.username, additional_claims=additional_claims)
        return jsonify(
            access_token=access_token,
            user={
                "username": user.username,
                "full_name": user.full_name,
                "can_view_financials": user.can_view_financials
            }
        )

    return jsonify({"msg": "Bad username or password"}), 401
