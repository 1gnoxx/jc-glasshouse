from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from models import User

def require_financial_access(fn):
    """Decorator to check if user has financial access (Abbas only)"""
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        can_view_financials = claims.get('can_view_financials', False)
        if not can_view_financials:
            return jsonify({"msg": "Financial data access denied"}), 403
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper

def get_current_user():
    """Get the current logged-in user from JWT"""
    username = get_jwt_identity()
    return User.query.filter_by(username=username).first()
