from flask import Blueprint, request, jsonify
import json
from models import db, Product, CarVariant, TimelineEvent, User
from flask_jwt_extended import jwt_required
from sqlalchemy.orm import joinedload
from flask_jwt_extended import get_jwt_identity

catalog_bp = Blueprint('catalog_bp', __name__)

# --- Unified Car Variant & Product Routes ---
@catalog_bp.route('/variants', methods=['GET'])
def get_variants():
    query = CarVariant.query.options(joinedload(CarVariant.product)).order_by(CarVariant.car_name, CarVariant.name)
    
    search_term = request.args.get('search', '')
    if search_term:
        search_pattern = f"%{search_term}%"
        query = query.filter(
            db.or_(
                CarVariant.car_name.ilike(search_pattern),
                CarVariant.name.ilike(search_pattern)
            )
        )

    variants = query.all()
    results = []
    for v in variants:
        product_data = v.product
        results.append({
            'id': v.id,
            'car_name': v.car_name,
            'variant_name': v.name,
            'sunroof_type': v.sunroof_type,
            'sunroof_length_in': v.sunroof_length_in,
            'sunroof_width_in': v.sunroof_width_in,
            'clip_positions': json.loads(v.clip_positions) if v.clip_positions else [],
            'product_id': product_data.id if product_data else None,
            'description': product_data.description if product_data else '',
            'stock_level': product_data.stock_quantity if product_data else 0,
            'with_frame': False,  # Field not in current model
            'images': [product_data.image_url] if (product_data and product_data.image_url) else [],
            'purchase_price': product_data.purchase_price if product_data else None,
            'selling_price': product_data.selling_price if product_data else None,
        })
    return jsonify(results)

@catalog_bp.route('/variants', methods=['POST'])
@jwt_required()
def create_variant():
    data = request.get_json() or {}
    
    new_variant = CarVariant(
        car_name=data.get('car_name'),
        name=data.get('variant_name', 'New Variant'),
        sunroof_type=data.get('sunroof_type', 'N/A'),
        sunroof_length_in=data.get('sunroof_length_in'),
        sunroof_width_in=data.get('sunroof_width_in'),
        clip_positions=json.dumps(data.get('clip_positions') or data.get('clips', []))
    )

    product = Product(
        description=data.get('description', ''),
        stock_quantity=data.get('stock_level') or data.get('stock') or data.get('quantity', 0),
        purchase_price=data.get('purchase_price'),
        selling_price=data.get('selling_price'),
        image_url=data.get('images', [])[0] if data.get('images') else None
    )

    new_variant.product = product
    db.session.add(new_variant)
    
    # Log timeline event
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    event = TimelineEvent(
        event_type='PRODUCT_ADD',
        description=f"New sunroof \'{new_variant.name}\' for \'{new_variant.car_name}\' added to catalog.",
        user_id=user.id if user else None
    )
    db.session.add(event)

    db.session.commit()
    return jsonify({'msg': 'Variant created', 'id': new_variant.id}), 201

@catalog_bp.route('/variants/<int:variant_id>', methods=['PUT'])
@jwt_required()
def update_variant_with_product(variant_id):
    variant = CarVariant.query.get_or_404(variant_id)
    product = variant.product or Product()
    data = request.get_json()

    # Track changes for timeline
    changes = []
    if variant.name != data.get('variant_name', variant.name):
        changes.append(f"name to \'{data.get('variant_name')}\'")
    if product.stock_level != data.get('stock_level', product.stock_level):
        changes.append(f"stock to {data.get('stock_level')}")

    variant.car_name = data.get('car_name', variant.car_name)
    variant.name = data.get('variant_name') or data.get('name', variant.name)
    variant.sunroof_type = data.get('sunroof_type', variant.sunroof_type)
    variant.sunroof_length_in = data.get('sunroof_length_in', variant.sunroof_length_in)
    variant.sunroof_width_in = data.get('sunroof_width_in', variant.sunroof_width_in)
    variant.clip_positions = json.dumps(data.get('clip_positions') or data.get('clips', []))

    product.description = data.get('description', product.description)
    product.stock_quantity = data.get('stock_level') or data.get('stock') or data.get('quantity', product.stock_quantity)
    product.purchase_price = data.get('purchase_price', product.purchase_price)
    product.selling_price = data.get('selling_price', product.selling_price)

    if 'images' in data and data.get('images'):
        product.image_url = data.get('images', [])[0]  # Take first image URL

    variant.product = product

    # Log timeline event
    if changes:
        username = get_jwt_identity()
        user = User.query.filter_by(username=username).first()
        event = TimelineEvent(
            event_type='PRODUCT_UPDATE',
            description=f"Details for \'{variant.name}\' updated: { ', '.join(changes) }.",
            user_id=user.id if user else None
        )
        db.session.add(event)

    db.session.commit()
    return jsonify({'msg': 'Variant and Product updated'})

@catalog_bp.route('/variants/<int:variant_id>', methods=['DELETE'])
@jwt_required()
def delete_variant(variant_id):
    variant = CarVariant.query.get_or_404(variant_id)
    variant_name = variant.name
    car_name = variant.car_name
    
    # Log timeline event
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first()
    event = TimelineEvent(
        event_type='PRODUCT_DELETE',
        description=f"Sunroof \'{variant_name}\' for \'{car_name}\' deleted from catalog.",
        user_id=user.id if user else None
    )
    db.session.add(event)

    db.session.delete(variant)
    db.session.commit()
    return jsonify({"msg": "Variant deleted"})
