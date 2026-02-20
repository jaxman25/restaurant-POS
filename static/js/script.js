// Global state
let menuItems = [];
let currentOrder = [];
let kitchenOrders = [];
let currentFilter = 'all';
let specials = [];
let currentCustomizingItem = null; // Item being customized in modal
let currentCustomizations = {
    size: null,
    modifiers: {},
    specialInstructions: ''
};

// API base URL
const API_BASE = 'http://127.0.0.1:5000';

// Load everything when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadMenu();
    loadKitchenOrders();
    loadSpecials();
    updateDateTime();
    setInterval(updateDateTime, 1000);
    setInterval(loadKitchenOrders, 5000); // Refresh kitchen every 5 seconds
});

// Update date and time
function updateDateTime() {
    const now = new Date();
    document.getElementById('datetime').textContent = now.toLocaleString();
}

// Helper function to get category emoji
function getCategoryEmoji(category) {
    const emojis = {
        'Appetizer': '🍗',
        'Main': '🍔',
        'Side': '🍟',
        'Drink': '🥤',
        'Dessert': '🍰',
        'Combo': '🍱'
    };
    return emojis[category] || '📋';
}

// Load menu from API
async function loadMenu() {
    try {
        const response = await fetch(`${API_BASE}/api/products`);
        const data = await response.json();
        
        if (data.products) {
            menuItems = data.products;
            displayMenu();
            
            // Check stock for each item
            checkAllStock();
        }
    } catch (error) {
        console.error('Error loading menu:', error);
        document.getElementById('connection-status').textContent = '❌ Disconnected';
        document.getElementById('connection-status').className = 'status disconnected';
    }
}

// Load daily specials
async function loadSpecials() {
    try {
        const response = await fetch(`${API_BASE}/api/specials`);
        const data = await response.json();
        
        if (data.specials) {
            specials = data.specials;
            displaySpecials();
        }
    } catch (error) {
        console.error('Error loading specials:', error);
    }
}

// Display specials banner
function displaySpecials() {
    const banner = document.getElementById('specials-banner');
    
    if (!specials || specials.length === 0) {
        banner.style.display = 'none';
        return;
    }
    
    banner.style.display = 'flex';
    
    let html = '<span>🔥 Today\'s Specials:</span>';
    
    specials.forEach(special => {
        const product = menuItems.find(p => p.id === special.product_id);
        if (!product) return;
        
        const originalPrice = parseFloat(product.price);
        let displayPrice = originalPrice;
        let priceHtml = '';
        
        if (special.special_price) {
            displayPrice = parseFloat(special.special_price);
            priceHtml = `<span class="original-price">$${originalPrice.toFixed(2)}</span> <span class="special-price">$${displayPrice.toFixed(2)}</span>`;
        } else if (special.discount_percentage) {
            displayPrice = originalPrice * (1 - special.discount_percentage / 100);
            priceHtml = `<span class="original-price">$${originalPrice.toFixed(2)}</span> <span class="special-price">$${displayPrice.toFixed(2)}</span> (${special.discount_percentage}% off)`;
        }
        
        html += `
            <div class="special-item" onclick="addSpecialToOrder(${special.product_id}, ${displayPrice})">
                ${product.name} - ${priceHtml}
                ${special.notes ? `<small>${special.notes}</small>` : ''}
            </div>
        `;
    });
    
    banner.innerHTML = html;
}

// Add special to order
function addSpecialToOrder(productId, specialPrice) {
    const product = menuItems.find(p => p.id === productId);
    if (!product) return;
    
    // Check if product has sizes or modifiers
    if ((product.sizes && product.sizes.length > 0) || 
        (product.modifiers && product.modifiers.length > 0) ||
        product.is_combo) {
        // Create a copy of the product with the special price
        const specialProduct = {...product, price: specialPrice};
        openModifierModal(specialProduct);
    } else {
        addToOrder(productId, product.name, specialPrice);
    }
}

// Check stock for all items
async function checkAllStock() {
    for (let item of menuItems) {
        try {
            const response = await fetch(`${API_BASE}/api/check-stock/${item.id}`);
            const data = await response.json();
            item.available = data.available;
            if (!data.available && data.shortages) {
                item.shortages = data.shortages;
            }
        } catch (error) {
            console.error(`Error checking stock for ${item.name}:`, error);
            item.available = false;
        }
    }
    displayMenu(); // Refresh menu with stock status
}

// Display menu items
function displayMenu() {
    const menuGrid = document.getElementById('menu-items');
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    
    // Filter by category and search
    let filteredItems = menuItems;
    
    // Apply category filter
    if (currentFilter !== 'all') {
        filteredItems = filteredItems.filter(item => item.category === currentFilter);
    }
    
    // Apply search filter
    if (searchTerm) {
        filteredItems = filteredItems.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            (item.category && item.category.toLowerCase().includes(searchTerm))
        );
    }
    
    if (filteredItems.length === 0) {
        menuGrid.innerHTML = '<div class="loading">No items found</div>';
        return;
    }
    
    // Sort by category then name
    filteredItems.sort((a, b) => {
        if (a.category === b.category) {
            return a.name.localeCompare(b.name);
        }
        return (a.category || '').localeCompare(b.category || '');
    });
    
    let currentCategory = '';
    let html = '';
    
    filteredItems.forEach(item => {
        // Add category header if changing categories and not searching
        if (!searchTerm && currentFilter === 'all' && item.category !== currentCategory) {
            currentCategory = item.category;
            html += `<div class="category-header">${getCategoryEmoji(currentCategory)} ${currentCategory}</div>`;
        }
        
        // Check if item is on special
        const isSpecial = specials.some(s => s.product_id === item.id);
        
        html += `
            <div class="menu-item ${item.available === false ? 'out-of-stock' : ''}" 
                 onclick="${item.available !== false ? `openModifierModalById(${item.id})` : ''}">
                ${item.is_combo ? '<span class="combo-badge">COMBO</span>' : ''}
                ${isSpecial ? '<span class="special-badge">SPECIAL</span>' : ''}
                <div class="menu-item-name">${item.name}</div>
                <div class="price">$${parseFloat(item.price).toFixed(2)}</div>
                ${searchTerm ? `<div class="item-category">${getCategoryEmoji(item.category)} ${item.category}</div>` : ''}
                ${item.available === false ? 
                    '<div class="stock-warning">⚠️ Out of Stock</div>' : 
                    item.available === true ? '' :
                    '<div class="stock-warning">⏳ Checking stock...</div>'}
            </div>
        `;
    });
    
    menuGrid.innerHTML = html;
}

// Open modifier modal by product ID
function openModifierModalById(productId) {
    const item = menuItems.find(i => i.id === productId);
    if (item) {
        openModifierModal(item);
    } else {
        console.error('Item not found:', productId);
    }
}

// Filter menu by category
function filterCategory(category) {
    currentFilter = category;
    
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Clear search when changing categories
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = '';
    }
    
    displayMenu();
}

// Search menu items
function searchMenu() {
    // When searching, set filter to 'all' to show all matching items
    if (currentFilter !== 'all') {
        currentFilter = 'all';
        // Update active button
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector('.category-btn[onclick="filterCategory(\'all\')"]').classList.add('active');
    }
    
    displayMenu();
}

// Open modifier modal
function openModifierModal(item, specialPrice = null) {
    currentCustomizingItem = item;
    currentCustomizations = {
        size: item.sizes && item.sizes.length > 0 ? item.sizes.find(s => s.is_default) || item.sizes[0] : null,
        modifiers: {},
        specialInstructions: ''
    };
    
    document.getElementById('modal-product-name').textContent = item.name;
    
    let modalHtml = '';
    
    // Size selection
    if (item.sizes && item.sizes.length > 0) {
        modalHtml += `
            <div class="modifier-section">
                <h4>Select Size:</h4>
                <div class="size-options">
        `;
        
        item.sizes.forEach(size => {
            const isSelected = currentCustomizations.size && currentCustomizations.size.id === size.id;
            modalHtml += `
                <div class="size-option ${isSelected ? 'selected' : ''}" onclick="selectSize(${size.id})">
                    <div class="size-name">${size.size_name}</div>
                    <div class="size-price">+$${parseFloat(size.price_adjustment).toFixed(2)}</div>
                </div>
            `;
        });
        
        modalHtml += `</div>`;
    }
    
    // Modifiers
    if (item.modifiers && item.modifiers.length > 0) {
        item.modifiers.forEach(modifier => {
            modalHtml += `
                <div class="modifier-section">
                    <h4>${modifier.modifier_name} ${modifier.is_required ? '*' : ''}</h4>
                    <div class="modifier-options">
            `;
            
            const options = typeof modifier.options === 'string' ? JSON.parse(modifier.options) : modifier.options;
            options.forEach(option => {
                const inputType = modifier.max_selections > 1 ? 'checkbox' : 'radio';
                const name = `modifier_${modifier.id}`;
                const optionStr = JSON.stringify(option).replace(/'/g, "\\'");
                modalHtml += `
                    <div class="modifier-option">
                        <input type="${inputType}" name="${name}" 
                               value='${optionStr}'
                               ${modifier.is_required && inputType === 'radio' ? 'required' : ''}
                               onchange="updateModifier(${modifier.id}, this)">
                        <label>${option.name}</label>
                        ${option.price > 0 ? `<span class="modifier-option-price">+$${option.price.toFixed(2)}</span>` : ''}
                    </div>
                `;
            });
            
            modalHtml += `</div>`;
        });
    }
    
    // Special instructions
    modalHtml += `
        <div class="modifier-section special-instructions">
            <h4>Special Instructions:</h4>
            <textarea id="modal-special-instructions" 
                      placeholder="E.g., No onions, extra sauce, well done..." 
                      onchange="updateSpecialInstructions(this.value)"></textarea>
        </div>
    `;
    
    document.getElementById('modal-body').innerHTML = modalHtml;
    
    // Update price
    updateModalPrice();
    
    // Show modal
    document.getElementById('modifier-modal').style.display = 'block';
}

// Close modifier modal
function closeModifierModal() {
    document.getElementById('modifier-modal').style.display = 'none';
    currentCustomizingItem = null;
}

// Select size
function selectSize(sizeId) {
    const size = currentCustomizingItem.sizes.find(s => s.id === sizeId);
    if (size) {
        currentCustomizations.size = size;
        
        // Update UI
        document.querySelectorAll('.size-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        event.target.closest('.size-option').classList.add('selected');
        
        updateModalPrice();
    }
}

// Update modifier selection
function updateModifier(modifierId, input) {
    if (!currentCustomizations.modifiers[modifierId]) {
        currentCustomizations.modifiers[modifierId] = [];
    }
    
    const value = JSON.parse(input.value);
    
    if (input.type === 'checkbox') {
        if (input.checked) {
            currentCustomizations.modifiers[modifierId].push(value);
        } else {
            currentCustomizations.modifiers[modifierId] = 
                currentCustomizations.modifiers[modifierId].filter(v => v.name !== value.name);
        }
    } else { // radio
        currentCustomizations.modifiers[modifierId] = [value];
    }
    
    updateModalPrice();
}

// Update special instructions
function updateSpecialInstructions(instructions) {
    currentCustomizations.specialInstructions = instructions;
}

// Update modal price
function updateModalPrice() {
    let basePrice = parseFloat(currentCustomizingItem.price);
    
    // Add size adjustment
    if (currentCustomizations.size) {
        basePrice += parseFloat(currentCustomizations.size.price_adjustment);
    }
    
    // Add modifier prices
    for (let modifierId in currentCustomizations.modifiers) {
        currentCustomizations.modifiers[modifierId].forEach(option => {
            if (option.price) {
                basePrice += parseFloat(option.price);
            }
        });
    }
    
    document.getElementById('modal-price').textContent = `$${basePrice.toFixed(2)}`;
}

// Add customized item to order
function addCustomizedToOrder() {
    if (!currentCustomizingItem) return;
    
    const item = currentCustomizingItem;
    
    // Check required modifiers
    if (item.modifiers) {
        for (let modifier of item.modifiers) {
            if (modifier.is_required && 
                (!currentCustomizations.modifiers[modifier.id] || 
                 currentCustomizations.modifiers[modifier.id].length < modifier.min_selections)) {
                alert(`Please select ${modifier.modifier_name}`);
                return;
            }
        }
    }
    
    // Calculate price
    let price = parseFloat(item.price);
    
    // Add size adjustment
    if (currentCustomizations.size) {
        price += parseFloat(currentCustomizations.size.price_adjustment);
    }
    
    // Add modifier prices
    const selectedModifiers = [];
    for (let modifierId in currentCustomizations.modifiers) {
        currentCustomizations.modifiers[modifierId].forEach(option => {
            if (option.price) {
                price += parseFloat(option.price);
            }
            selectedModifiers.push(option);
        });
    }
    
    // Create order item
    const orderItem = {
        id: item.id,
        name: item.name,
        price: price,
        quantity: 1,
        size: currentCustomizations.size,
        modifiers: selectedModifiers,
        specialInstructions: currentCustomizations.specialInstructions
    };
    
    // Check if same item exists (for merging)
    const existingItem = currentOrder.find(i => 
        i.id === orderItem.id && 
        JSON.stringify(i.modifiers) === JSON.stringify(orderItem.modifiers) &&
        i.specialInstructions === orderItem.specialInstructions
    );
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        currentOrder.push(orderItem);
    }
    
    displayOrder();
    document.getElementById('send-btn').disabled = currentOrder.length === 0;
    
    // Close modal
    closeModifierModal();
}

// Add item directly to order (no modifiers)
function addToOrder(id, name, price) {
    const existingItem = currentOrder.find(item => item.id === id);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        currentOrder.push({
            id: id,
            name: name,
            price: price,
            quantity: 1,
            modifiers: [],
            specialInstructions: ''
        });
    }
    
    displayOrder();
    document.getElementById('send-btn').disabled = currentOrder.length === 0;
}

// Display current order
function displayOrder() {
    const orderDiv = document.getElementById('order-items');
    
    if (currentOrder.length === 0) {
        orderDiv.innerHTML = '<div class="empty-order">No items in order</div>';
        document.getElementById('order-total').textContent = '$0.00';
        return;
    }
    
    let total = 0;
    orderDiv.innerHTML = currentOrder.map(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        // Build details string
        const details = [];
        if (item.size) {
            details.push(item.size.size_name);
        }
        if (item.modifiers && item.modifiers.length > 0) {
            item.modifiers.forEach(m => details.push(m.name));
        }
        
        return `
            <div class="order-item">
                <div class="order-item-info">
                    <div class="order-item-name">${item.name} x${item.quantity}</div>
                    ${details.length > 0 ? `<div class="order-item-details">${details.join(', ')}</div>` : ''}
                    ${item.specialInstructions ? `<div class="order-item-details">📝 ${item.specialInstructions.substring(0, 30)}${item.specialInstructions.length > 30 ? '...' : ''}</div>` : ''}
                    <div class="order-item-price">$${itemTotal.toFixed(2)}</div>
                </div>
                <div class="order-item-actions">
                    <button onclick="updateQuantity(${item.id}, ${item.quantity + 1}, '${JSON.stringify(item.modifiers).replace(/'/g, "\\'")}', '${item.specialInstructions.replace(/'/g, "\\'")}')">➕</button>
                    <button onclick="updateQuantity(${item.id}, ${item.quantity - 1}, '${JSON.stringify(item.modifiers).replace(/'/g, "\\'")}', '${item.specialInstructions.replace(/'/g, "\\'")}')">➖</button>
                    <button onclick="removeFromOrder(${item.id}, '${JSON.stringify(item.modifiers).replace(/'/g, "\\'")}', '${item.specialInstructions.replace(/'/g, "\\'")}')">❌</button>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('order-total').textContent = `$${total.toFixed(2)}`;
}

// Update item quantity in order
function updateQuantity(id, newQuantity, modifiersStr, specialInstructions) {
    const modifiers = JSON.parse(modifiersStr);
    
    if (newQuantity <= 0) {
        removeFromOrder(id, modifiersStr, specialInstructions);
        return;
    }
    
    const item = currentOrder.find(item => 
        item.id === id && 
        JSON.stringify(item.modifiers) === JSON.stringify(modifiers) &&
        item.specialInstructions === specialInstructions
    );
    
    if (item) {
        item.quantity = newQuantity;
        displayOrder();
    }
}

// Remove item from order
function removeFromOrder(id, modifiersStr, specialInstructions) {
    const modifiers = JSON.parse(modifiersStr);
    
    currentOrder = currentOrder.filter(item => 
        !(item.id === id && 
          JSON.stringify(item.modifiers) === JSON.stringify(modifiers) &&
          item.specialInstructions === specialInstructions)
    );
    displayOrder();
    document.getElementById('send-btn').disabled = currentOrder.length === 0;
}

// Clear entire order
function clearOrder() {
    currentOrder = [];
    displayOrder();
    document.getElementById('send-btn').disabled = true;
    document.getElementById('order-instructions').value = '';
}

// Send order to kitchen
async function sendToKitchen() {
    if (currentOrder.length === 0) return;
    
    const tableNumber = document.getElementById('table-number').value || '1';
    const orderInstructions = document.getElementById('order-instructions').value;
    
    const order = {
        table: tableNumber,
        special_instructions: orderInstructions,
        items: currentOrder.map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            size_id: item.size ? item.size.id : null,
            modifiers: item.modifiers,
            special_instructions: item.specialInstructions
        }))
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(order)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear the order
            clearOrder();
            // Refresh kitchen display
            loadKitchenOrders();
            // Refresh menu to update stock
            loadMenu();
            // Show success message
            alert(`Order #${data.order_id} sent to kitchen!`);
        } else {
            alert('Error sending order to kitchen');
        }
    } catch (error) {
        console.error('Error sending order:', error);
        alert('Failed to connect to server');
    }
}

// Load kitchen orders from API
async function loadKitchenOrders() {
    try {
        const response = await fetch(`${API_BASE}/api/kitchen-orders`);
        const data = await response.json();
        
        if (data.orders) {
            kitchenOrders = data.orders;
            displayKitchenOrders();
        }
    } catch (error) {
        console.error('Error loading kitchen orders:', error);
    }
}

// Display kitchen orders
function displayKitchenOrders() {
    const kitchenDiv = document.getElementById('kitchen-orders');
    
    if (kitchenOrders.length === 0) {
        kitchenDiv.innerHTML = '<div class="loading">No active orders</div>';
        return;
    }
    
    kitchenDiv.innerHTML = kitchenOrders.map(order => `
        <div class="kitchen-order">
            <div class="kitchen-order-header">
                <span class="kitchen-order-table">Table ${order.table_number}</span>
                <span class="kitchen-order-time">${order.time}</span>
            </div>
            <div class="kitchen-order-items">
                ${order.items.map(item => {
                    let itemHtml = `
                        <div class="kitchen-order-item">
                            <span>${item.quantity}x ${item.name}</span>
                        </div>
                    `;
                    
                    // Add size if present
                    if (item.size) {
                        itemHtml += `
                            <div class="kitchen-order-item-details">
                                Size: ${item.size}
                            </div>
                        `;
                    }
                    
                    // Add modifiers if present
                    if (item.modifiers && item.modifiers.length > 0) {
                        const modifiers = typeof item.modifiers === 'string' ? JSON.parse(item.modifiers) : item.modifiers;
                        modifiers.forEach(mod => {
                            itemHtml += `
                                <div class="kitchen-order-item-details">
                                    • ${mod.name} ${mod.price > 0 ? `(+$${mod.price.toFixed(2)})` : ''}
                                </div>
                            `;
                        });
                    }
                    
                    // Add special instructions
                    if (item.special_instructions) {
                        itemHtml += `
                            <div class="kitchen-order-item-details">
                                📝 ${item.special_instructions}
                            </div>
                        `;
                    }
                    
                    return itemHtml;
                }).join('')}
            </div>
            ${order.special_instructions ? `
                <div class="kitchen-order-instructions">
                    📋 Order Note: ${order.special_instructions}
                </div>
            ` : ''}
            <div class="kitchen-order-actions">
                ${order.status === 'new' ? `
                    <button class="btn-prepare" onclick="updateOrderStatus(${order.id}, 'preparing')">Start Prep</button>
                ` : order.status === 'preparing' ? `
                    <button class="btn-ready" onclick="updateOrderStatus(${order.id}, 'ready')">Mark Ready</button>
                ` : `
                    <span style="color: #28a745;">✓ Ready</span>
                `}
            </div>
        </div>
    `).join('');
}

// Update order status
async function updateOrderStatus(orderId, status) {
    try {
        const response = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: status })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Refresh kitchen display
            loadKitchenOrders();
        }
    } catch (error) {
        console.error('Error updating order status:', error);
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('modifier-modal');
    if (event.target === modal) {
        closeModifierModal();
    }
}