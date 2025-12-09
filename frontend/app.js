// API Base URL
const API_BASE = "https://q7l5dkrcd2.execute-api.eu-north-1.amazonaws.com/prod";

// Local storage key for orders
const ORDERS_STORAGE_KEY = 'cafeteria_orders';

// ============ COGNITO CONFIGURATION ============
// Replace these placeholders with your actual Cognito values
const COGNITO_DOMAIN = "https://eu-north-1y30bfsr0f.auth.eu-north-1.amazoncognito.com";
const COGNITO_CLIENT_ID = "4l74mp12dj8g8ddo438uudbg2a";
const COGNITO_REDIRECT_URI = "https://main.d2yeykc7ilc7l0.amplifyapp.com";
const COGNITO_SCOPES = "openid email";
const COGNITO_RESPONSE_TYPE = "token";

// Local storage keys for auth tokens
const ID_TOKEN_KEY = 'cognito_id_token';
const ACCESS_TOKEN_KEY = 'cognito_access_token';

// ============ AUTH HELPER FUNCTIONS ============

/**
 * Parse tokens from URL hash after Cognito redirect
 * Expected format: #id_token=XYZ&access_token=ABC&token_type=Bearer&expires_in=3600
 */
function parseHashTokens() {
  const hash = window.location.hash.substring(1); // Remove the '#'
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  const idToken = params.get('id_token');
  const accessToken = params.get('access_token');
  const expiresIn = params.get('expires_in');

  if (idToken && accessToken) {
    // Calculate expiration time
    const expirationTime = Date.now() + (parseInt(expiresIn, 10) || 3600) * 1000;

    // Save tokens to localStorage
    localStorage.setItem(ID_TOKEN_KEY, idToken);
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem('token_expiration', expirationTime.toString());

    // Clean the URL (remove hash)
    window.history.replaceState(null, '', window.location.pathname + window.location.search);

    return { idToken, accessToken, expiresIn };
  }

  return null;
}

/**
 * Get the stored ID token (used for API authorization)
 * Returns null if no token or token is expired
 */
function getIdToken() {
  const token = localStorage.getItem(ID_TOKEN_KEY);
  const expiration = localStorage.getItem('token_expiration');

  if (!token) return null;

  // Check if token is expired
  if (expiration && Date.now() > parseInt(expiration, 10)) {
    // Token expired, clear storage
    clearAuthTokens();
    return null;
  }

  return token;
}

/**
 * Get the stored access token
 * Returns null if no token or token is expired
 */
function getAccessToken() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  const expiration = localStorage.getItem('token_expiration');

  if (!token) return null;

  // Check if token is expired
  if (expiration && Date.now() > parseInt(expiration, 10)) {
    clearAuthTokens();
    return null;
  }

  return token;
}

/**
 * Check if user is currently logged in
 */
function isLoggedIn() {
  return getIdToken() !== null;
}

/**
 * Clear all auth tokens from localStorage
 */
function clearAuthTokens() {
  localStorage.removeItem(ID_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem('token_expiration');
}

/**
 * Redirect to Cognito Hosted UI for login
 */
function redirectToLogin() {
  const loginUrl = `${COGNITO_DOMAIN}/login?` +
    `client_id=${COGNITO_CLIENT_ID}` +
    `&response_type=${COGNITO_RESPONSE_TYPE}` +
    `&scope=${encodeURIComponent(COGNITO_SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(COGNITO_REDIRECT_URI)}`;
  
  window.location.href = loginUrl;
}

/**
 * Logout user - clear tokens and optionally redirect to Cognito logout
 */
function logout() {
  clearAuthTokens();
  updateAuthUI();
  
  // Optionally redirect to Cognito logout endpoint
  const logoutUrl = `${COGNITO_DOMAIN}/logout?` +
    `client_id=${COGNITO_CLIENT_ID}` +
    `&logout_uri=${encodeURIComponent(COGNITO_REDIRECT_URI)}`;
  
  window.location.href = logoutUrl;
}

/**
 * Update the UI to reflect login state
 */
function updateAuthUI() {
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const authStatus = document.getElementById('auth-status');

  if (!loginBtn || !logoutBtn || !authStatus) return;

  if (isLoggedIn()) {
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'inline-block';
    authStatus.textContent = 'Logged in';
    authStatus.classList.add('logged-in');
  } else {
    loginBtn.style.display = 'inline-block';
    logoutBtn.style.display = 'none';
    authStatus.textContent = '';
    authStatus.classList.remove('logged-in');
  }
}

/**
 * Get headers for API requests, including Authorization if logged in
 */
function getApiHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };

  const idToken = getIdToken();
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  return headers;
}

// ============ LOCAL STORAGE HELPERS ============

function getStoredOrders() {
  try {
    const orders = localStorage.getItem(ORDERS_STORAGE_KEY);
    return orders ? JSON.parse(orders) : [];
  } catch {
    return [];
  }
}

function saveOrder(order) {
  const orders = getStoredOrders();
  orders.unshift(order); // Add new order at the beginning
  localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

function updateStoredOrderStatus(orderId, newStatus) {
  const orders = getStoredOrders();
  const order = orders.find(o => o.OrderId === orderId);
  if (order) {
    order.status = newStatus;
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  }
  return order;
}

// ============ MENU PAGE ============

// Fetch menu from API and render cards
async function fetchAndRenderMenu() {
  const menuContainer = document.getElementById('menu-container');
  if (!menuContainer) return;

  try {
    const response = await fetch(`${API_BASE}/menu`, {
      method: 'GET',
      headers: getApiHeaders(),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const menuItems = await response.json();
    renderMenu(menuItems, menuContainer);
  } catch (error) {
    console.error('Failed to fetch menu:', error);
    menuContainer.innerHTML = '<p class="error">Failed to load menu. Please try again later.</p>';
    alert('Failed to load menu. Please check your connection.');
  }
}

// Render menu items into the container
function renderMenu(menuItems, container) {
  container.innerHTML = '';

  if (!menuItems || menuItems.length === 0) {
    container.innerHTML = '<p>No menu items available.</p>';
    return;
  }

  menuItems.forEach(item => {
    const card = document.createElement('article');
    card.className = 'menu-card';
    card.innerHTML = `
      <div class="card-top">
        <div>
          <h2>${item.name}</h2>
          <p class="description">${item.description}</p>
        </div>
        <span class="price">$${Number(item.price).toFixed(2)}</span>
      </div>
      <label class="quantity">
        <span>Qty</span>
        <input type="number" min="0" value="0" data-id="${item.itemId}" aria-label="${item.name} quantity">
      </label>
    `;
    container.appendChild(card);
  });
}

// Place order via API
async function placeOrder() {
  const inputs = [...document.querySelectorAll('input[data-id]')];
  
  const items = inputs
    .map(input => {
      const card = input.closest('.menu-card');
      const name = card.querySelector('h2').textContent;
      const priceText = card.querySelector('.price').textContent;
      const price = parseFloat(priceText.replace('$', ''));
      
      return {
        itemId: input.dataset.id,
        qty: Number(input.value) || 0,
        name: name,
        price: price,
      };
    })
    .filter(entry => entry.qty > 0);

  if (items.length === 0) {
    alert('Please select at least one item.');
    return;
  }

  // Prepare the request body (API only needs itemId and qty)
  const apiItems = items.map(({ itemId, qty }) => ({ itemId, qty }));

  console.log('Sending order:', JSON.stringify({ items: apiItems }));

  try {
    const response = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({ items: apiItems }),
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    const data = await response.json();
    console.log('Response data:', data);

    if (!response.ok) {
      throw new Error(data.message || data.error || `HTTP error! status: ${response.status}`);
    }

    // Save order to localStorage with full item details
    const orderToSave = {
      ...data,
      items: items.map(item => ({
        itemId: item.itemId,
        name: item.name,
        quantity: item.qty,
        price: item.price * item.qty, // Total price for this item
      })),
      totalPrice: items.reduce((sum, item) => sum + (item.price * item.qty), 0),
      status: 'Placed',
    };
    saveOrder(orderToSave);

    alert(`Order placed! Order ID: ${data.OrderId}`);

    // Reset all quantity inputs
    inputs.forEach(input => (input.value = 0));
  } catch (error) {
    console.error('Failed to place order:', error);
    console.error('Error details:', error.message);
    alert('Failed to place order. Please try again.');
  }
}

// ============ ORDERS PAGE ============

function fetchAndRenderOrders() {
  const ordersContainer = document.getElementById('orders-container');
  const emptyState = document.querySelector('[data-empty]');
  if (!ordersContainer) return;

  const orders = getStoredOrders();

  if (orders.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    ordersContainer.innerHTML = '';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  const template = document.getElementById('order-card-template');
  ordersContainer.innerHTML = '';

  orders.forEach(order => {
    const card = template.content.cloneNode(true);

    // Order ID (show short version)
    const shortId = order.OrderId ? order.OrderId.slice(0, 8) + '...' : 'N/A';
    card.querySelector('.order-id').textContent = shortId;
    card.querySelector('.order-id').title = order.OrderId;

    // Status badge
    const statusBadge = card.querySelector('[data-status]');
    const status = order.status || 'Placed';
    statusBadge.textContent = status;
    statusBadge.setAttribute('data-status', status.toLowerCase());

    // Order items
    const itemsContainer = card.querySelector('[data-items]');
    if (order.items && order.items.length > 0) {
      itemsContainer.innerHTML = order.items.map(item => `
        <div class="order-item">
          <span class="item-name">${item.name || item.itemId}</span>
          <span class="item-qty">×${item.quantity || item.qty}</span>
          <span class="item-price">$${Number(item.price).toFixed(2)}</span>
        </div>
      `).join('');
    }

    // Total price
    card.querySelector('.total-price').textContent = `$${Number(order.totalPrice).toFixed(2)}`;

    // Update status button
    const updateBtn = card.querySelector('[data-update]');
    updateBtn.addEventListener('click', () => cycleOrderStatus(order.OrderId));

    ordersContainer.appendChild(card);
  });
}

function cycleOrderStatus(orderId) {
  const statuses = ['Placed', 'Preparing', 'Ready', 'Collected'];
  const orders = getStoredOrders();
  const order = orders.find(o => o.OrderId === orderId);
  
  if (!order) return;

  const currentIndex = statuses.indexOf(order.status || 'Placed');
  const nextIndex = (currentIndex + 1) % statuses.length;
  const newStatus = statuses[nextIndex];

  updateStoredOrderStatus(orderId, newStatus);
  fetchAndRenderOrders(); // Re-render the orders
}

// ============ INITIALIZATION ============

document.addEventListener('DOMContentLoaded', () => {
  // Parse tokens from URL hash (after Cognito redirect)
  parseHashTokens();
  
  // Update auth UI
  updateAuthUI();

  // Setup auth button listeners
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', redirectToLogin);
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  // Menu page
  fetchAndRenderMenu();

  const placeOrderBtn = document.getElementById('place-order-btn');
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', placeOrder);
  }

  // Orders page
  fetchAndRenderOrders();
});
