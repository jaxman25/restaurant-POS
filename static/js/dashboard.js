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
let inventoryTransactions = [];

// Chart instances
let hourlyChart = null;
let categoryChart = null;

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    
    checkAuth();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Initialize all data
    initializeSalesData();
    loadInventory();
    loadSavedKitchenOrders();
    loadInventoryTransactions();
    
    // Update displays after a short delay
    setTimeout(() => {
        loadMenuItems();
        updateCharts();
        updateTopItems();
        updateLowStockAlerts();
        renderKitchenOrders();
        
        console.log('Initialization complete');
    }, 500);
});

function checkAuth() {
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
    const inventoryNav = document.getElementById('inventory-nav');
    if (inventoryNav) {
        inventoryNav.style.display = currentUser.permissions.inventory ? 'flex' : 'none';
    }
    
    const reportsNav = document.getElementById('reports-nav');
    if (reportsNav) {
        reportsNav.style.display = currentUser.permissions.reports ? 'flex' : 'none';
    }
    
    const clearBtn = document.getElementById('clear-completed-btn');
    if (clearBtn) {
        clearBtn.style.display = (currentUser.permissions.staff || currentUser.permissions.reports) ? 'inline-flex' : 'none';
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
    
    const demoUsers = {
        '1234': { 
            id: 1, 
            name: 'Admin User', 
            role: 'admin', 
            permissions: { pos: true, inventory: true, reports: true, staff: true, settings: true } 
        },
        '1111': { 
            id: 2, 
            name: 'John Manager', 
            role: 'manager', 
            permissions: { pos: true, inventory: true, reports: true, staff: false, settings: false } 
        },
        '2222': { 
            id: 3, 
            name: 'Sarah Staff', 
            role: 'staff', 
            permissions: { pos: true, inventory: false, reports: false, staff: false, settings: false } 
        },
        '3333': { 
            id: 4, 
            name: 'Mike Cook', 
            role: 'cook', 
            permissions: { pos: true, inventory: false, reports: false, staff: false, settings: false } 
        }
    };
    
    if (demoUsers[currentPin]) {
        currentUser = demoUsers[currentPin];
        
        document.getElementById('staff-name').textContent = currentUser.name;
        document.getElementById('staff-role').textContent = currentUser.role;
        document.getElementById('current-staff-name').textContent = currentUser.name;
        
        applyPermissions();
        showDashboard();
        loadAllData();
        clearPin();
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
    cart = [];
    renderCart();
}

function hasPermission(permission) {
    return currentUser && currentUser.permissions && currentUser.permissions[permission];
}

// =============================================
// DATA LOADING
// =============================================

function loadAllData() {
    loadMenuItems();
    renderKitchenOrders();
    loadInventory();
    updateCharts();
    updateTopItems();
    updateLowStockAlerts();
    
    if (hasPermission('reports')) {
        loadReports();
    }
}

function refreshData() {
    loadInventory();
    loadSavedKitchenOrders();
    renderKitchenOrders();
    updateTopItems();
    updateCharts();
    updateLowStockAlerts();
    showNotification('Data refreshed!', 'success');
}

// =============================================
// TAB SWITCHING
// =============================================

function switchTab(tabName) {
    if (tabName === 'inventory' && !hasPermission('inventory')) {
        showNotification('You don\'t have permission to view inventory', 'error');
        return;
    }
    if (tabName === 'reports' && !hasPermission('reports')) {
        showNotification('You don\'t have permission to view reports', 'error');
        return;
    }
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    const titles = {
        'overview': 'Overview',
        'pos': 'Point of Sale',
        'kitchen': 'Kitchen Display',
        'inventory': 'Inventory Management',
        'reports': 'Sales Reports'
    };
    document.getElementById('page-title').textContent = titles[tabName];
    
    if (tabName === 'inventory') {
        loadInventory();
    }
    if (tabName === 'reports') {
        loadReports();
    }
    if (tabName === 'overview') {
        setTimeout(() => {
            updateCharts();
            updateTopItems();
            updateLowStockAlerts();
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
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    } else {
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
    
    // Group identical items to show quantities
    const itemMap = new Map();
    cart.forEach(item => {
        const key = `${item.id}-${item.name}`;
        if (itemMap.has(key)) {
            const existing = itemMap.get(key);
            existing.quantity += 1;
        } else {
            itemMap.set(key, {
                ...item,
                quantity: 1
            });
        }
    });
    
    const groupedCart = Array.from(itemMap.values());
    
    let html = '';
    groupedCart.forEach((item, index) => {
        html += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name} ${item.quantity > 1 ? `(x${item.quantity})` : ''}</div>
                </div>
                <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
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
    // Since we're grouping, we need to remove by actual cart index
    // This is a simplified version - in production you'd want to remove by item ID
    if (cart.length > 0) {
        cart.pop(); // Remove last item for simplicity
    }
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
// INVENTORY FUNCTIONS
// =============================================

function getDefaultInventoryItems() {
    return [
        { id: 1, name: 'Beef Patty', stock: 45, unit: 'each', reorder: 20, status: 'ok', cost: 2.50 },
        { id: 2, name: 'Burger Bun', stock: 32, unit: 'each', reorder: 30, status: 'low', cost: 0.50 },
        { id: 3, name: 'Lettuce', stock: 8, unit: 'head', reorder: 10, status: 'low', cost: 1.50 },
        { id: 4, name: 'Chicken Wings', stock: 15, unit: 'lbs', reorder: 10, status: 'ok', cost: 3.50 },
        { id: 5, name: 'Frying Oil', stock: 5, unit: 'gallon', reorder: 2, status: 'ok', cost: 15.00 },
        { id: 6, name: 'Soda Syrup', stock: 3, unit: 'gallon', reorder: 4, status: 'low', cost: 20.00 },
        { id: 7, name: 'Cheese', stock: 50, unit: 'slice', reorder: 20, status: 'ok', cost: 0.25 },
        { id: 8, name: 'Bacon', stock: 15, unit: 'lbs', reorder: 10, status: 'ok', cost: 5.00 }
    ];
}

function loadInventory() {
    const saved = localStorage.getItem('inventoryItems');
    
    if (saved) {
        try {
            inventoryItems = JSON.parse(saved);
        } catch (e) {
            inventoryItems = getDefaultInventoryItems();
        }
    } else {
        inventoryItems = getDefaultInventoryItems();
    }
    
    renderInventory(inventoryItems);
    populateInventoryDropdown();
}

function loadInventoryTransactions() {
    const saved = localStorage.getItem('inventoryTransactions');
    if (saved) {
        try {
            inventoryTransactions = JSON.parse(saved);
        } catch (e) {
            inventoryTransactions = [];
        }
    }
}

function renderInventory(items) {
    const tbody = document.getElementById('inventory-body');
    if (!tbody) return;
    
    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading">No items</td></tr>';
        return;
    }
    
    const lowStock = items.filter(item => item.stock > 0 && item.stock <= item.reorder).length;
    const outOfStock = items.filter(item => item.stock <= 0).length;
    const totalValue = items.reduce((sum, item) => sum + (item.stock * (item.cost || 2.50)), 0);
    
    document.getElementById('low-stock-count').textContent = lowStock + outOfStock;
    document.getElementById('total-inventory-value').textContent = `$${totalValue.toFixed(2)}`;
    
    const inventoryBadge = document.getElementById('inventory-badge');
    if (inventoryBadge) {
        inventoryBadge.textContent = lowStock + outOfStock;
    }
    
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
        
        // Format stock display - show whole numbers for items counted in "each" or "slice", keep decimals for other units
        let stockDisplay = item.stock;
        if (item.unit === 'each' || item.unit === 'slice' || item.unit === 'head') {
            stockDisplay = Math.round(item.stock);
        } else {
            stockDisplay = item.stock.toFixed(1);
        }
        
        return `
            <tr>
                <td>${item.name}</td>
                <td>${stockDisplay}</td>
                <td>${item.unit}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="showReceiveStockModal(${item.id})" ${!hasPermission('inventory') ? 'disabled' : ''}>
                        Receive
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    updateLowStockAlerts();
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
        // Format stock display for dropdown
        let stockDisplay = item.stock;
        if (item.unit === 'each' || item.unit === 'slice' || item.unit === 'head') {
            stockDisplay = Math.round(item.stock);
        } else {
            stockDisplay = item.stock.toFixed(1);
        }
        
        options += `<option value="${item.id}">${item.name} (Current: ${stockDisplay} ${item.unit})</option>`;
    });
    
    select.innerHTML = options;
}

function showReceiveStockModal(itemId = null) {
    if (!hasPermission('inventory')) {
        showNotification('You don\'t have permission to receive stock', 'error');
        return;
    }
    
    populateInventoryDropdown();
    
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
    
    const item = inventoryItems.find(i => i.id == itemId);
    if (item) {
        item.stock += quantity;
        
        if (item.stock <= 0) {
            item.status = 'out';
        } else if (item.stock <= item.reorder) {
            item.status = 'low';
        } else {
            item.status = 'ok';
        }
        
        renderInventory(inventoryItems);
        populateInventoryDropdown();
        localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
        
        showNotification(`Received ${quantity} ${item.unit} of ${item.name}`, 'success');
    }
    
    closeReceiveStockModal();
}

function updateInventoryFromOrder(order) {
    if (!inventoryItems || inventoryItems.length === 0) return;
    
    const recipeIngredients = {
        'Classic Burger': [
            { name: 'Beef Patty', quantity: 1 },
            { name: 'Burger Bun', quantity: 1 },
            { name: 'Lettuce', quantity: 0.2 },
            { name: 'Cheese', quantity: 1 }
        ],
        'Cheeseburger': [
            { name: 'Beef Patty', quantity: 1 },
            { name: 'Burger Bun', quantity: 1 },
            { name: 'Lettuce', quantity: 0.2 },
            { name: 'Cheese', quantity: 2 }
        ],
        'French Fries': [
            { name: 'Frying Oil', quantity: 0.1 }
        ],
        'Chicken Wings': [
            { name: 'Chicken Wings', quantity: 1 },
            { name: 'Frying Oil', quantity: 0.2 }
        ],
        'Soda': [
            { name: 'Soda Syrup', quantity: 0.1 }
        ],
        'Ice Cream': [],
        'Caesar Salad': [
            { name: 'Lettuce', quantity: 0.5 }
        ],
        'Steak': [
            { name: 'Beef Patty', quantity: 2 }
        ]
    };
    
    let inventoryUpdated = false;
    
    // Count item quantities in the order
    const itemCounts = new Map();
    order.items.forEach(item => {
        const count = itemCounts.get(item.name) || 0;
        itemCounts.set(item.name, count + 1);
    });
    
    itemCounts.forEach((count, itemName) => {
        const ingredients = recipeIngredients[itemName];
        if (!ingredients) return;
        
        ingredients.forEach(ingredient => {
            const inventoryItem = inventoryItems.find(i => 
                i.name.toLowerCase() === ingredient.name.toLowerCase()
            );
            
            if (inventoryItem) {
                const totalQuantity = ingredient.quantity * count;
                inventoryItem.stock = Math.max(0, inventoryItem.stock - totalQuantity);
                
                if (inventoryItem.stock <= 0) {
                    inventoryItem.status = 'out';
                } else if (inventoryItem.stock <= inventoryItem.reorder) {
                    inventoryItem.status = 'low';
                } else {
                    inventoryItem.status = 'ok';
                }
                
                inventoryUpdated = true;
            }
        });
    });
    
    if (inventoryUpdated) {
        renderInventory(inventoryItems);
        localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
        updateLowStockAlerts();
        checkLowStockAfterOrder();
    }
}

function checkLowStockAfterOrder() {
    if (!inventoryItems) return;
    
    const lowStock = inventoryItems.filter(item => item.stock > 0 && item.stock <= item.reorder);
    const outOfStock = inventoryItems.filter(item => item.stock <= 0);
    
    if (outOfStock.length > 0) {
        const items = outOfStock.map(i => i.name).join(', ');
        showNotification(`⚠️ OUT OF STOCK: ${items}`, 'error');
    } else if (lowStock.length > 0) {
        const items = lowStock.map(i => i.name).join(', ');
        showNotification(`⚠️ Low stock: ${items}`, 'warning');
    }
}

// =============================================
// OVERVIEW DASHBOARD FUNCTIONS
// =============================================

function initializeSalesData() {
    const saved = localStorage.getItem('dailySales');
    if (!saved) {
        const menuItems = [
            { name: 'Classic Burger', price: 12.99 },
            { name: 'Cheeseburger', price: 13.99 },
            { name: 'French Fries', price: 4.99 },
            { name: 'Chicken Wings', price: 10.99 },
            { name: 'Soda', price: 1.99 },
            { name: 'Ice Cream', price: 3.99 },
            { name: 'Caesar Salad', price: 8.99 },
            { name: 'Steak', price: 24.99 }
        ];
        
        const defaultSales = [];
        const now = new Date();
        
        // Generate 100 random orders spread across the last 7 days (8 AM - 9 PM)
        for (let i = 0; i < 100; i++) {
            const numItems = Math.floor(Math.random() * 3) + 1;
            const items = [];
            let total = 0;
            
            for (let j = 0; j < numItems; j++) {
                const randomIndex = Math.floor(Math.random() * menuItems.length);
                const randomItem = { 
                    name: menuItems[randomIndex].name, 
                    price: menuItems[randomIndex].price 
                };
                items.push(randomItem);
                total += randomItem.price;
            }
            
            // Random date within last 7 days
            const daysAgo = Math.floor(Math.random() * 7);
            // Random hour between 8 AM (8) and 9 PM (21)
            const hoursAgo = Math.floor(Math.random() * 14) + 8; // 8 to 21 (8 AM to 9 PM)
            const orderDate = new Date(now);
            orderDate.setDate(orderDate.getDate() - daysAgo);
            orderDate.setHours(hoursAgo, Math.floor(Math.random() * 60), 0);
            
            defaultSales.push({
                id: Date.now() - i * 1000,
                items: items,
                total: total,
                timestamp: orderDate.toLocaleString(),
                date: orderDate.toLocaleDateString(),
                hour: orderDate.getHours()
            });
        }
        
        localStorage.setItem('dailySales', JSON.stringify(defaultSales));
    }
}

function updateTopItems() {
    const tbody = document.getElementById('top-items-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    let salesData = [];
    try {
        const saved = localStorage.getItem('dailySales');
        if (saved) {
            salesData = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error loading sales data:', e);
    }
    
    // If no sales data, use default mock data with integer quantities
    if (!salesData || salesData.length === 0) {
        const defaultItems = [
            { name: 'Classic Burger', quantity: 18, revenue: 233.82 },
            { name: 'Steak', quantity: 8, revenue: 199.92 },
            { name: 'Chicken Wings', quantity: 12, revenue: 131.88 },
            { name: 'French Fries', quantity: 15, revenue: 74.85 },
            { name: 'Soda', quantity: 20, revenue: 39.80 }
        ];
        
        tbody.innerHTML = defaultItems.map((item, index) => `
            <tr>
                <td>
                    ${index === 0 ? '🥇 ' : index === 1 ? '🥈 ' : index === 2 ? '🥉 ' : ''}
                    <strong>${item.name}</strong>
                </td>
                <td>${item.quantity}</td>
                <td>$${item.revenue.toFixed(2)}</td>
            </tr>
        `).join('');
        return;
    }
    
    // Calculate top items from sales data with proper integer quantities
    const itemSales = new Map();
    
    salesData.forEach(sale => {
        if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach(item => {
                const itemName = item.name;
                const itemPrice = item.price || 0;
                
                if (itemSales.has(itemName)) {
                    const existing = itemSales.get(itemName);
                    existing.quantity += 1;
                    existing.revenue += itemPrice;
                } else {
                    itemSales.set(itemName, {
                        name: itemName,
                        quantity: 1,
                        revenue: itemPrice
                    });
                }
            });
        }
    });
    
    // Convert to array and sort by revenue in DESCENDING order
    const topItems = Array.from(itemSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    
    if (topItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="loading">No sales data yet</td></tr>';
        return;
    }
    
    // Ensure quantities are integers (whole numbers)
    topItems.forEach(item => {
        item.quantity = Math.round(item.quantity);
    });
    
    tbody.innerHTML = topItems.map((item, index) => `
        <tr>
            <td>
                ${index === 0 ? '🥇 ' : index === 1 ? '🥈 ' : index === 2 ? '🥉 ' : ''}
                <strong>${item.name}</strong>
            </td>
            <td>${item.quantity}</td>
            <td>$${item.revenue.toFixed(2)}</td>
        </tr>
    `).join('');
}

function updateLowStockAlerts() {
    const alertsDiv = document.getElementById('low-stock-alerts');
    if (!alertsDiv) return;
    
    alertsDiv.innerHTML = '';
    
    if (!inventoryItems || inventoryItems.length === 0) {
        loadInventory();
        if (!inventoryItems || inventoryItems.length === 0) {
            alertsDiv.innerHTML = '<div class="alert alert-info">No inventory data available</div>';
            return;
        }
    }
    
    const lowStock = inventoryItems.filter(item => 
        item.stock > 0 && item.stock <= item.reorder
    );
    
    const outOfStock = inventoryItems.filter(item => 
        item.stock <= 0
    );
    
    if (lowStock.length === 0 && outOfStock.length === 0) {
        alertsDiv.innerHTML = '<div class="alert alert-success">✅ All stock levels are good</div>';
        return;
    }
    
    outOfStock.forEach(item => {
        // Format stock for display
        let stockDisplay = item.stock;
        if (item.unit === 'each' || item.unit === 'slice' || item.unit === 'head') {
            stockDisplay = Math.round(item.stock);
        } else {
            stockDisplay = item.stock.toFixed(1);
        }
        
        const alertItem = document.createElement('div');
        alertItem.className = 'alert alert-danger';
        alertItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-times-circle"></i>
                <div style="flex: 1;">
                    <strong>${item.name}</strong> - OUT OF STOCK!
                </div>
                <button class="btn btn-sm btn-primary" onclick="showReceiveStockModal(${item.id})">
                    <i class="fas fa-plus"></i> Order
                </button>
            </div>
        `;
        alertsDiv.appendChild(alertItem);
    });
    
    lowStock.forEach(item => {
        // Format stock for display
        let stockDisplay = item.stock;
        if (item.unit === 'each' || item.unit === 'slice' || item.unit === 'head') {
            stockDisplay = Math.round(item.stock);
        } else {
            stockDisplay = item.stock.toFixed(1);
        }
        
        const alertItem = document.createElement('div');
        alertItem.className = 'alert alert-warning';
        alertItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; padding: 10px 20px; margin: 10px;">
                <i class="fas fa-exclamation-triangle"></i>
                <div style="flex: 1;">
                    <strong>${item.name}</strong> - Low stock: ${stockDisplay} ${item.unit} remaining<br>
                    <small>Reorder at: ${item.reorder}</small>
                </div>
                <button class="btn btn-sm btn-primary" onclick="showReceiveStockModal(${item.id})">
                    <i class="fas fa-plus"></i> Order
                </button>
            </div>
        `;
        alertsDiv.appendChild(alertItem);
    });
}

function saveOrderToSalesHistory(order) {
    try {
        let salesData = [];
        const saved = localStorage.getItem('dailySales');
        if (saved) {
            salesData = JSON.parse(saved);
        }
        
        // Save items as they are - each occurrence will be counted separately
        const orderItems = order.items.map(item => ({
            name: item.name,
            price: item.price
        }));
        
        const now = new Date();
        
        salesData.push({
            id: order.id,
            items: orderItems,
            total: order.total,
            timestamp: order.timestamp || now.toLocaleString(),
            date: now.toLocaleDateString(),
            hour: now.getHours()
        });
        
        if (salesData.length > 500) { // Keep last 500 orders
            salesData = salesData.slice(-500);
        }
        
        localStorage.setItem('dailySales', JSON.stringify(salesData));
        updateTopItems();
        updateCharts(); // Update charts when new order is added
    } catch (e) {
        console.error('Error saving order:', e);
    }
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
    
    tipAmount = 0;
    currentPaymentMethod = 'cash';
    
    updatePaymentModal();
    document.getElementById('payment-modal').style.display = 'flex';
}

function updatePaymentModal() {
    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const tax = subtotal * 0.085;
    const total = subtotal + tax;
    
    document.getElementById('payment-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('payment-tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('payment-total').textContent = `$${total.toFixed(2)}`;
    
    const itemsDiv = document.getElementById('payment-items');
    if (itemsDiv) {
        // Group items for display
        const itemMap = new Map();
        cart.forEach(item => {
            const key = item.name;
            if (itemMap.has(key)) {
                const existing = itemMap.get(key);
                existing.quantity += 1;
                existing.total += item.price;
            } else {
                itemMap.set(key, {
                    name: item.name,
                    price: item.price,
                    quantity: 1,
                    total: item.price
                });
            }
        });
        
        itemsDiv.innerHTML = Array.from(itemMap.values()).map(item => `
            <div class="payment-item">
                <span>${item.name} ${item.quantity > 1 ? `(x${item.quantity})` : ''}</span>
                <span>$${item.total.toFixed(2)}</span>
            </div>
        `).join('');
    }
    
    selectPaymentMethod('cash');
    
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
    
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`method-${method}`).classList.add('active');
    
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
    
    const order = {
        id: Date.now(),
        table: table,
        items: [...cart],
        subtotal: subtotal,
        tax: tax,
        total: total,
        tip: tipAmount,
        paymentMethod: currentPaymentMethod,
        staff: currentUser ? currentUser.name : 'Unknown',
        timestamp: new Date().toLocaleString()
    };
    
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
    
    // Close payment modal IMMEDIATELY
    closePaymentModal();
    
    // Update inventory
    updateInventoryFromOrder(order);
    
    // Save to sales history
    saveOrderToSalesHistory(order);
    
    // Print receipt - open in new window without blocking
    setTimeout(() => {
        printReceipt(order);
    }, 200);
    
    // Add to kitchen display
    addOrderToKitchen(order);
    
    // Update sales data display
    updateSalesData(order);
    
    // Clear cart
    clearCart();
    
    // Refresh data
    refreshData();
}

function closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        
        // Ensure body scrolling is re-enabled
        document.body.style.overflow = 'auto';
        document.body.style.position = 'relative';
    }
    
    // Clear any modal backdrops that might exist
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
}

function updateSalesData(order) {
    const todaySalesElement = document.getElementById('today-sales');
    if (todaySalesElement) {
        const currentSales = parseFloat(todaySalesElement.textContent.replace('$', '').replace(',', '')) || 0;
        const newSales = currentSales + order.total;
        todaySalesElement.textContent = `$${newSales.toFixed(2)}`;
    }
    
    const ordersElement = document.getElementById('today-orders');
    if (ordersElement) {
        const currentOrders = parseInt(ordersElement.textContent) || 0;
        ordersElement.textContent = currentOrders + 1;
    }
    
    const avgElement = document.getElementById('avg-order');
    if (avgElement) {
        const currentAvg = parseFloat(avgElement.textContent.replace('$', '')) || 0;
        const currentOrders = parseInt(document.getElementById('today-orders').textContent) || 1;
        const newAvg = ((currentAvg * (currentOrders - 1)) + order.total) / currentOrders;
        avgElement.textContent = `$${newAvg.toFixed(2)}`;
    }
    
    const activeTablesEl = document.getElementById('active-tables');
    if (activeTablesEl && order.table !== 'takeout') {
        const currentActive = parseInt(activeTablesEl.textContent.split('/')[0]) || 0;
        activeTablesEl.textContent = `${currentActive + 1}/8`;
    }
}

// =============================================
// RECEIPT PRINTING FUNCTIONS
// =============================================

function printReceipt(order) {
    let tableDisplay = order.table;
    if (order.table === 'takeout') {
        tableDisplay = 'TAKEOUT';
    } else if (order.table === 'delivery') {
        tableDisplay = 'DELIVERY';
    } else {
        tableDisplay = `TABLE ${order.table}`;
    }
    
    // Group items for receipt display
    const itemMap = new Map();
    order.items.forEach(item => {
        const key = item.name;
        if (itemMap.has(key)) {
            const existing = itemMap.get(key);
            existing.quantity += 1;
        } else {
            itemMap.set(key, {
                name: item.name,
                price: item.price,
                quantity: 1
            });
        }
    });
    
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
                        ${Array.from(itemMap.values()).map(item => `
                            <tr>
                                <td style="text-align: left;">${item.name}</td>
                                <td style="text-align: center;">${item.quantity}</td>
                                <td style="text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
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
    
    // Open print window in a non-blocking way
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(`
            <html>
                <head>
                    <title>Receipt - Order #${order.id}</title>
                    <style>
                        body { margin: 0; padding: 20px; font-family: 'Courier New', monospace; }
                        @media print {
                            body { margin: 0; padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    ${receiptContent}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.print();
                                setTimeout(function() { window.close(); }, 500);
                            }, 100);
                        };
                    <\/script>
                </body>
            </html>
        `);
        printWindow.document.close();
    } else {
        showNotification('Please allow popups to print receipt', 'warning');
    }
}

function printKitchenTicket(order) {
    let tableDisplay = order.table;
    if (order.table === 'takeout') {
        tableDisplay = 'TAKEOUT';
    } else if (order.table === 'delivery') {
        tableDisplay = 'DELIVERY';
    } else {
        tableDisplay = `TABLE ${order.table}`;
    }
    
    // Group items for kitchen ticket
    const itemMap = new Map();
    order.items.forEach(item => {
        const key = item.name;
        if (itemMap.has(key)) {
            const existing = itemMap.get(key);
            existing.quantity += 1;
        } else {
            itemMap.set(key, {
                name: item.name,
                quantity: 1
            });
        }
    });
    
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
                ${Array.from(itemMap.values()).map(item => `
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
    
    const printWindow = window.open('', '_blank', 'width=400,height=500');
    printWindow.document.write(`
        <html>
            <head>
                <title>Kitchen Ticket - Order #${order.id}</title>
                <style>
                    body { margin: 0; padding: 20px; font-family: 'Courier New', monospace; }
                    @media print {
                        body { margin: 0; padding: 0; }
                    }
                </style>
            </head>
            <body>
                ${ticketContent}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                        }, 100);
                    };
                <\/script>
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
    
    const sortedOrders = [...kitchenOrders].sort((a, b) => {
        const statusOrder = { 'new': 0, 'preparing': 1, 'ready': 2, 'served': 3 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
        }
        return new Date(`1970/01/01 ${b.time}`) - new Date(`1970/01/01 ${a.time}`);
    });
    
    updateKitchenBadges();
    
    container.innerHTML = sortedOrders.map(order => `
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
    const orderIndex = kitchenOrders.findIndex(o => o.id === orderId);
    
    if (orderIndex === -1) {
        showNotification('Order not found', 'error');
        return;
    }
    
    const order = kitchenOrders[orderIndex];
    
    const statusMessages = {
        'preparing': 'started preparing',
        'ready': 'is ready for serving',
        'served': 'has been served'
    };
    
    order.status = newStatus;
    
    if (newStatus === 'served') {
        showNotification(`Order from ${order.table_number} has been served`, 'success');
        
        setTimeout(() => {
            kitchenOrders.splice(orderIndex, 1);
            renderKitchenOrders();
            saveKitchenOrders();
        }, 2000);
    } else {
        showNotification(`Order from ${order.table_number} ${statusMessages[newStatus] || 'updated'}`, 'success');
    }
    
    renderKitchenOrders();
    saveKitchenOrders();
}

function addOrderToKitchen(order) {
    let tableDisplay = order.table;
    if (order.table === 'takeout') {
        tableDisplay = 'Takeout';
    } else if (order.table === 'delivery') {
        tableDisplay = 'Delivery';
    } else {
        tableDisplay = `Table ${order.table}`;
    }
    
    const itemMap = new Map();
    order.items.forEach(item => {
        if (itemMap.has(item.name)) {
            itemMap.set(item.name, itemMap.get(item.name) + 1);
        } else {
            itemMap.set(item.name, 1);
        }
    });
    
    const groupedItems = Array.from(itemMap.entries()).map(([name, quantity]) => ({
        name: name,
        quantity: quantity
    }));
    
    const newOrder = {
        id: order.id,
        table_number: tableDisplay,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: 'new',
        created_by: currentUser ? currentUser.name : 'Unknown',
        items: groupedItems
    };
    
    kitchenOrders.unshift(newOrder);
    renderKitchenOrders();
    saveKitchenOrders();
    
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
    const removedCount = beforeCount - kitchenOrders.length;
    
    renderKitchenOrders();
    saveKitchenOrders();
    
    showNotification(removedCount > 0 ? `Cleared ${removedCount} completed orders` : 'No completed orders to clear', 'success');
}

// =============================================
// CHART FUNCTIONS - UPDATED WITH 8AM-9PM TIMEFRAME
// =============================================

function updateCharts() {
    setTimeout(() => {
        updateHourlyChart();
        updateCategoryChart();
    }, 100);
}

function updateHourlyChart() {
    const canvas = document.getElementById('hourlyChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const period = document.getElementById('hourly-period')?.value || 'today';
    
    // Get sales data from localStorage
    let salesData = [];
    try {
        const saved = localStorage.getItem('dailySales');
        if (saved) {
            salesData = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error loading sales data:', e);
    }
    
    // Filter data based on selected period
    const now = new Date();
    const today = now.toLocaleDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString();
    
    let filteredSales = [];
    
    // Create hour labels from 8 AM to 9 PM (14 hours)
    const hourLabels = [];
    const hourValues = [];
    for (let hour = 8; hour <= 21; hour++) {
        const hourStr = hour <= 11 ? `${hour} AM` : hour === 12 ? `12 PM` : hour > 12 ? `${hour-12} PM` : `${hour} AM`;
        hourLabels.push(hourStr);
        hourValues.push(hour);
    }
    
    // Initialize hourly data array with zeros
    const hourlyData = new Array(hourValues.length).fill(0);
    
    if (period === 'today') {
        // Filter for today's sales
        filteredSales = salesData.filter(sale => sale.date === today);
    } else if (period === 'yesterday') {
        // Filter for yesterday's sales
        filteredSales = salesData.filter(sale => sale.date === yesterdayStr);
    }
    
    // Aggregate sales by hour
    filteredSales.forEach(sale => {
        const saleHour = sale.hour || new Date(sale.timestamp).getHours();
        
        // Find which hour bucket this belongs to (only include hours between 8 AM and 9 PM)
        for (let i = 0; i < hourValues.length; i++) {
            if (saleHour === hourValues[i]) {
                hourlyData[i] += sale.total;
                break;
            }
        }
    });
    
    // Round to 2 decimal places
    const roundedData = hourlyData.map(value => Math.round(value * 100) / 100);
    
    // Destroy existing chart if it exists
    if (hourlyChart) {
        hourlyChart.destroy();
    }
    
    // Create new chart
    hourlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hourLabels,
            datasets: [{
                label: `Sales (${period === 'today' ? 'Today' : 'Yesterday'})`,
                data: roundedData,
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
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            let value = context.raw || 0;
                            return `${label}: $${value.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

function updateCategoryChart() {
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const period = document.getElementById('category-period')?.value || 'today';
    
    // Get sales data from localStorage
    let salesData = [];
    try {
        const saved = localStorage.getItem('dailySales');
        if (saved) {
            salesData = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error loading sales data:', e);
    }
    
    // Filter data based on selected period
    const now = new Date();
    const today = now.toLocaleDateString();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    let filteredSales = [];
    
    if (period === 'today') {
        // Filter for today's sales
        filteredSales = salesData.filter(sale => sale.date === today);
    } else if (period === 'week') {
        // Filter for last 7 days
        filteredSales = salesData.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate >= weekAgo;
        });
    }
    
    // Define categories and their colors
    const categories = ['Mains', 'Drinks', 'Appetizers', 'Sides', 'Desserts'];
    const colors = ['#3498db', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6'];
    const categoryRevenue = [0, 0, 0, 0, 0];
    
    // Define item to category mapping
    const itemCategoryMap = {
        'Classic Burger': 'Mains',
        'Cheeseburger': 'Mains',
        'Steak': 'Mains',
        'Soda': 'Drinks',
        'Chicken Wings': 'Appetizers',
        'Caesar Salad': 'Appetizers',
        'French Fries': 'Sides',
        'Ice Cream': 'Desserts'
    };
    
    // Aggregate revenue by category
    filteredSales.forEach(sale => {
        if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach(item => {
                const category = itemCategoryMap[item.name] || 'Other';
                const categoryIndex = categories.indexOf(category);
                
                if (categoryIndex !== -1) {
                    categoryRevenue[categoryIndex] += item.price || 0;
                }
            });
        }
    });
    
    // Round to 2 decimal places
    const roundedRevenue = categoryRevenue.map(value => Math.round(value * 100) / 100);
    
    // Calculate total for percentages
    const total = roundedRevenue.reduce((sum, val) => sum + val, 0);
    
    // Destroy existing chart if it exists
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    // Create new chart
    categoryChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: roundedRevenue,
                backgroundColor: colors,
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
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            let value = context.raw || 0;
                            let percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// =============================================
// REPORTS FUNCTIONS
// =============================================

function loadReports() {
    if (!hasPermission('reports')) return;
    
    const period = document.getElementById('report-period')?.value || 'today';
    const data = getMockReportData(period);
    renderReports(data);
}

function getMockReportData(period) {
    // Get real sales data from localStorage
    let salesData = [];
    try {
        const saved = localStorage.getItem('dailySales');
        if (saved) {
            salesData = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Error loading sales data:', e);
    }
    
    const now = new Date();
    const today = now.toLocaleDateString();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    let filteredSales = [];
    
    if (period === 'today') {
        filteredSales = salesData.filter(sale => sale.date === today);
    } else if (period === 'week') {
        filteredSales = salesData.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate >= weekAgo;
        });
    } else if (period === 'month') {
        filteredSales = salesData.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate >= monthAgo;
        });
    }
    
    // Calculate summary
    const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalOrders = filteredSales.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    
    // Calculate category revenue
    const itemCategoryMap = {
        'Classic Burger': 'Mains',
        'Cheeseburger': 'Mains',
        'Steak': 'Mains',
        'Soda': 'Drinks',
        'Chicken Wings': 'Appetizers',
        'Caesar Salad': 'Appetizers',
        'French Fries': 'Sides',
        'Ice Cream': 'Desserts'
    };
    
    const categoryRevenue = {
        'Mains': 0,
        'Drinks': 0,
        'Appetizers': 0,
        'Sides': 0,
        'Desserts': 0
    };
    
    filteredSales.forEach(sale => {
        if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach(item => {
                const category = itemCategoryMap[item.name] || 'Other';
                if (categoryRevenue.hasOwnProperty(category)) {
                    categoryRevenue[category] += item.price || 0;
                }
            });
        }
    });
    
    const byCategory = Object.keys(categoryRevenue).map(category => ({
        category: category,
        revenue: categoryRevenue[category]
    }));
    
    // Calculate top items
    const itemSales = new Map();
    filteredSales.forEach(sale => {
        if (sale.items && Array.isArray(sale.items)) {
            sale.items.forEach(item => {
                const itemName = item.name;
                if (itemSales.has(itemName)) {
                    const existing = itemSales.get(itemName);
                    existing.quantity += 1;
                    existing.revenue += item.price || 0;
                } else {
                    itemSales.set(itemName, {
                        name: itemName,
                        quantity: 1,
                        revenue: item.price || 0
                    });
                }
            });
        }
    });
    
    const topItems = Array.from(itemSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map(item => ({
            name: item.name,
            quantity_sold: item.quantity,
            revenue: item.revenue
        }));
    
    return {
        summary: {
            total_sales: totalSales,
            total_orders: totalOrders,
            avg_order_value: avgOrderValue
        },
        by_category: byCategory,
        top_items: topItems
    };
}

function renderReports(data) {
    const reportDiv = document.getElementById('report-data');
    if (!reportDiv) return;
    
    // Beautiful report HTML with styled tables for dashboard view
    let html = `
        <style>
            .report-container {
                display: flex;
                flex-direction: column;
                gap: 25px;
            }
            
            .report-card {
                background: white;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                border: 1px solid #e0e0e0;
            }
            
            .report-card h3 {
                margin: 0 0 20px 0;
                color: #2c3e50;
                font-size: 1.3rem;
                font-weight: 600;
                padding-bottom: 10px;
                border-bottom: 2px solid #3498db;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
            }
            
            .stat-item {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                border-left: 4px solid #3498db;
            }
            
            .stat-label {
                color: #7f8c8d;
                font-size: 0.9rem;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .stat-value {
                color: #2c3e50;
                font-size: 1.8rem;
                font-weight: 700;
            }
            
            .stat-value.sales {
                color: #27ae60;
            }
            
            .stat-value.orders {
                color: #3498db;
            }
            
            .stat-value.avg {
                color: #e67e22;
            }
            
            .report-table {
                width: 100%;
                border-collapse: collapse;
                background: white;
                border-radius: 10px;
                overflow: hidden;
            }
            
            .report-table thead {
                background: linear-gradient(135deg, #2c3e50, #3498db);
                color: white;
            }
            
            .report-table th {
                padding: 15px;
                text-align: left;
                font-weight: 600;
                font-size: 0.95rem;
                letter-spacing: 0.5px;
            }
            
            .report-table td {
                padding: 12px 15px;
                border-bottom: 1px solid #e0e0e0;
            }
            
            .report-table tbody tr:hover {
                background-color: #f5f9ff;
                transition: background-color 0.2s;
            }
            
            .report-table tbody tr:last-child td {
                border-bottom: none;
            }
            
            .category-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.85rem;
                font-weight: 500;
            }
            
            .badge-mains { background: #3498db20; color: #2980b9; }
            .badge-drinks { background: #27ae6020; color: #27ae60; }
            .badge-appetizers { background: #f39c1220; color: #e67e22; }
            .badge-sides { background: #e74c3c20; color: #c0392b; }
            .badge-desserts { background: #9b59b620; color: #8e44ad; }
            
            .revenue-positive {
                color: #27ae60;
                font-weight: 600;
            }
            
            .percentage-bar {
                display: inline-block;
                width: 50px;
                height: 6px;
                background: #ecf0f1;
                border-radius: 3px;
                margin-left: 10px;
                vertical-align: middle;
            }
            
            .percentage-fill {
                height: 100%;
                background: #3498db;
                border-radius: 3px;
            }
            
            .top-item-rank {
                display: inline-block;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                text-align: center;
                line-height: 30px;
                font-weight: 700;
                margin-right: 10px;
            }
            
            .rank-1 { background: #f1c40f; color: white; }
            .rank-2 { background: #bdc3c7; color: white; }
            .rank-3 { background: #e67e22; color: white; }
        </style>
        
        <div class="report-container">
            <!-- Summary Cards -->
            <div class="report-card">
                <h3>📊 Sales Summary</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-label">Total Sales</div>
                        <div class="stat-value sales">$${data.summary.total_sales.toFixed(2)}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Total Orders</div>
                        <div class="stat-value orders">${data.summary.total_orders}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Average Order</div>
                        <div class="stat-value avg">$${data.summary.avg_order_value.toFixed(2)}</div>
                    </div>
                </div>
            </div>
            
            <!-- Sales by Category -->
            <div class="report-card">
                <h3>📈 Sales by Category</h3>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Revenue</th>
                            <th>Percentage</th>
                            <th>Distribution</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.by_category.map((cat, index) => {
                            const badgeClass = 
                                cat.category === 'Mains' ? 'badge-mains' :
                                cat.category === 'Drinks' ? 'badge-drinks' :
                                cat.category === 'Appetizers' ? 'badge-appetizers' :
                                cat.category === 'Sides' ? 'badge-sides' : 'badge-desserts';
                            
                            const percentage = data.summary.total_sales > 0 ? ((cat.revenue / data.summary.total_sales) * 100).toFixed(1) : 0;
                            
                            return `
                                <tr>
                                    <td>
                                        <span class="category-badge ${badgeClass}">${cat.category}</span>
                                    </td>
                                    <td class="revenue-positive">$${cat.revenue.toFixed(2)}</td>
                                    <td><strong>${percentage}%</strong></td>
                                    <td>
                                        <div class="percentage-bar">
                                            <div class="percentage-fill" style="width: ${percentage}%"></div>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- Top Items -->
            <div class="report-card">
                <h3>🏆 Top Selling Items</h3>
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Item</th>
                            <th>Quantity Sold</th>
                            <th>Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.top_items.map((item, index) => `
                            <tr>
                                <td>
                                    <span class="top-item-rank rank-${index + 1}">${index + 1}</span>
                                </td>
                                <td><strong>${item.name}</strong></td>
                                <td>${item.quantity_sold}</td>
                                <td class="revenue-positive">$${item.revenue.toFixed(2)}</td>
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
    
    printDailyReport(data, period);
    showNotification(`Report for ${period} sent to printer`, 'success');
}

function printDailyReport(reportData, period) {
    // Beautifully formatted exported version - professional and clean
    const reportContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sales Report - ${period}</title>
            <style>
                body {
                    font-family: 'Helvetica', 'Arial', sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: #fff;
                    color: #333;
                }
                .report-container {
                    max-width: 800px;
                    margin: 0 auto;
                    background: white;
                    padding: 30px;
                    box-shadow: 0 0 20px rgba(0,0,0,0.1);
                    border-radius: 10px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #2c3e50;
                }
                .header h1 {
                    color: #2c3e50;
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                }
                .header h2 {
                    color: #7f8c8d;
                    margin: 5px 0 0;
                    font-size: 16px;
                    font-weight: normal;
                }
                .header .date {
                    color: #3498db;
                    font-size: 14px;
                    margin-top: 10px;
                }
                .summary-section {
                    background: #f8f9fa;
                    border-radius: 10px;
                    padding: 20px;
                    margin-bottom: 30px;
                    border-left: 5px solid #3498db;
                }
                .summary-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #2c3e50;
                    margin: 0 0 15px 0;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                }
                .summary-item {
                    text-align: center;
                }
                .summary-label {
                    color: #7f8c8d;
                    font-size: 12px;
                    text-transform: uppercase;
                    margin-bottom: 5px;
                }
                .summary-value {
                    font-size: 24px;
                    font-weight: bold;
                }
                .summary-value.sales { color: #27ae60; }
                .summary-value.orders { color: #3498db; }
                .summary-value.avg { color: #e67e22; }
                
                .section {
                    margin-bottom: 30px;
                }
                .section-title {
                    font-size: 18px;
                    font-weight: 600;
                    color: #2c3e50;
                    margin: 0 0 15px 0;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #3498db;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    background: white;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                }
                th {
                    background: #34495e;
                    color: white;
                    font-weight: 600;
                    padding: 12px;
                    text-align: left;
                    font-size: 14px;
                }
                td {
                    padding: 10px 12px;
                    border-bottom: 1px solid #ecf0f1;
                }
                tr:last-child td {
                    border-bottom: none;
                }
                tr:nth-child(even) {
                    background: #f8f9fa;
                }
                .category-row td:first-child {
                    font-weight: 500;
                }
                .amount {
                    font-weight: 600;
                    color: #27ae60;
                }
                .footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px dashed #bdc3c7;
                    text-align: center;
                    color: #7f8c8d;
                    font-size: 12px;
                }
                .footer p {
                    margin: 5px 0;
                }
                .print-button {
                    display: block;
                    width: 200px;
                    margin: 20px auto;
                    padding: 12px 24px;
                    background: #3498db;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    font-size: 16px;
                    cursor: pointer;
                    text-align: center;
                    text-decoration: none;
                }
                .print-button:hover {
                    background: #2980b9;
                }
                @media print {
                    .print-button {
                        display: none;
                    }
                    body {
                        padding: 0;
                        background: white;
                    }
                    .report-container {
                        box-shadow: none;
                        padding: 15px;
                    }
                }
            </style>
        </head>
        <body>
            <div class="report-container">
                <div class="header">
                    <h1>🍔 RESTAURANT POS</h1>
                    <h2>Sales Report - ${period.toUpperCase()}</h2>
                    <div class="date">Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
                </div>
                
                <div class="summary-section">
                    <div class="summary-title">Executive Summary</div>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <div class="summary-label">Total Sales</div>
                            <div class="summary-value sales">$${reportData.summary.total_sales.toFixed(2)}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">Total Orders</div>
                            <div class="summary-value orders">${reportData.summary.total_orders}</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-label">Average Order</div>
                            <div class="summary-value avg">$${reportData.summary.avg_order_value.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">📊 Sales by Category</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th>Revenue</th>
                                <th>Percentage</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportData.by_category.map(cat => {
                                const percentage = reportData.summary.total_sales > 0 ? ((cat.revenue / reportData.summary.total_sales) * 100).toFixed(1) : 0;
                                return `
                                    <tr class="category-row">
                                        <td><strong>${cat.category}</strong></td>
                                        <td class="amount">$${cat.revenue.toFixed(2)}</td>
                                        <td>${percentage}%</td>
                                    </tr>
                                `;
                            }).join('')}
                            <tr style="background: #ecf0f1; font-weight: bold;">
                                <td>TOTAL</td>
                                <td class="amount">$${reportData.summary.total_sales.toFixed(2)}</td>
                                <td>100%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                
                <div class="section">
                    <div class="section-title">🏆 Top Selling Items</div>
                    <table>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Item</th>
                                <th>Quantity Sold</th>
                                <th>Revenue</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportData.top_items.map((item, index) => `
                                <tr>
                                    <td><strong>#${index + 1}</strong></td>
                                    <td>${item.name}</td>
                                    <td>${item.quantity_sold}</td>
                                    <td class="amount">$${item.revenue.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="footer">
                    <p>Thank you for using Restaurant POS System</p>
                    <p>123 Main Street, City | Tel: (555) 123-4567</p>
                    <p>This report was generated automatically. For questions, please contact management.</p>
                </div>
                
                <button class="print-button" onclick="window.print()">🖨️ Print Report</button>
            </div>
            
            <script>
                // Auto-print when window loads (optional - comment out if not wanted)
                // window.onload = function() { setTimeout(function() { window.print(); }, 500); };
            <\/script>
        </body>
        </html>
    `;
    
    // Open print window with the beautifully formatted report
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
        printWindow.document.write(reportContent);
        printWindow.document.close();
    } else {
        showNotification('Please allow popups to print the report', 'warning');
    }
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