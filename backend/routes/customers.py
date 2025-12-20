from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import db, Customer

customers_bp = Blueprint('customers_bp', __name__)

@customers_bp.route('', methods=['GET'])
@jwt_required()
def get_customers():
    """Get all customers, optionally filtered by name/phone"""
    search = request.args.get('search', '').lower()
    
    query = Customer.query
    if search:
        query = query.filter(
            (Customer.name.ilike(f'%{search}%')) |
            (Customer.phone.ilike(f'%{search}%')) |
            (Customer.company.ilike(f'%{search}%'))
        )
    
    customers = query.order_by(Customer.name).all()
    
    return jsonify({
        'success': True,
        'data': [{
            'id': c.id,
            'name': c.name,
            'phone': c.phone,
            'company': c.company,
            'city': c.city,
            'address': c.address,
            'created_at': c.created_at.isoformat() if c.created_at else None
        } for c in customers]
    })

@customers_bp.route('', methods=['POST'])
@jwt_required()
def create_customer():
    """Create a new customer"""
    data = request.get_json()
    
    if not data.get('name'):
        return jsonify({'msg': 'Customer name is required'}), 400
        
    new_customer = Customer(
        name=data['name'],
        phone=data.get('phone'),
        company=data.get('company'),
        city=data.get('city'),
        address=data.get('address')
    )
    
    try:
        db.session.add(new_customer)
        db.session.commit()
        return jsonify({
            'success': True,
            'msg': 'Customer created successfully',
            'data': {
                'id': new_customer.id,
                'name': new_customer.name,
                'phone': new_customer.phone,
                'company': new_customer.company,
                'city': new_customer.city,
                'address': new_customer.address
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': str(e)}), 500

@customers_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_customer(id):
    """Update an existing customer"""
    customer = Customer.query.get_or_404(id)
    data = request.get_json()
    
    if 'name' in data:
        customer.name = data['name']
    if 'phone' in data:
        customer.phone = data['phone']
    if 'company' in data:
        customer.company = data['company']
    if 'city' in data:
        customer.city = data['city']
    if 'address' in data:
        customer.address = data['address']
        
    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'msg': 'Customer updated successfully',
            'data': {
                'id': customer.id,
                'name': customer.name,
                'phone': customer.phone,
                'company': customer.company,
                'city': customer.city,
                'address': customer.address
            }
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': str(e)}), 500

@customers_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_customer(id):
    """Delete a customer"""
    customer = Customer.query.get_or_404(id)
    
    # Check if customer has sales
    if customer.sales:
        return jsonify({'msg': 'Cannot delete customer with existing sales history'}), 400
        
    try:
        db.session.delete(customer)
        db.session.commit()
        return jsonify({'success': True, 'msg': 'Customer deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': str(e)}), 500
