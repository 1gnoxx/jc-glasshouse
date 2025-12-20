"""
Sales API routes for SunroofOS wholesale inventory system
Supports creating invoices, tracking payments, and viewing sales history
Abbas: Full access to all sales data and financial information
Irfan: Can create sales but cannot view sales history or financial details
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from sqlalchemy.orm import joinedload
from datetime import datetime
from models import db, Sale, SaleItem, Product, User, Payment, Customer
from .utils import get_current_user, require_financial_access

sales_bp = Blueprint('sales_bp', __name__)

def generate_invoice_number():
    """Generate sequential invoice number like INV-2024-0001"""
    year = datetime.now().year
    last_sale = Sale.query.filter(
        Sale.invoice_number.like(f'INV-{year}-%')
    ).order_by(Sale.id.desc()).first()
    
    if last_sale:
        # Extract number from last invoice and increment
        last_num = int(last_sale.invoice_number.split('-')[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f'INV-{year}-{new_num:04d}'

@sales_bp.route('', methods=['POST'])
@jwt_required()
def create_sale():
    """
    Create a new sale/invoice
    Both Abbas and Irfan can create sales
    Sales can be created without prices (pending status) and prices added later
    """
    data = request.get_json()
    user = get_current_user()
    
    if not user:
        return jsonify({"msg": "User not found"}), 404
    
    # Validate required fields
    if not data.get('customer_name'):
        return jsonify({"msg": "Customer name is required"}), 400
    if not data.get('items') or not isinstance(data['items'], list) or len(data['items']) == 0:
        return jsonify({"msg": "At least one item is required"}), 400
    
    # Validate products and check stock
    product_ids = [item.get('product_id') for item in data['items']]
    products = Product.query.filter(Product.id.in_(product_ids)).all()
    product_map = {p.id: p for p in products}
    
    for item in data['items']:
        product_id = item.get('product_id')
        quantity = item.get('quantity')
        
        if not product_id or not quantity:
            return jsonify({"msg": "Each item must have product_id and quantity"}), 400
        
        product = product_map.get(product_id)
        if not product:
            return jsonify({"msg": f"Product ID {product_id} not found"}), 404
        
        if not isinstance(quantity, int) or quantity < 1:
            return jsonify({"msg": f"Invalid quantity {quantity} for {product.name}"}), 400
        
        if product.stock_quantity < quantity:
            return jsonify({
                "msg": f"Insufficient stock for {product.name}. Available: {product.stock_quantity}, Requested: {quantity}"
            }), 400
    
    # Generate invoice number
    invoice_number = generate_invoice_number()
    
    # Calculate total and determine if any items are missing prices
    total_amount = 0
    has_missing_prices = False
    for item in data['items']:
        product = product_map[item['product_id']]
        quantity = item['quantity']
        # Use provided unit_price or None (pending)
        unit_price = item.get('unit_price')
        if unit_price is None or unit_price == '' or unit_price == 0:
            has_missing_prices = True
            unit_price = None
        else:
            total_amount += quantity * float(unit_price)
    
    # Apply discount if provided
    discount_amount = float(data.get('discount_amount', 0.0) or 0.0)
    total_amount -= discount_amount
    
    # Determine status based on whether all items have prices
    status = 'pending' if has_missing_prices else 'completed'
    
    # Create sale
    sale = Sale(
        invoice_number=invoice_number,
        customer_id=data.get('customer_id'),
        customer_name=data['customer_name'],
        customer_phone=data.get('customer_phone'),
        customer_company=data.get('customer_company'),
        status=status,
        payment_status=data.get('payment_status', 'unpaid'),
        payment_method=data.get('payment_method'),
        total_amount=total_amount,
        discount_amount=discount_amount,
        amount_paid=float(data.get('amount_paid', 0.0) or 0.0),
        created_by_user_id=user.id,
        notes=data.get('notes')
    )
    
    db.session.add(sale)
    db.session.flush()  # Get sale ID
    
    # Add sale items and reduce stock
    for item in data['items']:
        product = product_map[item['product_id']]
        quantity = item['quantity']
        
        # Use provided unit_price or None for pending
        unit_price = item.get('unit_price')
        if unit_price is None or unit_price == '' or unit_price == 0:
            unit_price = None
        else:
            unit_price = float(unit_price)
            
        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=product.id,
            quantity=quantity,
            unit_price=unit_price
        )
        db.session.add(sale_item)
        
        # Reduce stock
        product.stock_quantity -= quantity
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'msg': 'Sale created successfully',
        'data': {
            'id': sale.id,
            'invoice_number': sale.invoice_number,
            'status': sale.status,
            'total_amount': sale.total_amount,
            'balance_due': sale.balance_due
        }
    }), 201

@sales_bp.route('', methods=['GET'])
@jwt_required()
def get_sales():
    """
    Get all sales (Accessible to all authenticated users)
    Query params:
    - status: pending, completed (for sale workflow status)
    - payment_status: unpaid, partial, paid
    - start_date, end_date: filter by date range (YYYY-MM-DD)
    - customer: search by customer name
    """
    query = Sale.query.options(
        joinedload(Sale.created_by),
        joinedload(Sale.customer),
        joinedload(Sale.items).joinedload(SaleItem.product)
    )
    
    # Filter by sale status (pending/completed)
    status = request.args.get('status')
    if status:
        query = query.filter_by(status=status)
    
    # Filter by payment status
    payment_status = request.args.get('payment_status')
    if payment_status:
        query = query.filter_by(payment_status=payment_status)
    
    # Filter by date range
    start_date = request.args.get('start_date')
    if start_date:
        try:
            start = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Sale.sale_date >= start)
        except ValueError:
            return jsonify({"msg": "Invalid start_date format. Use YYYY-MM-DD"}), 400
    
    end_date = request.args.get('end_date')
    if end_date:
        try:
            end = datetime.strptime(end_date, '%Y-%m-%d')
            query = query.filter(Sale.sale_date <= end)
        except ValueError:
            return jsonify({"msg": "Invalid end_date format. Use YYYY-MM-DD"}), 400
    
    # Search by customer
    customer = request.args.get('customer')
    if customer:
        query = query.filter(Sale.customer_name.ilike(f'%{customer}%'))
    
    # Order by most recent first
    sales = query.order_by(Sale.sale_date.desc()).all()
    
    results = []
    for sale in sales:
        # Get customer details from linked customer or use stored values
        customer_city = None
        customer_address = None
        if sale.customer:
            customer_city = sale.customer.city
            customer_address = sale.customer.address
        
        results.append({
            'id': sale.id,
            'invoice_number': sale.invoice_number,
            'status': sale.status,
            'customer_id': sale.customer_id,
            'customer_name': sale.customer_name,
            'customer_phone': sale.customer_phone,
            'customer_company': sale.customer_company,
            'customer_city': customer_city,
            'customer_address': customer_address,
            'sale_date': sale.sale_date.isoformat(),
            'payment_status': sale.payment_status,
            'payment_method': sale.payment_method,
            'total_amount': sale.total_amount,
            'discount_amount': sale.discount_amount,
            'amount_paid': sale.amount_paid,
            'balance_due': sale.balance_due,
            'created_by': sale.created_by.full_name if sale.created_by else 'Unknown',
            'items_count': len(sale.items),
            'items': [
                {
                    'id': item.id,
                    'product_id': item.product_id,
                    'product_name': item.product.name if item.product else 'N/A',
                    'product_code': item.product.product_code if item.product else 'N/A',
                    'quantity': item.quantity,
                    'unit_price': item.unit_price,
                    'line_total': item.line_total
                } for item in sale.items
            ]
        })
    
    return jsonify({
        'success': True,
        'data': results,
        'count': len(results)
    })

@sales_bp.route('/<int:sale_id>', methods=['GET'])
@jwt_required()
def get_sale(sale_id):
    """Get detailed information about a specific sale"""
    sale = Sale.query.options(
        joinedload(Sale.created_by),
        joinedload(Sale.customer),
        joinedload(Sale.items).joinedload(SaleItem.product)
    ).get_or_404(sale_id)
    
    # Get customer details from linked customer
    customer_city = None
    customer_address = None
    if sale.customer:
        customer_city = sale.customer.city
        customer_address = sale.customer.address
    
    return jsonify({
        'success': True,
        'data': {
            'id': sale.id,
            'invoice_number': sale.invoice_number,
            'status': sale.status,
            'customer_name': sale.customer_name,
            'customer_phone': sale.customer_phone,
            'customer_company': sale.customer_company,
            'customer_city': customer_city,
            'customer_address': customer_address,
            'sale_date': sale.sale_date.isoformat(),
            'payment_status': sale.payment_status,
            'payment_method': sale.payment_method,
            'total_amount': sale.total_amount,
            'discount_amount': sale.discount_amount,
            'amount_paid': sale.amount_paid,
            'balance_due': sale.balance_due,
            'notes': sale.notes,
            'created_by': sale.created_by.full_name if sale.created_by else 'Unknown',
            'items': [
                {
                    'id': item.id,
                    'product_id': item.product_id,
                    'product_name': item.product.name if item.product else 'N/A',
                    'product_code': item.product.product_code if item.product else 'N/A',
                    'quantity': item.quantity,
                    'unit_price': item.unit_price,
                    'line_total': item.line_total
                } for item in sale.items
            ]
        }
    })

@sales_bp.route('/<int:sale_id>', methods=['PUT'])
@jwt_required()
def update_sale(sale_id):
    """
    Update a sale - primarily for editing pending sales (adding prices, updating quantities)
    Similar to stock intake pending edit functionality
    """
    sale = Sale.query.options(
        joinedload(Sale.items).joinedload(SaleItem.product)
    ).get_or_404(sale_id)
    
    data = request.get_json()
    
    # Update basic sale info if provided
    if 'customer_name' in data:
        sale.customer_name = data['customer_name']
    if 'customer_phone' in data:
        sale.customer_phone = data['customer_phone']
    if 'customer_company' in data:
        sale.customer_company = data['customer_company']
    if 'notes' in data:
        sale.notes = data['notes']
    if 'discount_amount' in data:
        sale.discount_amount = float(data['discount_amount'] or 0)
    
    # Update items if provided
    if 'items' in data and isinstance(data['items'], list):
        # Build map of existing items
        existing_items = {item.id: item for item in sale.items}
        updated_item_ids = set()
        
        for item_data in data['items']:
            item_id = item_data.get('id')
            
            if item_id and item_id in existing_items:
                # Update existing item
                item = existing_items[item_id]
                if 'quantity' in item_data:
                    old_qty = item.quantity
                    new_qty = int(item_data['quantity'])
                    qty_diff = new_qty - old_qty
                    
                    # Check stock if increasing quantity
                    if qty_diff > 0 and item.product:
                        if item.product.stock_quantity < qty_diff:
                            return jsonify({
                                "msg": f"Insufficient stock for {item.product.name}. Available: {item.product.stock_quantity}"
                            }), 400
                        item.product.stock_quantity -= qty_diff
                    elif qty_diff < 0 and item.product:
                        # Return stock if decreasing quantity
                        item.product.stock_quantity -= qty_diff  # qty_diff is negative, so -= adds
                    
                    item.quantity = new_qty
                
                if 'unit_price' in item_data:
                    unit_price = item_data['unit_price']
                    if unit_price is not None and unit_price != '' and unit_price != 0:
                        item.unit_price = float(unit_price)
                    else:
                        item.unit_price = None
                
                updated_item_ids.add(item_id)
        
        # Handle deleted items (items in existing but not in updated)
        for item_id, item in existing_items.items():
            if item_id not in updated_item_ids and len(data['items']) > 0:
                # Check if this item should be deleted (not in updated list and items were provided)
                items_have_this_id = any(i.get('id') == item_id for i in data['items'])
                if not items_have_this_id:
                    # Return stock
                    if item.product:
                        item.product.stock_quantity += item.quantity
                    db.session.delete(item)
    
    # Handle explicit deleted_item_ids
    if 'deleted_item_ids' in data and isinstance(data['deleted_item_ids'], list):
        for item_id in data['deleted_item_ids']:
            item = SaleItem.query.get(item_id)
            if item and item.sale_id == sale.id:
                # Return stock
                if item.product:
                    item.product.stock_quantity += item.quantity
                db.session.delete(item)
    
    # Handle new items
    if 'new_items' in data and isinstance(data['new_items'], list):
        for new_item_data in data['new_items']:
            product_id = new_item_data.get('product_id')
            quantity = new_item_data.get('quantity', 1)
            unit_price = new_item_data.get('unit_price')
            
            if not product_id:
                continue
                
            product = Product.query.get(product_id)
            if not product:
                return jsonify({"msg": f"Product ID {product_id} not found"}), 404
            
            if product.stock_quantity < quantity:
                return jsonify({
                    "msg": f"Insufficient stock for {product.name}. Available: {product.stock_quantity}"
                }), 400
            
            # Create new sale item
            new_item = SaleItem(
                sale_id=sale.id,
                product_id=product_id,
                quantity=quantity,
                unit_price=float(unit_price) if unit_price else None
            )
            db.session.add(new_item)
            
            # Reduce stock
            product.stock_quantity -= quantity
    
    # Recalculate total and status
    db.session.flush()  # Ensure items are updated
    sale = Sale.query.options(joinedload(Sale.items)).get(sale_id)
    
    total_amount = 0
    has_missing_prices = False
    for item in sale.items:
        if item.unit_price is not None and item.unit_price > 0:
            total_amount += item.quantity * item.unit_price
        else:
            has_missing_prices = True
    
    sale.total_amount = total_amount - sale.discount_amount
    sale.status = 'pending' if has_missing_prices else 'completed'
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'msg': 'Sale updated successfully',
        'data': {
            'id': sale.id,
            'invoice_number': sale.invoice_number,
            'status': sale.status,
            'total_amount': sale.total_amount,
            'items_count': len(sale.items)
        }
    })

@sales_bp.route('/<int:sale_id>/payment', methods=['PUT'])
@jwt_required()
def update_payment(sale_id):
    """
    Update payment status and amount paid
    Both Abbas and Irfan can update payments
    """
    sale = Sale.query.get_or_404(sale_id)
    data = request.get_json()
    
    if 'payment_status' in data:
        valid_statuses = ['unpaid', 'partial', 'paid']
        if data['payment_status'] not in valid_statuses:
            return jsonify({"msg": f"Invalid payment status. Must be one of: {', '.join(valid_statuses)}"}), 400
        sale.payment_status = data['payment_status']
    
    if 'amount_paid' in data:
        try:
            amount = float(data['amount_paid'])
            if amount < 0:
                return jsonify({"msg": "Amount paid cannot be negative"}), 400
            if amount > sale.total_amount:
                return jsonify({"msg": "Amount paid cannot exceed total amount"}), 400
            sale.amount_paid = amount
            
            # Auto-update payment status based on amount
            if amount == 0:
                sale.payment_status = 'unpaid'
            elif amount < sale.total_amount:
                sale.payment_status = 'partial'
            else:
                sale.payment_status = 'paid'
                
        except ValueError:
            return jsonify({"msg": "Invalid amount value"}), 400
    
    if 'payment_method' in data:
        sale.payment_method = data['payment_method']
    
    db.session.commit()
    
    return jsonify({
        'success': True,
        'msg': 'Payment updated successfully',
        'data': {
            'payment_status': sale.payment_status,
            'amount_paid': sale.amount_paid,
            'balance_due': sale.balance_due
        }
    })

@sales_bp.route('/<int:sale_id>/payments', methods=['POST'])
@jwt_required()
def add_payment(sale_id):
    """Add a payment to a sale"""
    sale = Sale.query.get_or_404(sale_id)
    data = request.get_json()
    user = get_current_user()
    
    try:
        amount = float(data.get('amount', 0))
    except (ValueError, TypeError):
        return jsonify({"msg": "Invalid payment amount"}), 400

    if amount <= 0:
        return jsonify({"msg": "Payment amount must be positive"}), 400
        
    # Allow overpayment? Probably not for now.
    if sale.amount_paid + amount > sale.total_amount + 0.01: # float tolerance
        return jsonify({"msg": f"Payment exceeds balance due (Balance: {sale.balance_due})"}), 400
        
    payment = Payment(
        sale_id=sale.id,
        amount=amount,
        payment_method=data.get('payment_method', 'cash'),
        notes=data.get('notes'),
        created_by_user_id=user.id
    )
    
    db.session.add(payment)
    
    # Update sale totals
    sale.amount_paid += amount
    
    # Update status
    if sale.amount_paid >= sale.total_amount - 0.01:
        sale.payment_status = 'paid'
    elif sale.amount_paid > 0:
        sale.payment_status = 'partial'
    else:
        sale.payment_status = 'unpaid'
        
    db.session.commit()
    
    return jsonify({
        'success': True,
        'msg': 'Payment added successfully',
        'data': {
            'id': payment.id,
            'amount': payment.amount,
            'sale_amount_paid': sale.amount_paid,
            'sale_payment_status': sale.payment_status,
            'balance_due': sale.balance_due
        }
    }), 201

@sales_bp.route('/<int:sale_id>/payments', methods=['GET'])
@jwt_required()
def get_payments(sale_id):
    """Get payment history for a sale"""
    sale = Sale.query.get_or_404(sale_id)
    payments = Payment.query.filter_by(sale_id=sale.id).order_by(Payment.payment_date.desc()).all()
    
    return jsonify({
        'success': True,
        'data': [{
            'id': p.id,
            'amount': p.amount,
            'date': p.payment_date.isoformat(),
            'method': p.payment_method,
            'notes': p.notes,
            'created_by': p.created_by.full_name if p.created_by else 'Unknown'
        } for p in payments]
    })

@sales_bp.route('/today', methods=['GET'])
@jwt_required()
def get_today_sales():
    """
    Get today's sales - limited data for Irfan, full data for Abbas
    """
    claims = get_jwt()
    can_view_financials = claims.get('can_view_financials', False)
    
    # Get sales from today
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    sales = Sale.query.filter(Sale.sale_date >= today_start).all()
    
    if can_view_financials:
        # Abbas: Full financial data
        results = []
        for sale in sales:
            results.append({
                'id': sale.id,
                'invoice_number': sale.invoice_number,
                'customer_name': sale.customer_name,
                'total_amount': sale.total_amount,
                'payment_status': sale.payment_status,
                'items_count': len(sale.items)
            })
        
        total_revenue = sum(s.total_amount for s in sales)
        total_paid = sum(s.amount_paid for s in sales)
        
        return jsonify({
            'success': True,
            'data': results,
            'summary': {
                'count': len(sales),
                'total_revenue': total_revenue,
                'total_paid': total_paid,
                'outstanding': total_revenue - total_paid
            }
        })
    else:
        # Irfan: Limited data (no financial info)
        results = []
        for sale in sales:
            results.append({
                'id': sale.id,
                'invoice_number': sale.invoice_number,
                'customer_name': sale.customer_name,
                'payment_status': sale.payment_status,
                'items_count': len(sale.items)
            })
        
        return jsonify({
            'success': True,
            'data': results,
            'summary': {
                'count': len(sales)
            }
        })

@sales_bp.route('/<int:sale_id>', methods=['DELETE'])
@jwt_required()
def delete_sale(sale_id):
    """
    Delete a sale record
    - Restores stock quantities (adds back quantities to products)
    - Deletes associated payments
    - Removes the sale and all its items
    """
    sale = Sale.query.get_or_404(sale_id)
    
    # Restore stock quantities for each item
    for item in sale.items:
        product = Product.query.get(item.product_id)
        if product:
            product.stock_quantity += item.quantity
    
    # Delete the sale (cascade will delete items and payments)
    db.session.delete(sale)
    db.session.commit()
    
    return jsonify({
        'success': True,
        'msg': 'Sale deleted successfully'
    })
