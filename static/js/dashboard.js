// =============================================
// RESTAURANT POS SYSTEM WITH MULTI-USER MANAGEMENT
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
let itemToDelete = null;
let deleteCallback = null;

// Chart instances
let hourlyChart = null;
let categoryChart = null;

// =============================================
// INITIALIZATION
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    
    // Check if system has been set up
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    if (users.length === 0) {
        // Show startup screen
        document.getElementById('startup-screen').style.display = 'flex';
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'none';
    } else {
        // Show login screen
        document.getElementById('startup-screen').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('dashboard').style.display = 'none';
        
        // Load ALL restaurant info for login screen
        loadRestaurantInfo();
    }
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

// =============================================
// SETUP FUNCTIONS
// =============================================

let currentStep = 1;
let setupOption = 'empty';

function nextStep() {
    if (currentStep === 1) {
        // Validate step 1
        const name = document.getElementById('admin-full-name').value.trim();
        const pin = document.getElementById('admin-pin').value;
        const confirmPin = document.getElementById('admin-confirm-pin').value;
        
        if (!name) {
            showNotification('Please enter admin name', 'error');
            return;
        }
        
        if (!pin || pin.length !== 4) {
            showNotification('Please enter a 4-digit PIN', 'error');
            return;
        }
        
        if (pin !== confirmPin) {
            showNotification('PINs do not match', 'error');
            return;
        }
        
        // Update summary
        document.getElementById('summary-admin').textContent = name;
    }
    
    if (currentStep === 2) {
        // Validate step 2
        const restaurantName = document.getElementById('restaurant-name').value.trim();
        if (!restaurantName) {
            showNotification('Please enter restaurant name', 'error');
            return;
        }
        
        // Update summary
        document.getElementById('summary-restaurant').textContent = restaurantName;
        document.getElementById('summary-tax').textContent = document.getElementById('restaurant-tax-rate').value + '%';
    }
    
    // Update progress
    document.getElementById(`step${currentStep}`).classList.remove('active');
    document.getElementById(`step${currentStep}-indicator`).classList.remove('active');
    
    currentStep++;
    
    document.getElementById(`step${currentStep}`).classList.add('active');
    document.getElementById(`step${currentStep}-indicator`).classList.add('active');
}

function prevStep() {
    currentStep--;
    
    document.getElementById(`step${currentStep + 1}`).classList.remove('active');
    document.getElementById(`step${currentStep + 1}-indicator`).classList.remove('active');
    
    document.getElementById(`step${currentStep}`).classList.add('active');
    document.getElementById(`step${currentStep}-indicator`).classList.add('active');
}

function selectSetupOption(option) {
    setupOption = option;
    
    // Update UI
    document.querySelectorAll('.setup-option-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.getElementById(`option-${option}`).classList.add('selected');
    
    // Update summary
    const optionLabels = {
        'empty': 'Start Fresh',
        'demo': 'Load Demo Data',
        'minimal': 'Minimal Setup'
    };
    document.getElementById('summary-option').textContent = optionLabels[option];
}

function completeSetup() {
    // Create admin user with ALL permissions including manageUsers
    const adminName = document.getElementById('admin-full-name').value.trim();
    const adminPin = document.getElementById('admin-pin').value;
    const adminEmail = document.getElementById('admin-email').value;
    
    const adminUser = {
        id: 1,
        name: adminName,
        pin: adminPin,
        email: adminEmail,
        role: 'admin',
        permissions: {
            pos: true,
            kitchen: true,
            inventory: true,
            reports: true,
            settings: true,
            manageUsers: true
        },
        createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('users', JSON.stringify([adminUser]));
    
    // Save restaurant info
    const restaurantInfo = {
        name: document.getElementById('restaurant-name').value.trim(),
        address: document.getElementById('restaurant-address').value.trim(),
        city: document.getElementById('restaurant-city').value.trim(),
        state: document.getElementById('restaurant-state').value.trim(),
        zip: document.getElementById('restaurant-zip').value.trim(),
        phone: document.getElementById('restaurant-phone').value.trim(),
        taxRate: parseFloat(document.getElementById('restaurant-tax-rate').value),
        logo: null
    };
    
    localStorage.setItem('restaurantInfo', JSON.stringify(restaurantInfo));
    
    // Setup based on option
    if (setupOption === 'demo') {
        loadDemoData();
    } else if (setupOption === 'minimal') {
        loadMinimalData();
    }
    
    // Show login screen
    document.getElementById('startup-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('login-restaurant-name').textContent = restaurantInfo.name;
    
    showNotification('Setup complete! Please login with your PIN', 'success');
}

function loadDemoData() {
    // This function intentionally left empty - no demo data
    console.log('Demo data option selected but no data loaded');
}

function loadMinimalData() {
    // This function intentionally left empty - no demo data
    console.log('Minimal data option selected but no data loaded');
}

// =============================================
// LOGIN FUNCTIONS
// =============================================

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
        showNotification('Please enter 4-digit PIN', 'error');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.pin === currentPin);
    
    if (user) {
        currentUser = user;
        
        document.getElementById('staff-name').textContent = user.name;
        document.getElementById('staff-role').textContent = user.role;
        document.getElementById('current-staff-name').textContent = user.name;
        
        // Apply permissions
        applyPermissions();
        
        // Load ALL restaurant info (name AND logo)
        loadRestaurantInfo();
        
        // Load dashboard
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        
        // Load all data
        loadAllData();
        
        clearPin();
        showNotification(`Welcome, ${user.name}!`, 'success');
    } else {
        showNotification('Invalid PIN', 'error');
        clearPin();
    }
}

function logout() {
    currentUser = null;
    cart = [];
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
    clearPin();
    
    // Reset logo to default icon on logout
    document.getElementById('sidebar-logo').innerHTML = '<i class="fas fa-utensils"></i>';
    const loginLogo = document.querySelector('.login-logo');
    if (loginLogo) {
        loginLogo.innerHTML = '<i class="fas fa-utensils"></i>';
    }
}

// =============================================
// PERMISSIONS MANAGEMENT
// =============================================

function applyPermissions() {
    if (!currentUser) return;
    
    const perms = currentUser.permissions;
    
    // Show/hide navigation items based on permissions
    document.getElementById('nav-inventory').style.display = perms.inventory ? 'flex' : 'none';
    document.getElementById('nav-reports').style.display = perms.reports ? 'flex' : 'none';
    
    // Settings nav - show if user has settings OR manageUsers OR is admin
    const showSettings = perms.settings || perms.manageUsers || currentUser.role === 'admin';
    document.getElementById('nav-settings').style.display = showSettings ? 'flex' : 'none';
    
    // Kitchen nav - show for kitchen permission or cook role
    if (currentUser.role === 'cook' || perms.kitchen) {
        document.getElementById('nav-kitchen').style.display = 'flex';
    } else {
        document.getElementById('nav-kitchen').style.display = 'none';
    }
    
    // POS nav - show for pos permission
    document.getElementById('nav-pos').style.display = perms.pos ? 'flex' : 'none';
    
    // Overview nav - always show but hide for cook
    if (currentUser.role === 'cook') {
        document.getElementById('nav-overview').style.display = 'none';
    } else {
        document.getElementById('nav-overview').style.display = 'flex';
    }
    
    // Show/hide inventory actions
    if (perms.inventory) {
        const inventoryActions = document.getElementById('inventory-actions');
        if (inventoryActions) inventoryActions.style.display = 'flex';
        
        const inventoryActionsHeader = document.getElementById('inventory-actions-header');
        if (inventoryActionsHeader) inventoryActionsHeader.style.display = 'table-cell';
    }
    
    // Show/hide report controls
    if (perms.reports) {
        const reportControls = document.getElementById('report-controls');
        if (reportControls) reportControls.style.display = 'flex';
    }
    
    // Show/hide clear completed button for managers/admins
    if (perms.reports || perms.settings || currentUser.role === 'admin') {
        const clearBtn = document.getElementById('clear-completed-btn');
        if (clearBtn) clearBtn.style.display = 'inline-flex';
    }
}

function hasPermission(permission) {
    if (!currentUser || !currentUser.permissions) return false;
    
    // Admin always has all permissions
    if (currentUser.role === 'admin') return true;
    
    return currentUser.permissions[permission] === true;
}

// =============================================
// USER MANAGEMENT FUNCTIONS
// =============================================

function openUserManagement() {
    // Check if user has manageUsers permission OR is admin
    if (!hasPermission('manageUsers') && currentUser.role !== 'admin') {
        showNotification('Only admins can manage users', 'error');
        return;
    }
    
    loadUsersList();
    document.getElementById('user-management-modal').style.display = 'flex';
}

function closeUserManagementModal() {
    document.getElementById('user-management-modal').style.display = 'none';
    clearUserForm();
}

function updateRolePreview() {
    const role = document.getElementById('new-user-role').value;
    const preview = document.getElementById('role-permissions');
    
    let badges = '';
    if (role === 'admin') {
        badges = '<span class="permission-badge admin">👑 Admin (Full Access including User Management)</span>';
    } else if (role === 'manager') {
        badges = '<span class="permission-badge pos">🛒 POS</span><span class="permission-badge kitchen">👨‍🍳 Kitchen</span><span class="permission-badge inventory">📦 Inventory</span><span class="permission-badge reports">📊 Reports</span>';
    } else if (role === 'cook') {
        badges = '<span class="permission-badge kitchen">👨‍🍳 Kitchen Only</span>';
    } else {
        badges = '<span class="permission-badge pos">🛒 POS Only</span>';
    }
    
    preview.innerHTML = badges;
}

function loadUsersList() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const list = document.getElementById('users-list');
    
    let html = '';
    users.forEach(user => {
        html += '<div class="user-item">';
        html += '<div class="user-item-info">';
        html += '<div class="user-item-name">' + user.name + '</div>';
        html += '<div class="user-item-details">';
        html += '<span class="user-item-pin">PIN: ' + user.pin + '</span>';
        html += '<span class="user-item-role">' + user.role + '</span>';
        html += '</div>';
        html += '</div>';
        html += '<div class="user-item-actions">';
        html += '<button class="btn-sm btn-primary" onclick="editUser(' + user.id + ')"><i class="fas fa-edit"></i></button>';
        if (user.id !== 1) {
            html += '<button class="btn-sm btn-danger" onclick="deleteUser(' + user.id + ')"><i class="fas fa-trash"></i></button>';
        } else {
            html += '<span class="badge-success" style="padding:5px;">Primary Admin</span>';
        }
        html += '</div>';
        html += '</div>';
    });
    
    list.innerHTML = html;
}

function addNewUser() {
    const name = document.getElementById('new-user-name').value.trim();
    const pin = document.getElementById('new-user-pin').value;
    const role = document.getElementById('new-user-role').value;
    
    if (!name) {
        showNotification('Please enter user name', 'error');
        return;
    }
    
    if (!pin || pin.length !== 4) {
        showNotification('Please enter a 4-digit PIN', 'error');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Check if PIN already exists
    if (users.some(u => u.pin === pin)) {
        showNotification('PIN already exists', 'error');
        return;
    }
    
    const permissions = getPermissionsForRole(role);
    
    const newUser = {
        id: Date.now(),
        name: name,
        pin: pin,
        role: role,
        permissions: permissions,
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    loadUsersList();
    clearUserForm();
    showNotification(`User ${name} added successfully`, 'success');
}

function getPermissionsForRole(role) {
    switch(role) {
        case 'admin':
            return {
                pos: true,
                kitchen: true,
                inventory: true,
                reports: true,
                settings: true,
                manageUsers: true
            };
        case 'manager':
            return {
                pos: true,
                kitchen: true,
                inventory: true,
                reports: true,
                settings: false,
                manageUsers: false
            };
        case 'cook':
            return {
                pos: false,
                kitchen: true,
                inventory: false,
                reports: false,
                settings: false,
                manageUsers: false
            };
        default: // staff
            return {
                pos: true,
                kitchen: false,
                inventory: false,
                reports: false,
                settings: false,
                manageUsers: false
            };
    }
}

function editUser(userId) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.id === userId);
    
    if (!user) return;
    
    document.getElementById('edit-user-id').value = user.id;
    document.getElementById('edit-user-name').value = user.name;
    document.getElementById('edit-user-pin').value = '';
    document.getElementById('edit-user-role').value = user.role;
    
    closeUserManagementModal();
    document.getElementById('edit-user-modal').style.display = 'flex';
}

function closeEditUserModal() {
    document.getElementById('edit-user-modal').style.display = 'none';
}

function saveUserChanges() {
    const userId = parseInt(document.getElementById('edit-user-id').value);
    const name = document.getElementById('edit-user-name').value.trim();
    const pin = document.getElementById('edit-user-pin').value;
    const role = document.getElementById('edit-user-role').value;
    
    if (!name) {
        showNotification('Please enter user name', 'error');
        return;
    }
    
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) return;
    
    // Check if new PIN already exists (if changed)
    if (pin) {
        if (pin.length !== 4) {
            showNotification('PIN must be 4 digits', 'error');
            return;
        }
        if (users.some((u, i) => i !== userIndex && u.pin === pin)) {
            showNotification('PIN already exists', 'error');
            return;
        }
        users[userIndex].pin = pin;
    }
    
    users[userIndex].name = name;
    users[userIndex].role = role;
    users[userIndex].permissions = getPermissionsForRole(role);
    
    localStorage.setItem('users', JSON.stringify(users));
    
    closeEditUserModal();
    openUserManagement();
    showNotification('User updated successfully', 'success');
}

function deleteUser(userId) {
    itemToDelete = userId;
    deleteCallback = confirmDeleteUser;
    document.getElementById('delete-message').textContent = 'Are you sure you want to delete this user?';
    document.getElementById('delete-confirm-modal').style.display = 'flex';
}

function confirmDeleteUser() {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const updatedUsers = users.filter(u => u.id !== itemToDelete);
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    
    loadUsersList();
    showNotification('User deleted successfully', 'success');
}

function clearUserForm() {
    document.getElementById('new-user-name').value = '';
    document.getElementById('new-user-pin').value = '';
    document.getElementById('new-user-role').value = 'staff';
    updateRolePreview();
}

// =============================================
// RESTAURANT SETTINGS FUNCTIONS
// =============================================

function openRestaurantSettings() {
    if (!hasPermission('settings') && currentUser.role !== 'admin') {
        showNotification('Access denied', 'error');
        return;
    }
    
    const info = JSON.parse(localStorage.getItem('restaurantInfo') || '{}');
    
    document.getElementById('settings-restaurant-name').value = info.name || '';
    document.getElementById('settings-restaurant-address').value = info.address || '';
    document.getElementById('settings-restaurant-city').value = info.city || '';
    document.getElementById('settings-restaurant-state').value = info.state || '';
    document.getElementById('settings-restaurant-zip').value = info.zip || '';
    document.getElementById('settings-restaurant-phone').value = info.phone || '';
    
    // Load logo if exists
    if (info.logo) {
        document.getElementById('logo-preview').src = info.logo;
        document.getElementById('logo-preview').style.display = 'block';
        document.getElementById('logo-placeholder').style.display = 'none';
        document.getElementById('remove-logo-btn').style.display = 'inline-flex';
        window.tempLogoData = info.logo;
    } else {
        document.getElementById('logo-preview').style.display = 'none';
        document.getElementById('logo-placeholder').style.display = 'flex';
        document.getElementById('remove-logo-btn').style.display = 'none';
        window.tempLogoData = null;
    }
    
    document.getElementById('restaurant-settings-modal').style.display = 'flex';
}

function closeRestaurantSettingsModal() {
    document.getElementById('restaurant-settings-modal').style.display = 'none';
}

function saveRestaurantSettings() {
    const info = {
        name: document.getElementById('settings-restaurant-name').value.trim(),
        address: document.getElementById('settings-restaurant-address').value.trim(),
        city: document.getElementById('settings-restaurant-city').value.trim(),
        state: document.getElementById('settings-restaurant-state').value.trim(),
        zip: document.getElementById('settings-restaurant-zip').value.trim(),
        phone: document.getElementById('settings-restaurant-phone').value.trim(),
        taxRate: parseFloat(localStorage.getItem('restaurantInfo') ? JSON.parse(localStorage.getItem('restaurantInfo')).taxRate : 8.5),
        logo: window.tempLogoData || null
    };
    
    localStorage.setItem('restaurantInfo', JSON.stringify(info));
    
    // Update ALL displays
    document.getElementById('restaurant-name-display').textContent = info.name;
    document.getElementById('login-restaurant-name').textContent = info.name;
    
    // Update logo displays
    updateLogoDisplay(info.logo);
    
    closeRestaurantSettingsModal();
    showNotification('Restaurant information updated', 'success');
}

// =============================================
// LOGO UPLOAD FUNCTIONS
// =============================================

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        showNotification('Logo image must be less than 2MB', 'error');
        return;
    }
    
    // Check file type
    if (!file.type.match('image.*')) {
        showNotification('Please select an image file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const logoData = e.target.result;
        
        // Show preview
        document.getElementById('logo-preview').src = logoData;
        document.getElementById('logo-preview').style.display = 'block';
        document.getElementById('logo-placeholder').style.display = 'none';
        document.getElementById('remove-logo-btn').style.display = 'inline-flex';
        
        // Store temporarily
        window.tempLogoData = logoData;
    };
    reader.readAsDataURL(file);
}

function removeLogo() {
    // Hide preview, show placeholder
    document.getElementById('logo-preview').style.display = 'none';
    document.getElementById('logo-preview').src = '';
    document.getElementById('logo-placeholder').style.display = 'flex';
    document.getElementById('remove-logo-btn').style.display = 'none';
    
    // Clear temp data
    window.tempLogoData = null;
    
    // Clear file input
    document.getElementById('logo-upload').value = '';
}

function updateLogoDisplay(logoData) {
    // Update sidebar logo
    const sidebarLogo = document.getElementById('sidebar-logo');
    if (sidebarLogo) {
        if (logoData) {
            sidebarLogo.innerHTML = '<img src="' + logoData + '" alt="Restaurant Logo" style="width: 100%; height: 100%; object-fit: cover;">';
        } else {
            sidebarLogo.innerHTML = '<i class="fas fa-utensils"></i>';
        }
    }
    
    // Update login screen logo
    const loginLogo = document.querySelector('.login-logo');
    if (loginLogo) {
        if (logoData) {
            loginLogo.innerHTML = '<img src="' + logoData + '" alt="Restaurant Logo" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">';
        } else {
            loginLogo.innerHTML = '<i class="fas fa-utensils"></i>';
        }
    }
}

function loadRestaurantInfo() {
    const info = JSON.parse(localStorage.getItem('restaurantInfo') || '{}');
    
    // Update login screen
    if (info.name) {
        document.getElementById('login-restaurant-name').textContent = info.name;
    }
    
    // Update dashboard sidebar if element exists
    const dashboardNameDisplay = document.getElementById('restaurant-name-display');
    if (dashboardNameDisplay) {
        dashboardNameDisplay.textContent = info.name || 'Restaurant POS';
    }
    
    // Update logo if exists
    if (info.logo) {
        const loginLogo = document.querySelector('.login-logo');
        if (loginLogo) {
            loginLogo.innerHTML = '<img src="' + info.logo + '" alt="Restaurant Logo" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">';
        }
        
        // Update sidebar logo if user is logged in
        const sidebarLogo = document.getElementById('sidebar-logo');
        if (sidebarLogo) {
            sidebarLogo.innerHTML = '<img src="' + info.logo + '" alt="Restaurant Logo" style="width: 100%; height: 100%; object-fit: cover;">';
        }
    }
    
    // Update tax rate display if needed
    if (info.taxRate) {
        const taxDisplay = document.getElementById('tax-rate-display');
        if (taxDisplay) {
            taxDisplay.textContent = info.taxRate;
        }
    }
}

function loadRestaurantLogo() {
    const info = JSON.parse(localStorage.getItem('restaurantInfo') || '{}');
    if (info.logo) {
        updateLogoDisplay(info.logo);
    }
}

// =============================================
// MENU MANAGEMENT FUNCTIONS
// =============================================

function openMenuManagement() {
    if (!hasPermission('settings') && currentUser.role !== 'admin') {
        showNotification('Only admins can manage menu', 'error');
        return;
    }
    
    loadMenuItemsList();
    document.getElementById('menu-management-modal').style.display = 'flex';
}

function closeMenuManagementModal() {
    document.getElementById('menu-management-modal').style.display = 'none';
}

function loadMenuItemsList() {
    const items = JSON.parse(localStorage.getItem('menuItems') || '[]');
    const list = document.getElementById('menu-items-list');
    
    if (items.length === 0) {
        list.innerHTML = '<div class="loading" style="padding: 20px; text-align: center;">No menu items yet. Add your first item above.</div>';
        return;
    }
    
    let html = '';
    items.forEach(item => {
        html += '<div class="menu-item-row">';
        html += '<div class="menu-item-info">';
        html += '<span class="menu-item-name">' + item.name + '</span>';
        html += '<span class="menu-item-category">' + item.category + '</span>';
        html += '</div>';
        html += '<div>';
        html += '<span class="menu-item-price">$' + item.price.toFixed(2) + '</span>';
        html += '<button class="btn-sm btn-danger" onclick="deleteMenuItem(' + item.id + ')"><i class="fas fa-trash"></i></button>';
        html += '</div>';
        html += '</div>';
    });
    
    list.innerHTML = html;
}

function addMenuItem() {
    const name = document.getElementById('new-menu-name').value.trim();
    const price = parseFloat(document.getElementById('new-menu-price').value);
    const category = document.getElementById('new-menu-category').value;
    
    if (!name) {
        showNotification('Please enter item name', 'error');
        return;
    }
    
    if (isNaN(price) || price <= 0) {
        showNotification('Please enter a valid price', 'error');
        return;
    }
    
    let menuItems = JSON.parse(localStorage.getItem('menuItems') || '[]');
    
    const newId = menuItems.length > 0 ? Math.max(...menuItems.map(i => i.id)) + 1 : 1;
    
    const newItem = {
        id: newId,
        name: name,
        price: price,
        category: category
    };
    
    menuItems.push(newItem);
    localStorage.setItem('menuItems', JSON.stringify(menuItems));
    
    // Clear form
    document.getElementById('new-menu-name').value = '';
    document.getElementById('new-menu-price').value = '';
    
    // Refresh both management list and POS menu
    loadMenuItemsList();
    loadMenuItems();
    
    showNotification(`Added ${name} to menu`, 'success');
}

function deleteMenuItem(itemId) {
    itemToDelete = itemId;
    deleteCallback = confirmDeleteMenuItem;
    document.getElementById('delete-message').textContent = 'Are you sure you want to delete this menu item?';
    document.getElementById('delete-confirm-modal').style.display = 'flex';
}

function confirmDeleteMenuItem() {
    let menuItems = JSON.parse(localStorage.getItem('menuItems') || '[]');
    const deletedItem = menuItems.find(i => i.id === itemToDelete);
    menuItems = menuItems.filter(i => i.id !== itemToDelete);
    localStorage.setItem('menuItems', JSON.stringify(menuItems));
    
    // Refresh both management list and POS menu
    loadMenuItemsList();
    loadMenuItems();
    
    showNotification(`Deleted ${deletedItem ? deletedItem.name : 'item'} from menu`, 'success');
}

// =============================================
// TAX SETTINGS FUNCTIONS
// =============================================

function openTaxSettings() {
    if (!hasPermission('settings') && currentUser.role !== 'admin') {
        showNotification('Access denied', 'error');
        return;
    }
    
    const info = JSON.parse(localStorage.getItem('restaurantInfo') || '{}');
    document.getElementById('tax-rate').value = info.taxRate || 8.5;
    document.getElementById('tax-settings-modal').style.display = 'flex';
}

function closeTaxSettingsModal() {
    document.getElementById('tax-settings-modal').style.display = 'none';
}

function saveTaxSettings() {
    const taxRate = parseFloat(document.getElementById('tax-rate').value);
    
    const info = JSON.parse(localStorage.getItem('restaurantInfo') || '{}');
    info.taxRate = taxRate;
    localStorage.setItem('restaurantInfo', JSON.stringify(info));
    
    document.getElementById('tax-rate-display').textContent = taxRate;
    
    closeTaxSettingsModal();
    showNotification('Tax rate updated', 'success');
}

// =============================================
// DATA EXPORT FUNCTIONS
// =============================================

function exportAllData() {
    if (!hasPermission('settings') && currentUser.role !== 'admin') {
        showNotification('Access denied', 'error');
        return;
    }
    
    const data = {
        users: JSON.parse(localStorage.getItem('users') || '[]'),
        restaurantInfo: JSON.parse(localStorage.getItem('restaurantInfo') || '{}'),
        menuItems: JSON.parse(localStorage.getItem('menuItems') || '[]'),
        inventoryItems: JSON.parse(localStorage.getItem('inventoryItems') || '[]'),
        kitchenOrders: JSON.parse(localStorage.getItem('kitchenOrders') || '[]'),
        dailySales: JSON.parse(localStorage.getItem('dailySales') || '[]'),
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pos-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    showNotification('Data exported successfully', 'success');
}

// =============================================
// DATA LOADING FUNCTIONS
// =============================================

function loadAllData() {
    loadMenuItems();
    loadInventory();
    loadSavedKitchenOrders();
    updateDashboardMetrics();
    
    const salesData = JSON.parse(localStorage.getItem('dailySales') || '[]');
    if (salesData.length > 0) {
        updateCharts();
        updateTopItems();
    } else {
        // Show empty state for charts
        document.getElementById('hourlyChart').style.display = 'none';
        document.getElementById('categoryChart').style.display = 'none';
    }
    
    updateLowStockAlerts();
    
    if (hasPermission('reports')) {
        loadReports();
    }
}

function refreshData() {
    loadInventory();
    loadSavedKitchenOrders();
    updateDashboardMetrics();
    
    const salesData = JSON.parse(localStorage.getItem('dailySales') || '[]');
    if (salesData.length > 0) {
        updateTopItems();
        updateCharts();
    }
    
    updateLowStockAlerts();
    showNotification('Data refreshed!', 'success');
}

// =============================================
// TAB SWITCHING
// =============================================

function switchTab(tabName) {
    // Check permissions
    if (tabName === 'inventory' && !hasPermission('inventory')) {
        showNotification('Access denied', 'error');
        return;
    }
    if (tabName === 'reports' && !hasPermission('reports')) {
        showNotification('Access denied', 'error');
        return;
    }
    if (tabName === 'settings' && !hasPermission('settings') && currentUser.role !== 'admin') {
        showNotification('Access denied', 'error');
        return;
    }
    if (tabName === 'kitchen' && !hasPermission('kitchen') && currentUser.role !== 'cook') {
        showNotification('Access denied', 'error');
        return;
    }
    if (tabName === 'pos' && !hasPermission('pos')) {
        showNotification('Access denied', 'error');
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
        'reports': 'Sales Reports',
        'settings': 'System Settings'
    };
    document.getElementById('page-title').textContent = titles[tabName];
    
    // Load tab-specific data
    if (tabName === 'inventory') {
        loadInventory();
    }
    if (tabName === 'reports') {
        loadReports();
    }
    if (tabName === 'overview') {
        setTimeout(() => {
            const salesData = JSON.parse(localStorage.getItem('dailySales') || '[]');
            updateDashboardMetrics();
            if (salesData.length > 0) {
                updateCharts();
                updateTopItems();
            } else {
                document.getElementById('hourlyChart').style.display = 'none';
                document.getElementById('categoryChart').style.display = 'none';
                document.getElementById('top-items-body').innerHTML = '<tr><td colspan="3" class="loading">No sales data yet. Complete a sale to see charts.</td></tr>';
            }
            updateLowStockAlerts();
        }, 100);
    }
    if (tabName === 'kitchen') {
        renderKitchenOrders();
    }
}

// =============================================
// MENU FUNCTIONS - FOR POS DISPLAY
// =============================================

function loadMenuItems() {
    const saved = localStorage.getItem('menuItems');
    menuItems = saved ? JSON.parse(saved) : [];
    filterMenu('all');
}

function filterMenu(category) {
    currentFilter = category;
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
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
        grid.innerHTML = '<div class="loading">No menu items found. Add items in Settings > Menu Management.</div>';
        return;
    }
    
    let html = '';
    filtered.forEach(item => {
        html += '<div class="menu-item" onclick="addToCart(' + item.id + ')">';
        html += '<div class="menu-item-name">' + item.name + '</div>';
        html += '<div class="price">$' + item.price.toFixed(2) + '</div>';
        html += '</div>';
    });
    
    grid.innerHTML = html;
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
    
    // Group identical items
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
    groupedCart.forEach(item => {
        html += '<div class="cart-item">';
        html += '<div class="cart-item-info">';
        html += '<div class="cart-item-name">' + item.name + (item.quantity > 1 ? ' (x' + item.quantity + ')' : '') + '</div>';
        html += '</div>';
        html += '<div class="cart-item-price">$' + (item.price * item.quantity).toFixed(2) + '</div>';
        html += '<div class="cart-item-actions">';
        html += '<button onclick="removeFromCartByItemId(' + item.id + ')"><i class="fas fa-trash"></i></button>';
        html += '</div>';
        html += '</div>';
    });
    
    cartDiv.innerHTML = html;
    updateCartTotals();
}

function removeFromCartByItemId(itemId) {
    for (let i = cart.length - 1; i >= 0; i--) {
        if (cart[i].id === itemId) {
            cart.splice(i, 1);
            break;
        }
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
    const info = JSON.parse(localStorage.getItem('restaurantInfo') || '{}');
    const taxRate = info.taxRate || 8.5;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    
    document.getElementById('cart-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('cart-tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`;
    document.getElementById('tax-rate-display').textContent = taxRate;
}

// =============================================
// INVENTORY FUNCTIONS - WITH WARNINGS AND SUGGESTIONS
// =============================================

function loadInventory() {
    const saved = localStorage.getItem('inventoryItems');
    inventoryItems = saved ? JSON.parse(saved) : [];
    renderInventory(inventoryItems);
    populateInventoryDropdown();
}

function renderInventory(items) {
    const tbody = document.getElementById('inventory-body');
    if (!tbody) return;
    
    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading">No inventory items. Click "Add Item" to get started.</td></tr>';
        
        document.getElementById('total-inventory-value').textContent = '$0.00';
        document.getElementById('low-stock-count').textContent = '0';
        document.getElementById('inventory-badge').textContent = '0';
        document.getElementById('inventory-badge').style.display = 'none';
        return;
    }
    
    const lowStock = items.filter(item => item.stock > 0 && item.stock <= item.reorder).length;
    const outOfStock = items.filter(item => item.stock <= 0).length;
    const totalValue = calculateTotalInventoryValue();
    
    document.getElementById('low-stock-count').textContent = lowStock + outOfStock;
    document.getElementById('total-inventory-value').textContent = `$${totalValue.toFixed(2)}`;
    
    const alertCount = lowStock + outOfStock;
    const badge = document.getElementById('inventory-badge');
    badge.textContent = alertCount;
    badge.style.display = alertCount > 0 ? 'inline-block' : 'none';
    
    let html = '';
    items.forEach(item => {
        let statusClass = 'badge-success';
        let statusText = 'OK';
        
        if (item.stock <= 0) {
            statusClass = 'badge-danger';
            statusText = 'Out of Stock';
        } else if (item.stock <= item.reorder) {
            statusClass = 'badge-warning';
            statusText = 'Low Stock';
        }
        
        let stockDisplay = item.stock;
        if (item.unit === 'each' || item.unit === 'slice' || item.unit === 'head') {
            stockDisplay = Math.round(item.stock);
        } else {
            stockDisplay = item.stock.toFixed(1);
        }
        
        // Check if this inventory item matches any menu item
        const matchingMenuItem = menuItems.find(menuItem => 
            menuItem.name.toLowerCase() === item.name.toLowerCase()
        );
        
        // Add warning icon if out of stock but exists in menu
        const warningIcon = (item.stock <= 0 && matchingMenuItem) ? 
            '<span class="warning-icon" title="This item is on the menu but out of stock!">⚠️</span> ' : '';
        
        html += '<tr>';
        html += '<td>' + warningIcon + item.name + '</td>';
        html += '<td>' + stockDisplay + '</td>';
        html += '<td>' + item.unit + '</td>';
        html += '<td><span class="' + statusClass + '">' + statusText + '</span></td>';
        html += '<td>';
        
        if (hasPermission('inventory')) {
            html += '<div class="action-buttons">';
            html += '<button class="btn-sm btn-primary" onclick="showReceiveStockModal(' + item.id + ')">Receive</button>';
            html += '<button class="delete-btn" onclick="showDeleteModal(' + item.id + ')"><i class="fas fa-trash"></i></button>';
            html += '</div>';
        } else {
            html += '-';
        }
        
        html += '</td>';
        html += '</tr>';
    });
    
    tbody.innerHTML = html;
    updateLowStockAlerts();
}

function calculateTotalInventoryValue() {
    if (!inventoryItems.length) return 0;
    return inventoryItems.reduce((sum, item) => sum + ((item.cost || 0) * (item.stock || 0)), 0);
}

function populateInventoryDropdown() {
    const select = document.getElementById('receive-item');
    if (!select) return;
    
    if (!inventoryItems.length) {
        select.innerHTML = '<option value="">No items available</option>';
        return;
    }
    
    let options = '<option value="">-- Select Item --</option>';
    inventoryItems.forEach(item => {
        let stockDisplay = item.stock;
        if (item.unit === 'each' || item.unit === 'slice' || item.unit === 'head') {
            stockDisplay = Math.round(item.stock);
        } else {
            stockDisplay = item.stock.toFixed(1);
        }
        
        // Check if this inventory item is low or out of stock
        const stockStatus = item.stock <= 0 ? 'OUT OF STOCK' : 
                           (item.stock <= item.reorder ? 'LOW' : '');
        
        const statusText = stockStatus ? ` [${stockStatus}]` : '';
        
        options += `<option value="${item.id}">${item.name} (Current: ${stockDisplay} ${item.unit})${statusText}</option>`;
    });
    
    select.innerHTML = options;
}

function showAddInventoryModal() {
    if (!hasPermission('inventory')) {
        showNotification('Access denied', 'error');
        return;
    }
    
    // Suggest inventory items based on menu items
    suggestInventoryItems();
    
    document.getElementById('add-inventory-modal').style.display = 'flex';
}

function suggestInventoryItems() {
    // Get all menu items
    const menuItems = JSON.parse(localStorage.getItem('menuItems') || '[]');
    const inventoryItems = JSON.parse(localStorage.getItem('inventoryItems') || '[]');
    
    // Find menu items that don't have corresponding inventory
    const missingInventory = menuItems.filter(menuItem => {
        return !inventoryItems.some(invItem => 
            invItem.name.toLowerCase() === menuItem.name.toLowerCase()
        );
    });
    
    // Create suggestion div if it doesn't exist
    let suggestionsEl = document.getElementById('inventory-suggestions');
    if (!suggestionsEl) {
        const modalBody = document.querySelector('#add-inventory-modal .modal-body');
        if (modalBody) {
            const suggestions = document.createElement('div');
            suggestions.id = 'inventory-suggestions';
            suggestions.className = 'inventory-suggestions';
            suggestions.style.marginBottom = '20px';
            suggestions.style.padding = '15px';
            suggestions.style.background = '#e8f4fd';
            suggestions.style.borderRadius = '8px';
            suggestions.style.borderLeft = '4px solid #3498db';
            modalBody.insertBefore(suggestions, modalBody.firstChild);
            suggestionsEl = suggestions;
        }
    }
    
    if (suggestionsEl) {
        if (missingInventory.length > 0) {
            let html = '<h4 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 14px;">';
            html += '<i class="fas fa-lightbulb" style="color: #f39c12;"></i> Suggested Inventory Items';
            html += '</h4>';
            html += '<p style="margin: 0 0 10px 0; color: #2c3e50; font-size: 13px;">';
            html += 'These items are on your menu but not in inventory:';
            html += '</p>';
            html += '<div style="display: flex; flex-wrap: wrap; gap: 8px;">';
            
            missingInventory.slice(0, 5).forEach(item => {
                html += '<button class="btn-sm btn-secondary" onclick="quickAddInventoryItem(\'' + item.name + '\', \'each\', 20, ' + (item.price * 0.3).toFixed(2) + ')">';
                html += '<i class="fas fa-plus"></i> ' + item.name;
                html += '</button>';
            });
            
            if (missingInventory.length > 5) {
                html += '<span style="font-size: 12px; color: #7f8c8d;">+' + (missingInventory.length - 5) + ' more</span>';
            }
            
            html += '</div>';
            suggestionsEl.innerHTML = html;
        } else {
            suggestionsEl.innerHTML = '<h4 style="margin: 0 0 5px 0; color: #27ae60; font-size: 14px;">' +
                '<i class="fas fa-check-circle"></i> All menu items have inventory</h4>' +
                '<p style="margin: 0; color: #2c3e50; font-size: 13px;">' +
                'Great! Every menu item has corresponding inventory tracking.</p>';
        }
    }
}

function quickAddInventoryItem(name, unit, reorder, cost) {
    document.getElementById('new-item-name').value = name;
    document.getElementById('new-item-unit').value = unit;
    document.getElementById('new-item-reorder').value = reorder;
    document.getElementById('new-item-cost').value = cost.toFixed(2);
    
    showNotification(`Ready to add ${name} to inventory`, 'success');
}

function closeAddInventoryModal() {
    document.getElementById('add-inventory-modal').style.display = 'none';
    document.getElementById('new-item-name').value = '';
    document.getElementById('new-item-unit').value = 'each';
    document.getElementById('new-item-reorder').value = '';
    document.getElementById('new-item-cost').value = '';
    
    // Remove suggestions div if it exists
    const suggestionsEl = document.getElementById('inventory-suggestions');
    if (suggestionsEl) {
        suggestionsEl.remove();
    }
}

function addInventoryItem() {
    const name = document.getElementById('new-item-name').value.trim();
    const unit = document.getElementById('new-item-unit').value;
    const reorder = parseInt(document.getElementById('new-item-reorder').value);
    const cost = parseFloat(document.getElementById('new-item-cost').value);
    
    if (!name) {
        showNotification('Please enter item name', 'error');
        return;
    }
    
    if (isNaN(reorder) || reorder <= 0) {
        showNotification('Please enter valid reorder level', 'error');
        return;
    }
    
    if (isNaN(cost) || cost <= 0) {
        showNotification('Please enter valid cost', 'error');
        return;
    }
    
    // Check if item already exists in inventory
    const existingItem = inventoryItems.find(item => 
        item.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingItem) {
        showNotification(`"${name}" already exists in inventory!`, 'warning');
        return;
    }
    
    const newId = inventoryItems.length > 0 ? Math.max(...inventoryItems.map(i => i.id)) + 1 : 1;
    
    const newItem = {
        id: newId,
        name: name,
        stock: 0,
        unit: unit,
        reorder: reorder,
        cost: cost,
        status: 'out'
    };
    
    inventoryItems.push(newItem);
    localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
    
    renderInventory(inventoryItems);
    populateInventoryDropdown();
    closeAddInventoryModal();
    
    // Check if this item is on the menu
    const menuItem = menuItems.find(item => item.name.toLowerCase() === name.toLowerCase());
    if (menuItem) {
        showNotification(`Added ${name} to inventory. This item is on the menu - remember to stock it!`, 'success');
    } else {
        showNotification(`Added ${name} to inventory`, 'success');
    }
    
    // Check for out of stock warnings
    checkInventoryWarnings();
}

function showReceiveStockModal(itemId = null) {
    if (!hasPermission('inventory')) {
        showNotification('Access denied', 'error');
        return;
    }
    
    populateInventoryDropdown();
    
    if (itemId) {
        document.getElementById('receive-item').value = itemId;
    }
    
    document.getElementById('receive-stock-modal').style.display = 'flex';
}

function closeReceiveStockModal() {
    document.getElementById('receive-stock-modal').style.display = 'none';
    document.getElementById('receive-quantity').value = '';
}

function receiveStock() {
    const itemId = document.getElementById('receive-item').value;
    const quantity = parseFloat(document.getElementById('receive-quantity').value);
    
    if (!itemId) {
        showNotification('Please select an item', 'error');
        return;
    }
    
    if (!quantity || quantity <= 0) {
        showNotification('Please enter valid quantity', 'error');
        return;
    }
    
    const item = inventoryItems.find(i => i.id == itemId);
    if (item) {
        const oldStock = item.stock;
        item.stock += quantity;
        
        // Update status
        if (item.stock <= 0) {
            item.status = 'out';
        } else if (item.stock <= item.reorder) {
            item.status = 'low';
        } else {
            item.status = 'ok';
        }
        
        localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
        
        renderInventory(inventoryItems);
        populateInventoryDropdown();
        
        showNotification(`Received ${quantity} ${item.unit} of ${item.name}`, 'success');
        
        // Check if this item was out of stock and now has stock
        if (oldStock <= 0 && item.stock > 0) {
            showNotification(`✅ ${item.name} is now back in stock!`, 'success');
        }
    }
    
    closeReceiveStockModal();
}

function showDeleteModal(itemId) {
    itemToDelete = itemId;
    deleteCallback = confirmDeleteItem;
    document.getElementById('delete-message').textContent = 'Are you sure you want to delete this inventory item?';
    document.getElementById('delete-confirm-modal').style.display = 'flex';
}

function closeDeleteModal() {
    document.getElementById('delete-confirm-modal').style.display = 'none';
    itemToDelete = null;
    deleteCallback = null;
}

function confirmDelete() {
    if (deleteCallback) {
        deleteCallback();
    }
    closeDeleteModal();
}

function confirmDeleteItem() {
    const deletedItem = inventoryItems.find(i => i.id === itemToDelete);
    inventoryItems = inventoryItems.filter(i => i.id !== itemToDelete);
    localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
    
    renderInventory(inventoryItems);
    populateInventoryDropdown();
    
    // Check if deleted item was on the menu
    if (deletedItem) {
        const menuItem = menuItems.find(item => item.name.toLowerCase() === deletedItem.name.toLowerCase());
        if (menuItem) {
            showNotification(`⚠️ Warning: ${deletedItem.name} is on the menu but removed from inventory!`, 'warning');
        }
    }
    
    showNotification('Item deleted', 'success');
}

function checkInventoryWarnings() {
    if (!inventoryItems || !menuItems) return;
    
    // Find menu items that are out of stock in inventory
    const outOfStockMenuItems = menuItems.filter(menuItem => {
        const inventoryItem = inventoryItems.find(invItem => 
            invItem.name.toLowerCase() === menuItem.name.toLowerCase()
        );
        return inventoryItem && inventoryItem.stock <= 0;
    });
    
    if (outOfStockMenuItems.length > 0) {
        const items = outOfStockMenuItems.map(i => i.name).join(', ');
        showNotification(`⚠️ OUT OF STOCK: ${items} are on the menu but have no inventory!`, 'error');
    }
    
    // Find low stock items
    const lowStockItems = inventoryItems.filter(item => 
        item.stock > 0 && item.stock <= item.reorder && 
        menuItems.some(menuItem => menuItem.name.toLowerCase() === item.name.toLowerCase())
    );
    
    if (lowStockItems.length > 0) {
        const items = lowStockItems.map(i => i.name).join(', ');
        showNotification(`⚠️ LOW STOCK: ${items} are running low!`, 'warning');
    }
}

// =============================================
// OVERVIEW DASHBOARD FUNCTIONS
// =============================================

function updateDashboardMetrics() {
    let salesData = JSON.parse(localStorage.getItem('dailySales') || '[]');
    const now = new Date();
    const today = now.toLocaleDateString();
    
    const todaySales = salesData.filter(sale => sale.date === today);
    const todayTotal = todaySales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const todayOrders = todaySales.length;
    const avgOrderValue = todayOrders > 0 ? todayTotal / todayOrders : 0;
    
    document.getElementById('today-sales').textContent = `$${todayTotal.toFixed(2)}`;
    document.getElementById('today-orders').textContent = todayOrders;
    document.getElementById('avg-order').textContent = `$${avgOrderValue.toFixed(2)}`;
    document.getElementById('active-tables').textContent = `${kitchenOrders.length}/8`;
}

function updateTopItems() {
    const tbody = document.getElementById('top-items-body');
    if (!tbody) return;
    
    let salesData = JSON.parse(localStorage.getItem('dailySales') || '[]');
    
    if (!salesData.length) {
        tbody.innerHTML = '<tr><td colspan="3" class="loading">No sales data yet. Complete a sale to see top items.</td></tr>';
        return;
    }
    
    const itemSales = new Map();
    
    salesData.forEach(sale => {
        if (sale.items) {
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
    
    const topItems = Array.from(itemSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    
    let html = '';
    topItems.forEach((item, index) => {
        // Check if this top-selling item is low on stock
        const inventoryItem = inventoryItems.find(inv => inv.name.toLowerCase() === item.name.toLowerCase());
        const stockWarning = (inventoryItem && inventoryItem.stock <= inventoryItem.reorder) ? 
            ' <span class="warning-badge" style="color: #e74c3c; font-size: 11px;">(Low Stock)</span>' : '';
        
        html += '<tr>';
        html += '<td>';
        if (index === 0) html += '🥇 ';
        else if (index === 1) html += '🥈 ';
        else if (index === 2) html += '🥉 ';
        html += '<strong>' + item.name + '</strong>' + stockWarning;
        html += '</td>';
        html += '<td>' + item.quantity + '</td>';
        html += '<td>$' + item.revenue.toFixed(2) + '</td>';
        html += '</tr>';
    });
    
    tbody.innerHTML = html;
}

function updateLowStockAlerts() {
    const alertsDiv = document.getElementById('low-stock-alerts');
    if (!alertsDiv) return;
    
    alertsDiv.innerHTML = '';
    
    if (!inventoryItems.length) {
        alertsDiv.innerHTML = '<div class="alert alert-info">No inventory items yet</div>';
        return;
    }
    
    const lowStock = inventoryItems.filter(item => item.stock > 0 && item.stock <= item.reorder);
    const outOfStock = inventoryItems.filter(item => item.stock <= 0);
    
    if (lowStock.length === 0 && outOfStock.length === 0) {
        alertsDiv.innerHTML = '<div class="alert alert-success">✅ All stock levels are good</div>';
        return;
    }
    
    // Show out of stock items with menu warning
    outOfStock.forEach(item => {
        const isOnMenu = menuItems.some(menuItem => menuItem.name.toLowerCase() === item.name.toLowerCase());
        const menuWarning = isOnMenu ? ' ⚠️ ON MENU' : '';
        
        const alertItem = document.createElement('div');
        alertItem.className = 'alert alert-danger';
        
        let html = '<div style="display: flex; align-items: center; gap: 10px;">';
        html += '<i class="fas fa-times-circle"></i>';
        html += '<div style="flex: 1;">';
        html += '<strong>' + item.name + '</strong> - OUT OF STOCK!' + menuWarning;
        html += '</div>';
        
        if (hasPermission('inventory')) {
            html += '<button class="btn-sm btn-primary" onclick="showReceiveStockModal(' + item.id + ')">';
            html += '<i class="fas fa-plus"></i> Order';
            html += '</button>';
        }
        
        html += '</div>';
        alertItem.innerHTML = html;
        alertsDiv.appendChild(alertItem);
    });
    
    // Show low stock items
    lowStock.forEach(item => {
        const alertItem = document.createElement('div');
        alertItem.className = 'alert alert-warning';
        
        let html = '<div style="display: flex; align-items: center; gap: 10px;">';
        html += '<i class="fas fa-exclamation-triangle"></i>';
        html += '<div style="flex: 1;">';
        html += '<strong>' + item.name + '</strong> - Low stock: ' + item.stock + ' ' + item.unit + ' remaining';
        html += '</div>';
        
        if (hasPermission('inventory')) {
            html += '<button class="btn-sm btn-primary" onclick="showReceiveStockModal(' + item.id + ')">';
            html += '<i class="fas fa-plus"></i> Order';
            html += '</button>';
        }
        
        html += '</div>';
        alertItem.innerHTML = html;
        alertsDiv.appendChild(alertItem);
    });
}

// =============================================
// KITCHEN FUNCTIONS
// =============================================

function loadSavedKitchenOrders() {
    const saved = localStorage.getItem('kitchenOrders');
    kitchenOrders = saved ? JSON.parse(saved) : [];
    renderKitchenOrders();
}

function saveKitchenOrders() {
    localStorage.setItem('kitchenOrders', JSON.stringify(kitchenOrders));
}

function renderKitchenOrders() {
    const container = document.getElementById('kitchen-orders');
    if (!container) return;
    
    if (!kitchenOrders.length) {
        container.innerHTML = '<div class="loading">No active orders</div>';
        updateKitchenBadges();
        return;
    }
    
    const sortedOrders = [...kitchenOrders].sort((a, b) => {
        const statusOrder = { 'new': 0, 'preparing': 1, 'ready': 2 };
        if (statusOrder[a.status] !== statusOrder[b.status]) {
            return statusOrder[a.status] - statusOrder[b.status];
        }
        return new Date(`1970/01/01 ${b.time}`) - new Date(`1970/01/01 ${a.time}`);
    });
    
    updateKitchenBadges();
    
    let html = '';
    sortedOrders.forEach(order => {
        const canUpdate = hasPermission('kitchen') || currentUser.role === 'cook';
        
        // Create a properly formatted order object for printing
        const printOrder = {
            id: order.id,
            table: order.table_number === 'Takeout' ? 'takeout' : 
                   order.table_number === 'Delivery' ? 'delivery' : 
                   order.table_number.replace('Table ', ''),
            items: order.items.map(item => ({
                name: item.name,
                quantity: item.quantity
            })),
            staff: order.created_by
        };
        
        // Convert to JSON string safely for onclick
        const printOrderJson = JSON.stringify(printOrder).replace(/'/g, "\\'");
        
        html += '<div class="kitchen-order-card ' + order.status + '">';
        html += '<div class="kitchen-order-header">';
        html += '<span class="kitchen-order-table">' + order.table_number + '</span>';
        html += '<span class="kitchen-order-time">' + order.time + '</span>';
        html += '</div>';
        html += '<div class="kitchen-order-items">';
        
        order.items.forEach(item => {
            html += '<div class="kitchen-order-item">' + item.quantity + 'x ' + item.name + '</div>';
        });
        
        html += '</div>';
        html += '<div class="kitchen-order-footer">';
        html += '<i class="fas fa-user"></i> Taken by: ' + (order.created_by || 'Unknown');
        html += '</div>';
        html += '<div class="kitchen-order-actions">';
        
        if (canUpdate) {
            if (order.status === 'new') {
                html += '<button class="btn-secondary" onclick="updateOrderStatus(' + order.id + ', \'preparing\')">Start Preparing</button>';
            } else if (order.status === 'preparing') {
                html += '<button class="btn-primary" onclick="updateOrderStatus(' + order.id + ', \'ready\')">Mark Ready</button>';
            } else if (order.status === 'ready') {
                html += '<span class="badge-success">✓ Ready</span>';
            }
        }
        
        html += '<button class="btn-info" onclick=\'printKitchenTicket(' + printOrderJson + ')\' style="margin-left: 5px;">';
        html += '<i class="fas fa-print"></i> Print';
        html += '</button>';
        html += '</div>';
        html += '</div>';
    });
    
    container.innerHTML = html;
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
    if (orderIndex === -1) return;
    
    kitchenOrders[orderIndex].status = newStatus;
    
    if (newStatus === 'ready') {
        setTimeout(() => {
            kitchenOrders = kitchenOrders.filter(o => o.id !== orderId);
            renderKitchenOrders();
            saveKitchenOrders();
        }, 300000); // Auto-clear after 5 minutes
    }
    
    renderKitchenOrders();
    saveKitchenOrders();
    showNotification(`Order status updated`, 'success');
}

function addOrderToKitchen(order) {
    const tableDisplay = order.table === 'takeout' ? 'Takeout' : 
                        order.table === 'delivery' ? 'Delivery' : 
                        `Table ${order.table}`;
    
    const itemMap = new Map();
    order.items.forEach(item => {
        if (itemMap.has(item.name)) {
            itemMap.set(item.name, itemMap.get(item.name) + 1);
        } else {
            itemMap.set(item.name, 1);
        }
    });
    
    const groupedItems = [];
    itemMap.forEach((quantity, name) => {
        groupedItems.push({
            name: name,
            quantity: quantity
        });
    });
    
    const newOrder = {
        id: order.id,
        table_number: tableDisplay,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: 'new',
        created_by: currentUser.name,
        items: groupedItems
    };
    
    kitchenOrders.unshift(newOrder);
    renderKitchenOrders();
    saveKitchenOrders();
    
    console.log('Order added to kitchen:', newOrder);
}

function clearCompletedOrders() {
    if (!hasPermission('reports') && !hasPermission('settings') && currentUser.role !== 'admin') {
        showNotification('Access denied', 'error');
        return;
    }
    
    kitchenOrders = kitchenOrders.filter(o => o.status !== 'ready');
    renderKitchenOrders();
    saveKitchenOrders();
    showNotification('Completed orders cleared', 'success');
}

// =============================================
// PAYMENT FUNCTIONS
// =============================================

function processPayment() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    if (cart.length === 0) {
        showNotification('Cart is empty', 'error');
        return;
    }
    
    // Check inventory before processing payment
    const outOfStockItems = checkCartAgainstInventory();
    if (outOfStockItems.length > 0) {
        const items = outOfStockItems.join(', ');
        if (!confirm(`⚠️ WARNING: The following items are out of stock: ${items}\n\nDo you want to continue with the sale anyway?`)) {
            return;
        }
    }
    
    tipAmount = 0;
    currentPaymentMethod = 'cash';
    
    updatePaymentModal();
    document.getElementById('payment-modal').style.display = 'flex';
}

function checkCartAgainstInventory() {
    const outOfStock = [];
    
    cart.forEach(item => {
        const inventoryItem = inventoryItems.find(inv => 
            inv.name.toLowerCase() === item.name.toLowerCase()
        );
        
        if (inventoryItem && inventoryItem.stock <= 0) {
            if (!outOfStock.includes(item.name)) {
                outOfStock.push(item.name);
            }
        }
    });
    
    return outOfStock;
}

function updatePaymentModal() {
    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const info = JSON.parse(localStorage.getItem('restaurantInfo') || '{}');
    const taxRate = info.taxRate || 8.5;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    
    document.getElementById('payment-subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('payment-tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('payment-total').textContent = `$${total.toFixed(2)}`;
    
    const itemsDiv = document.getElementById('payment-items');
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
                quantity: 1,
                total: item.price
            });
        }
    });
    
    let html = '';
    itemMap.forEach(item => {
        html += '<div class="payment-item">';
        html += '<span>' + item.name + (item.quantity > 1 ? ' (x' + item.quantity + ')' : '') + '</span>';
        html += '<span>$' + item.total.toFixed(2) + '</span>';
        html += '</div>';
    });
    
    itemsDiv.innerHTML = html;
    
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
    
    // Close payment modal
    closePaymentModal();
    
    // Update inventory
    updateInventoryFromOrder(order);
    
    // Save to sales history
    saveOrderToSalesHistory(order);
    
    // Print receipt automatically
    setTimeout(() => {
        printReceipt(order);
    }, 200);
    
    // Add to kitchen display (without printing ticket - manual only)
    addOrderToKitchen(order);
    
    // Clear cart
    clearCart();
    
    // Refresh data
    refreshData();
    
    // Check inventory warnings after sale
    checkInventoryWarnings();
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

// =============================================
// RECEIPT PRINTING FUNCTIONS
// =============================================

function getRestaurantInfo() {
    const saved = localStorage.getItem('restaurantInfo');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            return {
                name: 'Restaurant Name',
                address: '123 Main Street',
                city: 'City, ST 12345',
                phone: '(555) 123-4567'
            };
        }
    }
    return {
        name: 'Restaurant Name',
        address: '123 Main Street',
        city: 'City, ST 12345',
        phone: '(555) 123-4567'
    };
}

function printReceipt(order) {
    const restaurant = getRestaurantInfo();
    
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
    
    let itemsHtml = '';
    itemMap.forEach(item => {
        itemsHtml += '<tr>';
        itemsHtml += '<td style="text-align: left;">' + item.name + '</td>';
        itemsHtml += '<td style="text-align: center;">' + item.quantity + '</td>';
        itemsHtml += '<td style="text-align: right;">$' + (item.price * item.quantity).toFixed(2) + '</td>';
        itemsHtml += '</tr>';
    });
    
    const receiptContent = `
        <div style="font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 24px;">🍔 ${restaurant.name}</h2>
                <p style="margin: 5px 0; font-size: 12px;">${restaurant.address}</p>
                <p style="margin: 5px 0; font-size: 12px;">${restaurant.city}</p>
                <p style="margin: 5px 0; font-size: 12px;">Tel: ${restaurant.phone}</p>
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
                        ${itemsHtml}
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
    const restaurant = getRestaurantInfo();
    
    let tableDisplay = order.table;
    if (order.table === 'takeout') {
        tableDisplay = 'TAKEOUT';
    } else if (order.table === 'delivery') {
        tableDisplay = 'DELIVERY';
    } else {
        tableDisplay = `TABLE ${order.table}`;
    }
    
    // Group items for kitchen ticket with correct quantities
    const itemMap = new Map();
    
    // If order has items with quantities already grouped
    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
            const quantity = item.quantity || 1;
            const name = item.name;
            
            if (itemMap.has(name)) {
                const existing = itemMap.get(name);
                existing.quantity += quantity;
            } else {
                itemMap.set(name, {
                    name: name,
                    quantity: quantity
                });
            }
        });
    }
    
    let itemsHtml = '';
    itemMap.forEach(item => {
        itemsHtml += '<div style="font-size: 16px; margin-bottom: 5px;">';
        itemsHtml += '<strong>' + item.quantity + 'x ' + item.name + '</strong>';
        itemsHtml += '</div>';
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
                <p><strong>Server:</strong> ${order.staff || 'Unknown'}</p>
            </div>
            
            <div style="border-top: 1px dashed #000; margin: 10px 0;"></div>
            
            <div style="margin-bottom: 15px;">
                <h3 style="margin: 0 0 10px 0;">ITEMS TO PREPARE:</h3>
                ${itemsHtml}
            </div>
            
            <div style="border-top: 2px solid #000; margin: 10px 0;"></div>
            
            <div style="text-align: center; font-size: 12px;">
                <p>🔥 FIRES UP! 🔥</p>
            </div>
        </div>
    `;
    
    const printWindow = window.open('', '_blank', 'width=400,height=500');
    if (printWindow) {
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
    } else {
        showNotification('Please allow popups to print kitchen ticket', 'warning');
    }
}

// =============================================
// INVENTORY UPDATE FUNCTIONS
// =============================================

function updateInventoryFromOrder(order) {
    if (!inventoryItems || inventoryItems.length === 0) return;
    
    // Load recipes from localStorage
    const recipes = JSON.parse(localStorage.getItem('recipeIngredients') || '{}');
    
    let inventoryUpdated = false;
    let updatedItems = [];
    
    // Count item quantities in the order
    const itemCounts = new Map();
    order.items.forEach(item => {
        const count = itemCounts.get(item.name) || 0;
        itemCounts.set(item.name, count + 1);
    });
    
    itemCounts.forEach((count, itemName) => {
        const ingredients = recipes[itemName];
        if (!ingredients) return;
        
        ingredients.forEach(ingredient => {
            const inventoryItem = inventoryItems.find(i => 
                i.name.toLowerCase() === ingredient.name.toLowerCase()
            );
            
            if (inventoryItem) {
                const totalQuantity = ingredient.quantity * count;
                const oldStock = inventoryItem.stock;
                inventoryItem.stock = Math.max(0, inventoryItem.stock - totalQuantity);
                
                // Track which items were updated
                if (!updatedItems.includes(inventoryItem.name)) {
                    updatedItems.push(inventoryItem.name);
                }
                
                // Update status
                if (inventoryItem.stock <= 0) {
                    inventoryItem.status = 'out';
                } else if (inventoryItem.stock <= inventoryItem.reorder) {
                    inventoryItem.status = 'low';
                } else {
                    inventoryItem.status = 'ok';
                }
                
                // Record transaction
                saveInventoryTransaction(inventoryItem, totalQuantity, 'sold', order.id);
                inventoryUpdated = true;
                
                console.log(`Inventory updated: ${inventoryItem.name} - ${oldStock} → ${inventoryItem.stock} (used: ${totalQuantity})`);
            }
        });
    });
    
    if (inventoryUpdated) {
        // Save to localStorage
        localStorage.setItem('inventoryItems', JSON.stringify(inventoryItems));
        
        // Re-render inventory with updated values
        renderInventory(inventoryItems);
        
        // Update low stock alerts
        updateLowStockAlerts();
        
        // Check for critical stock levels
        checkLowStockAfterOrder(updatedItems);
        
        console.log('Inventory updated successfully. Total value:', calculateTotalInventoryValue());
    }
}

function checkLowStockAfterOrder(updatedItems = []) {
    if (!inventoryItems) return;
    
    const lowStock = inventoryItems.filter(item => item.stock > 0 && item.stock <= item.reorder);
    const outOfStock = inventoryItems.filter(item => item.stock <= 0);
    
    // Only show notifications for items that were actually affected by this order
    const affectedLowStock = lowStock.filter(item => updatedItems.includes(item.name));
    const affectedOutOfStock = outOfStock.filter(item => updatedItems.includes(item.name));
    
    // Show notifications for critical stock
    if (affectedOutOfStock.length > 0) {
        const items = affectedOutOfStock.map(i => i.name).join(', ');
        showNotification(`⚠️ OUT OF STOCK: ${items}`, 'error');
    } else if (affectedLowStock.length > 0) {
        const items = affectedLowStock.map(i => i.name).join(', ');
        showNotification(`⚠️ Low stock: ${items}`, 'warning');
    }
}

function saveInventoryTransaction(item, quantity, type, orderId) {
    const transaction = {
        id: Date.now() + Math.random(),
        itemId: item.id,
        itemName: item.name,
        quantity: quantity,
        type: type,
        orderId: orderId,
        timestamp: new Date().toLocaleString(),
        staff: currentUser ? currentUser.name : 'System'
    };
    
    inventoryTransactions.unshift(transaction);
    
    // Keep only last 100 transactions
    if (inventoryTransactions.length > 100) {
        inventoryTransactions = inventoryTransactions.slice(0, 100);
    }
    
    localStorage.setItem('inventoryTransactions', JSON.stringify(inventoryTransactions));
}

// =============================================
// CHART FUNCTIONS
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
    
    let salesData = JSON.parse(localStorage.getItem('dailySales') || '[]');
    
    if (salesData.length === 0) {
        canvas.style.display = 'none';
        return;
    }
    
    canvas.style.display = 'block';
    
    const now = new Date();
    const today = now.toLocaleDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString();
    
    // Get date for week and month ranges
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    // Filter sales based on selected period
    let filteredSales = [];
    let chartLabel = '';
    
    if (period === 'today') {
        filteredSales = salesData.filter(sale => sale.date === today);
        chartLabel = 'Today';
    } else if (period === 'yesterday') {
        filteredSales = salesData.filter(sale => sale.date === yesterdayStr);
        chartLabel = 'Yesterday';
    } else if (period === 'week') {
        filteredSales = salesData.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate >= weekAgo;
        });
        chartLabel = 'This Week';
    } else if (period === 'month') {
        filteredSales = salesData.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate >= monthAgo;
        });
        chartLabel = 'This Month';
    }
    
    // Create hour labels from 8 AM to 9 PM (14 hours)
    const hourLabels = [];
    const hourValues = [];
    for (let hour = 8; hour <= 21; hour++) {
        const hourStr = hour <= 11 ? `${hour} AM` : hour === 12 ? `12 PM` : `${hour-12} PM`;
        hourLabels.push(hourStr);
        hourValues.push(hour);
    }
    
    // Initialize hourly data array with zeros
    const hourlyData = new Array(hourValues.length).fill(0);
    
    // Aggregate sales by hour
    filteredSales.forEach(sale => {
        const saleHour = sale.hour || new Date(sale.timestamp).getHours();
        
        // Find which hour bucket this belongs to
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
                label: `Sales (${chartLabel})`,
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
    
    let salesData = JSON.parse(localStorage.getItem('dailySales') || '[]');
    
    if (salesData.length === 0) {
        canvas.style.display = 'none';
        return;
    }
    
    canvas.style.display = 'block';
    
    const now = new Date();
    const today = now.toLocaleDateString();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    let filteredSales = [];
    let chartTitle = '';
    
    if (period === 'today') {
        filteredSales = salesData.filter(sale => sale.date === today);
        chartTitle = 'Today';
    } else if (period === 'week') {
        filteredSales = salesData.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate >= weekAgo;
        });
        chartTitle = 'This Week';
    } else if (period === 'month') {
        filteredSales = salesData.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate >= monthAgo;
        });
        chartTitle = 'This Month';
    }
    
    // Define categories and their colors
    const categories = ['Mains', 'Drinks', 'Appetizers', 'Sides', 'Desserts'];
    const colors = ['#3498db', '#27ae60', '#f39c12', '#e74c3c', '#9b59b6'];
    const categoryRevenue = [0, 0, 0, 0, 0];
    
    // Load menu items for category mapping
    const menuItems = JSON.parse(localStorage.getItem('menuItems') || '[]');
    const itemCategoryMap = {};
    menuItems.forEach(item => {
        itemCategoryMap[item.name] = item.category;
    });
    
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
    
    // Create new chart with appropriate title
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
                title: {
                    display: true,
                    text: `Sales by Category - ${chartTitle}`,
                    font: {
                        size: 14,
                        weight: 'bold'
                    },
                    padding: {
                        bottom: 10
                    }
                },
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
    const data = getReportData(period);
    renderReports(data);
}

function getReportData(period) {
    let salesData = JSON.parse(localStorage.getItem('dailySales') || '[]');
    
    const now = new Date();
    const today = now.toLocaleDateString();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    let filteredSales = [];
    let periodTitle = '';
    
    if (period === 'today') {
        filteredSales = salesData.filter(sale => sale.date === today);
        periodTitle = 'Today';
    } else if (period === 'week') {
        filteredSales = salesData.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate >= weekAgo;
        });
        periodTitle = 'This Week';
    } else if (period === 'month') {
        filteredSales = salesData.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate >= monthAgo;
        });
        periodTitle = 'This Month';
    }
    
    // If no sales in period, return empty data
    if (filteredSales.length === 0) {
        return {
            summary: {
                total_sales: 0,
                total_orders: 0,
                avg_order_value: 0
            },
            by_category: [
                { category: 'Mains', revenue: 0 },
                { category: 'Drinks', revenue: 0 },
                { category: 'Appetizers', revenue: 0 },
                { category: 'Sides', revenue: 0 },
                { category: 'Desserts', revenue: 0 }
            ],
            top_items: [],
            period_title: periodTitle
        };
    }
    
    // Calculate summary
    const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
    const totalOrders = filteredSales.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    
    // Load menu items for category mapping
    const menuItems = JSON.parse(localStorage.getItem('menuItems') || '[]');
    const itemCategoryMap = {};
    menuItems.forEach(item => {
        itemCategoryMap[item.name] = item.category;
    });
    
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
        top_items: topItems,
        period_title: periodTitle
    };
}

function renderReports(data) {
    const reportDiv = document.getElementById('report-data');
    if (!reportDiv) return;
    
    // Check if there's any data
    if (data.summary.total_sales === 0 && data.top_items.length === 0) {
        reportDiv.innerHTML = `
            <div class="report-card" style="text-align: center; padding: 50px;">
                <h3>📊 No Sales Data for ${data.period_title}</h3>
                <p style="color: #7f8c8d; margin: 20px 0;">No sales found for the selected period.</p>
                <p style="color: #7f8c8d;">Complete a sale to see reports here.</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="report-container">
            <!-- Summary Cards -->
            <div class="report-card">
                <h3>
                    📊 Sales Summary
                    <span class="period-badge">${data.period_title}</span>
                </h3>
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
    `;
    
    data.by_category.forEach((cat) => {
        let badgeClass = 'badge-mains';
        if (cat.category === 'Mains') badgeClass = 'badge-mains';
        else if (cat.category === 'Drinks') badgeClass = 'badge-drinks';
        else if (cat.category === 'Appetizers') badgeClass = 'badge-appetizers';
        else if (cat.category === 'Sides') badgeClass = 'badge-sides';
        else if (cat.category === 'Desserts') badgeClass = 'badge-desserts';
        
        const percentage = data.summary.total_sales > 0 ? ((cat.revenue / data.summary.total_sales) * 100).toFixed(1) : 0;
        
        html += '<tr>';
        html += '<td><span class="category-badge ' + badgeClass + '">' + cat.category + '</span></td>';
        html += '<td class="revenue-positive">$' + cat.revenue.toFixed(2) + '</td>';
        html += '<td><strong>' + percentage + '%</strong></td>';
        html += '<td><div class="percentage-bar"><div class="percentage-fill" style="width: ' + percentage + '%"></div></div></td>';
        html += '</tr>';
    });
    
    html += `
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
    `;
    
    data.top_items.forEach((item, index) => {
        html += '<tr>';
        html += '<td><span class="top-item-rank rank-' + (index + 1) + '">' + (index + 1) + '</span></td>';
        html += '<td><strong>' + item.name + '</strong></td>';
        html += '<td>' + item.quantity_sold + '</td>';
        html += '<td class="revenue-positive">$' + item.revenue.toFixed(2) + '</td>';
        html += '</tr>';
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    reportDiv.innerHTML = html;
}

function exportReport() {
    if (!hasPermission('reports')) {
        showNotification('Access denied', 'error');
        return;
    }
    
    const period = document.getElementById('report-period').value;
    const data = getReportData(period);
    
    const reportContent = `
        SALES REPORT - ${data.period_title}
        Generated: ${new Date().toLocaleString()}
        
        SUMMARY
        Total Sales: $${data.summary.total_sales.toFixed(2)}
        Total Orders: ${data.summary.total_orders}
        Average Order: $${data.summary.avg_order_value.toFixed(2)}
        
        SALES BY CATEGORY
        ${data.by_category.map(c => `${c.category}: $${c.revenue.toFixed(2)}`).join('\n')}
        
        TOP ITEMS
        ${data.top_items.map((item, i) => `${i+1}. ${item.name} - ${item.quantity_sold} sold - $${item.revenue.toFixed(2)}`).join('\n')}
    `;
    
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${data.period_title.toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    
    showNotification('Report exported', 'success');
}

// =============================================
// DEBUG FUNCTIONS
// =============================================

function debugUserPermissions() {
    console.log('Current User:', currentUser);
    console.log('Has manageUsers permission:', hasPermission('manageUsers'));
    console.log('All permissions:', currentUser?.permissions);
    
    // Show all users in storage
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    console.log('All users:', users);
    
    // Check if settings nav is visible
    const settingsNav = document.getElementById('nav-settings');
    console.log('Settings nav visible:', settingsNav ? settingsNav.style.display !== 'none' : 'not found');
    
    showNotification('Check console for debug info (F12)', 'info');
}

function debugRestaurantInfo() {
    const info = JSON.parse(localStorage.getItem('restaurantInfo') || '{}');
    console.log('Saved restaurant info:', info);
    console.log('Current sidebar name:', document.getElementById('restaurant-name-display')?.textContent);
    console.log('Current login name:', document.getElementById('login-restaurant-name')?.textContent);
    showNotification('Check console for debug info', 'info');
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

function updateDateTime() {
    const now = new Date();
    document.getElementById('current-datetime').textContent = now.toLocaleString('en-US', { 
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true 
    });
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
        z-index: 20000;
        animation: slideIn 0.3s;
        border-left: 4px solid ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
}

// Add styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .btn-sm {
        padding: 5px 10px;
        font-size: 12px;
        border-radius: 4px;
        border: none;
        cursor: pointer;
    }
    
    .delete-btn {
        background: #ffebee;
        color: #e74c3c;
        border: 1px solid #ffcdd2;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
    }
    
    .delete-btn:hover {
        background: #e74c3c;
        color: white;
    }
    
    .action-buttons {
        display: flex;
        gap: 5px;
    }
    
    .warning-icon {
        color: #e74c3c;
        margin-right: 5px;
        font-size: 14px;
    }
    
    .inventory-suggestions {
        margin-bottom: 20px;
        padding: 15px;
        background: #e8f4fd;
        border-radius: 8px;
        border-left: 4px solid #3498db;
    }
`;
document.head.appendChild(style);