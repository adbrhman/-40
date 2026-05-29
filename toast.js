export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
    <span style="flex:1;font-size:var(--font-size-sm);">${message}</span>
  `;

  container.appendChild(toast);

  const remove = () => {
    toast.classList.add('toast-leaving');
    setTimeout(() => toast.parentNode && toast.remove(), 300);
  };

  const timer = setTimeout(remove, duration);
  toast.addEventListener('click', () => { clearTimeout(timer); remove(); });
}
