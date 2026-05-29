import { store } from './store.js';
import { LeaderboardService } from './leaderboard.service.js';
import { setHTML } from './renderer.js';
import { esc } from './security.js';
import { getAvatarFallback } from './helpers.js';

export async function renderLeaderboard(contentEl) {
  setHTML(contentEl, '<div class="page-loader"><div class="spinner-ring"></div></div>');

  const { user, compId } = store.getState();
  if (!user || !compId) return;

  try {
    const rows = await LeaderboardService.get(compId);
    store.dispatch('SET_LB', { rows });

    if (!rows.length) {
      setHTML(contentEl, `
        <div class="empty-state">
          <div class="empty-state-icon">🏆</div>
          <p class="empty-state-title">لا يوجد ترتيب بعد</p>
          <p class="empty-state-text">أكمل الجولة الأولى لتظهر في الترتيب</p>
        </div>
      `);
      return;
    }

    const top3    = rows.slice(0, 3);
    const rest    = rows.slice(3);
    const myRow   = rows.find(r => r.userId === user.id);
    const myRank  = myRow ? rows.indexOf(myRow) + 1 : null;
    const inRest  = myRank && myRank > 3;

    const podiumHTML = top3.length >= 3 ? `
      <div class="lb-podium">
        <div class="podium-item podium-rank-2">
          <div class="podium-avatar-wrap">
            <div class="podium-avatar-ring">
              <img class="podium-avatar" src="${esc(top3[1]?.avatar || getAvatarFallback(top3[1]?.name))}" onerror="this.src='${getAvatarFallback(top3[1]?.name)}'" />
            </div>
            <span class="podium-rank-num">2</span>
          </div>
          <span class="podium-name">${esc(top3[1]?.name || '')}</span>
          <span class="podium-points">${top3[1]?.points || 0} نقطة</span>
          <div class="podium-stage">🥈</div>
        </div>
        <div class="podium-item podium-rank-1">
          <div class="podium-avatar-wrap">
            <span class="podium-crown">👑</span>
            <div class="podium-avatar-ring">
              <img class="podium-avatar" src="${esc(top3[0]?.avatar || getAvatarFallback(top3[0]?.name))}" onerror="this.src='${getAvatarFallback(top3[0]?.name)}'" />
            </div>
            <span class="podium-rank-num">1</span>
          </div>
          <span class="podium-name">${esc(top3[0]?.name || '')}</span>
          <span class="podium-points">${top3[0]?.points || 0} نقطة</span>
          <div class="podium-stage">🥇</div>
        </div>
        <div class="podium-item podium-rank-3">
          <div class="podium-avatar-wrap">
            <div class="podium-avatar-ring">
              <img class="podium-avatar" src="${esc(top3[2]?.avatar || getAvatarFallback(top3[2]?.name))}" onerror="this.src='${getAvatarFallback(top3[2]?.name)}'" />
            </div>
            <span class="podium-rank-num">3</span>
          </div>
          <span class="podium-name">${esc(top3[2]?.name || '')}</span>
          <span class="podium-points">${top3[2]?.points || 0} نقطة</span>
          <div class="podium-stage">🥉</div>
        </div>
      </div>
    ` : '';

    const rowHTML = (row) => `
      <div class="lb-row${row.userId === user.id ? ' is-me' : ''}">
        <span class="lb-rank rank-${row.rank <= 3 ? row.rank : ''}">${row.rank}</span>
        <img class="lb-avatar" src="${esc(row.avatar || getAvatarFallback(row.name))}" onerror="this.src='${getAvatarFallback(row.name)}'" />
        <div class="lb-info">
          <div class="lb-username">${esc(row.name)}</div>
          <div class="lb-title-badge">${esc(row.title || 'لاعب')}</div>
        </div>
        <div class="lb-points">
          <span class="lb-pts-val">${row.points}</span>
          <span class="lb-pts-icon">⭐</span>
        </div>
      </div>
    `;

    const stickyMe = inRest && myRow ? `
      <div class="lb-row sticky-me">
        <span class="lb-rank">${myRank}</span>
        <img class="lb-avatar" src="${esc(myRow.avatar || getAvatarFallback(myRow.name))}" onerror="this.src='${getAvatarFallback(myRow.name)}'" />
        <div class="lb-info">
          <div class="lb-username">${esc(myRow.name)} (أنت)</div>
        </div>
        <div class="lb-points">
          <span class="lb-pts-val">${myRow.points}</span>
          <span class="lb-pts-icon">⭐</span>
        </div>
      </div>
    ` : '';

    setHTML(contentEl, `
      ${podiumHTML}
      <div class="lb-list">
        ${rest.map(rowHTML).join('')}
        ${stickyMe}
      </div>
    `);

  } catch (err) {
    setHTML(contentEl, `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <p class="empty-state-title">خطأ في تحميل الترتيب</p>
        <p class="empty-state-text">${esc(err.message)}</p>
      </div>
    `);
  }
}
