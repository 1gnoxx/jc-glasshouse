"""
Product API routes for SunroofOS wholesale inventory system
Supports filtering by category, size, stock status, and vehicle compatibility
"""
from flask import Blueprint, request, jsonify
import json
from flask_jwt_extended import jwt_required, get_jwt
from sqlalchemy import and_, or_
from models import db, Product, ProductCategory
from .utils import get_current_user

products_bp = Blueprint('products_bp', __name__)

@products_bp.route('', methods=['GET'])
@jwt_required()
def get_products():
    """
    Get all products with optional filtering
    Query params:
    - category: sunroof, windshield, door_glass, rear_glass, quarter_glass
    - min_length, max_length: filter by length in mm
    - min_width, max_width: filter by width in mm
    - stock_status: all, in_stock, low_stock, out_of_stock
    - search: search in name, product_code, year
    - is_active: true/false (default: true)
    """
    # Get current user for financial data filtering
    claims = get_jwt()
    can_view_financials = claims.get('can_view_financials', False)
    
    # Base query
    query = Product.query
    
    # Filter by active status (default: only active products)
    is_active = request.args.get('is_active', 'true').lower() == 'true'
    query = query.filter_by(is_active=is_active)
    
    # Filter by category
    category = request.args.get('category')
    if category:
        try:
            cat_enum = ProductCategory[category.upper()]
            query = query.filter_by(category=cat_enum)
        except KeyError:
            return jsonify({"msg": f"Invalid category: {category}"}), 400
    
    # Filter by dimensions
    min_length = request.args.get('min_length', type=float)
    max_length = request.args.get('max_length', type=float)
    if min_length:
        query = query.filter(Product.length_mm >= min_length)
    if max_length:
        query = query.filter(Product.length_mm <= max_length)
    
    min_width = request.args.get('min_width', type=float)
    max_width = request.args.get('max_width', type=float)
    if min_width:
        query = query.filter(Product.width_mm >= min_width)
    if max_width:
        query = query.filter(Product.width_mm <= max_width)
    
    # Filter by stock status
    stock_status = request.args.get('stock_status')
    if stock_status == 'low_stock':
        query = query.filter(Product.stock_quantity <= Product.low_stock_threshold)
    elif stock_status == 'out_of_stock':
        query = query.filter(Product.stock_quantity == 0)
    elif stock_status == 'in_stock':
        query = query.filter(Product.stock_quantity > 0)
    
    # Search
    search = request.args.get('search')
    if search:
        search_term = f"%{search}%"
        query = query.filter(or_(
            Product.name.ilike(search_term),
            Product.product_code.ilike(search_term),
            Product.year.ilike(search_term)
        ))
    
    # Execute query
    products = query.all()
    
    # Format response based on user permissions
    results = []
    for product in products:
        product_data = {
            'id': product.id,
            'product_code': product.product_code,
            'name': product.name,
            'category': product.category.value if product.category else None,
            'tags': json.loads(product.tags) if isinstance(product.tags, str) else (product.tags or []),
            'description': product.description,
            'length_mm': product.length_mm,
            'width_mm': product.width_mm,
            'thickness_mm': product.thickness_mm,
            'year': product.year,
            'stock_quantity': product.stock_quantity,
            'low_stock_threshold': product.low_stock_threshold,
            'is_low_stock': product.is_low_stock,
            'selling_price': product.selling_price,
            'image_url': product.image_url,
            'is_active': product.is_active
        }
        
        # Include financial data only for Abbas
        if can_view_financials:
            product_data['purchase_price'] = product.purchase_price
            product_data['profit_margin'] = product.profit_margin
            product_data['profit_percentage'] = product.profit_percentage
        
        results.append(product_data)
    
    return jsonify({
        'success': True,
        'data': results,
        'count': len(results)
    })

@products_bp.route('', methods=['POST'])
@jwt_required()
def create_product():
    """
    Create a new product
    Both Abbas and Irfan can create products
    """
    data = request.get_json()
    
    # Validate required fields
    required_fields = ['name', 'category']
    for field in required_fields:
        if field not in data:
            return jsonify({"msg": f"Missing required field: {field}"}), 400
    
    # Auto-generate product code if not provided
    import time
    if 'product_code' not in data or not data['product_code']:
        # Generate a simple code based on category and timestamp
        # e.g., WS-1716728394
        prefix = data['category'][:2].upper()
        timestamp = int(time.time())
        data['product_code'] = f"{prefix}-{timestamp}"

    # Check if product code already exists
    if Product.query.filter_by(product_code=data['product_code']).first():
        return jsonify({"msg": f"Product code '{data['product_code']}' already exists"}), 400
    
    # Validate category if provided (for backward compatibility)
    category_str = data.get('category')
    category_enum = None
    if category_str:
        try:
            category_enum = ProductCategory[category_str.upper()] # Assuming category_str is the enum name
        except KeyError:
            return jsonify({"msg": f"Invalid category: {category_str}"}), 400
    
    # Get tags array
    tags = data.get('tags', [])
    if not isinstance(tags, list):
        tags = [tags] if tags else []
    
    # Convert tags to JSON string for storage
    tags_json = json.dumps(tags)
    
    # Helper to clean numeric input
    def clean_float(value):
        if value == '' or value is None:
            return None
        return float(value)

    # Create product
    product = Product(
        product_code=data['product_code'],
        name=data['name'],
        category=category_enum,
        tags=tags_json,
        description=data.get('description'),
        length_mm=clean_float(data.get('length_mm')),
        width_mm=clean_float(data.get('width_mm')),
        thickness_mm=clean_float(data.get('thickness_mm')),
        year=data.get('year'),
        stock_quantity=int(data.get('stock_quantity', 0)),
        low_stock_threshold=int(data.get('low_stock_threshold', 5)),
        purchase_price=clean_float(data.get('purchase_price')),
        selling_price=clean_float(data.get('selling_price')),
        image_url=data.get('image_url'),
        is_active=data.get('is_active', True)
    )
    
    db.session.add(product)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'msg': 'Product created successfully',
        'data': {
            'id': product.id,
            'product_code': product.product_code,
            'name': product.name
        }
    }), 201

@products_bp.route('/<int:product_id>', methods=['GET'])
@jwt_required()
def get_product(product_id):
    """Get a single product by ID"""
    product = Product.query.get_or_404(product_id)
    
    claims = get_jwt()
    can_view_financials = claims.get('can_view_financials', False)
    
    product_data = {
        'id': product.id,
        'product_code': product.product_code,
        'name': product.name,
        'category': product.category.value,
        'description': product.description,
        'length_mm': product.length_mm,
        'width_mm': product.width_mm,
        'thickness_mm': product.thickness_mm,
        'year': product.year,
        'stock_quantity': product.stock_quantity,
        'low_stock_threshold': product.low_stock_threshold,
        'is_low_stock': product.is_low_stock,
        'selling_price': product.selling_price,
        'image_url': product.image_url,
        'is_active': product.is_active,
        'created_at': product.created_at.isoformat() if product.created_at else None,
        'updated_at': product.updated_at.isoformat() if product.updated_at else None
    }
    
    if can_view_financials:
        product_data['purchase_price'] = product.purchase_price
        product_data['profit_margin'] = product.profit_margin
        product_data['profit_percentage'] = product.profit_percentage
    
    return jsonify({
        'success': True,
        'data': product_data
    })

@products_bp.route('/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    """Update a product"""
    product = Product.query.get_or_404(product_id)
    data = request.get_json()
    
    # Update fields if provided
    if 'name' in data:
        product.name = data['name']
    if 'category' in data:
        try:
            product.category = ProductCategory[data['category'].upper()]
        except KeyError:
            return jsonify({"msg": f"Invalid category: {data['category']}"}), 400
    if 'description' in data:
        product.description = data['description']
    if 'length_mm' in data:
        product.length_mm = data['length_mm']
    if 'width_mm' in data:
        product.width_mm = data['width_mm']
    if 'thickness_mm' in data:
        product.thickness_mm = data['thickness_mm']
    if 'year' in data:
        product.year = data['year']
    if 'stock_quantity' in data:
        product.stock_quantity = data['stock_quantity']
    if 'low_stock_threshold' in data:
        product.low_stock_threshold = data['low_stock_threshold']
    if 'purchase_price' in data:
        try:
            val = data['purchase_price']
            product.purchase_price = float(val) if val != '' and val is not None else None
        except ValueError:
            return jsonify({"msg": "Invalid purchase price"}), 400
            
    if 'selling_price' in data:
        try:
            val = data['selling_price']
            product.selling_price = float(val) if val != '' and val is not None else None
        except ValueError:
            return jsonify({"msg": "Invalid selling price"}), 400
    if 'image_url' in data:
        product.image_url = data['image_url']
    if 'is_active' in data:
        product.is_active = data['is_active']
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'msg': 'Product updated successfully'
    })

@products_bp.route('/<int:product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    """
    Delete a product (soft delete by setting is_active=False)
    Hard delete only if no sales associated
    """
    product = Product.query.get_or_404(product_id)
    
    # Check if product has been sold (has associated sale items)
    from models import SaleItem
    has_sales = SaleItem.query.filter_by(product_id=product_id).first() is not None
    
    if has_sales:
        # Soft delete: just deactivate
        product.is_active = False
        db.session.commit()
        return jsonify({
            'success': True,
            'msg': 'Product deactivated (has sales history)'
        })
    else:
        # Hard delete: remove from database
        db.session.delete(product)
        db.session.commit()
        return jsonify({
            'success': True,
            'msg': 'Product deleted permanently'
        })

@products_bp.route('/low-stock', methods=['GET'])
@jwt_required()
def get_low_stock_products():
    """Get all products with stock below threshold"""
    products = Product.query.filter(
        Product.stock_quantity <= Product.low_stock_threshold,
        Product.is_active == True
    ).all()
    
    claims = get_jwt()
    can_view_financials = claims.get('can_view_financials', False)
    
    results = []
    for product in products:
        product_data = {
            'id': product.id,
            'product_code': product.product_code,
            'name': product.name,
            'category': product.category.value,
            'stock_quantity': product.stock_quantity,
            'low_stock_threshold': product.low_stock_threshold,
            'selling_price': product.selling_price
        }
        
        if can_view_financials:
            product_data['purchase_price'] = product.purchase_price
        
        results.append(product_data)
    
    return jsonify({
        'success': True,
        'data': results,
        'count': len(results)
    })

@products_bp.route('/<int:product_id>/adjust-stock', methods=['POST'])
@jwt_required()
def adjust_stock(product_id):
    """
    Manually adjust stock quantity (for receiving inventory, corrections, etc.)
    """
    product = Product.query.get_or_404(product_id)
    data = request.get_json()
    
    adjustment = data.get('adjustment')
    if adjustment is None:
        return jsonify({"msg": "Missing 'adjustment' field"}), 400
    
    try:
        adjustment = int(adjustment)
    except ValueError:
        return jsonify({"msg": "Adjustment must be an integer"}), 400
    
    old_quantity = product.stock_quantity
    product.stock_quantity += adjustment
    
    # Prevent negative stock
    if product.stock_quantity < 0:
        return jsonify({"msg": "Stock quantity cannot be negative"}), 400
    
    reason = data.get('reason', 'Manual adjustment')
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'msg': f'Stock adjusted by {adjustment:+d}',
        'data': {
            'old_quantity': old_quantity,
            'new_quantity': product.stock_quantity,
            'adjustment': adjustment
        }
    })
