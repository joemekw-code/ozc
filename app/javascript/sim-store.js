const STORAGE_KEY = "ozc-sim-state-v2";

export const CATEGORIES = [
  "社会・政治",
  "お金・資産",
  "男女・性別",
  "外国人問題",
  "テクノロジー",
  "医療・福祉",
  "生活",
  "その他",
];

export const SIM_RULES = {
  minStake: 1,
  cooldownSteps: 8,
  issueMaxLength: 40,
  claimMaxLength: 140,
};

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function catIndex(category) {
  return Math.max(1, CATEGORIES.indexOf(category) + 1);
}

const CATEGORY_TITLES = {
  "社会・政治": [
    "移民政策で優先すべき基準は何か",
    "地方議会の透明性を高める方法は何か",
    "少子化対策で最も即効性がある施策は何か",
    "ベーシックインカムはどこから試すべきか",
    "選挙期間中のSNS規制は必要か",
    "学校無償化は何を対象に広げるべきか",
    "防衛費の増額はどこまで正当化できるか",
    "都市再開発で住民合意をどう作るか",
    "自治体の監視カメラ活用はどこまで許されるか",
    "公共交通の赤字路線をどう維持するか",
  ],
  "お金・資産": [
    "新NISA時代に現金比率はどれくらい持つべきか",
    "インフレ期の家計防衛は何から始めるべきか",
    "住宅ローンと投資の優先順位はどう考えるべきか",
    "副業収入を資産形成へ回す最適な配分は何か",
    "金とビットコインはどちらを守りに使うべきか",
    "円安長期化で生活費を守る方法は何か",
    "子育て世帯の教育費積立は何で持つべきか",
    "FIRE志向と普通の生活防衛はどう両立するか",
    "高配当株は生活防衛資産になりうるか",
    "生活費の固定費圧縮で最優先すべき項目は何か",
  ],
  "男女・性別": [
    "育休取得の不利益を減らす制度は何が必要か",
    "性教育はどの年齢から何を扱うべきか",
    "家事育児の見えない負担をどう可視化するか",
    "男女賃金格差の説明責任は企業に必要か",
    "制服や校則は性別に依存しない形へ変えるべきか",
    "少人数の職場でハラスメントを減らす仕組みは何か",
    "更年期や生理の支援は職場でどこまで必要か",
    "結婚制度と事実婚の差をどこまで縮めるべきか",
    "男子校女子校の価値は今も残るか",
    "育児とキャリアの分断を防ぐ評価制度は何か",
  ],
  "外国人問題": [
    "技能実習制度に代わる仕組みは何が妥当か",
    "観光客増加と地域生活の両立はどう図るべきか",
    "外国人労働者の日本語支援は誰が担うべきか",
    "移民受け入れと社会保障の関係をどう整理するか",
    "地域コミュニティで文化摩擦を減らす方法は何か",
    "大学の留学生支援はどこまで公費で行うべきか",
    "多言語行政サービスの優先順位はどう決めるか",
    "外国籍住民の防災情報はどう届けるべきか",
    "住宅賃貸での国籍差別を減らす仕組みは何か",
    "観光地でのマナー対策は規制と啓発どちらが有効か",
  ],
  "テクノロジー": [
    "生成AI時代に個人が学ぶべき基礎能力は何か",
    "学校でのAI使用はどこまで許されるべきか",
    "個人開発者がAIで稼ぐ現実的な戦略は何か",
    "音声AIは接客業をどこまで置き換えるか",
    "AIによる情報要約は思考力を弱めるか",
    "ロボット介護は人手不足の本命になりうるか",
    "オープンソースAIと巨大企業AIの差はどこで決まるか",
    "検索の代わりにAI対話が主流になる条件は何か",
    "子どもの端末利用をどう設計するべきか",
    "デジタル身分証は利便性と監視をどう両立するか",
  ],
  "医療・福祉": [
    "医療費負担を抑えつつ地域医療を守る方法は何か",
    "介護職の待遇改善はどこから手を付けるべきか",
    "高齢者の孤立対策で最優先すべき仕組みは何か",
    "予防医療への公的投資はどこまで拡大すべきか",
    "終末期医療の意思決定をどう支えるべきか",
    "メンタル不調の初期支援を学校や職場でどう整えるか",
    "救急外来の混雑を減らす制度設計は何か",
    "医師偏在の是正に必要な誘導策は何か",
    "子どもの発達支援を地域でどうつなぐか",
    "病院DXで患者の負担を減らせる領域は何か",
  ],
  "生活": [
    "家賃高騰に対して個人が取れる対策は何か",
    "孤独感を減らす生活習慣は何が有効か",
    "共働き家庭の平日夕食をどう最適化するか",
    "地方移住で失敗しないための確認項目は何か",
    "ブラック企業を見抜くための具体サインは何か",
    "節約と生活の質を両立する固定費の見直し方は何か",
    "スマホ依存を減らす現実的な方法は何か",
    "子どもの習い事は何を軸に選ぶべきか",
    "一人暮らしの防犯を最小コストで強化する方法は何か",
    "疲れをためない休日の使い方はどうあるべきか",
  ],
  "その他": [
    "匿名SNSに実名性をどこまで求めるべきか",
    "コミュニティ運営で荒れにくいルールは何か",
    "地方祭りを次世代へ残す方法は何があるか",
    "趣味のコミュニティを長く続ける条件は何か",
    "社会人の学び直しを続けるコツは何か",
    "ネット炎上に巻き込まれない発信姿勢は何か",
    "オンラインサロンの価値はどこで決まるか",
    "都市と地方の文化格差をどう埋めるべきか",
    "寄付文化を日常化するには何が必要か",
    "現代の信頼できる情報源をどう見分けるか",
  ],
};

function buildSeedContent(createdAt) {
  const issues = [];
  const claims = [];
  const stakes = [];
  let currentStep = 0;

  CATEGORIES.forEach((category, categoryIndex) => {
    CATEGORY_TITLES[category].forEach((title, titleIndex) => {
      const issueId = `issue_${categoryIndex + 1}_${titleIndex + 1}`;
      const claimId = `claim_${categoryIndex + 1}_${titleIndex + 1}`;
      const amount = Math.max(8, 58 - titleIndex * 4 - categoryIndex);
      issues.push({
        id: issueId,
        category,
        title,
        createdAt,
        createdStep: currentStep,
      });
      claims.push({
        id: claimId,
        issueId,
        text: `${category}に関する論点として、「${title}」を現実的な制度・生活・行動の観点から捉え直すべきだ。`,
        authorName: ["Nora", "Kaito", "Mika", "Jun", "Sora"][(titleIndex + categoryIndex) % 5],
        createdAt,
        createdStep: currentStep,
      });
      stakes.push({
        id: uid("stake"),
        claimId,
        userId: `seed_user_${categoryIndex}_${titleIndex}`,
        amount,
        status: "locked",
        createdStep: currentStep,
        readyAtStep: null,
      });
      currentStep += 1;
    });
  });

  return { issues, claims, stakes, currentStep };
}

function makeInitialState() {
  const createdAt = nowIso();
  const user = {
    id: "demo_user",
    name: "あなた",
    availableBalance: 120,
  };
  const { issues, claims, stakes, currentStep } = buildSeedContent(createdAt);

  user.availableBalance -= 10;
  stakes.unshift(
    { id: uid("stake"), claimId: "claim_5_1", userId: user.id, amount: 6, status: "locked", createdStep: currentStep + 1, readyAtStep: null },
    { id: uid("stake"), claimId: "claim_2_1", userId: user.id, amount: 4, status: "locked", createdStep: currentStep + 2, readyAtStep: null },
  );

  return {
    version: 2,
    currentStep: currentStep + 2,
    rules: { ...SIM_RULES },
    user,
    favorites: [],
    issues,
    claims,
    stakes,
    events: [
      { id: uid("event"), type: "bootstrap", createdAt, message: "OZC simulation prototype initialized" },
    ],
  };
}

function loadRawState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 2) return null;
    if (!Array.isArray(parsed.issues) || parsed.issues.length === 0) return null;
    if (!Array.isArray(parsed.claims) || parsed.claims.length === 0) return null;
    if (!Array.isArray(parsed.stakes)) return null;
    if (!Array.isArray(parsed.favorites)) parsed.favorites = [];
    if (!parsed.user || typeof parsed.user.availableBalance !== "number") return null;
    return parsed;
  } catch (_error) {
    return null;
  }
}

function saveRawState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function ensureState() {
  const existing = loadRawState();
  if (existing) return existing;
  const initial = makeInitialState();
  saveRawState(initial);
  return initial;
}

function maturePending(state) {
  let released = 0;
  for (const stake of state.stakes) {
    if (stake.status === "pending" && stake.readyAtStep <= state.currentStep) {
      stake.status = "released";
      released += stake.amount;
    }
  }
  if (released > 0) {
    state.user.availableBalance += released;
    state.events.unshift({
      id: uid("event"),
      type: "matured",
      createdAt: nowIso(),
      message: `${released.toFixed(1)} OZC が引き出し可能残高に戻りました`,
    });
  }
}

function withMutation(mutator) {
  const next = cloneState(ensureState());
  const result = mutator(next);
  maturePending(next);
  saveRawState(next);
  return result;
}

function allLockedStake(stakes, claimId) {
  return stakes
    .filter((stake) => stake.claimId === claimId && (stake.status === "locked" || stake.status === "pending"))
    .reduce((sum, stake) => sum + stake.amount, 0);
}

function myLockedStake(state, claimId) {
  return state.stakes
    .filter((stake) => stake.userId === state.user.id && stake.claimId === claimId && stake.status === "locked")
    .reduce((sum, stake) => sum + stake.amount, 0);
}

function myPendingStake(state, claimId) {
  return state.stakes
    .filter((stake) => stake.userId === state.user.id && stake.claimId === claimId && stake.status === "pending")
    .reduce((sum, stake) => sum + stake.amount, 0);
}

function claimView(state, claim) {
  const issue = state.issues.find((item) => item.id === claim.issueId);
  return {
    ...claim,
    category: issue?.category ?? "その他",
    categoryIndex: catIndex(issue?.category ?? "その他"),
    totalStake: allLockedStake(state.stakes, claim.id),
    myLockedStake: myLockedStake(state, claim.id),
    myPendingStake: myPendingStake(state, claim.id),
  };
}

function issueView(state, issue) {
  const claims = state.claims
    .filter((claim) => claim.issueId === issue.id)
    .map((claim) => claimView(state, claim))
    .sort((a, b) => b.totalStake - a.totalStake || b.createdStep - a.createdStep);
  const claimIds = new Set(claims.map((claim) => claim.id));
  const totalStake = claims.reduce((sum, claim) => sum + claim.totalStake, 0);
  const voteCount = state.stakes.filter(
    (stake) => claimIds.has(stake.claimId) && (stake.status === "locked" || stake.status === "pending"),
  ).length;
  const topClaim = claims[0] ?? null;
  return {
    ...issue,
    categoryIndex: catIndex(issue.category),
    totalStake,
    claimCount: claims.length,
    voteCount,
    topClaim,
    claims,
  };
}

export function resetSimulation() {
  const initial = makeInitialState();
  saveRawState(initial);
  return projectState(initial);
}

export function advanceSimulation(steps = 1) {
  return withMutation((state) => {
    state.currentStep += Math.max(1, Number(steps) || 1);
    state.events.unshift({
      id: uid("event"),
      type: "advance",
      createdAt: nowIso(),
      message: `simulation step advanced to ${state.currentStep}`,
    });
    return projectState(state);
  });
}

export function createIssue({ category, title, claimText, stakeAmount }) {
  return withMutation((state) => {
    const normalizedStake = Number(stakeAmount);
    if (!CATEGORIES.includes(category)) throw new Error("カテゴリを選んでください");
    if (!title || title.trim().length === 0) throw new Error("論点を入力してください");
    if (title.trim().length > state.rules.issueMaxLength) throw new Error(`論点は${state.rules.issueMaxLength}字以内です`);
    if (!claimText || claimText.trim().length === 0) throw new Error("最初の主張を入力してください");
    if (claimText.trim().length > state.rules.claimMaxLength) throw new Error(`主張は${state.rules.claimMaxLength}字以内です`);
    if (!Number.isFinite(normalizedStake) || normalizedStake < state.rules.minStake) {
      throw new Error(`初期ステークは ${state.rules.minStake} OZC 以上です`);
    }
    if (state.user.availableBalance < normalizedStake) throw new Error("残高が不足しています");

    state.currentStep += 1;
    const issueId = uid("issue");
    const claimId = uid("claim");
    state.issues.unshift({
      id: issueId,
      category,
      title: title.trim(),
      createdAt: nowIso(),
      createdStep: state.currentStep,
    });
    state.claims.unshift({
      id: claimId,
      issueId,
      text: claimText.trim(),
      authorName: "あなた",
      createdAt: nowIso(),
      createdStep: state.currentStep,
    });
    state.stakes.unshift({
      id: uid("stake"),
      claimId,
      userId: state.user.id,
      amount: normalizedStake,
      status: "locked",
      createdStep: state.currentStep,
      readyAtStep: null,
    });
    state.user.availableBalance -= normalizedStake;
    if (!state.favorites.includes(issueId)) state.favorites.unshift(issueId);
    state.events.unshift({
      id: uid("event"),
      type: "create_issue",
      createdAt: nowIso(),
      message: `新しい論点「${title.trim()}」を作成し、${normalizedStake} OZC を初期ロック`,
    });
    return projectState(state);
  });
}

export function favoriteIssue(issueId) {
  return withMutation((state) => {
    if (!state.favorites.includes(issueId)) {
      state.favorites.unshift(issueId);
      state.events.unshift({
        id: uid("event"),
        type: "favorite",
        createdAt: nowIso(),
        message: "論点をお気に入りに追加しました",
      });
    }
    return projectState(state);
  });
}

export function unfavoriteIssue(issueId) {
  return withMutation((state) => {
    state.favorites = state.favorites.filter((id) => id !== issueId);
    state.events.unshift({
      id: uid("event"),
      type: "unfavorite",
      createdAt: nowIso(),
      message: "論点をお気に入りから外しました",
    });
    return projectState(state);
  });
}

export function clearFavorites() {
  return withMutation((state) => {
    state.favorites = [];
    state.events.unshift({
      id: uid("event"),
      type: "clear_favorites",
      createdAt: nowIso(),
      message: "お気に入り論点をすべて解除しました",
    });
    return projectState(state);
  });
}

export function addClaim(issueId, text) {
  return withMutation((state) => {
    const issue = state.issues.find((item) => item.id === issueId);
    if (!issue) throw new Error("論点が見つかりません");
    if (!text || text.trim().length === 0) throw new Error("主張を入力してください");
    if (text.trim().length > state.rules.claimMaxLength) throw new Error(`主張は${state.rules.claimMaxLength}字以内です`);
    state.currentStep += 1;
    state.claims.unshift({
      id: uid("claim"),
      issueId,
      text: text.trim(),
      authorName: "あなた",
      createdAt: nowIso(),
      createdStep: state.currentStep,
    });
    state.events.unshift({
      id: uid("event"),
      type: "add_claim",
      createdAt: nowIso(),
      message: `論点「${issue.title}」に新しい主張を追加`,
    });
    return projectState(state);
  });
}

export function stakeClaim(claimId, amount) {
  return withMutation((state) => {
    const claim = state.claims.find((item) => item.id === claimId);
    const normalized = Number(amount);
    if (!claim) throw new Error("主張が見つかりません");
    if (!Number.isFinite(normalized) || normalized < state.rules.minStake) {
      throw new Error(`ステークは ${state.rules.minStake} OZC 以上です`);
    }
    if (state.user.availableBalance < normalized) throw new Error("残高が不足しています");
    state.currentStep += 1;
    state.stakes.unshift({
      id: uid("stake"),
      claimId,
      userId: state.user.id,
      amount: normalized,
      status: "locked",
      createdStep: state.currentStep,
      readyAtStep: null,
    });
    state.user.availableBalance -= normalized;
    state.events.unshift({
      id: uid("event"),
      type: "stake",
      createdAt: nowIso(),
      message: `${normalized} OZC を主張へロック`,
    });
    return projectState(state);
  });
}

export function requestWithdraw(claimId, amount) {
  return withMutation((state) => {
    const normalized = Number(amount);
    const locked = myLockedStake(state, claimId);
    if (!Number.isFinite(normalized) || normalized <= 0) throw new Error("引き出し量が不正です");
    if (normalized > locked) throw new Error("ロック残高を超えています");
    state.currentStep += 1;
    let remaining = normalized;
    for (const stake of state.stakes) {
      if (
        remaining > 0 &&
        stake.userId === state.user.id &&
        stake.claimId === claimId &&
        stake.status === "locked"
      ) {
        const moved = Math.min(remaining, stake.amount);
        if (moved === stake.amount) {
          stake.status = "pending";
          stake.readyAtStep = state.currentStep + state.rules.cooldownSteps;
          remaining -= moved;
        } else {
          stake.amount -= moved;
          state.stakes.unshift({
            id: uid("stake"),
            claimId,
            userId: state.user.id,
            amount: moved,
            status: "pending",
            createdStep: state.currentStep,
            readyAtStep: state.currentStep + state.rules.cooldownSteps,
          });
          remaining -= moved;
        }
      }
    }
    state.events.unshift({
      id: uid("event"),
      type: "withdraw",
      createdAt: nowIso(),
      message: `${normalized} OZC の引き出しを申請。step ${state.currentStep + state.rules.cooldownSteps} で戻る予定`,
    });
    return projectState(state);
  });
}

export function getIssue(issueId) {
  const state = ensureState();
  const issue = state.issues.find((item) => item.id === issueId);
  if (!issue) return null;
  return projectState(state).issues.find((item) => item.id === issueId) ?? null;
}

export function getProjectedState() {
  return projectState(ensureState());
}

function projectState(state) {
  const issues = state.issues
    .map((issue) => issueView(state, issue))
    .sort((a, b) => b.totalStake - a.totalStake || b.createdStep - a.createdStep);
  const pendingWithdrawals = state.stakes
    .filter((stake) => stake.userId === state.user.id && stake.status === "pending")
    .sort((a, b) => a.readyAtStep - b.readyAtStep)
    .map((stake) => ({
      id: stake.id,
      claimId: stake.claimId,
      amount: stake.amount,
      readyAtStep: stake.readyAtStep,
      stepsLeft: Math.max(0, stake.readyAtStep - state.currentStep),
    }));
  const lockedBalance = state.stakes
    .filter((stake) => stake.userId === state.user.id && stake.status === "locked")
    .reduce((sum, stake) => sum + stake.amount, 0);

  return {
    currentStep: state.currentStep,
    rules: { ...state.rules },
    favorites: [...state.favorites],
    user: {
      ...state.user,
      lockedBalance,
      totalBalance: state.user.availableBalance + lockedBalance + pendingWithdrawals.reduce((sum, item) => sum + item.amount, 0),
    },
    pendingWithdrawals,
    recentEvents: state.events.slice(0, 12),
    issues,
  };
}
