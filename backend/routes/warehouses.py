"""
Warehouse and Stock Transfer API routes for multi-location inventory management
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy.orm import joinedload
from sqlalchemy import func
from datetime import datetime
from models import db, Warehouse, ProductStock, StockTransfer, Product, User
from routes.utils import get_current_user

warehouses_bp = Blueprint('warehouses_bp', __name__)

# ============== WAREHOUSE ENDPOINTS ==============

@warehouses_bp.route('', methods=['GET'])
@jwt_required()
def get_warehouses():
    """Get all warehouses"""
    warehouses = Warehouse.query.filter_by(is_active=True).order_by(Warehouse.name).all()
    
    return jsonify({
        'success': True,
        'data': [{
            'id': w.id,
            'code': w.code,
            'name': w.name,
            'description': w.description,
            'is_default_intake': w.is_default_intake,
            'is_shipping_location': w.is_shipping_location
        } for w in warehouses]
    })

@warehouses_bp.route('/<int:warehouse_id>/stock', methods=['GET'])
@jwt_required()
def get_warehouse_stock(warehouse_id):
    """Get all products with stock at a specific warehouse"""
    warehouse = Warehouse.query.get_or_404(warehouse_id)
    
    # Get all product stocks for this warehouse
    stocks = ProductStock.query.filter_by(warehouse_id=warehouse_id).options(
        joinedload(ProductStock.product)
    ).all()
    
    return jsonify({
        'success': True,
        'data': {
            'warehouse': {
                'id': warehouse.id,
                'code': warehouse.code,
                'name': warehouse.name
            },
            'products': [{
                'id': s.product.id,
                'product_code': s.product.product_code,
                'name': s.product.name,
                'quantity': s.quantity,
                'total_stock': s.product.stock_quantity
            } for s in stocks if s.quantity > 0]
        }
    })

# ============== STOCK TRANSFER ENDPOINTS ==============

@warehouses_bp.route('/transfers', methods=['POST'])
@jwt_required()
def create_transfer():
    """
    Create a stock transfer between warehouses
    """
    data = request.get_json()
    user = get_current_user()
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    # Validate required fields
    required_fields = ['product_id', 'from_warehouse_id', 'to_warehouse_id', 'quantity']
    for field in required_fields:
        if not data.get(field):
            return jsonify({"msg": f"Missing required field: {field}"}), 400
    
    product_id = data['product_id']
    from_warehouse_id = data['from_warehouse_id']
    to_warehouse_id = data['to_warehouse_id']
    quantity = int(data['quantity'])
    
    # Validate quantity
    if quantity < 1:
        return jsonify({"msg": "Quantity must be at least 1"}), 400
    
    # Can't transfer to same warehouse
    if from_warehouse_id == to_warehouse_id:
        return jsonify({"msg": "Cannot transfer to the same warehouse"}), 400
    
    # Validate product exists
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"msg": "Product not found"}), 404
    
    # Validate warehouses exist
    from_warehouse = Warehouse.query.get(from_warehouse_id)
    to_warehouse = Warehouse.query.get(to_warehouse_id)
    if not from_warehouse or not to_warehouse:
        return jsonify({"msg": "Invalid warehouse"}), 404
    
    # Check source warehouse has enough stock
    from_stock = ProductStock.query.filter_by(
        product_id=product_id,
        warehouse_id=from_warehouse_id
    ).first()
    
    if not from_stock or from_stock.quantity < quantity:
        available = from_stock.quantity if from_stock else 0
        return jsonify({
            "msg": f"Insufficient stock at {from_warehouse.name}. Available: {available}"
        }), 400
    
    # Perform the transfer
    # 1. Reduce from source warehouse
    from_stock.quantity -= quantity
    
    # 2. Increase at destination warehouse (create record if doesn't exist)
    to_stock = ProductStock.query.filter_by(
        product_id=product_id,
        warehouse_id=to_warehouse_id
    ).first()
    
    if to_stock:
        to_stock.quantity += quantity
    else:
        to_stock = ProductStock(
            product_id=product_id,
            warehouse_id=to_warehouse_id,
            quantity=quantity
        )
        db.session.add(to_stock)
    
    # 3. Create transfer record
    transfer = StockTransfer(
        product_id=product_id,
        from_warehouse_id=from_warehouse_id,
        to_warehouse_id=to_warehouse_id,
        quantity=quantity,
        notes=data.get('notes'),
        created_by_user_id=user.id
    )
    db.session.add(transfer)
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'msg': f'Transferred {quantity}x {product.name} from {from_warehouse.name} to {to_warehouse.name}',
        'data': {
            'id': transfer.id,
            'product_name': product.name,
            'from_warehouse': from_warehouse.name,
            'to_warehouse': to_warehouse.name,
            'quantity': quantity,
            'from_stock_remaining': from_stock.quantity,
            'to_stock_new': to_stock.quantity
        }
    }), 201

@warehouses_bp.route('/transfers', methods=['GET'])
@jwt_required()
def get_transfers():
    """
    Get stock transfer history
    Query params:
    - product_id: filter by product
    - from_warehouse_id, to_warehouse_id: filter by warehouse
    - start_date, end_date: filter by date range (YYYY-MM-DD)
    """
    query = StockTransfer.query.options(
        joinedload(StockTransfer.product),
        joinedload(StockTransfer.from_warehouse),
        joinedload(StockTransfer.to_warehouse),
        joinedload(StockTransfer.created_by)
    )
    
    # Filters
    if request.args.get('product_id'):
        query = query.filter(StockTransfer.product_id == int(request.args['product_id']))
    
    if request.args.get('from_warehouse_id'):
        query = query.filter(StockTransfer.from_warehouse_id == int(request.args['from_warehouse_id']))
    
    if request.args.get('to_warehouse_id'):
        query = query.filter(StockTransfer.to_warehouse_id == int(request.args['to_warehouse_id']))
    
    if request.args.get('start_date'):
        try:
            start = datetime.strptime(request.args['start_date'], '%Y-%m-%d')
            query = query.filter(StockTransfer.transfer_date >= start)
        except ValueError:
            return jsonify({"msg": "Invalid start_date format. Use YYYY-MM-DD"}), 400
    
    if request.args.get('end_date'):
        try:
            end = datetime.strptime(request.args['end_date'], '%Y-%m-%d')
            query = query.filter(StockTransfer.transfer_date <= end)
        except ValueError:
            return jsonify({"msg": "Invalid end_date format. Use YYYY-MM-DD"}), 400
    
    transfers = query.order_by(StockTransfer.transfer_date.desc()).all()
    
    return jsonify({
        'success': True,
        'data': [{
            'id': t.id,
            'product_id': t.product_id,
            'product_name': t.product.name if t.product else 'N/A',
            'product_code': t.product.product_code if t.product else 'N/A',
            'from_warehouse': {
                'id': t.from_warehouse.id,
                'name': t.from_warehouse.name
            } if t.from_warehouse else None,
            'to_warehouse': {
                'id': t.to_warehouse.id,
                'name': t.to_warehouse.name
            } if t.to_warehouse else None,
            'quantity': t.quantity,
            'transfer_date': t.transfer_date.isoformat() if t.transfer_date else None,
            'notes': t.notes,
            'created_by': t.created_by.full_name if t.created_by else 'Unknown'
        } for t in transfers],
        'count': len(transfers)
    })

# ============== PRODUCT STOCK BY WAREHOUSE ==============

@warehouses_bp.route('/products/<int:product_id>/stock', methods=['GET'])
@jwt_required()
def get_product_stock_by_warehouse(product_id):
    """Get stock breakdown for a product across all warehouses"""
    product = Product.query.get_or_404(product_id)
    
    stocks = ProductStock.query.filter_by(product_id=product_id).options(
        joinedload(ProductStock.warehouse)
    ).all()
    
    return jsonify({
        'success': True,
        'data': {
            'product_id': product.id,
            'product_name': product.name,
            'total_stock': product.stock_quantity,
            'warehouses': [{
                'warehouse_id': s.warehouse.id,
                'warehouse_code': s.warehouse.code,
                'warehouse_name': s.warehouse.name,
                'quantity': s.quantity
            } for s in stocks]
        }
    })
