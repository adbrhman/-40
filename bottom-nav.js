const NAV_ITEMS = [
  {
    id: 'pred', label: 'التوقعات',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8l-4 8h8z"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>`,
  },
  {
    id: 'lb', label: 'الترتيب',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  },
  { id: 'fab', label: '', icon: '' },
  {
    id: 'hist', label: 'السجل',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  },
  {
    id: 'profile', label: 'ملفي',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  },
];

export class BottomNav {
  #el;
  #active = 'pred';
  #onChange;

  constructor(container, onChange) {
    this.#el = container;
    this.#onChange = onChange;
    this.#render();
  }

  #render() {
    this.#el.className = 'bottom-nav';
    this.#el.innerHTML = '';

    for (const item of NAV_ITEMS) {
      if (item.id === 'fab') {
        const fab = document.createElement('button');
        fab.className = 'nav-fab';
        fab.setAttribute('aria-label', 'التوقعات');
        fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
        fab.addEventListener('click', () => { this.setActive('pred'); this.#onChange?.('pred'); });
        this.#el.append(fab);
        continue;
      }

      const btn = document.createElement('button');
      btn.className = `nav-item${item.id === this.#active ? ' active' : ''}`;
      btn.dataset.tab = item.id;
      btn.setAttribute('aria-label', item.label);
      btn.innerHTML = `${item.icon}<span>${item.label}</span>`;
      btn.addEventListener('click', () => { this.setActive(item.id); this.#onChange?.(item.id); });
      this.#el.append(btn);
    }
  }

  setActive(tabId) {
    this.#active = tabId;
    this.#el.querySelectorAll('.nav-item').forEach(el =>
      el.classList.toggle('active', el.dataset.tab === tabId)
    );
  }

  getActive() { return this.#active; }
}
