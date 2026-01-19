"""
Stock Intake API routes for tracking incoming stock purchases
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from sqlalchemy.orm import joinedload
from datetime import datetime, date
from models import db, StockIntake, StockIntakeItem, Product, User, Expense, Warehouse, ProductStock
from routes.utils import get_current_user

stock_intake_bp = Blueprint('stock_intake_bp', __name__)

def get_or_create_product_stock(product_id, warehouse_id):
    """Get or create ProductStock record for a product at a warehouse"""
    stock = ProductStock.query.filter_by(
        product_id=product_id,
        warehouse_id=warehouse_id
    ).first()
    
    if not stock:
        stock = ProductStock(
            product_id=product_id,
            warehouse_id=warehouse_id,
            quantity=0
        )
        db.session.add(stock)
        db.session.flush()
    
    return stock

@stock_intake_bp.route('', methods=['POST'])
@jwt_required()
def create_stock_intake():
    """
    Create a new stock intake record and update inventory quantities
    """
    data = request.get_json()
    user = get_current_user()
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    # Validate required fields
    if not data.get('supplier_name'):
        return jsonify({"msg": "Supplier name is required"}), 400
    if not data.get('items') or not isinstance(data['items'], list) or len(data['items']) == 0:
        return jsonify({"msg": "At least one item is required"}), 400
    
    # Parse date
    intake_date_str = data.get('intake_date')
    if intake_date_str:
        try:
            intake_date = datetime.strptime(intake_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"msg": "Invalid date format. Use YYYY-MM-DD"}), 400
    else:
        intake_date = date.today()
    
    # Get warehouse (default to BhaiJaan if not specified)
    warehouse_id = data.get('warehouse_id')
    if warehouse_id:
        warehouse = Warehouse.query.get(warehouse_id)
        if not warehouse:
            return jsonify({"msg": "Invalid warehouse"}), 400
    else:
        # Use default intake warehouse (BhaiJaan)
        warehouse = Warehouse.query.filter_by(is_default_intake=True).first()
        if not warehouse:
            # Fallback to first warehouse
            warehouse = Warehouse.query.first()
        if warehouse:
            warehouse_id = warehouse.id
    
    # Validate products
    product_ids = [item.get('product_id') for item in data['items']]
    products = Product.query.filter(Product.id.in_(product_ids)).all()
    product_map = {p.id: p for p in products}
    
    for item in data['items']:
        product_id = item.get('product_id')
        quantity = item.get('quantity')
        # Purchase price is now optional
        purchase_price = item.get('purchase_price_per_unit')
        
        if not product_id or not quantity:
            return jsonify({"msg": "Each item must have product_id and quantity"}), 400
        
        product = product_map.get(product_id)
        if not product:
            return jsonify({"msg": f"Product ID {product_id} not found"}), 404
        
        if not isinstance(quantity, int) or quantity < 1:
            return jsonify({"msg": f"Invalid quantity {quantity} for {product.name}"}), 400
        
        # Validate purchase price if provided
        if purchase_price is not None and (not isinstance(purchase_price, (int, float)) or purchase_price < 0):
            return jsonify({"msg": f"Invalid purchase price for {product.name}"}), 400
    
    # Create stock intake record
    stock_intake = StockIntake(
        intake_date=intake_date,
        supplier_name=data['supplier_name'],
        notes=data.get('notes'),
        warehouse_id=warehouse_id,
        created_by_user_id=user.id
    )
    
    db.session.add(stock_intake)
    db.session.flush()  # Get stock_intake ID
    
    # Add intake items and update stock quantities
    for item in data['items']:
        product = product_map[item['product_id']]
        quantity = item['quantity']
        purchase_price = item.get('purchase_price_per_unit')
        
        intake_item = StockIntakeItem(
            stock_intake_id=stock_intake.id,
            product_id=product.id,
            quantity=quantity,
            purchase_price_per_unit=purchase_price  # Can be None
        )
        db.session.add(intake_item)
        
        # Update product total stock quantity
        product.stock_quantity += quantity
        
        # Update per-warehouse stock (if warehouse specified)
        if warehouse_id:
            product_stock = get_or_create_product_stock(product.id, warehouse_id)
            product_stock.quantity += quantity
        
        # Optionally update purchase price if provided
        if purchase_price is not None and data.get('update_purchase_price', False):
            product.purchase_price = purchase_price
    
    # Auto-calculate and set status
    old_status = None  # No previous status for new intake
    stock_intake.status = stock_intake.calculate_status()
    new_status = stock_intake.status
    
    db.session.commit()
    
    # Auto-create expense if completed
    if new_status == 'completed':
        expense = Expense(
            date=stock_intake.intake_date,
            category='stock_purchase',
            amount=stock_intake.total_cost,
            description=f"Stock purchase from {stock_intake.supplier_name}",
            stock_intake_id=stock_intake.id,
            created_by_user_id=user.id
        )
        db.session.add(expense)
        db.session.commit()
    
    return jsonify({
        'success': True,
        'msg': 'Stock intake recorded successfully',
        'data': {
            'id': stock_intake.id,
            'intake_date': stock_intake.intake_date.isoformat(),
            'supplier_name': stock_intake.supplier_name,
            'status': stock_intake.status,
            'total_items': stock_intake.total_items_count,
            'total_quantity': stock_intake.total_quantity
        }
    }), 201

@stock_intake_bp.route('', methods=['GET'])
@jwt_required()
def get_stock_intakes():
    """
    Get all stock intake records
    Query params:
    - supplier: filter by supplier name
    - start_date, end_date: filter by date range (YYYY-MM-DD)
    - status: filter by status (pending/completed)
    """
    query = StockIntake.query.options(
        joinedload(StockIntake.created_by),
        joinedload(StockIntake.items)
    )
    
    # Filter by supplier
    supplier = request.args.get('supplier')
    if supplier:
        query = query.filter(StockIntake.supplier_name.ilike(f'%{supplier}%'))
    
    # Filter by status
    status = request.args.get('status')
    if status:
        query = query.filter(StockIntake.status == status)
    
    # Filter by date range
    start_date = request.args.get('start_date')
    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(StockIntake.intake_date >= start)
        except ValueError:
            return jsonify({"msg": "Invalid start_date format. Use YYYY-MM-DD"}), 400
    
    end_date = request.args.get('end_date')
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(StockIntake.intake_date <= end)
        except ValueError:
            return jsonify({"msg": "Invalid end_date format. Use YYYY-MM-DD"}), 400
    
    # Order by most recent first
    intakes = query.order_by(StockIntake.intake_date.desc()).all()
    
    results = []
    for intake in intakes:
        results.append({
            'id': intake.id,
            'intake_date': intake.intake_date.isoformat(),
            'supplier_name': intake.supplier_name,
            'notes': intake.notes,
            'status': intake.status,
            'total_items': intake.total_items_count,
            'total_quantity': intake.total_quantity,
            'total_cost': intake.total_cost,
            'created_by': intake.created_by.full_name if intake.created_by else 'Unknown',
            'created_at': intake.created_at.isoformat() if intake.created_at else None
        })
    
    return jsonify({
        'success': True,
        'data': results,
        'count': len(results)
    })

@stock_intake_bp.route('/<int:intake_id>', methods=['GET'])
@jwt_required()
def get_stock_intake_detail(intake_id):
    """Get detailed information about a specific stock intake"""
    intake = StockIntake.query.options(
        joinedload(StockIntake.created_by),
        joinedload(StockIntake.items).joinedload(StockIntakeItem.product)
    ).get_or_404(intake_id)
    
    return jsonify({
        'success': True,
        'data': {
            'id': intake.id,
            'intake_date': intake.intake_date.isoformat(),
            'supplier_name': intake.supplier_name,
            'notes': intake.notes,
            'status': intake.status,
            'created_by': intake.created_by.full_name if intake.created_by else 'Unknown',
            'created_at': intake.created_at.isoformat() if intake.created_at else None,
            'items': [
                {
                    'id': item.id,
                    'product_id': item.product_id,
                    'product_name': item.product.name if item.product else 'N/A',
                    'product_code': item.product.product_code if item.product else 'N/A',
                    'quantity': item.quantity,
                    'purchase_price_per_unit': item.purchase_price_per_unit,
                    'total_cost': item.total_cost
                } for item in intake.items
            ],
            'total_items': intake.total_items_count,
            'total_quantity': intake.total_quantity,
            'total_cost': intake.total_cost
        }
    })

@stock_intake_bp.route('/<int:intake_id>', methods=['PUT'])
@jwt_required()
def update_stock_intake(intake_id):
    """
    Update a stock intake - supports comprehensive editing:
    - Add new items
    - Update quantities and prices of existing items
    - Delete items
    Can only update pending intakes
    """
    intake = StockIntake.query.get_or_404(intake_id)
    
    data = request.get_json()
    
    # Update basic fields if provided
    if 'supplier_name' in data:
        intake.supplier_name = data['supplier_name']
    if 'notes' in data:
        intake.notes = data['notes']
    if 'intake_date' in data:
        try:
            intake.intake_date = datetime.strptime(data['intake_date'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"msg": "Invalid date format. Use YYYY-MM-DD"}), 400
    
    # Handle item deletions first
    deleted_item_ids = data.get('deleted_item_ids', [])
    if deleted_item_ids:
        for item_id in deleted_item_ids:
            item = StockIntakeItem.query.filter_by(
                id=item_id,
                stock_intake_id=intake.id
            ).first()
            
            if item:
                # Reverse the stock addition
                product = Product.query.get(item.product_id)
                if product:
                    product.stock_quantity -= item.quantity
                
                db.session.delete(item)
    
    # Update existing items (quantities and prices)
    if 'items' in data and isinstance(data['items'], list):
        for item_data in data['items']:
            item_id = item_data.get('id')
            
            if item_id:
                item = StockIntakeItem.query.filter_by(
                    id=item_id,
                    stock_intake_id=intake.id
                ).first()
                
                if item:
                    # Update quantity if provided
                    if 'quantity' in item_data:
                        new_quantity = int(item_data['quantity'])
                        if new_quantity < 1:
                            return jsonify({"msg": f"Quantity must be at least 1"}), 400
                        
                        # Adjust stock based on quantity change
                        quantity_diff = new_quantity - item.quantity
                        if quantity_diff != 0:
                            product = Product.query.get(item.product_id)
                            if product:
                                product.stock_quantity += quantity_diff
                        
                        item.quantity = new_quantity
                    
                    # Update price if provided
                    if 'purchase_price_per_unit' in item_data:
                        purchase_price = item_data.get('purchase_price_per_unit')
                        item.purchase_price_per_unit = float(purchase_price) if purchase_price is not None else None
                        
                        # Optionally update product's default purchase price
                        if purchase_price is not None and data.get('update_purchase_price', False):
                            product = Product.query.get(item.product_id)
                            if product:
                                product.purchase_price = float(purchase_price)
    
    # Add new items
    new_items = data.get('new_items', [])
    if new_items:
        for new_item_data in new_items:
            product_id = new_item_data.get('product_id')
            quantity = new_item_data.get('quantity')
            purchase_price = new_item_data.get('purchase_price_per_unit')
            
            if not product_id or not quantity:
                return jsonify({"msg": "Each new item must have product_id and quantity"}), 400
            
            # Validate product exists
            product = Product.query.get(product_id)
            if not product:
                return jsonify({"msg": f"Product ID {product_id} not found"}), 404
            
            if not isinstance(quantity, int) or quantity < 1:
                return jsonify({"msg": f"Invalid quantity {quantity}"}), 400
            
            # Create new intake item
            new_item = StockIntakeItem(
                stock_intake_id=intake.id,
                product_id=product_id,
                quantity=quantity,
                purchase_price_per_unit=float(purchase_price) if purchase_price is not None else None
            )
            db.session.add(new_item)
            
            # Update product stock quantity
            product.stock_quantity += quantity
    
    # Validate that at least one item remains
    db.session.flush()  # Flush to get updated items list
    if len(intake.items) == 0:
        db.session.rollback()
        return jsonify({"msg": "Stock intake must have at least one item"}), 400
    
    # Recalculate status after all updates
    old_status = intake.status
    intake.status = intake.calculate_status()
    new_status = intake.status
    
    # When transitioning from pending to completed, update product purchase prices
    if old_status == 'pending' and new_status == 'completed':
        for item in intake.items:
            product = Product.query.get(item.product_id)
            if product and item.purchase_price_per_unit is not None:
                # Update product's purchase price with the latest intake item price
                product.purchase_price = item.purchase_price_per_unit
    
    db.session.commit()
    
    # Manage expense based on status changes
    if new_status == 'completed':
        # Check if expense already exists for this intake
        existing_expense = Expense.query.filter_by(stock_intake_id=intake.id).first()
        
        if existing_expense:
            # Update existing expense
            existing_expense.date = intake.intake_date
            existing_expense.amount = intake.total_cost
            existing_expense.description = f"Stock purchase from {intake.supplier_name}"
        else:
            # Create new expense (intake just became completed)
            username = get_jwt_identity()
            user = User.query.filter_by(username=username).first()
            expense = Expense(
                date=intake.intake_date,
                category='stock_purchase',
                amount=intake.total_cost,
                description=f"Stock purchase from {intake.supplier_name}",
                stock_intake_id=intake.id,
                created_by_user_id=user.id
            )
            db.session.add(expense)
    elif old_status == 'completed' and new_status == 'pending':
        # Intake went from completed to pending - delete expense
        existing_expense = Expense.query.filter_by(stock_intake_id=intake.id).first()
        if existing_expense:
            db.session.delete(existing_expense)
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'msg': 'Stock intake updated successfully',
        'data': {
            'id': intake.id,
            'status': intake.status,
            'total_cost': intake.total_cost,
            'total_items': intake.total_items_count,
            'total_quantity': intake.total_quantity
        }
    })

@stock_intake_bp.route('/<int:intake_id>', methods=['DELETE'])
@jwt_required()
def delete_stock_intake(intake_id):
    """
    Delete a stock intake record
    - Reverses stock quantity changes (subtracts quantities from products)
    - Deletes associated expense if exists
    - Removes the stock intake and all its items
    """
    intake = StockIntake.query.get_or_404(intake_id)
    
    # Reverse stock quantities for each item
    for item in intake.items:
        product = Product.query.get(item.product_id)
        if product:
            product.stock_quantity -= item.quantity
            # Prevent negative stock (shouldn't happen but safety check)
            if product.stock_quantity < 0:
                product.stock_quantity = 0
    
    # Delete associated expense if exists
    existing_expense = Expense.query.filter_by(stock_intake_id=intake.id).first()
    if existing_expense:
        db.session.delete(existing_expense)
    
    # Delete the stock intake (cascade will delete items)
    db.session.delete(intake)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'msg': 'Stock intake deleted successfully'
    })
