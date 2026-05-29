import { getDayTabLabel, getUniqueDays } from './helpers.js';
import { setHTML, batchDOM } from './renderer.js';

export class DayTabs {
  #container;
  #days = [];
  #activeKey = null;
  #onChange;

  constructor(container, onChange) {
    this.#container = container;
    this.#onChange  = onChange;
    setHTML(container, '<div class="day-tabs-wrapper"><div class="day-tabs-scroll" id="day-tabs-scroll"></div></div>');
  }

  render(matches) {
    this.#days = getUniqueDays(matches);
    if (!this.#days.length) return;

    if (!this.#activeKey || !this.#days.find(d => d.key === this.#activeKey)) {
      this.#activeKey = this.#days[0].key;
    }

    batchDOM(() => {
      const scroll = this.#container.querySelector('#day-tabs-scroll');
      if (!scroll) return;

      const frag = document.createDocumentFragment();

      for (const day of this.#days) {
        const { day: dayName, date } = getDayTabLabel(day.dateStr);
        const btn = document.createElement('button');
        btn.className  = `day-tab${day.key === this.#activeKey ? ' active' : ''}`;
        btn.dataset.key = day.key;
        btn.setAttribute('aria-pressed', String(day.key === this.#activeKey));
        btn.innerHTML = `
          <span class="day-tab-name">${dayName}</span>
          <span class="day-tab-date">${date}</span>
        `;
        btn.addEventListener('click', () => this.#select(day.key));
        frag.append(btn);
      }

      scroll.replaceChildren(frag);
      this.#scrollToActive();
    });
  }

  #select(key) {
    if (this.#activeKey === key) return;
    this.#activeKey = key;

    const scroll = this.#container.querySelector('#day-tabs-scroll');
    if (!scroll) return;

    scroll.querySelectorAll('.day-tab').forEach(btn => {
      const isActive = btn.dataset.key === key;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    this.#scrollToActive();
    this.#onChange?.(key);
  }

  #scrollToActive() {
    requestAnimationFrame(() => {
      const scroll = this.#container.querySelector('#day-tabs-scroll');
      const activeBtn = scroll?.querySelector('.day-tab.active');
      if (!activeBtn) return;
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  }

  getActive() { return this.#activeKey; }

  setActive(key) {
    if (this.#days.find(d => d.key === key)) this.#select(key);
  }
}
