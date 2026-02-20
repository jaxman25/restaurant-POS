// =============================================
// RESTAURANT POS DASHBOARD WITH PAYMENT PROCESSING
// =============================================

// Global state
let menuItems = [];
let cart = [];
let currentFilter = 'all';
let currentUser = null;
let currentPin = '';
let kitchenOrders = [];
let inventoryItems = [];
let currentPaymentMethod = 'cash';
let tipAmount = 0;

// API Base URL (empty for demo mode)
const API_BASE = '';

// Chart instances
let hourlyChart = null;
let categoryChart = null;

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Initialize kitchen orders from localStorage
    loadSavedKitchenOrders();
    
    // Initialize inventory
    loadInventory();
    
    // Initialize charts after a short delay
    setTimeout(() => {
        if (document.getElementById('hourlyChart')) {
            updateCharts();
        }
    }, 500);
});

function checkAuth() {
    // For demo mode, always show login screen
    showLoginScreen();
}

// =============================================
// LOGIN FUNCTIONS
// =============================================

function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
}

function applyPermissions() {
    // Show/hide menu items based on permissions
    
    // Inventory tab
    const inventoryNav = document.getElementById('inventory-nav');
    if (inventoryNav) {
        if (!currentUser.permissions.inventory) {
            inventoryNav.style.display = 'none';
        } else {
            inventoryNav.style.display = 'flex';
        }
    }
    
    // Reports tab
    const reportsNav = document.getElementById('reports-nav');
    if (reportsNav) {
        if (!currentUser.permissions.reports) {
            reportsNav.style.display = 'none';
        } else {
            reportsNav.style.display = 'flex';
        }
    }
    
    // Clear completed button (manager only)
    const clearBtn = document.getElementById('clear-completed-btn');
    if (clearBtn) {
        if (!currentUser.permissions.staff && !currentUser.permissions.reports) {
            clearBtn.style.display = 'none';
        } else {
            clearBtn.style.display = 'inline-flex';
        }
    }
}

function addPin(digit) {
    if (currentPin.length < 4) {
        currentPin += digit;
        document.getElementById('pin-display').textContent = '•'.repeat(currentPin.length).padEnd(4, '•');
    }
}

function clearPin() {
    currentPin = '';
    document.getElementById('pin-display').textContent = '••••';
}

function deletePin() {
    currentPin = currentPin.slice(0, -1);
    document.getElementById('pin-display').textContent = '•'.repeat(currentPin.length).padEnd(4, '•');
}

function login() {
    if (currentPin.length !== 4) {
        showError('Please enter 4-digit PIN');
        return;
    }
    
    // Demo mode - direct login without server
    // Simulate different users based on PIN
    const demoUsers = {
        '1234': { 
            id: 1, 
            name: 'Admin User', 
            role: 'admin', 
            permissions: { 
                pos: true, 
                inventory: true, 
                reports: true, 
                staff: true,
                settings: true 
            } 
        },
        '1111': { 
            id: 2, 
            name: 'John Manager', 
            role: 'manager', 
            permissions: { 
                pos: true, 
                inventory: true, 
                reports: true, 
                staff: false,
                settings: false 
            } 
        },
        '2222': { 
            id: 3, 
            name: 'Sarah Staff', 
            role: 'staff', 
            permissions: { 
                pos: true, 
                inventory: false, 
                reports: false, 
                staff: false,
                settings: false 
            } 
        },
        '3333': { 
            id: 4, 
            name: 'Mike Cook', 
            role: 'cook', 
            permissions: { 
                pos: true, 
                inventory: false, 
                reports: false, 
                staff: false,
                settings: false 
            } 
        }
    };
    
    // Check if PIN exists in demo users
    if (demoUsers[currentPin]) {
        currentUser = demoUsers[currentPin];
        
        // Update UI
        document.getElementById('staff-name').textContent = currentUser.name;
        document.getElementById('staff-role').textContent = currentUser.role;
        document.getElementById('current-staff-name').textContent = currentUser.name;
        
        // Apply permissions
        applyPermissions();
        
        // Show dashboard
        showDashboard();
        
        // Load all data
        loadAllData();
        
        // Clear PIN
        clearPin();
        
        // Show success message
        showNotification(`Welcome, ${currentUser.name}!`, 'success');
    } else {
        showError('Invalid PIN');
        clearPin();
    }
}

function showError(message) {
    document.getElementById('login-error').textContent = message;
}

function logout() {
    currentUser = null;
    showLoginScreen();
    clearPin();
    
    // Clear sensitive data
    cart = [];
    renderCart();
}

// =============================================
// PERMISSION CHECKS
// =============================================

function hasPermission(permission) {
    return currentUser && currentUser.permissions && currentUser.permissions[permission];
}

// =============================================
// DATA LOADING
// =============================================

async function loadAllData() {
    loadMenuItems();
    renderKitchenOrders();
    
    if (hasPermission('inventory')) {
        loadInventory();
    }
    
    if (hasPermission('reports')) {
        loadReports();
    }
    
    updateCharts();
    updateTopItems();
    updateLowStockAlerts();
}

async function refreshData() {
    loadAllData();
    showNotification('Data refreshed!', 'success');
}

// =============================================
// TAB SWITCHING
// =============================================

function switchTab(tabName) {
    // Check permissions
    if (tabName === 'inventory' && !hasPermission('inventory')) {
        showNotification('You don\'t have permission to view inventory', 'error');
        return;
    }
    if (tabName === 'reports' && !hasPermission('reports')) {
        showNotification('You don\'t have permission to view reports', 'error');
        return;
    }
    
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Update page title
    const titles = {
        'overview': 'Dashboard Overview',
        'pos': 'Point of Sale',
        'kitchen': 'Kitchen Display',
        'inventory': 'Inventory Management',
        'reports': 'Sales Reports'
    };
    document.getElementById('page-title').textContent = titles[tabName];
    
    // Refresh data when switching tabs
    if (tabName === 'inventory') {
        loadInventory();
    }
    if (tabName === 'reports') {
        loadReports();
    }
    if (tabName === 'overview') {
        setTimeout(() => {
            updateCharts();
        }, 100);
    }
    if (tabName === 'kitchen') {
        renderKitchenOrders();
    }
}

// =============================================
// MENU FUNCTIONS
// =============================================

function loadMenuItems() {
    // Mock menu items for demo
    menuItems = getMockMenuItems();
    filterMenu('all');
}

function getMockMenuItems() {
    return [
        { id: 1, name: 'Classic Burger', price: 12.99, category: 'Mains' },
        { id: 2, name: 'Cheeseburger', price: 13.99, category: 'Mains' },
        { id: 3, name: 'French Fries', price: 4.99, category: 'Sides' },
        { id: 4, name: 'Chicken Wings', price: 10.99, category: 'Appetizers' },
        { id: 5, name: 'Soda', price: 1.99, category: 'Drinks' },
        { id: 6, name: 'Ice Cream', price: 3.99, category: 'Desserts' },
        { id: 7, name: 'Caesar Salad', price: 8.99, category: 'Appetizers' },
        { id: 8, name: 'Steak', price: 24.99, category: 'Mains' }
    ];
}

function filterMenu(category) {
    currentFilter = category;
    
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find and activate the correct button
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    } else {
        // Find and activate the "All" button
        document.querySelectorAll('.category-btn').forEach(btn => {
            if (btn.textContent.includes('All')) {
                btn.classList.add('active');
            }
        });
    }
    
    renderMenu();
}

function searchMenu() {
    renderMenu();
}

function renderMenu() {
    const grid = document.getElementById('menu-grid');
    if (!grid) return;
    
    const searchTerm = document.getElementById('menu-search')?.value.toLowerCase() || '';
    
    let filtered = menuItems;
    
    if (currentFilter !== 'all') {
        filtered = filtered.filter(item => item.category === currentFilter);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(item => 
            item.name.toLowerCase().includes(searchTerm)
        );
    }
    
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="loading">No items found</div>';
        return;
    }
    
    grid.innerHTML = filtered.map(item => `
        <div class="menu-item" onclick="addToCart(${item.id})">
            <div class="menu-item-name">${item.name}</div>
            <div class="price">$${item.price.toFixed(2)}</div>
        </div>
    `).join('');
}

// =============================================
// CART FUNCTIONS
// =============================================

function addToCart(itemId) {
    const item = menuItems.find(i => i.id === itemId);
    if (item) {
        cart.push({...item});
        renderCart();
        document.getElementById('checkout-btn').disabled = false;
        showNotification(`${item.name} added to cart`, 'success');
    }
}

function renderCart() {
    const cartDiv = document.getElementById('cart-items');
    if (!cartDiv) return;
    
    if (cart.length === 0) {
        cartDiv.innerHTML = '<div class="empty-cart">No items in order</div>';
        updateCartTotals();
        return;
    }
    
    let html = '';
    cart.forEach((item, index) => {
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                </div>
                <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                <div class="cart-item-actions">
                    <button onclick="removeFromCart(${index})" aria-label="Remove item">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    cartDiv.innerHTML = html;
    updateCartTotals();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
    document.getElementById('checkout-btn').disabled = cart.length === 0;
}

function clearCart() {
    cart = [];
    renderCart();
    document.getElementById('checkout-btn').disabled = true;
}

function updateCartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const tax = subtotal * 0.085;
    const total = subtotal + tax;
    
    document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('cart-tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`;
}

// =============================================
// PAYMENT PROCESSING FUNCTIONS
// =============================================

function processPayment() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    if (cart.length === 0) {
        showNotification('Cart is empty', 'warning');
        return;
    }
    
    // Reset payment state
    tipAmount = 0;
    currentPaymentMethod = 'cash';
    
    // Update payment modal with cart items
    updatePaymentModal();
    
    // Show payment modal
    document.getElementById('payment-modal').style.display = 'flex';
}

function updatePaymentModal() {
    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const tax = subtotal * 0.085;
    const total = subtotal + tax;
    
    // Update payment summary
    document.getElementById('payment-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('payment-tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('payment-total').textContent = `$${total.toFixed(2)}`;
    
    // Populate items list
    const itemsDiv = document.getElementById('payment-items');
    itemsDiv.innerHTML = cart.map(item => `
        <div class="payment-item">
            <span>${item.name}</span>
            <span>$${item.price.toFixed(2)}</span>
        </div>
    `).join('');
    
    // Reset payment method to cash
    selectPaymentMethod('cash');
    
    // Clear fields
    document.getElementById('amount-tendered').value = '';
    document.getElementById('change-amount').value = '0.00';
    document.getElementById('card-number').value = '';
    document.getElementById('card-expiry').value = '';
    document.getElementById('card-cvv').value = '';
    document.getElementById('card-name').value = '';
    document.getElementById('gift-card-number').value = '';
    document.getElementById('gift-card-pin').value = '';
    document.getElementById('custom-tip-field').style.display = 'none';
}

function selectPaymentMethod(method) {
    currentPaymentMethod = method;
    
    // Update active button
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`method-${method}`).classList.add('active');
    
    // Show relevant fields
    document.getElementById('cash-payment-fields').style.display = method === 'cash' ? 'block' : 'none';
    document.getElementById('card-payment-fields').style.display = method === 'card' ? 'block' : 'none';
    document.getElementById('gift-payment-fields').style.display = method === 'gift' ? 'block' : 'none';
}

function calculateChange() {
    const total = parseFloat(document.getElementById('payment-total').textContent.replace('$', ''));
    const tendered = parseFloat(document.getElementById('amount-tendered').value) || 0;
    const change = tendered - total;
    
    document.getElementById('change-amount').value = change > 0 ? change.toFixed(2) : '0.00';
}

function addTip(percentage) {
    const totalElement = document.getElementById('payment-total');
    const currentTotal = parseFloat(totalElement.textContent.replace('$', ''));
    const subtotal = parseFloat(document.getElementById('payment-subtotal').textContent.replace('$', ''));
    const tax = parseFloat(document.getElementById('payment-tax').textContent.replace('$', ''));
    
    if (percentage === 0) {
        tipAmount = 0;
        totalElement.textContent = `$${(subtotal + tax).toFixed(2)}`;
    } else {
        tipAmount = subtotal * (percentage / 100);
        const newTotal = subtotal + tax + tipAmount;
        totalElement.textContent = `$${newTotal.toFixed(2)}`;
    }
    
    document.getElementById('custom-tip-field').style.display = 'none';
}

function customTip() {
    document.getElementById('custom-tip-field').style.display = 'block';
}

function applyCustomTip() {
    const customTip = parseFloat(document.getElementById('custom-tip-amount').value) || 0;
    
    if (customTip > 0) {
        const totalElement = document.getElementById('payment-total');
        const subtotal = parseFloat(document.getElementById('payment-subtotal').textContent.replace('$', ''));
        const tax = parseFloat(document.getElementById('payment-tax').textContent.replace('$', ''));
        
        tipAmount = customTip;
        const newTotal = subtotal + tax + tipAmount;
        totalElement.textContent = `$${newTotal.toFixed(2)}`;
    }
}

function validatePayment() {
    if (currentPaymentMethod === 'cash') {
        const total = parseFloat(document.getElementById('payment-total').textContent.replace('$', ''));
        const tendered = parseFloat(document.getElementById('amount-tendered').value) || 0;
        
        if (tendered < total) {
            showNotification('Insufficient amount tendered', 'warning');
            return false;
        }
    } else if (currentPaymentMethod === 'card') {
        const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
        const expiry = document.getElementById('card-expiry').value;
        const cvv = document.getElementById('card-cvv').value;
        
        if (cardNumber.length < 15 || cardNumber.length > 16) {
            showNotification('Invalid card number', 'warning');
            return false;
        }
        
        if (!expiry.match(/^\d{2}\/\d{2}$/)) {
            showNotification('Invalid expiry date (MM/YY)', 'warning');
            return false;
        }
        
        if (cvv.length < 3 || cvv.length > 4) {
            showNotification('Invalid CVV', 'warning');
            return false;
        }
    } else if (currentPaymentMethod === 'gift') {
        const giftNumber = document.getElementById('gift-card-number').value;
        
        if (!giftNumber) {
            showNotification('Please enter gift card number', 'warning');
            return false;
        }
    }
    
    return true;
}

function completePayment() {
    if (!validatePayment()) {
        return;
    }
    
    const table = document.getElementById('table-select').value;
    const subtotal = parseFloat(document.getElementById('payment-subtotal').textContent.replace('$', ''));
    const tax = parseFloat(document.getElementById('payment-tax').textContent.replace('$', ''));
    const total = parseFloat(document.getElementById('payment-total').textContent.replace('$', ''));
    
    // Create order object
    const order = {
        id: Date.now(),
        table: table,
        items: [...cart],
        subtotal: subtotal,
        tax: tax,
        total: total,
        tip: tipAmount,
        paymentMethod: currentPaymentMethod,
        staff: currentUser.name,
        timestamp: new Date().toLocaleString()
    };
    
    // Process payment based on method
    if (currentPaymentMethod === 'cash') {
        const tendered = parseFloat(document.getElementById('amount-tendered').value);
        const change = tendered - total;
        order.tendered = tendered;
        order.change = change;
        
        showNotification(`Payment received: $${tendered.toFixed(2)}, Change: $${change.toFixed(2)}`, 'success');
    } else if (currentPaymentMethod === 'card') {
        showNotification('Card payment approved', 'success');
    } else if (currentPaymentMethod === 'gift') {
        showNotification('Gift card payment approved', 'success');
    }
    
    // Print receipt
    printReceipt(order);
    
    // Add to kitchen display
    addOrderToKitchen(order);
    
    // Update sales data
    updateSalesData(order);
    
    // Close payment modal
    closePaymentModal();
    
    // Clear cart
    clearCart();
    
    // Refresh data
    refreshData();
}

function closePaymentModal() {
    document.getElementById('payment-modal').style.display = 'none';
}

function updateSalesData(order) {
    // Update today's sales
    const todaySalesElement = document.getElementById('today-sales');
    const currentSales = parseFloat(todaySalesElement.textContent.replace('$', '').replace(',', ''));
    const newSales = currentSales + order.total;
    todaySalesElement.textContent = `$${newSales.toFixed(2)}`;
    
    // Update orders count
    const ordersElement = document.getElementById('today-orders');
    const currentOrders = parseInt(ordersElement.textContent);
    ordersElement.textContent = currentOrders + 1;
    
    // Update average order
    const avgElement = document.getElementById('avg-order');
    const currentAvg = parseFloat(avgElement.textContent.replace('$', ''));
    const newAvg = ((currentAvg * currentOrders) + order.total) / (currentOrders + 1);
    avgElement.textContent = `$${newAvg.toFixed(2)}`;
}

// =============================================
// RECEIPT PRINTING FUNCTIONS
// =============================================

function printReceipt(order) {
    // Format table number for display
    let tableDisplay = order.table;
    if (order.table === 'takeout') {
        tableDisplay = 'TAKEOUT';
    } else if (order.table === 'delivery') {
        tableDisplay = 'DELIVERY';
    } else {
        tableDisplay = `TABLE ${order.table}`;
    }
    
    // Create receipt content
    const receiptContent = `
        <div style="font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 24px;">🍔 RESTAURANT POS</h2>
                <p style="margin: 5px 0; font-size: 12px;">123 Main Street, City</p>
                <p style="margin: 5px 0; font-size: 12px;">Tel: (555) 123-4567</p>
                <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <p><strong>Order #:</strong> ${order.id}</p>
                <p><strong>${tableDisplay}</strong></p>
                <p><strong>Server:</strong> ${order.staff}</p>
                <p><strong>Date:</strong> ${order.timestamp}</p>
            </div>
            
            <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
            
            <div style="margin-bottom: 15px;">
                <table style="width: 100%; font-size: 14px;">
                    <thead>
                        <tr>
                            <th style="text-align: left;">Item</th>
                            <th style="text-align: center;">Qty</th>
                            <th style="text-align: right;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order.items.map(item => `
                            <tr>
                                <td style="text-align: left;">${item.name}</td>
                                <td style="text-align: center;">1</td>
                                <td style="text-align: right;">$${item.price.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
            
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between;">
                    <span>Subtotal:</span>
                    <span>$${order.subtotal.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Tax (8.5%):</span>
                    <span>$${order.tax.toFixed(2)}</span>
                </div>
                ${order.tip > 0 ? `
                    <div style="display: flex; justify-content: space-between;">
                        <span>Tip:</span>
                        <span>$${order.tip.toFixed(2)}</span>
                    </div>
                ` : ''}
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; margin-top: 10px; border-top: 1px solid #000; padding-top: 10px;">
                    <span>TOTAL:</span>
                    <span>$${order.total.toFixed(2)}</span>
                </div>
            </div>
            
            <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
            
            <div style="margin-bottom: 15px;">
                <p><strong>Payment Method:</strong> ${order.paymentMethod.toUpperCase()}</p>
                ${order.tendered ? `
                    <p><strong>Amount Tendered:</strong> $${order.tendered.toFixed(2)}</p>
                    <p><strong>Change:</strong> $${order.change.toFixed(2)}</p>
                ` : ''}
            </div>
            
            <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
            
            <div style="text-align: center; font-size: 12px;">
                <p>Thank you for dining with us!</p>
                <p>Please come again</p>
                <div style="margin-top: 10px;">******************</div>
            </div>
        </div>
    `;
    
    // Open print window
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
        <html>
            <head>
                <title>Receipt - Order #${order.id}</title>
                <style>
                    body { margin: 0; padding: 20px; }
                    @media print {
                        body { margin: 0; padding: 0; }
                    }
                </style>
            </head>
            <body>
                ${receiptContent}
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    };
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
}

function printKitchenTicket(order) {
    // Format table number for display
    let tableDisplay = order.table;
    if (order.table === 'takeout') {
        tableDisplay = 'TAKEOUT';
    } else if (order.table === 'delivery') {
        tableDisplay = 'DELIVERY';
    } else {
        tableDisplay = `TABLE ${order.table}`;
    }
    
    // Create kitchen ticket content
    const ticketContent = `
        <div style="font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 24px;">👨‍🍳 KITCHEN TICKET</h2>
                <div style="border-top: 2px solid #000; margin: 10px 0;"></div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <p><strong>Order #:</strong> ${order.id}</p>
                <p><strong>${tableDisplay}</strong></p>
                <p><strong>Time:</strong> ${new Date().toLocaleTimeString()}</p>
                <p><strong>Server:</strong> ${order.staff}</p>
            </div>
            
            <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
            
            <div style="margin-bottom: 15px;">
                <h3 style="margin: 0 0 10px 0;">ITEMS TO PREPARE:</h3>
                ${order.items.map(item => `
                    <div style="font-size: 16px; margin-bottom: 5px;">
                        <strong>${item.quantity}x ${item.name}</strong>
                    </div>
                `).join('')}
            </div>
            
            <div style="border-top: 2px solid #000; margin: 10px 0;"></div>
            
            <div style="text-align: center; font-size: 12px;">
                <p>🔥 FIRES UP! 🔥</p>
            </div>
        </div>
    `;
    
    // Open print window for kitchen
    const printWindow = window.open('', '_blank', 'width=400,height=500');
    printWindow.document.write(`
        <html>
            <head>
                <title>Kitchen Ticket - Order #${order.id}</title>
                <style>
                    body { margin: 0; padding: 20px; }
                    @media print {
                        body { margin: 0; padding: 0; }
                    }
                </style>
            </head>
            <body>
                ${ticketContent}
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    };
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
}

function printDailyReport(reportData, period) {
    // Create report content
    const reportContent = `
        <div style="font-family: 'Courier New', monospace; max-width: 400px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 24px;">📊 SALES REPORT</h2>
                <p style="margin: 5px 0;">${period.toUpperCase()}</p>
                <p>${new Date().toLocaleDateString()}</p>
                <div style="border-top: 2px solid #000; margin: 10px 0;"></div>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h3>SUMMARY</h3>
                <div style="display: flex; justify-content: space-between;">
                    <span>Total Sales:</span>
                    <span>$${reportData.summary.total_sales.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Total Orders:</span>
                    <span>${reportData.summary.total_orders}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Average Order:</span>
                    <span>$${reportData.summary.avg_order_value.toFixed(2)}</span>
                </div>
            </div>
            
            <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
            
            <div style="margin-bottom: 20px;">
                <h3>TOP ITEMS</h3>
                <table style="width: 100%;">
                    <thead>
                        <tr>
                            <th style="text-align: left;">Item</th>
                            <th style="text-align: center;">Qty</th>
                            <th style="text-align: right;">Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${reportData.top_items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td style="text-align: center;">${item.quantity_sold}</td>
                                <td style="text-align: right;">$${item.revenue.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="border-top: 2px solid #000; margin: 10px 0;"></div>
            
            <div style="text-align: center;">
                <p>End of Report</p>
            </div>
        </div>
    `;
    
    // Open print window for report
    const printWindow = window.open('', '_blank', 'width=500,height=700');
    printWindow.document.write(`
        <html>
            <head>
                <title>Sales Report - ${period}</title>
                <style>
                    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                    @media print {
                        body { margin: 0; padding: 0; }
                    }
                </style>
            </head>
            <body>
                ${reportContent}
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function() { window.close(); }, 500);
                    };
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
}

// =============================================
// KITCHEN FUNCTIONS
// =============================================

function getDefaultKitchenOrders() {
    return [
        {
            id: 1,
            table_number: 'Table 5',
            time: '12:30 PM',
            status: 'new',
            created_by: 'Sarah Staff',
            items: [
                { name: 'Classic Burger', quantity: 2 },
                { name: 'French Fries', quantity: 1 }
            ]
        },
        {
            id: 2,
            table_number: 'Table 3',
            time: '12:28 PM',
            status: 'preparing',
            created_by: 'John Manager',
            items: [
                { name: 'Chicken Wings', quantity: 1 }
            ]
        },
        {
            id: 3,
            table_number: 'Table 8',
            time: '12:25 PM',
            status: 'ready',
            created_by: 'Admin User',
            items: [
                { name: 'Steak', quantity: 2 }
            ]
        }
    ];
}

function loadSavedKitchenOrders() {
    const saved = localStorage.getItem('kitchenOrders');
    if (saved) {
        try {
            kitchenOrders = JSON.parse(saved);
        } catch (e) {
            kitchenOrders = getDefaultKitchenOrders();
        }
    } else {
        kitchenOrders = getDefaultKitchenOrders();
    }
    renderKitchenOrders();
}

function saveKitchenOrders() {
    localStorage.setItem('kitchenOrders', JSON.stringify(kitchenOrders));
}

function renderKitchenOrders() {
    const container = document.getElementById('kitchen-orders');
    if (!container) return;
    
    if (!kitchenOrders || kitchenOrders.length === 0) {
        container.innerHTML = '<div class="loading">No active orders</div>';
        updateKitchenBadges();
        return;
    }
    
    updateKitchenBadges();
    
    container.innerHTML = kitchenOrders.map(order => `
        <div class="kitchen-order-card ${order.status}">
            <div class="kitchen-order-header">
                <span class="kitchen-order-table">${order.table_number}</span>
                <span class="kitchen-order-time">${order.time}</span>
            </div>
            <div class="kitchen-order-items">
                ${order.items.map(item => `
                    <div class="kitchen-order-item">
                        ${item.quantity}x ${item.name}
                    </div>
                `).join('')}
            </div>
            <div class="kitchen-order-footer">
                <i class="fas fa-user"></i> Taken by: ${order.created_by || 'Unknown'}
            </div>
            <div class="kitchen-order-actions">
                ${order.status === 'new' ? 
                    `<button class="btn btn-secondary" onclick="updateOrderStatus(${order.id}, 'preparing')">Start Preparing</button>` : 
                 order.status === 'preparing' ?
                    `<button class="btn btn-primary" onclick="updateOrderStatus(${order.id}, 'ready')">Mark Ready</button>` :
                 order.status === 'ready' ?
                    `<button class="btn btn-success" onclick="updateOrderStatus(${order.id}, 'served')">Mark Served</button>` :
                    `<span class="badge-success">✓ Served</span>`
                }
            </div>
        </div>
    `).join('');
}

function updateKitchenBadges() {
    const newCount = kitchenOrders.filter(o => o.status === 'new').length;
    const preparingCount = kitchenOrders.filter(o => o.status === 'preparing').length;
    const readyCount = kitchenOrders.filter(o => o.status === 'ready').length;
    
    document.getElementById('kitchen-badge').textContent = kitchenOrders.length;
    document.getElementById('new-count').textContent = newCount;
    document.getElementById('preparing-count').textContent = preparingCount;
    document.getElementById('ready-count').textContent = readyCount;
}

function updateOrderStatus(orderId, newStatus) {
    // Find the order
    const orderIndex = kitchenOrders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
        showNotification('Order not found', 'error');
        return;
    }
    
    // Get the order
    const order = kitchenOrders[orderIndex];
    
    // Define status messages
    const statusMessages = {
        'preparing': 'started preparing',
        'ready': 'is ready for serving',
        'served': 'has been served'
    };
    
    // Update the status
    order.status = newStatus;
    
    // If status is 'served', remove from kitchen display
    if (newStatus === 'served') {
        // Remove from kitchen orders
        kitchenOrders.splice(orderIndex, 1);
        
        // Show notification
        showNotification(`Order from ${order.table_number} has been served`, 'success');
    } else {
        // Show status change notification
        showNotification(`Order from ${order.table_number} ${statusMessages[newStatus] || 'updated'}`, 'success');
    }
    
    // Re-render the kitchen display
    renderKitchenOrders();
    
    // Save to localStorage for persistence
    saveKitchenOrders();
}

function addOrderToKitchen(order) {
    // Format table number
    let tableDisplay = order.table;
    if (order.table === 'takeout') {
        tableDisplay = 'Takeout';
    } else if (order.table === 'delivery') {
        tableDisplay = 'Delivery';
    } else {
        tableDisplay = `Table ${order.table}`;
    }
    
    const newOrder = {
        id: order.id,
        table_number: tableDisplay,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: 'new',
        created_by: currentUser ? currentUser.name : 'Unknown',
        items: order.items.map(item => ({
            name: item.name,
            quantity: 1
        }))
    };
    
    kitchenOrders.unshift(newOrder); // Add to beginning
    renderKitchenOrders();
    saveKitchenOrders();
    
    // Print kitchen ticket
    printKitchenTicket(order);
    
    showNotification(`New order added to kitchen (${tableDisplay})`, 'success');
}

function clearCompletedOrders() {
    if (!hasPermission('staff') && !hasPermission('reports')) {
        showNotification('Only managers can clear completed orders', 'error');
        return;
    }
    
    const beforeCount = kitchenOrders.length;
    kitchenOrders = kitchenOrders.filter(o => o.status !== 'served');
    const afterCount = kitchenOrders.length;
    const removedCount = beforeCount - afterCount;
    
    renderKitchenOrders();
    saveKitchenOrders();
    
    if (removedCount > 0) {
        showNotification(`Cleared ${removedCount} completed orders`, 'success');
    } else {
        showNotification('No completed orders to clear', 'info');
    }
}

function resetKitchenOrders() {
    if (!hasPermission('staff')) {
        showNotification('Only managers can reset kitchen orders', 'error');
        return;
    }
    
    kitchenOrders = getDefaultKitchenOrders();
    renderKitchenOrders();
    saveKitchenOrders();
    
    showNotification('Kitchen orders reset to default', 'success');
}

// =============================================
// INVENTORY FUNCTIONS
// =============================================

function loadInventory() {
    // Mock inventory data - store globally
    inventoryItems = [
        { id: 1, name: 'Beef Patty', stock: 45, unit: 'each', reorder: 20, status: 'ok' },
        { id: 2, name: 'Burger Bun', stock: 32, unit: 'each', reorder: 30, status: 'low' },
        { id: 3, name: 'Lettuce', stock: 8, unit: 'head', reorder: 10, status: 'low' },
        { id: 4, name: 'Chicken Wings', stock: 0, unit: 'lbs', reorder: 15, status: 'out' },
        { id: 5, name: 'Frying Oil', stock: 5, unit: 'gallon', reorder: 2, status: 'ok' },
        { id: 6, name: 'Soda Syrup', stock: 3, unit: 'gallon', reorder: 4, status: 'low' },
        { id: 7, name: 'Cheese', stock: 50, unit: 'slice', reorder: 20, status: 'ok' },
        { id: 8, name: 'Bacon', stock: 15, unit: 'lbs', reorder: 10, status: 'ok' }
    ];
    
    renderInventory(inventoryItems);
    populateInventoryDropdown();
}

function renderInventory(items) {
    const tbody = document.getElementById('inventory-body');
    if (!tbody) return;
    
    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading">No items</td></tr>';
        return;
    }
    
    const lowStock = items.filter(i => i.status === 'low' || i.stock <= i.reorder).length;
    const outOfStock = items.filter(i => i.stock <= 0).length;
    const totalValue = items.reduce((sum, item) => sum + (item.stock * (item.cost || 2.50)), 0);
    
    document.getElementById('low-stock-count').textContent = lowStock;
    document.getElementById('inventory-badge').textContent = lowStock + outOfStock;
    document.getElementById('total-inventory-value').textContent = `$${totalValue.toFixed(2)}`;
    
    tbody.innerHTML = items.map(item => {
        let statusClass = 'badge-success';
        let statusText = 'OK';
        
        if (item.stock <= 0) {
            statusClass = 'badge-danger';
            statusText = 'Out of Stock';
        } else if (item.stock <= item.reorder) {
            statusClass = 'badge-warning';
            statusText = 'Low Stock';
        }
        
        return `
            <tr>
                <td>${item.name}</td>
                <td>${item.stock}</td>
                <td>${item.unit}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-secondary btn-small" onclick="showReceiveStockModal(${item.id})" ${!hasPermission('inventory') ? 'disabled' : ''}>
                        Receive
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function populateInventoryDropdown() {
    const select = document.getElementById('receive-item');
    if (!select) return;
    
    if (!inventoryItems || inventoryItems.length === 0) {
        select.innerHTML = '<option value="">No items available</option>';
        return;
    }
    
    let options = '<option value="">-- Select Item --</option>';
    inventoryItems.forEach(item => {
        options += `<option value="${item.id}">${item.name} (Current: ${item.stock} ${item.unit})</option>`;
    });
    
    select.innerHTML = options;
}

function showReceiveStockModal(itemId = null) {
    if (!hasPermission('inventory')) {
        showNotification('You don\'t have permission to receive stock', 'error');
        return;
    }
    
    // Refresh dropdown
    populateInventoryDropdown();
    
    // If specific item ID is provided, select it
    if (itemId) {
        const select = document.getElementById('receive-item');
        if (select) {
            select.value = itemId;
        }
    }
    
    document.getElementById('receive-stock-modal').style.display = 'flex';
}

function closeReceiveStockModal() {
    document.getElementById('receive-stock-modal').style.display = 'none';
    // Clear form
    document.getElementById('receive-quantity').value = '';
}

function receiveStock() {
    if (!hasPermission('inventory')) return;
    
    const itemId = document.getElementById('receive-item').value;
    const quantity = parseFloat(document.getElementById('receive-quantity').value);
    
    if (!itemId) {
        showNotification('Please select an item', 'warning');
        return;
    }
    
    if (!quantity || quantity <= 0) {
        showNotification('Please enter a valid quantity', 'warning');
        return;
    }
    
    // Find the item
    const item = inventoryItems.find(i => i.id == itemId);
    if (item) {
        // Update stock
        item.stock += quantity;
        
        // Update status
        if (item.stock <= 0) {
            item.status = 'out';
        } else if (item.stock <= item.reorder) {
            item.status = 'low';
        } else {
            item.status = 'ok';
        }
        
        // Re-render inventory
        renderInventory(inventoryItems);
        populateInventoryDropdown();
        
        // Show success message
        showNotification(`Received ${quantity} ${item.unit} of ${item.name}`, 'success');
    }
    
    closeReceiveStockModal();
}

// =============================================
// REPORTS FUNCTIONS
// =============================================

function loadReports() {
    if (!hasPermission('reports')) return;
    
    const period = document.getElementById('report-period')?.value || 'today';
    
    // Mock report data
    const data = getMockReportData(period);
    renderReports(data);
}

function getMockReportData(period) {
    // Different data based on period
    if (period === 'today') {
        return {
            summary: { total_sales: 2450.75, total_orders: 42, avg_order_value: 58.35 },
            by_category: [
                { category: 'Mains', revenue: 1250.50 },
                { category: 'Drinks', revenue: 480.25 },
                { category: 'Appetizers', revenue: 380.00 },
                { category: 'Sides', revenue: 195.00 },
                { category: 'Desserts', revenue: 145.00 }
            ],
            top_items: [
                { name: 'Classic Burger', quantity_sold: 18, revenue: 233.82 },
                { name: 'French Fries', quantity_sold: 15, revenue: 74.85 },
                { name: 'Chicken Wings', quantity_sold: 12, revenue: 131.88 },
                { name: 'Soda', quantity_sold: 20, revenue: 39.80 },
                { name: 'Steak', quantity_sold: 8, revenue: 199.92 }
            ]
        };
    } else if (period === 'week') {
        return {
            summary: { total_sales: 15750.50, total_orders: 285, avg_order_value: 55.26 },
            by_category: [
                { category: 'Mains', revenue: 8250.75 },
                { category: 'Drinks', revenue: 3150.25 },
                { category: 'Appetizers', revenue: 2350.50 },
                { category: 'Sides', revenue: 1250.00 },
                { category: 'Desserts', revenue: 749.00 }
            ],
            top_items: [
                { name: 'Classic Burger', quantity_sold: 125, revenue: 1623.75 },
                { name: 'French Fries', quantity_sold: 110, revenue: 548.90 },
                { name: 'Chicken Wings', quantity_sold: 95, revenue: 1044.05 },
                { name: 'Soda', quantity_sold: 180, revenue: 358.20 },
                { name: 'Steak', quantity_sold: 65, revenue: 1624.35 }
            ]
        };
    } else {
        return {
            summary: { total_sales: 62500.25, total_orders: 1120, avg_order_value: 55.80 },
            by_category: [
                { category: 'Mains', revenue: 32750.50 },
                { category: 'Drinks', revenue: 12500.75 },
                { category: 'Appetizers', revenue: 9250.00 },
                { category: 'Sides', revenue: 4500.00 },
                { category: 'Desserts', revenue: 3499.00 }
            ],
            top_items: [
                { name: 'Classic Burger', quantity_sold: 520, revenue: 6754.80 },
                { name: 'French Fries', quantity_sold: 485, revenue: 2420.15 },
                { name: 'Chicken Wings', quantity_sold: 410, revenue: 4505.90 },
                { name: 'Soda', quantity_sold: 750, revenue: 1492.50 },
                { name: 'Steak', quantity_sold: 280, revenue: 6997.20 }
            ]
        };
    }
}

function renderReports(data) {
    const reportDiv = document.getElementById('report-data');
    if (!reportDiv) return;
    
    // Calculate percentages for category table
    const totalRevenue = data.summary.total_sales;
    
    let html = `
        <div class="card">
            <div class="card-header"><h3>Summary</h3></div>
            <div class="card-body">
                <p><strong>Total Sales:</strong> <span style="color: #27ae60; font-weight: bold;">$${data.summary.total_sales.toFixed(2)}</span></p>
                <p><strong>Total Orders:</strong> <span style="font-weight: bold;">${data.summary.total_orders}</span></p>
                <p><strong>Average Order:</strong> <span style="font-weight: bold;">$${data.summary.avg_order_value.toFixed(2)}</span></p>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header"><h3>Sales by Category</h3></div>
            <div class="card-body">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Revenue</th>
                            <th>%</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.by_category.map(cat => {
                            const percentage = ((cat.revenue / totalRevenue) * 100).toFixed(1);
                            return `
                                <tr>
                                    <td>${cat.category}</td>
                                    <td>$${cat.revenue.toFixed(2)}</td>
                                    <td>${percentage}%</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header"><h3>Top Items</h3></div>
            <div class="card-body">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.top_items.map(item => `
                            <tr>
                                <td><strong>${item.name}</strong></td>
                                <td>${item.quantity_sold}</td>
                                <td>$${item.revenue.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    reportDiv.innerHTML = html;
}

function exportReport() {
    if (!hasPermission('reports')) {
        showNotification('You don\'t have permission to export reports', 'error');
        return;
    }
    
    const period = document.getElementById('report-period')?.value || 'today';
    const data = getMockReportData(period);
    
    // Print the report
    printDailyReport(data, period);
    
    showNotification(`Report for ${period} sent to printer`, 'success');
}

// =============================================
// OVERVIEW DASHBOARD FUNCTIONS
// =============================================

function updateTopItems() {
    const tbody = document.getElementById('top-items-body');
    if (!tbody) return;
    
    const items = [
        { name: 'Classic Burger', qty: 18, revenue: 233.82 },
        { name: 'French Fries', qty: 15, revenue: 74.85 },
        { name: 'Chicken Wings', qty: 12, revenue: 131.88 },
        { name: 'Soda', qty: 20, revenue: 39.80 },
        { name: 'Steak', qty: 8, revenue: 199.92 }
    ];
    
    tbody.innerHTML = items.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.qty}</td>
            <td>$${item.revenue.toFixed(2)}</td>
        </tr>
    `).join('');
}

function updateLowStockAlerts() {
    const alertsDiv = document.getElementById('low-stock-alerts');
    if (!alertsDiv) return;
    
    if (!inventoryItems || inventoryItems.length === 0) {
        alertsDiv.innerHTML = '<div class="alert-success">No low stock items</div>';
        return;
    }
    
    const lowStock = inventoryItems.filter(i => i.status === 'low' || i.stock <= i.reorder);
    
    if (lowStock.length === 0) {
        alertsDiv.innerHTML = '<div class="alert-success">All stock levels are good ✓</div>';
        return;
    }
    
    alertsDiv.innerHTML = lowStock.map(item => `
        <div class="alert-item ${item.stock === 0 ? 'alert-danger' : 'alert-warning'}">
            <i class="fas ${item.stock === 0 ? 'fa-times-circle' : 'fa-exclamation-triangle'}"></i>
            <span><strong>${item.name}</strong> - ${item.stock === 0 ? 'Out of stock' : `Low stock: ${item.stock} ${item.unit} remaining (Reorder at: ${item.reorder})`}</span>
            <button class="btn btn-secondary btn-small" onclick="showReceiveStockModal(${item.id})" style="margin-left: auto;">Order</button>
        </div>
    `).join('');
}

// =============================================
// CHARTS
// =============================================

function updateCharts() {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
        updateHourlyChart();
        updateCategoryChart();
    }, 100);
}

function updateHourlyChart() {
    const canvas = document.getElementById('hourlyChart');
    if (!canvas) return;
    
    // Get the context
    const ctx = canvas.getContext('2d');
    
    // Get container dimensions
    const container = canvas.closest('.chart-container');
    if (container) {
        // Set explicit dimensions
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }
    
    // Destroy existing chart if it exists
    if (hourlyChart) {
        hourlyChart.destroy();
    }
    
    // Create new chart
    hourlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM'],
            datasets: [{
                label: 'Sales ($)',
                data: [180, 650, 820, 420, 280, 190, 380],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#3498db',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#3498db',
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.05)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            layout: {
                padding: {
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10
                }
            }
        }
    });
}

function updateCategoryChart() {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    
    // Get the context
    const ctx = canvas.getContext('2d');
    
    // Get container dimensions
    const container = canvas.closest('.chart-container');
    if (container) {
        // Set explicit dimensions
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }
    
    // Destroy existing chart if it exists
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    // Create new chart
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Mains', 'Drinks', 'Appetizers', 'Sides', 'Desserts'],
            datasets: [{
                data: [1250, 480, 380, 195, 145],
                backgroundColor: ['#3498db', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6'],
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            let value = context.raw || 0;
                            let total = context.dataset.data.reduce((a, b) => a + b, 0);
                            let percentage = Math.round((value / total) * 100);
                            return `${label}: $${value} (${percentage}%)`;
                        }
                    }
                }
            },
            layout: {
                padding: {
                    top: 20,
                    bottom: 20,
                    left: 10,
                    right: 10
                }
            }
        }
    });
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

function updateDateTime() {
    const now = new Date();
    const datetimeEl = document.getElementById('current-datetime');
    if (datetimeEl) {
        datetimeEl.textContent = now.toLocaleString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 3000;
        animation: slideIn 0.3s;
        border-left: 4px solid ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
}

// Handle window resize to redraw charts
window.addEventListener('resize', function() {
    if (document.getElementById('overview-tab')?.classList.contains('active')) {
        updateCharts();
    }
});

// Add notification animation style
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);