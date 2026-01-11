"""
Expenses API routes for tracking business costs
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func, extract
from datetime import datetime, date
from models import db, Expense
from routes.utils import get_current_user

expenses_bp = Blueprint('expenses_bp', __name__)

@expenses_bp.route('', methods=['POST'])
@jwt_required()
def create_expense():
    """Create a new expense record"""
    data = request.get_json()
    user = get_current_user()
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    # Validate
    if not data.get('date') or not data.get('category') or not data.get('amount'):
        return jsonify({"msg": "Date, category, and amount are required"}), 400
    
    try:
        expense_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"msg": "Invalid date format. Use YYYY-MM-DD"}), 400
    
    expense = Expense(
        date=expense_date,
        category=data['category'],
        amount=float(data['amount']),
        description=data.get('description'),
        created_by_user_id=user.id
    )
    
    db.session.add(expense)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'msg': 'Expense created successfully',
        'data': {
            'id': expense.id,
            'date': expense.date.isoformat(),
            'category': expense.category,
            'amount': expense.amount,
            'description': expense.description
        }
    }), 201

@expenses_bp.route('', methods=['GET'])
@jwt_required()
def get_expenses():
    """Get expenses with optional filters"""
    month = request.args.get('month')  # Format: YYYY-MM
    category = request.args.get('category')
    
    query = Expense.query
    
    if month:
        try:
            year, month_num = map(int, month.split('-'))
            if month_num == 0:
                # Full year filter (month=00 means all months)
                query = query.filter(extract('year', Expense.date) == year)
            else:
                query = query.filter(
                    extract('year', Expense.date) == year,
                    extract('month', Expense.date) == month_num
                )
        except ValueError:
            return jsonify({"msg": "Invalid month format. Use YYYY-MM"}), 400
    
    if category:
        query = query.filter(Expense.category == category)
    
    expenses = query.order_by(Expense.date.desc()).all()
    
    return jsonify({
        'success': True,
        'data': [{
            'id': e.id,
            'date': e.date.isoformat(),
            'category': e.category,
            'amount': e.amount,
            'description': e.description,
            'created_by': e.created_by.full_name if e.created_by else 'Unknown'
        } for e in expenses]
    })

@expenses_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_expenses_summary():
    """Get monthly summary of expenses by category"""
    month = request.args.get('month', datetime.now().strftime('%Y-%m'))
    
    try:
        year, month_num = map(int, month.split('-'))
    except ValueError:
        return jsonify({"msg": "Invalid month format. Use YYYY-MM"}), 400
    
    # Get expenses grouped by category
    query = db.session.query(
        Expense.category,
        func.sum(Expense.amount).label('total')
    ).filter(extract('year', Expense.date) == year)
    
    if month_num != 0:
        # Filter by specific month (0 means full year)
        query = query.filter(extract('month', Expense.date) == month_num)
    
    category_totals = query.group_by(Expense.category).all()
    
    total = sum(ct.total for ct in category_totals)
    
    return jsonify({
        'success': True,
        'data': {
            'month': month,
            'categories': {ct.category: float(ct.total) for ct in category_totals},
            'total': float(total)
        }
    })

@expenses_bp.route('/<int:expense_id>', methods=['PUT'])
@jwt_required()
def update_expense(expense_id):
    """Update an expense"""
    expense = Expense.query.get_or_404(expense_id)
    data = request.get_json()
    
    if 'date' in data:
        try:
            expense.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"msg": "Invalid date format"}), 400
    
    if 'category' in data:
        expense.category = data['category']
    if 'amount' in data:
        expense.amount = float(data['amount'])
    if 'description' in data:
        expense.description = data['description']
    
    db.session.commit()
    
    return jsonify({'success': True, 'msg': 'Expense updated successfully'})

@expenses_bp.route('/<int:expense_id>', methods=['DELETE'])
@jwt_required()
def delete_expense(expense_id):
    """Delete an expense"""
    expense = Expense.query.get_or_404(expense_id)
    
    db.session.delete(expense)
    db.session.commit()
    
    return jsonify({'success': True, 'msg': 'Expense deleted successfully'})
