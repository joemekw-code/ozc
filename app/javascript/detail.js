import {
  SIM_RULES,
  addClaim,
  advanceSimulation,
  getIssue,
  getProjectedState,
  requestWithdraw,
  stakeClaim,
} from "./sim-store.js";

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

function getId() {
  const params = new URLSearchParams(location.search);
  return params.get("id") || "";
}

function renderClaimList(issue) {
  const state = getProjectedState();
  document.querySelector(".report-list-container").innerHTML = `
    <section class="claims-panel">
      <div class="claims-panel-head">
        <h3>主張一覧</h3>
        <div class="claims-panel-meta">主張は流通量順で表示</div>
      </div>
      <div class="claim-composer">
        <textarea id="new-claim-text" rows="3" maxlength="${SIM_RULES.claimMaxLength}" placeholder="この論点に対して、自分が信じる説明・見解・事実認識・提案を書く"></textarea>
        <button id="new-claim-button" class="button secondary"><div class="text">主張を追加</div></button>
        <div id="new-claim-status" class="ozc-create-status"></div>
      </div>
      <div class="claim-list">
        ${issue.claims
          .map(
            (claim) => `
              <article class="claim-card">
                <div class="claim-card-head">
                  <div class="claim-author">${esc(claim.authorName)}</div>
                  <div class="claim-stake">💰 ${formatOzc(claim.totalStake)} OZC</div>
                </div>
                <div class="claim-text">${esc(claim.text)}</div>
                <div class="claim-submeta">
                  <span>あなたのロック: ${formatOzc(claim.myLockedStake)} OZC</span>
                  <span>引き出し待ち: ${formatOzc(claim.myPendingStake)} OZC</span>
                </div>
                <div class="claim-actions">
                  <input class="claim-amount-input" id="stake-${claim.id}" type="number" min="${SIM_RULES.minStake}" step="1" value="${SIM_RULES.minStake}" />
                  <button class="button secondary stake-claim-button" data-claim-id="${claim.id}"><div class="text">ロック</div></button>
                  <button class="button secondary-border withdraw-claim-button" data-claim-id="${claim.id}" ${claim.myLockedStake <= 0 ? "disabled" : ""}><div class="text">引き出し申請</div></button>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;

  document.getElementById("new-claim-button").addEventListener("click", () => {
    const status = document.getElementById("new-claim-status");
    const textarea = document.getElementById("new-claim-text");
    try {
      addClaim(issue.id, textarea.value);
      status.textContent = "主張を追加しました";
      textarea.value = "";
      rerender();
    } catch (error) {
      status.textContent = `失敗: ${error.message || error}`;
    }
  });

  document.querySelectorAll(".stake-claim-button").forEach((button) => {
    button.addEventListener("click", () => {
      const claimId = button.dataset.claimId;
      const input = document.getElementById(`stake-${claimId}`);
      try {
        stakeClaim(claimId, Number(input.value || 0));
        rerender();
      } catch (error) {
        alert(error.message || error);
      }
    });
  });

  document.querySelectorAll(".withdraw-claim-button").forEach((button) => {
    button.addEventListener("click", () => {
      const claimId = button.dataset.claimId;
      const input = document.getElementById(`stake-${claimId}`);
      try {
        requestWithdraw(claimId, Number(input.value || 0));
        rerender();
      } catch (error) {
        alert(error.message || error);
      }
    });
  });

  document.querySelector(".group-item-list").innerHTML = `
    <div class="sim-metrics detail-metrics">
      <div><span>使える残高</span><strong>${formatOzc(state.user.availableBalance)} OZC</strong></div>
      <div><span>ロック中</span><strong>${formatOzc(state.user.lockedBalance)} OZC</strong></div>
      <div><span>step</span><strong>${state.currentStep}</strong></div>
      <div><span>クールダウン</span><strong>${SIM_RULES.cooldownSteps} step</strong></div>
    </div>
    <div class="sim-actions detail-actions">
      <button class="button secondary-border" id="detail-advance-1"><div class="text">+1 step</div></button>
      <button class="button secondary-border" id="detail-advance-8"><div class="text">+${SIM_RULES.cooldownSteps} step</div></button>
    </div>
  `;

  document.getElementById("detail-advance-1").addEventListener("click", () => {
    advanceSimulation(1);
    rerender();
  });
  document.getElementById("detail-advance-8").addEventListener("click", () => {
    advanceSimulation(SIM_RULES.cooldownSteps);
    rerender();
  });
}

function renderIssue(issue) {
  document.querySelector(".tab-wrapper .tab[data-tab='conversations']").textContent = "論点";
  document.querySelector(".tab-wrapper .tab[data-tab='reports']").textContent = "主張";
  document.querySelector(".notice-group .text").textContent =
    "これは OZC の simulation prototype です。実残高ではなくローカル保存のデモ残高を使います。";
  document.querySelector(".group-title").textContent = "現在の状態";
  document.querySelector(".group-description").textContent =
    "論点の総流通量、あなたの残高、引き出し待ち step を見ながら主張の競りを試せます。";
  document.querySelector(".detail-report-text-group .title").textContent = "この prototype で確かめること";
  document.querySelector(".detail-report-text-group .detail").textContent =
    "軽いクールダウン付きロックが、主張の注目競争として自然に見えるかを確認する。";
  document.querySelector(".make-comments-detail").innerHTML =
    "主張を追加したり、他人の主張に OZC をロックして、<br>論点の流通量ランキングがどう動くか観察してください。";
  document.querySelector(".goto-theme-button").textContent = "論点一覧へ戻る";

  document.querySelector(".polis").innerHTML = `
    <div class="ozc-detail-card article-window cat-${issue.categoryIndex}">
      <div class="category-label">#${esc(issue.category)}</div>
      <div class="article-title-area">
        <div class="article-title">${esc(issue.title)}</div>
      </div>
      <div class="article-description">${esc(issue.topClaim?.text ?? "まだ主張がありません")}</div>
      <div class="ozc-detail-grid">
        <div><span>論点総流通量</span><strong>${formatOzc(issue.totalStake)} OZC</strong></div>
        <div><span>主張数</span><strong>${issue.claimCount}</strong></div>
        <div><span>カテゴリ</span><strong>${esc(issue.category)}</strong></div>
        <div><span>最上位主張</span><strong>${formatOzc(issue.topClaim?.totalStake ?? 0)} OZC</strong></div>
      </div>
      <div class="sim-notes">
        <div>論点は複数の主張が入りうる一つの問い</div>
        <div>主張はこの論点に対して自分が信じるもの</div>
      </div>
    </div>
  `;

  renderClaimList(issue);
}

function rerender() {
  const issue = getIssue(getId());
  if (!issue) {
    document.querySelector(".polis").innerHTML = `<div class="article-error">論点が見つかりません</div>`;
    return;
  }
  renderIssue(issue);
}

function bindTabs() {
  const tabs = document.querySelectorAll("#tab-group .tab");
  const app = document.getElementById("app");
  const indicator = document.querySelector("#tab-group .tab-select");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((x) => x.classList.remove("active"));
      tab.classList.add("active");
      app.className = `on-${tab.dataset.tab}`;
      indicator.className = `tab-select on-${tab.dataset.tab}`;
    });
  });
}

document.querySelector(".back")?.addEventListener("click", () => {
  location.href = "/";
});

document.querySelector(".goto-theme-button")?.addEventListener("click", () => {
  location.href = "/";
});

bindTabs();
rerender();
