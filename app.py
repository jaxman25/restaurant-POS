from flask import Flask, jsonify, request, render_template, send_from_directory, session
from flask_cors import CORS
from db import get_db_connection
from datetime import datetime, timedelta
import json
import os
from functools import wraps

app = Flask(__name__)
app.secret_key = 'your-secret-key-change-in-production'  # Required for sessions
CORS(app, supports_credentials=True)

# =============================================
# LOGIN REQUIRED DECORATOR
# =============================================

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Not authenticated'}), 401
        return f(*args, **kwargs)
    return decorated_function

def permission_required(permission):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return jsonify({'error': 'Not authenticated'}), 401
            
            # Check permission from session
            user_permissions = session.get('permissions', {})
            if not user_permissions.get(permission, False):
                return jsonify({'error': 'Permission denied'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# =============================================
# AUTHENTICATION API
# =============================================

@app.route('/')
def serve_dashboard():
    return render_template('dashboard.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login with PIN"""
    data = request.json
    pin = data.get('pin')
    
    conn = get_db_connection()
    if not conn:
        # Demo mode - use mock staff
        return handle_demo_login(pin)
    
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, pin_code, name, email, role, permissions, is_active 
            FROM staff 
            WHERE pin_code = %s AND is_active = true
        """, (pin,))
        
        staff = cur.fetchone()
        cur.close()
        conn.close()
        
        if staff:
            # Set session
            session['user_id'] = staff['id']
            session['user_name'] = staff['name']
            session['user_role'] = staff['role']
            session['permissions'] = staff['permissions']
            
            # Update last login
            update_last_login(staff['id'])
            
            return jsonify({
                'success': True,
                'user': {
                    'id': staff['id'],
                    'name': staff['name'],
                    'role': staff['role'],
                    'permissions': staff['permissions']
                }
            })
        else:
            return jsonify({'success': False, 'error': 'Invalid PIN'}), 401
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

def handle_demo_login(pin):
    """Handle login in demo mode without database"""
    # Demo staff database
    demo_staff = {
        '1234': {'id': 1, 'name': 'Admin User', 'role': 'admin', 'permissions': {
            'pos': True, 'inventory': True, 'reports': True, 'staff': True, 'settings': True
        }},
        '1111': {'id': 2, 'name': 'John Manager', 'role': 'manager', 'permissions': {
            'pos': True, 'inventory': True, 'reports': True, 'staff': False, 'settings': False
        }},
        '2222': {'id': 3, 'name': 'Sarah Staff', 'role': 'staff', 'permissions': {
            'pos': True, 'inventory': False, 'reports': False, 'staff': False, 'settings': False
        }},
        '3333': {'id': 4, 'name': 'Mike Cook', 'role': 'staff', 'permissions': {
            'pos': True, 'inventory': False, 'reports': False, 'staff': False, 'settings': False
        }}
    }
    
    if pin in demo_staff:
        staff = demo_staff[pin]
        session['user_id'] = staff['id']
        session['user_name'] = staff['name']
        session['user_role'] = staff['role']
        session['permissions'] = staff['permissions']
        
        return jsonify({
            'success': True,
            'user': staff
        })
    else:
        return jsonify({'success': False, 'error': 'Invalid PIN'}), 401

def update_last_login(staff_id):
    """Update staff last login timestamp"""
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("UPDATE staff SET last_login = CURRENT_TIMESTAMP WHERE id = %s", (staff_id,))
            conn.commit()
            cur.close()
            conn.close()
        except:
            pass

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Logout user"""
    session.clear()
    return jsonify({'success': True})

@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    """Get current logged in user"""
    if 'user_id' in session:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': session['user_id'],
                'name': session['user_name'],
                'role': session['user_role'],
                'permissions': session['permissions']
            }
        })
    else:
        return jsonify({'authenticated': False}), 401

@app.route('/api/auth/staff', methods=['GET'])
@login_required
@permission_required('staff')
def get_staff():
    """Get all staff members (admin/manager only)"""
    conn = get_db_connection()
    if not conn:
        # Return demo staff
        return jsonify({'staff': [
            {'id': 1, 'name': 'Admin User', 'pin': '1234', 'role': 'admin', 'email': 'admin@restaurant.com', 'active': True, 'last_login': '2024-01-15 09:30'},
            {'id': 2, 'name': 'John Manager', 'pin': '1111', 'role': 'manager', 'email': 'john@restaurant.com', 'active': True, 'last_login': '2024-01-15 08:45'},
            {'id': 3, 'name': 'Sarah Staff', 'pin': '2222', 'role': 'staff', 'email': 'sarah@restaurant.com', 'active': True, 'last_login': '2024-01-15 09:00'},
            {'id': 4, 'name': 'Mike Cook', 'pin': '3333', 'role': 'staff', 'email': 'mike@restaurant.com', 'active': True, 'last_login': '2024-01-14 16:30'}
        ]})
    
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, pin_code, name, email, role, permissions, is_active, last_login 
            FROM staff 
            ORDER BY created_at DESC
        """)
        staff = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({'staff': staff})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/staff', methods=['POST'])
@login_required
@permission_required('staff')
def create_staff():
    """Create new staff member"""
    data = request.json
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': True, 'message': 'Staff created (demo)'})
    
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO staff (pin_code, name, email, role, permissions, created_by)
            VALUES (%s, %s, %s, %s, %s::jsonb, %s)
            RETURNING id
        """, (
            data['pin'],
            data['name'],
            data.get('email'),
            data['role'],
            json.dumps(data.get('permissions', {})),
            session['user_id']
        ))
        
        staff_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'success': True, 'id': staff_id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/staff/<int:staff_id>', methods=['PUT'])
@login_required
@permission_required('staff')
def update_staff(staff_id):
    """Update staff member"""
    data = request.json
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': True})
    
    try:
        cur = conn.cursor()
        cur.execute("""
            UPDATE staff 
            SET name = %s,
                email = %s,
                role = %s,
                permissions = %s::jsonb,
                is_active = %s
            WHERE id = %s
        """, (
            data['name'],
            data.get('email'),
            data['role'],
            json.dumps(data.get('permissions', {})),
            data.get('is_active', True),
            staff_id
        ))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/staff/<int:staff_id>/reset-pin', methods=['POST'])
@login_required
@permission_required('staff')
def reset_staff_pin(staff_id):
    """Reset staff PIN"""
    data = request.json
    new_pin = data.get('pin')
    
    conn = get_db_connection()
    if not conn:
        return jsonify({'success': True})
    
    try:
        cur = conn.cursor()
        cur.execute("UPDATE staff SET pin_code = %s WHERE id = %s", (new_pin, staff_id))
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =============================================
# ORDERS API WITH STAFF TRACKING
# =============================================

@app.route('/api/orders', methods=['POST'])
@login_required
def create_order():
    """Create a new order with staff tracking"""
    data = request.json
    staff_id = session['user_id']
    staff_name = session['user_name']
    
    conn = get_db_connection()
    if not conn:
        # Demo mode
        return jsonify({
            'success': True,
            'order_id': 1234,
            'message': f'Order created by {staff_name}'
        })
    
    try:
        cur = conn.cursor()
        
        # Generate order number
        cur.execute("SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM orders")
        next_id = cur.fetchone()['next_id']
        order_number = f"ORD-{datetime.now().strftime('%Y%m%d')}-{next_id:04d}"
        
        # Calculate totals
        subtotal = sum(item['price'] for item in data['items'])
        tax = subtotal * 0.085
        total = subtotal + tax
        
        # Insert order with staff_id
        cur.execute("""
            INSERT INTO orders (
                order_number, table_number, order_type, status,
                subtotal, tax_amount, total_amount,
                special_instructions, created_by, created_by_name
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            order_number,
            data.get('table', '1'),
            data.get('order_type', 'dine-in'),
            'new',
            subtotal,
            tax,
            total,
            data.get('special_instructions', ''),
            staff_id,
            staff_name
        ))
        
        order_id = cur.fetchone()['id']
        
        # Insert order items
        for item in data['items']:
            cur.execute("""
                INSERT INTO order_items (
                    order_id, product_id, product_name,
                    quantity, unit_price, total_price
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                order_id,
                item['id'],
                item['name'],
                1,  # quantity
                item['price'],
                item['price']
            ))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'order_id': order_id,
            'message': f'Order created by {staff_name}'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/kitchen-orders', methods=['GET'])
def get_kitchen_orders():
    """Get active kitchen orders with staff info"""
    conn = get_db_connection()
    if not conn:
        # Return mock orders with staff info
        return jsonify({'orders': [
            {
                'id': 1,
                'table_number': 'Table 5',
                'time': '12:30 PM',
                'status': 'new',
                'created_by': 'Sarah Staff',
                'items': [
                    {'name': 'Classic Burger', 'quantity': 2},
                    {'name': 'French Fries', 'quantity': 1}
                ]
            },
            {
                'id': 2,
                'table_number': 'Table 3',
                'time': '12:28 PM',
                'status': 'preparing',
                'created_by': 'John Manager',
                'items': [
                    {'name': 'Chicken Wings', 'quantity': 1}
                ]
            }
        ]})
    
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT 
                o.id, o.table_number, o.status, o.created_by_name,
                to_char(o.created_at, 'HH12:MI AM') as time,
                json_agg(
                    json_build_object(
                        'name', oi.product_name,
                        'quantity', oi.quantity
                    )
                ) as items
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status IN ('new', 'preparing')
            GROUP BY o.id
            ORDER BY o.created_at DESC
        """)
        
        orders = cur.fetchall()
        cur.close()
        conn.close()
        
        return jsonify({'orders': orders})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =============================================
# PRODUCTS API
# =============================================

@app.route('/api/products', methods=['GET'])
def get_products():
    """Get all menu products"""
    conn = get_db_connection()
    if not conn:
        return jsonify({"products": get_mock_products()})
    
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM products WHERE is_available = true")
        products = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({"products": products})
    except Exception as e:
        return jsonify({"products": get_mock_products()})

def get_mock_products():
    """Return mock product data for demo"""
    return [
        {"id": 1, "name": "Classic Burger", "price": 12.99, "category": "Mains"},
        {"id": 2, "name": "Cheeseburger", "price": 13.99, "category": "Mains"},
        {"id": 3, "name": "French Fries", "price": 4.99, "category": "Sides"},
        {"id": 4, "name": "Chicken Wings", "price": 10.99, "category": "Appetizers"},
        {"id": 5, "name": "Soda", "price": 1.99, "category": "Drinks"},
        {"id": 6, "name": "Ice Cream", "price": 3.99, "category": "Desserts"},
        {"id": 7, "name": "Caesar Salad", "price": 8.99, "category": "Appetizers"},
        {"id": 8, "name": "Steak", "price": 24.99, "category": "Mains"}
    ]

# =============================================
# INVENTORY API
# =============================================

@app.route('/api/inventory', methods=['GET'])
@login_required
def get_inventory():
    """Get inventory items"""
    # Return mock inventory data
    inventory = [
        {"id": 1, "name": "Beef Patty", "stock": 45, "unit": "each", "reorder": 20, "status": "ok"},
        {"id": 2, "name": "Burger Bun", "stock": 32, "unit": "each", "reorder": 30, "status": "low"},
        {"id": 3, "name": "Lettuce", "stock": 8, "unit": "head", "reorder": 10, "status": "low"},
        {"id": 4, "name": "Chicken Wings", "stock": 0, "unit": "lbs", "reorder": 15, "status": "out"}
    ]
    
    return jsonify({"inventory": inventory})

@app.route('/api/inventory/receive', methods=['POST'])
@login_required
@permission_required('inventory')
def receive_inventory():
    """Receive stock (inventory permission required)"""
    data = request.json
    staff_name = session['user_name']
    
    return jsonify({
        'success': True, 
        'message': f'Stock received by {staff_name}'
    })

# =============================================
# REPORTS API
# =============================================

@app.route('/api/reports/sales', methods=['GET'])
@login_required
@permission_required('reports')
def get_sales_report():
    """Get sales report (reports permission required)"""
    period = request.args.get('period', 'today')
    
    # Return mock report data
    report = {
        "summary": {
            "total_sales": 2450.75,
            "total_orders": 42,
            "avg_order_value": 58.35
        },
        "by_category": [
            {"category": "Mains", "revenue": 1250.50},
            {"category": "Drinks", "revenue": 480.25},
            {"category": "Appetizers", "revenue": 380.00}
        ],
        "top_items": [
            {"name": "Classic Burger", "quantity_sold": 18, "revenue": 233.82},
            {"name": "French Fries", "quantity_sold": 15, "revenue": 74.85}
        ]
    }
    
    return jsonify(report)

# =============================================
# CHECK PERMISSIONS API
# =============================================

@app.route('/api/auth/permissions', methods=['GET'])
@login_required
def check_permissions():
    """Check what permissions current user has"""
    return jsonify({
        'permissions': session.get('permissions', {})
    })

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 Restaurant POS with Staff Login System")
    print("=" * 50)
    print("📍 Server: http://127.0.0.1:5000")
    print("📍 Demo PINs:")
    print("   - 1234 (Admin)")
    print("   - 1111 (Manager)")
    print("   - 2222 (Staff)")
    print("   - 3333 (Cook)")
    print("=" * 50)
    app.run(debug=True, port=5000)