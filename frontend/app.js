// Core data
const menuItems = [
  { id: 'flat-white', name: 'Flat White', description: 'Velvety espresso with microfoam.', price: 4.2, mealType: 'coffee' },
  { id: 'honey-oat-latte', name: 'Honey Oat Latte', description: 'Oat milk, espresso, raw honey drizzle.', price: 4.9, mealType: 'coffee' },
  { id: 'salmon-bagel', name: 'Smoked Salmon Bagel', description: 'Sesame bagel, cream cheese, capers.', price: 7.5, mealType: 'food' },
  { id: 'almond-croissant', name: 'Almond Croissant', description: 'Buttery layers with frangipane.', price: 3.8, mealType: 'pastry' },
  { id: 'chia-pudding', name: 'Chia Pudding', description: 'Coconut milk, seasonal fruit compote.', price: 5.2, mealType: 'food' },
  { id: 'matcha-tonic', name: 'Matcha Tonic', description: 'Ceremonial matcha, sparkling tonic.', price: 4.6, mealType: 'refresh' },
];

const STORAGE_KEY = 'orders';
const STATUS_FLOW = ['Placed', 'Accepted', 'Ready', 'Collected'];

// Utilities
const createUUID = () =>
  (crypto?.randomUUID?.() ||
    'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }));

const readOrders = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
};

const writeOrders = orders => localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));

// Menu page logic
function renderMenu() {
  const menuContainer = document.querySelector('.menu-grid');
  if (!menuContainer) return;

  menuContainer.innerHTML = '';
  menuItems.forEach(item => {
    const card = document.createElement('article');
    card.className = 'menu-card';
    card.innerHTML = `
      <div class="card-top">
        <div>
          <h2>${item.name}</h2>
          <p class="description">${item.description}</p>
        </div>
        <span class="price">$${item.price.toFixed(2)}</span>
      </div>
      <label class="quantity">
        <span>Qty</span>
        <input type="number" min="0" value="0" data-item="${item.id}" aria-label="${item.name} quantity">
      </label>
    `;
    menuContainer.appendChild(card);
  });

  const placeOrderBtn = document.querySelector('.primary-btn');
  placeOrderBtn?.addEventListener('click', placeOrder);
}

function placeOrder() {
  const inputs = [...document.querySelectorAll('input[data-item]')];
  const selections = inputs
    .map(input => ({
      id: input.dataset.item,
      quantity: Number(input.value) || 0,
    }))
    .filter(entry => entry.quantity > 0);

  if (!selections.length) {
    alert('Add at least one item to place an order.');
    return;
  }

  const items = selections.map(sel => {
    const menuItem = menuItems.find(m => m.id === sel.id);
    return {
      id: menuItem.id,
      name: menuItem.name,
      price: menuItem.price,
      quantity: sel.quantity,
      subtotal: Number((menuItem.price * sel.quantity).toFixed(2)),
    };
  });

  const totalPrice = items.reduce((sum, item) => sum + item.subtotal, 0);

  const order = {
    id: createUUID(),
    items,
    totalPrice: Number(totalPrice.toFixed(2)),
    status: 'Placed',
    createdAt: new Date().toISOString(),
  };

  const orders = readOrders();
  orders.push(order);
  writeOrders(orders);

  inputs.forEach(input => (input.value = 0));
  alert('Order placed! Check My Orders to track it.');
}

// Orders page logic
function loadOrders() {
  const container = document.getElementById('orders-container');
  if (!container) return;

  const orders = readOrders();
  renderOrders(orders);
}

function renderOrders(orders) {
  const container = document.getElementById('orders-container');
  const emptyState = document.querySelector('[data-empty]');
  const template = document.getElementById('order-card-template');
  if (!container || !template) return;

  container.innerHTML = '';

  if (!orders.length) {
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  orders.forEach(order => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector('.order-card');
    card.dataset.orderId = order.id;

    node.querySelector('.order-id').textContent = `#${order.id.slice(0, 6)}`;
    const statusBadge = node.querySelector('[data-status]');
    statusBadge.textContent = order.status;
    statusBadge.setAttribute('data-status', order.status);

    const itemsContainer = node.querySelector('[data-items]');
    order.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = `
        <span>${item.name}</span>
        <span>x${item.quantity}</span>
        <span>$${item.price.toFixed(2)}</span>
      `;
      itemsContainer.appendChild(row);
    });

    node.querySelector('.total-price').textContent = `$${order.totalPrice.toFixed(2)}`;

    node.querySelector('[data-update]')?.addEventListener('click', () => {
      cycleStatus(order.id);
    });

    container.appendChild(node);
  });
}

function cycleStatus(orderId) {
  const orders = readOrders();
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  const currentIndex = STATUS_FLOW.indexOf(order.status);
  const nextIndex = currentIndex === -1 || currentIndex === STATUS_FLOW.length - 1 ? STATUS_FLOW.length - 1 : currentIndex + 1;
  order.status = STATUS_FLOW[nextIndex];

  writeOrders(orders);
  renderOrders(orders);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  renderMenu();
  loadOrders();
});
