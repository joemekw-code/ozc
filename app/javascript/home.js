import {
  CATEGORIES,
  SIM_RULES,
  clearFavorites,
  createIssue,
  favoriteIssue,
  getProjectedState,
  unfavoriteIssue,
} from "./sim-store.js";

const sortState = { key: "stake" };
let currentSection = "home";
let currentCategory = null;
let currentQuery = "";
let searchCategoryIndex = 0;
let state = getProjectedState();
const FAVORITES_RESET_KEY = "ozc-clear-favorites-once-v1";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatOzc(value) {
  return Number(value || 0).toLocaleString("ja-JP", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

function filteredIssues() {
  let baseIssues = state.issues;
  if (currentSection === "favorites") {
    const favoriteSet = new Set(state.favorites);
    baseIssues = state.issues.filter((issue) => favoriteSet.has(issue.id));
  } else if (currentSection === "home") {
    const favoriteSet = new Set(state.favorites);
    baseIssues = state.issues.filter((issue) => !favoriteSet.has(issue.id));
  }
  const q = currentQuery.trim().toLowerCase();
  const rows = baseIssues.filter((issue) => {
    const catOk = !currentCategory || issue.category === currentCategory;
    const qOk =
      !q ||
      `${issue.title} ${issue.topClaim?.text ?? ""} ${issue.category}`.toLowerCase().includes(q);
    return catOk && qOk;
  });

  if (sortState.key === "new") {
    rows.sort((a, b) => b.createdStep - a.createdStep);
  } else if (sortState.key === "claims") {
    rows.sort((a, b) => b.voteCount - a.voteCount || b.totalStake - a.totalStake);
  } else {
    rows.sort((a, b) => b.totalStake - a.totalStake || b.claimCount - a.claimCount);
  }

  return rows;
}

function renderCards() {
  const container = document.querySelector(".article-container");
  if (currentSection === "account") {
    renderWalletPanel(container);
    return;
  }
  if (currentSection === "search") {
    renderSearchPanel(container);
    return;
  }
  if (currentSection === "notifications") {
    renderNotificationsPanel(container);
    return;
  }
  const rows = filteredIssues();
  if (rows.length === 0) {
    container.innerHTML = `
      <section class="article-error empty-state">
        <div class="sim-badge">${currentSection === "favorites" ? "FAVORITES" : "EMPTY"}</div>
        <h2>${currentSection === "favorites" ? "右スワイプした論点がここに並びます" : "表示できる論点がありません"}</h2>
      </section>
    `;
    return;
  }
  container.innerHTML = rows
    .map(
      (item) => `
        <button class="article-item" data-id="${item.id}">
          <img class="corner-bg" src="/images/common/corner-spaced.png" alt="">
          <div class="category-label">#${esc(item.category)}</div>
          ${state.favorites.includes(item.id) ? '<div class="favorite-badge"><i class="bi bi-star-fill"></i></div>' : ""}
          <div class="article-window cat-${item.categoryIndex}">
            <div class="article-title-area">
              <div class="article-title">${esc(item.title)}</div>
            </div>
            <div class="article-footer article-footer-ozc">
              <div class="article-opinion-group">
                <i class="bi bi-chat-left-dots-fill"></i>
                <div class="label-text">意見</div>
                <div class="text">${item.claimCount}</div>
              </div>
              <div class="article-vote-group">
                <i class="bi bi-people-fill"></i>
                <div class="label-text">投票</div>
                <div class="text">${item.voteCount}</div>
              </div>
              <div class="article-ozc-group">
                <i class="bi bi-soundwave"></i>
                <div class="label-text">流通量</div>
                <div class="text">${formatOzc(item.totalStake)}</div>
              </div>
            </div>
          </div>
        </button>
      `,
    )
    .join("");

  container.querySelectorAll(".article-item").forEach((button) => {
    button.addEventListener("click", () => {
      location.href = `/detail/?id=${button.dataset.id}`;
    });
    bindSwipeFavorite(button);
  });
}

function searchCategoryRows() {
  const category = CATEGORIES[searchCategoryIndex] ?? CATEGORIES[0];
  const q = currentQuery.trim().toLowerCase();
  const rows = state.issues.filter((issue) => {
    if (issue.category !== category) return false;
    if (!q) return true;
    return `${issue.title} ${issue.topClaim?.text ?? ""} ${issue.category}`.toLowerCase().includes(q);
  });
  rows.sort((a, b) => b.totalStake - a.totalStake || b.voteCount - a.voteCount || b.createdStep - a.createdStep);
  return rows;
}

function renderSearchPanel(container) {
  const rows = searchCategoryRows();
  const category = CATEGORIES[searchCategoryIndex] ?? CATEGORIES[0];
  const topIssue = rows[0] ?? null;
  const highlightedIssues = rows
    .map((issue) => issue.title)
    .filter(Boolean)
    .slice(0, 3);
  container.innerHTML = `
    <section class="search-story-panel">
      <div class="search-cube-scene" id="search-cube-scene">
        <div class="search-cube-face">
          ${!topIssue
            ? `<div class="search-empty-card">このテーマに一致する論点はありません</div>`
            : `
              <article class="search-theme-card" id="search-theme-card">
                <div class="search-theme-kicker">#${esc(category)}</div>
                <div class="search-theme-header">
                  <h3 class="search-theme-title">${esc(topIssue.title)}</h3>
                </div>
                <div class="search-theme-chips">
                  ${highlightedIssues
                    .map((text) => `<div class="search-theme-chip">${esc(text)}</div>`)
                    .join("")}
                </div>
                <div class="search-theme-meta">
                  <span><i class="bi bi-chat-left-dots-fill"></i>${topIssue.claimCount} 意見</span>
                  <span><i class="bi bi-people-fill"></i>${topIssue.voteCount} 投票</span>
                  <span><i class="bi bi-soundwave"></i>${formatOzc(topIssue.totalStake)} 流通量</span>
                </div>
              </article>
            `}
        </div>
      </div>
      ${
        rows.length > 0
          ? `
            <div class="search-list-panel">
              ${rows
                .map(
                  (item) => `
                    <button class="article-item search-article-item" data-id="${item.id}">
                      <img class="corner-bg" src="/images/common/corner-spaced.png" alt="">
                      <div class="category-label">#${esc(item.category)}</div>
                      <div class="article-window cat-${item.categoryIndex}">
                        <div class="article-title-area">
                          <div class="article-title">${esc(item.title)}</div>
                        </div>
                        <div class="article-footer article-footer-ozc">
                          <div class="article-opinion-group">
                            <i class="bi bi-chat-left-dots-fill"></i>
                            <div class="label-text">意見</div>
                            <div class="text">${item.claimCount}</div>
                          </div>
                          <div class="article-vote-group">
                            <i class="bi bi-people-fill"></i>
                            <div class="label-text">投票</div>
                            <div class="text">${item.voteCount}</div>
                          </div>
                          <div class="article-ozc-group">
                            <i class="bi bi-soundwave"></i>
                            <div class="label-text">流通量</div>
                            <div class="text">${formatOzc(item.totalStake)}</div>
                          </div>
                        </div>
                      </div>
                    </button>
                  `,
                )
                .join("")}
            </div>
          `
          : ""
      }
    </section>
  `;

  const themeCard = container.querySelector("#search-theme-card");
  if (themeCard && topIssue) {
    let dragging = false;
    themeCard.addEventListener("touchstart", () => {
      dragging = false;
    }, { passive: true });
    themeCard.addEventListener("touchmove", () => {
      dragging = true;
    }, { passive: true });
    themeCard.addEventListener("click", () => {
      if (dragging) return;
      location.href = `/detail/?id=${topIssue.id}`;
    });
  }

  container.querySelectorAll(".search-list-panel .article-item").forEach((button) => {
    button.addEventListener("click", () => {
      location.href = `/detail/?id=${button.dataset.id}`;
    });
  });

  bindSearchStorySwipe(container.querySelector("#search-cube-scene"));
}

function renderNotificationsPanel(container) {
  container.innerHTML = `
    <section class="claims-panel notification-panel">
      <div class="claims-panel-head">
        <h3>通知</h3>
        <div class="claims-panel-meta">latest 12</div>
      </div>
      <div class="sim-events">
        ${state.recentEvents
          .slice(0, 12)
          .map((event) => `<div class="sim-event-item">${esc(event.message)}</div>`)
          .join("")}
      </div>
    </section>
  `;
}

function renderWalletPanel(container) {
  const pendingTotal = state.pendingWithdrawals.reduce((sum, item) => sum + item.amount, 0);
  const quickItems = [
    { icon: "bi-qr-code-scan", label: "スキャン" },
    { icon: "bi-arrow-left-right", label: "送る・受け取る" },
    { icon: "bi-piggy-bank", label: "おトク" },
    { icon: "bi-plus-circle", label: "チャージ" },
    { icon: "bi-ticket-perforated", label: "クーポン" },
    { icon: "bi-graph-up-arrow", label: "ボーナス運用" },
    { icon: "bi-receipt", label: "請求書払い" },
    { icon: "bi-bag", label: "ピックアップ" },
    { icon: "bi-wallet2", label: "お金を作りる" },
    { icon: "bi-cart3", label: "OZCモール" },
    { icon: "bi-shirt", label: "OZCフリマ" },
    { icon: "bi-grid-3x3-gap", label: "もっと見る" },
  ];
  container.innerHTML = `
    <section class="wallet-panel wallet-pay-shell">
      <div class="wallet-pay-card">
        <div class="wallet-pay-card-inner">
          <div class="wallet-pay-card-front">
            <div class="wallet-pay-barcode" aria-hidden="true">
              <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
              <span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span>
            </div>
            <div class="wallet-pay-card-row">
              <div class="wallet-pay-qr" aria-hidden="true">
                <div class="wallet-pay-qr-grid"></div>
              </div>
              <div class="wallet-pay-brand">
                <div class="wallet-pay-brand-head">
                  <div class="wallet-pay-brand-logo">OZC</div>
                  <div class="wallet-pay-brand-name">Pay</div>
                </div>
                <div class="wallet-pay-brand-sub">OZC残高からの支払い</div>
                <div class="wallet-pay-balance">${formatOzc(state.user.availableBalance)} OZC</div>
              </div>
            </div>
          </div>
          <div class="wallet-pay-actions">
            <button class="wallet-pay-action"><i class="bi bi-qr-code-scan"></i><span>スキャン</span></button>
            <button class="wallet-pay-action"><i class="bi bi-wallet2"></i><span>送る・受け取る</span></button>
            <button class="wallet-pay-action"><i class="bi bi-piggy-bank"></i><span>おトク</span></button>
            <button class="wallet-pay-action"><i class="bi bi-plus-circle"></i><span>チャージ</span></button>
          </div>
        </div>
      </div>

      <div class="wallet-summary-strip">
        <div><span>ロック中</span><strong>${formatOzc(state.user.lockedBalance)} OZC</strong></div>
        <div><span>引き出し待ち</span><strong>${formatOzc(pendingTotal)} OZC</strong></div>
        <div><span>星</span><strong>${state.favorites.length}</strong></div>
      </div>

      <div class="wallet-service-grid">
        ${quickItems
          .map(
            (item) => `
              <button class="wallet-service-item">
                <div class="wallet-service-icon"><i class="bi ${item.icon}"></i></div>
                <div class="wallet-service-label">${esc(item.label)}</div>
              </button>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function bindSwipeFavorite(button) {
  let startX = 0;
  let startY = 0;
  let dragging = false;
  let swipedAway = false;
  const issueId = button.dataset.id;

  const onStart = (x, y) => {
    startX = x;
    startY = y;
    dragging = true;
    button.classList.remove("swiping-right");
  };

  const onMove = (x, y) => {
    if (!dragging) return;
    const dx = x - startX;
    const dy = y - startY;
    if (Math.abs(dy) > Math.abs(dx)) return;
    if (dx > 0) {
      button.style.transform = `translateX(${Math.min(dx, 72)}px)`;
      button.classList.toggle("swiping-right", dx > 36);
    }
  };

  const onEnd = (x) => {
    if (!dragging) return;
    const dx = x - startX;
    dragging = false;
    if (dx > 72) {
      state = favoriteIssue(issueId);
      swipedAway = true;
      button.classList.remove("swiping-right");
      button.classList.add("swipe-away-right");
      button.style.pointerEvents = "none";
      window.setTimeout(() => {
        renderHome();
      }, 220);
      return;
    }
    button.style.transform = "";
    button.classList.remove("swiping-right");
  };

  button.addEventListener("touchstart", (e) => {
    const t = e.changedTouches[0];
    onStart(t.clientX, t.clientY);
  }, { passive: true });
  button.addEventListener("touchmove", (e) => {
    const t = e.changedTouches[0];
    onMove(t.clientX, t.clientY);
  }, { passive: true });
  button.addEventListener("touchend", (e) => {
    const t = e.changedTouches[0];
    onEnd(t.clientX);
  });
  button.addEventListener("transitionend", () => {
    if (!swipedAway) return;
    button.style.transform = "";
  });
}

function renderHome() {
  updateSectionChrome();
  renderCards();
  updateWalletButton();
  updateCategoryButtons();
  updateUnderbar();
}

function updateSectionChrome() {
  const innerMenu = document.querySelector("#main .inner-menu");
  const bottomMenu = document.getElementById("bottom-menu");
  const searchHeader = document.getElementById("search-tab-header");
  const searchInput = document.getElementById("search-input");
  const isSearch = currentSection === "search";
  document.body.classList.toggle("search-mode", isSearch);
  if (innerMenu) {
    innerMenu.style.display = "none";
  }
  if (bottomMenu) {
    bottomMenu.style.display = currentSection === "home" ? "" : "none";
  }
  if (searchHeader) {
    searchHeader.style.display = isSearch ? "block" : "none";
  }
  if (searchInput) {
    searchInput.value = currentQuery;
  }
}

function updateCategoryButtons() {
  document.querySelectorAll(".category-button").forEach((button) => {
    const active = button.textContent.trim() === currentCategory;
    button.classList.toggle("active", active);
  });
}

function bindCategoryButtons() {
  document.querySelectorAll(".category-button").forEach((button) => {
    button.addEventListener("click", () => {
      const nextCategory = button.textContent.trim();
      currentCategory = currentCategory === nextCategory ? null : nextCategory;
      renderHome();
    });
  });
}

function bindSearch() {
  const input = document.getElementById("search-input");
  const button = document.getElementById("search-button");
  if (!input || !button) return;
  const apply = () => {
    currentQuery = input.value;
    renderHome();
  };
  button.addEventListener("click", apply);
  input.addEventListener("input", apply);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") apply();
  });
}

function bindSort() {
  const sortButton = document.querySelector(".sort-button");
  const sortSelect = document.querySelector(".sort-select");
  sortButton.addEventListener("click", () => sortSelect.classList.toggle("show"));
  document.querySelectorAll(".select-element").forEach((element) => {
    element.addEventListener("click", () => {
      sortState.key = element.dataset.value;
      sortSelect.classList.remove("show");
      renderHome();
    });
  });
}

function updateWalletButton() {
  const button = document.getElementById("wallet-connect-button");
  if (!button) return;
  button.innerHTML = `<i class="bi bi-wallet2"></i><span>${formatOzc(state.user.availableBalance)} OZC</span>`;
}

function updateUnderbar() {
  document.querySelectorAll(".underbar-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.section === currentSection);
  });
}

function closeCreateModal() {
  document.getElementById("theme-create-modal").classList.remove("show");
}

function openCreateModal() {
  document.getElementById("theme-create-modal").classList.add("show");
}

function renderCreateForm() {
  document.querySelector(".label-header .modal-title").textContent = "論点作成";
  document.querySelector(".label-group .modal-text").textContent =
    "カテゴリ・論点・最初の主張・初期ステークをまとめて入れます";
  const container = document.querySelector(".create-form-container");
  container.innerHTML = `
    <form id="sim-create-form" class="ozc-create-form">
      <label class="create-label">カテゴリ
        <select name="category">
          ${CATEGORIES.map((value) => `<option value="${esc(value)}">${esc(value)}</option>`).join("")}
        </select>
      </label>
      <label class="create-label">論点（40字以内）
        <input name="title" maxlength="${SIM_RULES.issueMaxLength}" required />
      </label>
      <label class="create-label">最初の主張（140字以内）
        <textarea name="claimText" rows="4" maxlength="${SIM_RULES.claimMaxLength}" required></textarea>
      </label>
      <label class="create-label">初期ステーク
        <input name="stakeAmount" type="number" min="${SIM_RULES.minStake}" step="1" value="${SIM_RULES.minStake}" required />
      </label>
      <button type="submit" class="button secondary"><div class="text">論点を作成</div></button>
      <div id="ozc-create-status" class="ozc-create-status"></div>
    </form>
  `;
  container.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = document.getElementById("ozc-create-status");
    try {
      const category = String(form.get("category") || "");
      state = createIssue({
        category,
        title: String(form.get("title") || ""),
        claimText: String(form.get("claimText") || ""),
        stakeAmount: Number(form.get("stakeAmount") || 0),
      });
      status.textContent = "論点を作成しました";
      currentCategory = category;
      currentQuery = "";
      sortState.key = "new";
      closeCreateModal();
      renderHome();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      status.textContent = `失敗: ${error.message || error}`;
    }
  });
}

function bindCreateModal() {
  document.querySelector(".create-button")?.addEventListener("click", openCreateModal);
  document.querySelectorAll("#theme-create-modal .modal-close-button, #theme-create-modal .complete-close-button").forEach((button) => {
    button.addEventListener("click", closeCreateModal);
  });
}

function bindUnderbar() {
  document.querySelectorAll(".underbar-item").forEach((button) => {
    button.addEventListener("click", () => {
      currentSection = button.dataset.section;
      renderHome();
    });
  });
}

function stepSearchCategory(dir) {
  const next = (searchCategoryIndex + dir + CATEGORIES.length) % CATEGORIES.length;
  const scene = document.getElementById("search-cube-scene");
  if (scene) {
    scene.classList.remove("cube-next", "cube-prev");
    void scene.offsetWidth;
    scene.classList.add(dir > 0 ? "cube-next" : "cube-prev");
  }
  searchCategoryIndex = next;
  window.setTimeout(() => {
    renderHome();
  }, 170);
}

function bindSearchStorySwipe(scene) {
  if (!scene) return;
  let startX = 0;
  let startY = 0;
  let dragging = false;
  scene.addEventListener(
    "touchstart",
    (e) => {
      const t = e.changedTouches[0];
      startX = t.clientX;
      startY = t.clientY;
      dragging = true;
    },
    { passive: true },
  );
  scene.addEventListener(
    "touchend",
    (e) => {
      if (!dragging) return;
      dragging = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy)) return;
      stepSearchCategory(dx < 0 ? 1 : -1);
    },
    { passive: true },
  );
}

function init() {
  if (!localStorage.getItem(FAVORITES_RESET_KEY)) {
    state = clearFavorites();
    localStorage.setItem(FAVORITES_RESET_KEY, "1");
  }
  currentSection = "home";
  const createButtonText = document.querySelector(".create-button .text");
  if (createButtonText) createButtonText.textContent = "論点を作成";
  document.querySelectorAll(".select-element")[0].textContent = "流通量順";
  document.querySelectorAll(".select-element")[1].textContent = "新着順";
  document.querySelectorAll(".select-element")[2].textContent = "投票数順";
  renderCreateForm();
  bindCreateModal();
  bindUnderbar();
  bindCategoryButtons();
  bindSearch();
  bindSort();
  renderHome();
}

init();
