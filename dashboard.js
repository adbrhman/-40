import { AdminService } from './admin.service.js';
import { setHTML } from './renderer.js';
import { esc } from './security.js';

export default async function renderDashboard(container) {
  try {
    const stats = await AdminService.getStats();
    setHTML(container, `
      <div class="admin-dashboard">
        <div class="admin-stats-grid">
          <div class="admin-stat-card">
            <div class="stat-icon-big">⚽</div>
            <div class="stat-big-val">${stats.openMatches}</div>
            <div class="stat-big-label">مبارياة مفتوحة</div>
          </div>
          <div class="admin-stat-card">
            <div class="stat-icon-big">👥</div>
            <div class="stat-big-val">${stats.activeUsers}</div>
            <div class="stat-big-label">مستخدم نشط</div>
          </div>
          <div class="admin-stat-card">
            <div class="stat-icon-big">📋</div>
            <div class="stat-big-val">${stats.totalPreds}</div>
            <div class="stat-big-label">إجمالي التوقعات</div>
          </div>
          <div class="admin-stat-card">
            <div class="stat-icon-big">⭐</div>
            <div class="stat-big-val">${stats.topPoints}</div>
            <div class="stat-big-label">أعلى نقاط</div>
          </div>
        </div>
        <div class="admin-section" style="margin-top:24px;">
          <div class="admin-section-title">سجل العمليات</div>
          <div class="admin-log-list">
            ${AdminService._logs.length ? AdminService._logs.slice(0, 10).map(l =>
              `<div class="admin-log-row"><span style="color:var(--text-tertiary);font-size:11px;">${esc(l.ts)}</span><span> ${esc(l.action || JSON.stringify(l))}</span></div>`
            ).join('') : '<p style="color:var(--text-tertiary);text-align:center;padding:20px;">لا توجد عمليات حديثة</p>'}
          </div>
        </div>
      </div>
    `);
  } catch (err) {
    setHTML(container, `<p style="color:var(--color-danger);padding:20px;">خطأ: ${esc(err.message)}</p>`);
  }
}
