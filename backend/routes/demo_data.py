import json
from datetime import datetime, timedelta

# Mock Warehouses
MOCK_WAREHOUSES = [
    {
        "id": 1,
        "code": "BHAIJAAN",
        "name": "BhaiJaan",
        "description": "Main storage warehouse",
        "is_default_intake": True,
        "is_shipping_location": False,
        "is_active": True
    },
    {
        "id": 2,
        "code": "MAHAPOLI",
        "name": "Mahapoli",
        "description": "Shipping/dispatch location",
        "is_default_intake": False,
        "is_shipping_location": True,
        "is_active": True
    }
]

# Mock Customers
MOCK_CUSTOMERS = [
    {
        "id": 1,
        "name": "Rajesh Auto Glass",
        "phone": "9876543210",
        "company": "Rajesh Motors",
        "city": "Mumbai",
        "address": "12, Link Road, Andheri West"
    },
    {
        "id": 2,
        "name": "Aman Glass Distributors",
        "phone": "9123456789",
        "company": "Aman & Sons",
        "city": "Pune",
        "address": "45, MG Road, Camp"
    },
    {
        "id": 3,
        "name": "Super Auto Traders",
        "phone": "9988776655",
        "company": "Super Auto Corp",
        "city": "Thane",
        "address": "Block B, Industrial Area"
    }
]

# Mock Products
MOCK_PRODUCTS = [
    {
        "id": 1,
        "product_code": "SR-1001",
        "name": "Honda Civic Sunroof Assembly",
        "category": "sunroof",
        "tags": ["sunroof", "honda", "civic", "front"],
        "description": "OEM replacement sunroof assembly for Honda Civic. High durability glass.",
        "length_mm": "19.10",
        "width_mm": "9.5",
        "thickness_mm": "4.0",
        "year": "2018-2022",
        "stock_quantity": 8,
        "low_stock_threshold": 3,
        "is_low_stock": False,
        "selling_price": 12500.0,
        "purchase_price": 8500.0,
        "profit_margin": 4000.0,
        "profit_percentage": 47.06,
        "image_url": "",
        "is_active": True,
        "warehouse_stocks": {
            "BHAIJAAN": {"warehouse_id": 1, "warehouse_name": "BhaiJaan", "quantity": 5},
            "MAHAPOLI": {"warehouse_id": 2, "warehouse_name": "Mahapoli", "quantity": 3}
        }
    },
    {
        "id": 2,
        "product_code": "WS-2002",
        "name": "Toyota Corolla Windshield Glass",
        "category": "windshield",
        "tags": ["windshield", "toyota", "corolla", "lami"],
        "description": "Front laminated windshield glass with rain sensor support.",
        "length_mm": "45.2",
        "width_mm": "32.1",
        "thickness_mm": "5.0",
        "year": "2019-2023",
        "stock_quantity": 2,
        "low_stock_threshold": 5,
        "is_low_stock": True,
        "selling_price": 7500.0,
        "purchase_price": 5000.0,
        "profit_margin": 2500.0,
        "profit_percentage": 50.0,
        "image_url": "",
        "is_active": True,
        "warehouse_stocks": {
            "BHAIJAAN": {"warehouse_id": 1, "warehouse_name": "BhaiJaan", "quantity": 1},
            "MAHAPOLI": {"warehouse_id": 2, "warehouse_name": "Mahapoli", "quantity": 1}
        }
    },
    {
        "id": 3,
        "product_code": "DG-3003",
        "name": "Hyundai Creta Front Left Door Glass",
        "category": "door_glass",
        "tags": ["door_glass", "hyundai", "creta", "left", "front"],
        "description": "Toughened side door window glass for Hyundai Creta front left door.",
        "length_mm": "25.0",
        "width_mm": "18.0",
        "thickness_mm": "3.5",
        "year": "2020-2024",
        "stock_quantity": 15,
        "low_stock_threshold": 4,
        "is_low_stock": False,
        "selling_price": 2800.0,
        "purchase_price": 1800.0,
        "profit_margin": 1000.0,
        "profit_percentage": 55.56,
        "image_url": "",
        "is_active": True,
        "warehouse_stocks": {
            "BHAIJAAN": {"warehouse_id": 1, "warehouse_name": "BhaiJaan", "quantity": 10},
            "MAHAPOLI": {"warehouse_id": 2, "warehouse_name": "Mahapoli", "quantity": 5}
        }
    },
    {
        "id": 4,
        "product_code": "RG-4004",
        "name": "Maruti Swift Rear Windshield Glass",
        "category": "rear_glass",
        "tags": ["rear_glass", "maruti", "swift", "rear"],
        "description": "Rear defogger-compatible windshield glass for Maruti Suzuki Swift.",
        "length_mm": "38.5",
        "width_mm": "22.0",
        "thickness_mm": "4.0",
        "year": "2018-2023",
        "stock_quantity": 0,
        "low_stock_threshold": 2,
        "is_low_stock": True,
        "selling_price": 4200.0,
        "purchase_price": 2700.0,
        "profit_margin": 1500.0,
        "profit_percentage": 55.56,
        "image_url": "",
        "is_active": True,
        "warehouse_stocks": {
            "BHAIJAAN": {"warehouse_id": 1, "warehouse_name": "BhaiJaan", "quantity": 0},
            "MAHAPOLI": {"warehouse_id": 2, "warehouse_name": "Mahapoli", "quantity": 0}
        }
    },
    {
        "id": 5,
        "product_code": "SR-1002",
        "name": "Mahindra XUV700 Panoramic Sunroof Glass",
        "category": "sunroof",
        "tags": ["sunroof", "mahindra", "xuv700", "panoramic"],
        "description": "Rear portion sunroof panel for Mahindra XUV700 skyroof.",
        "length_mm": "32.4",
        "width_mm": "24.6",
        "thickness_mm": "5.0",
        "year": "2021-2025",
        "stock_quantity": 5,
        "low_stock_threshold": 2,
        "is_low_stock": False,
        "selling_price": 18500.0,
        "purchase_price": 12000.0,
        "profit_margin": 6500.0,
        "profit_percentage": 54.17,
        "image_url": "",
        "is_active": True,
        "warehouse_stocks": {
            "BHAIJAAN": {"warehouse_id": 1, "warehouse_name": "BhaiJaan", "quantity": 4},
            "MAHAPOLI": {"warehouse_id": 2, "warehouse_name": "Mahapoli", "quantity": 1}
        }
    }
]

# Mock Sales
MOCK_SALES = [
    {
        "id": 1,
        "invoice_number": "INV-2026-0001",
        "status": "completed",
        "customer_id": 1,
        "customer_name": "Rajesh Auto Glass",
        "customer_phone": "9876543210",
        "customer_company": "Rajesh Motors",
        "customer_city": "Mumbai",
        "customer_address": "12, Link Road, Andheri West",
        "sale_date": (datetime.now() - timedelta(days=2)).isoformat(),
        "payment_status": "paid",
        "payment_method": "upi",
        "total_amount": 25000.0,
        "discount_amount": 0.0,
        "amount_paid": 25000.0,
        "balance_due": 0.0,
        "created_by": "Demo User",
        "items_count": 1,
        "items": [
            {
                "id": 1,
                "product_id": 1,
                "product_name": "Honda Civic Sunroof Assembly",
                "product_code": "SR-1001",
                "quantity": 2,
                "unit_price": 12500.0,
                "line_total": 25000.0
            }
        ]
    },
    {
        "id": 2,
        "invoice_number": "INV-2026-0002",
        "status": "completed",
        "customer_id": 2,
        "customer_name": "Aman Glass Distributors",
        "customer_phone": "9123456789",
        "customer_company": "Aman & Sons",
        "customer_city": "Pune",
        "customer_address": "45, MG Road, Camp",
        "sale_date": (datetime.now() - timedelta(days=1)).isoformat(),
        "payment_status": "partial",
        "payment_method": "bank_transfer",
        "total_amount": 10300.0,
        "discount_amount": 0.0,
        "amount_paid": 4000.0,
        "balance_due": 6300.0,
        "created_by": "Demo User",
        "items_count": 2,
        "items": [
            {
                "id": 2,
                "product_id": 2,
                "product_name": "Toyota Corolla Windshield Glass",
                "product_code": "WS-2002",
                "quantity": 1,
                "unit_price": 7500.0,
                "line_total": 7500.0
            },
            {
                "id": 3,
                "product_id": 3,
                "product_name": "Hyundai Creta Front Left Door Glass",
                "product_code": "DG-3003",
                "quantity": 1,
                "unit_price": 2800.0,
                "line_total": 2800.0
            }
        ]
    },
    {
        "id": 3,
        "invoice_number": "INV-2026-0003",
        "status": "pending",
        "customer_id": 3,
        "customer_name": "Super Auto Traders",
        "customer_phone": "9988776655",
        "customer_company": "Super Auto Corp",
        "customer_city": "Thane",
        "customer_address": "Block B, Industrial Area",
        "sale_date": datetime.now().isoformat(),
        "payment_status": "unpaid",
        "payment_method": "credit",
        "total_amount": 0.0,
        "discount_amount": 0.0,
        "amount_paid": 0.0,
        "balance_due": 0.0,
        "created_by": "Demo User",
        "items_count": 1,
        "items": [
            {
                "id": 4,
                "product_id": 5,
                "product_name": "Mahindra XUV700 Panoramic Sunroof Glass",
                "product_code": "SR-1002",
                "quantity": 1,
                "unit_price": 0.0,
                "line_total": 0.0
            }
        ]
    }
]

# Mock Payments
MOCK_PAYMENTS = {
    1: [
        {
            "id": 1,
            "amount": 25000.0,
            "date": (datetime.now() - timedelta(days=2)).isoformat(),
            "method": "upi",
            "notes": "Full payment received via GPay",
            "created_by": "Demo User"
        }
    ],
    2: [
        {
            "id": 2,
            "amount": 4000.0,
            "date": (datetime.now() - timedelta(days=1)).isoformat(),
            "method": "bank_transfer",
            "notes": "Initial partial payment",
            "created_by": "Demo User"
        }
    ],
    3: []
}

# Mock Stock Intakes
MOCK_INTAKES = [
    {
        "id": 1,
        "intake_date": (datetime.now() - timedelta(days=10)).date().isoformat(),
        "supplier_name": "GlassCorp India Ltd",
        "notes": "Bulk import sunroofs & windshields",
        "status": "completed",
        "warehouse_id": 1,
        "warehouse_name": "BhaiJaan",
        "created_by": "Demo User",
        "total_items_count": 2,
        "total_quantity": 10,
        "total_cost": 67500.0,
        "items": [
            {
                "id": 1,
                "product_id": 1,
                "product_name": "Honda Civic Sunroof Assembly",
                "product_code": "SR-1001",
                "quantity": 5,
                "purchase_price_per_unit": 8500.0,
                "total_cost": 42500.0
            },
            {
                "id": 2,
                "product_id": 2,
                "product_name": "Toyota Corolla Windshield Glass",
                "product_code": "WS-2002",
                "quantity": 5,
                "purchase_price_per_unit": 5000.0,
                "total_cost": 25000.0
            }
        ]
    }
]

# Mock Expenses
MOCK_EXPENSES = [
    {
        "id": 1,
        "date": (datetime.now() - timedelta(days=5)).date().isoformat(),
        "category": "rent",
        "amount": 12000.0,
        "description": "BhaiJaan Warehouse Rent - June 2026",
        "created_by": "Demo User"
    },
    {
        "id": 2,
        "date": (datetime.now() - timedelta(days=3)).date().isoformat(),
        "category": "transport",
        "amount": 3500.0,
        "description": "Glass transport from Mahapoli to shop",
        "created_by": "Demo User"
    },
    {
        "id": 3,
        "date": (datetime.now() - timedelta(days=1)).date().isoformat(),
        "category": "utilities",
        "amount": 1800.0,
        "description": "Electricity bill",
        "created_by": "Demo User"
    }
]

# Mock Catalog Variants
MOCK_VARIANTS = [
    {
        "id": 1,
        "car_name": "Honda Civic",
        "name": "Civic 10th Gen",
        "sunroof_type": "standard",
        "sunroof_length_in": 19.10,
        "clip_positions": "Front/Rear clips"
    },
    {
        "id": 2,
        "car_name": "Mahindra XUV700",
        "name": "XUV700 AX7",
        "sunroof_type": "panoramic",
        "sunroof_length_in": 32.40,
        "clip_positions": "Side sliders"
    }
]

def get_mock_response(path, args):
    """
    Route mock request parameters and return high-fidelity responses.
    """
    # 1. Products Routes
    if path == '/api/products':
        category = args.get('category')
        stock_status = args.get('stock_status')
        search = args.get('search')
        warehouse_id = args.get('warehouse_id', type=int)

        filtered = MOCK_PRODUCTS
        if category:
            filtered = [p for p in filtered if p['category'] == category.lower()]
        
        if stock_status == 'low_stock':
            filtered = [p for p in filtered if p['stock_quantity'] <= p['low_stock_threshold']]
        elif stock_status == 'out_of_stock':
            filtered = [p for p in filtered if p['stock_quantity'] == 0]
        elif stock_status == 'in_stock':
            filtered = [p for p in filtered if p['stock_quantity'] > 0]
        
        if search:
            search = search.lower()
            filtered = [
                p for p in filtered
                if search in p['name'].lower() or search in p['product_code'].lower() or search in p['year'].lower()
            ]

        if warehouse_id:
            wh_code = next((w['code'] for w in MOCK_WAREHOUSES if w['id'] == warehouse_id), None)
            if wh_code:
                filtered = [p for p in filtered if wh_code in p['warehouse_stocks'] and p['warehouse_stocks'][wh_code]['quantity'] > 0]

        return {
            "success": True,
            "data": filtered,
            "count": len(filtered)
        }

    elif path == '/api/products/low-stock':
        low_stock = [p for p in MOCK_PRODUCTS if p['stock_quantity'] <= p['low_stock_threshold']]
        return {
            "success": True,
            "data": low_stock,
            "count": len(low_stock)
        }

    elif path.startswith('/api/products/'):
        try:
            prod_id = int(path.split('/')[-1])
            product = next((p for p in MOCK_PRODUCTS if p['id'] == prod_id), None)
            if product:
                return {"success": True, "data": product}
        except ValueError:
            pass
        return {"success": False, "msg": "Product not found"}, 404

    # 2. Warehouses Routes
    elif path == '/api/warehouses':
        return {
            "success": True,
            "data": MOCK_WAREHOUSES
        }

    elif path.startswith('/api/warehouses/') and path.endswith('/stock'):
        try:
            wh_id = int(path.split('/')[-2])
            wh_code = next((w['code'] for w in MOCK_WAREHOUSES if w['id'] == wh_id), None)
            if wh_code:
                stock_list = []
                for p in MOCK_PRODUCTS:
                    qty = p['warehouse_stocks'].get(wh_code, {}).get('quantity', 0)
                    stock_list.append({
                        "id": p['id'],
                        "product_id": p['id'],
                        "product_name": p['name'],
                        "product_code": p['product_code'],
                        "quantity": qty
                    })
                return {"success": True, "data": stock_list}
        except ValueError:
            pass
        return {"success": False, "msg": "Warehouse not found"}, 404

    elif path == '/api/warehouses/transfers':
        # Return empty list or 1-2 mock transfers
        return {
            "success": True,
            "data": [
                {
                    "id": 1,
                    "product_id": 1,
                    "product_name": "Honda Civic Sunroof Assembly",
                    "from_warehouse_name": "BhaiJaan",
                    "to_warehouse_name": "Mahapoli",
                    "quantity": 2,
                    "transfer_date": (datetime.now() - timedelta(days=3)).isoformat(),
                    "notes": "Move display stock to dispatch",
                    "created_by": "Demo User"
                }
            ]
        }

    elif path.startswith('/api/warehouses/products/') and path.endswith('/stock'):
        # Get stock details for a product across all warehouses
        try:
            prod_id = int(path.split('/')[-2])
            product = next((p for p in MOCK_PRODUCTS if p['id'] == prod_id), None)
            if product:
                stock_data = []
                for wh in MOCK_WAREHOUSES:
                    qty = product['warehouse_stocks'].get(wh['code'], {}).get('quantity', 0)
                    stock_data.append({
                        "warehouse_id": wh['id'],
                        "warehouse_name": wh['name'],
                        "warehouse_code": wh['code'],
                        "quantity": qty
                    })
                return {"success": True, "data": stock_data}
        except ValueError:
            pass
        return {"success": False, "msg": "Product not found"}, 404

    # 3. Customers Routes
    elif path == '/api/customers':
        return {
            "success": True,
            "data": MOCK_CUSTOMERS,
            "count": len(MOCK_CUSTOMERS)
        }

    elif path.startswith('/api/customers/'):
        try:
            cust_id = int(path.split('/')[-1])
            customer = next((c for c in MOCK_CUSTOMERS if c['id'] == cust_id), None)
            if customer:
                return {"success": True, "data": customer}
        except ValueError:
            pass
        return {"success": False, "msg": "Customer not found"}, 404

    # 4. Sales Routes
    elif path == '/api/sales':
        status = args.get('status')
        payment_status = args.get('payment_status')
        customer = args.get('customer')

        filtered = MOCK_SALES
        if status:
            filtered = [s for s in filtered if s['status'] == status]
        if payment_status:
            filtered = [s for s in filtered if s['payment_status'] == payment_status]
        if customer:
            customer = customer.lower()
            filtered = [s for s in filtered if customer in s['customer_name'].lower()]

        return {
            "success": True,
            "data": filtered,
            "count": len(filtered)
        }

    elif path.startswith('/api/sales/') and path.endswith('/payments'):
        try:
            sale_id = int(path.split('/')[-2])
            payments = MOCK_PAYMENTS.get(sale_id, [])
            return {"success": True, "data": payments}
        except ValueError:
            pass
        return {"success": True, "data": []}

    elif path == '/api/sales/today':
        # Today's sales mock response
        today_sales = [s for s in MOCK_SALES if s['sale_date'].startswith(datetime.now().strftime('%Y-%m-%d'))]
        total_revenue = sum(s['total_amount'] for s in today_sales)
        total_paid = sum(s['amount_paid'] for s in today_sales)
        return {
            "success": True,
            "data": [
                {
                    "id": s['id'],
                    "invoice_number": s['invoice_number'],
                    "customer_name": s['customer_name'],
                    "total_amount": s['total_amount'],
                    "payment_status": s['payment_status'],
                    "items_count": s['items_count']
                } for s in today_sales
            ],
            "summary": {
                "count": len(today_sales),
                "total_revenue": total_revenue,
                "total_paid": total_paid,
                "outstanding": total_revenue - total_paid
            }
        }

    elif path.startswith('/api/sales/'):
        try:
            sale_id = int(path.split('/')[-1])
            sale = next((s for s in MOCK_SALES if s['id'] == sale_id), None)
            if sale:
                return {"success": True, "data": sale}
        except ValueError:
            pass
        return {"success": False, "msg": "Sale not found"}, 404

    # 5. Stock Intake Routes
    elif path == '/api/stock-intake':
        return {
            "success": True,
            "data": MOCK_INTAKES,
            "count": len(MOCK_INTAKES)
        }

    elif path.startswith('/api/stock-intake/'):
        try:
            intake_id = int(path.split('/')[-1])
            intake = next((i for i in MOCK_INTAKES if i['id'] == intake_id), None)
            if intake:
                return {"success": True, "data": intake}
        except ValueError:
            pass
        return {"success": False, "msg": "Intake not found"}, 404

    # 6. Expenses Routes
    elif path == '/api/expenses':
        category = args.get('category')
        filtered = MOCK_EXPENSES
        if category:
            filtered = [e for e in filtered if e['category'] == category]
        return {
            "success": True,
            "data": filtered
        }

    elif path == '/api/expenses/summary':
        # Sum by category
        categories = {}
        for e in MOCK_EXPENSES:
            categories[e['category']] = categories.get(e['category'], 0.0) + e['amount']
        
        total = sum(categories.values())
        return {
            "success": True,
            "data": {
                "month": datetime.now().strftime('%Y-%m'),
                "categories": categories,
                "total": total
            }
        }

    # 7. Catalog Routes
    elif path == '/api/catalog/variants':
        return {
            "success": True,
            "data": MOCK_VARIANTS,
            "count": len(MOCK_VARIANTS)
        }

    return None
