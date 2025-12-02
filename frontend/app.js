// API Base URL
const API_BASE = "https://q7l5dkrcd2.execute-api.eu-north-1.amazonaws.com/prod";

// Local storage key for orders
const ORDERS_STORAGE_KEY = 'cafeteria_orders';

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
    const response = await fetch(`${API_BASE}/menu`);
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
      headers: {
        'Content-Type': 'application/json',
      },
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
  // Menu page
  fetchAndRenderMenu();

  const placeOrderBtn = document.getElementById('place-order-btn');
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', placeOrder);
  }

  // Orders page
  fetchAndRenderOrders();
});
