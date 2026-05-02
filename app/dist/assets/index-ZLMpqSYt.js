(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))n(a);new MutationObserver(a=>{for(const i of a)if(i.type==="childList")for(const r of i.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&n(r)}).observe(document,{childList:!0,subtree:!0});function s(a){const i={};return a.integrity&&(i.integrity=a.integrity),a.referrerPolicy&&(i.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?i.credentials="include":a.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(a){if(a.ep)return;a.ep=!0;const i=s(a);fetch(a.href,i)}})();const x="ozc-sim-state-v2",f=["社会・政治","お金・資産","男女・性別","外国人問題","テクノロジー","医療・福祉","生活","その他"],w={minStake:1,cooldownSteps:8,issueMaxLength:40,claimMaxLength:140};function g(){return new Date().toISOString()}function v(e){return`${e}_${Math.random().toString(36).slice(2,10)}`}function A(e){return Math.max(1,f.indexOf(e)+1)}const T={"社会・政治":["移民政策で優先すべき基準は何か","地方議会の透明性を高める方法は何か","少子化対策で最も即効性がある施策は何か","ベーシックインカムはどこから試すべきか","選挙期間中のSNS規制は必要か","学校無償化は何を対象に広げるべきか","防衛費の増額はどこまで正当化できるか","都市再開発で住民合意をどう作るか","自治体の監視カメラ活用はどこまで許されるか","公共交通の赤字路線をどう維持するか"],"お金・資産":["新NISA時代に現金比率はどれくらい持つべきか","インフレ期の家計防衛は何から始めるべきか","住宅ローンと投資の優先順位はどう考えるべきか","副業収入を資産形成へ回す最適な配分は何か","金とビットコインはどちらを守りに使うべきか","円安長期化で生活費を守る方法は何か","子育て世帯の教育費積立は何で持つべきか","FIRE志向と普通の生活防衛はどう両立するか","高配当株は生活防衛資産になりうるか","生活費の固定費圧縮で最優先すべき項目は何か"],"男女・性別":["育休取得の不利益を減らす制度は何が必要か","性教育はどの年齢から何を扱うべきか","家事育児の見えない負担をどう可視化するか","男女賃金格差の説明責任は企業に必要か","制服や校則は性別に依存しない形へ変えるべきか","少人数の職場でハラスメントを減らす仕組みは何か","更年期や生理の支援は職場でどこまで必要か","結婚制度と事実婚の差をどこまで縮めるべきか","男子校女子校の価値は今も残るか","育児とキャリアの分断を防ぐ評価制度は何か"],外国人問題:["技能実習制度に代わる仕組みは何が妥当か","観光客増加と地域生活の両立はどう図るべきか","外国人労働者の日本語支援は誰が担うべきか","移民受け入れと社会保障の関係をどう整理するか","地域コミュニティで文化摩擦を減らす方法は何か","大学の留学生支援はどこまで公費で行うべきか","多言語行政サービスの優先順位はどう決めるか","外国籍住民の防災情報はどう届けるべきか","住宅賃貸での国籍差別を減らす仕組みは何か","観光地でのマナー対策は規制と啓発どちらが有効か"],テクノロジー:["生成AI時代に個人が学ぶべき基礎能力は何か","学校でのAI使用はどこまで許されるべきか","個人開発者がAIで稼ぐ現実的な戦略は何か","音声AIは接客業をどこまで置き換えるか","AIによる情報要約は思考力を弱めるか","ロボット介護は人手不足の本命になりうるか","オープンソースAIと巨大企業AIの差はどこで決まるか","検索の代わりにAI対話が主流になる条件は何か","子どもの端末利用をどう設計するべきか","デジタル身分証は利便性と監視をどう両立するか"],"医療・福祉":["医療費負担を抑えつつ地域医療を守る方法は何か","介護職の待遇改善はどこから手を付けるべきか","高齢者の孤立対策で最優先すべき仕組みは何か","予防医療への公的投資はどこまで拡大すべきか","終末期医療の意思決定をどう支えるべきか","メンタル不調の初期支援を学校や職場でどう整えるか","救急外来の混雑を減らす制度設計は何か","医師偏在の是正に必要な誘導策は何か","子どもの発達支援を地域でどうつなぐか","病院DXで患者の負担を減らせる領域は何か"],生活:["家賃高騰に対して個人が取れる対策は何か","孤独感を減らす生活習慣は何が有効か","共働き家庭の平日夕食をどう最適化するか","地方移住で失敗しないための確認項目は何か","ブラック企業を見抜くための具体サインは何か","節約と生活の質を両立する固定費の見直し方は何か","スマホ依存を減らす現実的な方法は何か","子どもの習い事は何を軸に選ぶべきか","一人暮らしの防犯を最小コストで強化する方法は何か","疲れをためない休日の使い方はどうあるべきか"],その他:["匿名SNSに実名性をどこまで求めるべきか","コミュニティ運営で荒れにくいルールは何か","地方祭りを次世代へ残す方法は何があるか","趣味のコミュニティを長く続ける条件は何か","社会人の学び直しを続けるコツは何か","ネット炎上に巻き込まれない発信姿勢は何か","オンラインサロンの価値はどこで決まるか","都市と地方の文化格差をどう埋めるべきか","寄付文化を日常化するには何が必要か","現代の信頼できる情報源をどう見分けるか"]};function _(e){const t=[],s=[],n=[];let a=0;return f.forEach((i,r)=>{T[i].forEach((c,u)=>{const d=`issue_${r+1}_${u+1}`,l=`claim_${r+1}_${u+1}`,b=Math.max(8,58-u*4-r);t.push({id:d,category:i,title:c,createdAt:e,createdStep:a}),s.push({id:l,issueId:d,text:`${i}に関する論点として、「${c}」を現実的な制度・生活・行動の観点から捉え直すべきだ。`,authorName:["Nora","Kaito","Mika","Jun","Sora"][(u+r)%5],createdAt:e,createdStep:a}),n.push({id:v("stake"),claimId:l,userId:`seed_user_${r}_${u}`,amount:b,status:"locked",createdStep:a,readyAtStep:null}),a+=1})}),{issues:t,claims:s,stakes:n,currentStep:a}}function N(){const e=g(),t={id:"demo_user",name:"あなた",availableBalance:120},{issues:s,claims:n,stakes:a,currentStep:i}=_(e);return t.availableBalance-=10,a.unshift({id:v("stake"),claimId:"claim_5_1",userId:t.id,amount:6,status:"locked",createdStep:i+1,readyAtStep:null},{id:v("stake"),claimId:"claim_2_1",userId:t.id,amount:4,status:"locked",createdStep:i+2,readyAtStep:null}),{version:2,currentStep:i+2,rules:{...w},user:t,favorites:[],issues:s,claims:n,stakes:a,events:[{id:v("event"),type:"bootstrap",createdAt:e,message:"OZC simulation prototype initialized"}]}}function P(){try{const e=localStorage.getItem(x);if(!e)return null;const t=JSON.parse(e);return!t||t.version!==2||!Array.isArray(t.issues)||t.issues.length===0||!Array.isArray(t.claims)||t.claims.length===0||!Array.isArray(t.stakes)||(Array.isArray(t.favorites)||(t.favorites=[]),!t.user||typeof t.user.availableBalance!="number")?null:t}catch{return null}}function q(e){localStorage.setItem(x,JSON.stringify(e))}function z(e){return JSON.parse(JSON.stringify(e))}function M(){const e=P();if(e)return e;const t=N();return q(t),t}function F(e){let t=0;for(const s of e.stakes)s.status==="pending"&&s.readyAtStep<=e.currentStep&&(s.status="released",t+=s.amount);t>0&&(e.user.availableBalance+=t,e.events.unshift({id:v("event"),type:"matured",createdAt:g(),message:`${t.toFixed(1)} OZC が引き出し可能残高に戻りました`}))}function I(e){const t=z(M()),s=e(t);return F(t),q(t),s}function Z(e,t){return e.filter(s=>s.claimId===t&&(s.status==="locked"||s.status==="pending")).reduce((s,n)=>s+n.amount,0)}function R(e,t){return e.stakes.filter(s=>s.userId===e.user.id&&s.claimId===t&&s.status==="locked").reduce((s,n)=>s+n.amount,0)}function Y(e,t){return e.stakes.filter(s=>s.userId===e.user.id&&s.claimId===t&&s.status==="pending").reduce((s,n)=>s+n.amount,0)}function j(e,t){const s=e.issues.find(n=>n.id===t.issueId);return{...t,category:s?.category??"その他",categoryIndex:A(s?.category??"その他"),totalStake:Z(e.stakes,t.id),myLockedStake:R(e,t.id),myPendingStake:Y(e,t.id)}}function H(e,t){const s=e.claims.filter(c=>c.issueId===t.id).map(c=>j(e,c)).sort((c,u)=>u.totalStake-c.totalStake||u.createdStep-c.createdStep),n=new Set(s.map(c=>c.id)),a=s.reduce((c,u)=>c+u.totalStake,0),i=e.stakes.filter(c=>n.has(c.claimId)&&(c.status==="locked"||c.status==="pending")).length,r=s[0]??null;return{...t,categoryIndex:A(t.category),totalStake:a,claimCount:s.length,voteCount:i,topClaim:r,claims:s}}function X({category:e,title:t,claimText:s,stakeAmount:n}){return I(a=>{const i=Number(n);if(!f.includes(e))throw new Error("カテゴリを選んでください");if(!t||t.trim().length===0)throw new Error("論点を入力してください");if(t.trim().length>a.rules.issueMaxLength)throw new Error(`論点は${a.rules.issueMaxLength}字以内です`);if(!s||s.trim().length===0)throw new Error("最初の主張を入力してください");if(s.trim().length>a.rules.claimMaxLength)throw new Error(`主張は${a.rules.claimMaxLength}字以内です`);if(!Number.isFinite(i)||i<a.rules.minStake)throw new Error(`初期ステークは ${a.rules.minStake} OZC 以上です`);if(a.user.availableBalance<i)throw new Error("残高が不足しています");a.currentStep+=1;const r=v("issue"),c=v("claim");return a.issues.unshift({id:r,category:e,title:t.trim(),createdAt:g(),createdStep:a.currentStep}),a.claims.unshift({id:c,issueId:r,text:s.trim(),authorName:"あなた",createdAt:g(),createdStep:a.currentStep}),a.stakes.unshift({id:v("stake"),claimId:c,userId:a.user.id,amount:i,status:"locked",createdStep:a.currentStep,readyAtStep:null}),a.user.availableBalance-=i,a.favorites.includes(r)||a.favorites.unshift(r),a.events.unshift({id:v("event"),type:"create_issue",createdAt:g(),message:`新しい論点「${t.trim()}」を作成し、${i} OZC を初期ロック`}),L(a)})}function D(e){return I(t=>(t.favorites.includes(e)||(t.favorites.unshift(e),t.events.unshift({id:v("event"),type:"favorite",createdAt:g(),message:"論点をお気に入りに追加しました"})),L(t)))}function J(){return I(e=>(e.favorites=[],e.events.unshift({id:v("event"),type:"clear_favorites",createdAt:g(),message:"お気に入り論点をすべて解除しました"}),L(e)))}function W(){return L(M())}function L(e){const t=e.issues.map(a=>H(e,a)).sort((a,i)=>i.totalStake-a.totalStake||i.createdStep-a.createdStep),s=e.stakes.filter(a=>a.userId===e.user.id&&a.status==="pending").sort((a,i)=>a.readyAtStep-i.readyAtStep).map(a=>({id:a.id,claimId:a.claimId,amount:a.amount,readyAtStep:a.readyAtStep,stepsLeft:Math.max(0,a.readyAtStep-e.currentStep)})),n=e.stakes.filter(a=>a.userId===e.user.id&&a.status==="locked").reduce((a,i)=>a+i.amount,0);return{currentStep:e.currentStep,rules:{...e.rules},favorites:[...e.favorites],user:{...e.user,lockedBalance:n,totalBalance:e.user.availableBalance+n+s.reduce((a,i)=>a+i.amount,0)},pendingWithdrawals:s,recentEvents:e.events.slice(0,12),issues:t}}const k={key:"stake"};let p="home",S=null,$="",E=0,o=W();const C="ozc-clear-favorites-once-v1";function m(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function y(e){return Number(e||0).toLocaleString("ja-JP",{minimumFractionDigits:0,maximumFractionDigits:1})}function K(){let e=o.issues;if(p==="favorites"){const n=new Set(o.favorites);e=o.issues.filter(a=>n.has(a.id))}else if(p==="home"){const n=new Set(o.favorites);e=o.issues.filter(a=>!n.has(a.id))}const t=$.trim().toLowerCase(),s=e.filter(n=>{const a=!S||n.category===S,i=!t||`${n.title} ${n.topClaim?.text??""} ${n.category}`.toLowerCase().includes(t);return a&&i});return k.key==="new"?s.sort((n,a)=>a.createdStep-n.createdStep):k.key==="claims"?s.sort((n,a)=>a.voteCount-n.voteCount||a.totalStake-n.totalStake):s.sort((n,a)=>a.totalStake-n.totalStake||a.claimCount-n.claimCount),s}function V(){const e=document.querySelector(".article-container");if(p==="account"){ee(e);return}if(p==="search"){U(e);return}if(p==="notifications"){Q(e);return}const t=K();if(t.length===0){e.innerHTML=`
      <section class="article-error empty-state">
        <div class="sim-badge">${p==="favorites"?"FAVORITES":"EMPTY"}</div>
        <h2>${p==="favorites"?"右スワイプした論点がここに並びます":"表示できる論点がありません"}</h2>
      </section>
    `;return}e.innerHTML=t.map(s=>`
        <button class="article-item" data-id="${s.id}">
          <img class="corner-bg" src="/images/common/corner-spaced.png" alt="">
          <div class="category-label">#${m(s.category)}</div>
          ${o.favorites.includes(s.id)?'<div class="favorite-badge"><i class="bi bi-star-fill"></i></div>':""}
          <div class="article-window cat-${s.categoryIndex}">
            <div class="article-title-area">
              <div class="article-title">${m(s.title)}</div>
            </div>
            <div class="article-footer article-footer-ozc">
              <div class="article-opinion-group">
                <i class="bi bi-chat-left-dots-fill"></i>
                <div class="label-text">意見</div>
                <div class="text">${s.claimCount}</div>
              </div>
              <div class="article-vote-group">
                <i class="bi bi-people-fill"></i>
                <div class="label-text">投票</div>
                <div class="text">${s.voteCount}</div>
              </div>
              <div class="article-ozc-group">
                <i class="bi bi-soundwave"></i>
                <div class="label-text">流通量</div>
                <div class="text">${y(s.totalStake)}</div>
              </div>
            </div>
          </div>
        </button>
      `).join(""),e.querySelectorAll(".article-item").forEach(s=>{s.addEventListener("click",()=>{location.href=`/detail/?id=${s.dataset.id}`}),te(s)})}function G(){const e=f[E]??f[0],t=$.trim().toLowerCase(),s=o.issues.filter(n=>n.category!==e?!1:t?`${n.title} ${n.topClaim?.text??""} ${n.category}`.toLowerCase().includes(t):!0);return s.sort((n,a)=>a.totalStake-n.totalStake||a.voteCount-n.voteCount||a.createdStep-n.createdStep),s}function U(e){const t=G(),s=f[E]??f[0],n=t[0]??null,a=t.map(r=>r.title).filter(Boolean).slice(0,3);e.innerHTML=`
    <section class="search-story-panel">
      <div class="search-cube-scene" id="search-cube-scene">
        <div class="search-cube-face">
          ${n?`
              <article class="search-theme-card" id="search-theme-card">
                <div class="search-theme-kicker">#${m(s)}</div>
                <div class="search-theme-header">
                  <h3 class="search-theme-title">${m(n.title)}</h3>
                </div>
                <div class="search-theme-chips">
                  ${a.map(r=>`<div class="search-theme-chip">${m(r)}</div>`).join("")}
                </div>
                <div class="search-theme-meta">
                  <span><i class="bi bi-chat-left-dots-fill"></i>${n.claimCount} 意見</span>
                  <span><i class="bi bi-people-fill"></i>${n.voteCount} 投票</span>
                  <span><i class="bi bi-soundwave"></i>${y(n.totalStake)} 流通量</span>
                </div>
              </article>
            `:'<div class="search-empty-card">このテーマに一致する論点はありません</div>'}
        </div>
      </div>
      ${t.length>0?`
            <div class="search-list-panel">
              ${t.map(r=>`
                    <button class="article-item search-article-item" data-id="${r.id}">
                      <img class="corner-bg" src="/images/common/corner-spaced.png" alt="">
                      <div class="category-label">#${m(r.category)}</div>
                      <div class="article-window cat-${r.categoryIndex}">
                        <div class="article-title-area">
                          <div class="article-title">${m(r.title)}</div>
                        </div>
                        <div class="article-footer article-footer-ozc">
                          <div class="article-opinion-group">
                            <i class="bi bi-chat-left-dots-fill"></i>
                            <div class="label-text">意見</div>
                            <div class="text">${r.claimCount}</div>
                          </div>
                          <div class="article-vote-group">
                            <i class="bi bi-people-fill"></i>
                            <div class="label-text">投票</div>
                            <div class="text">${r.voteCount}</div>
                          </div>
                          <div class="article-ozc-group">
                            <i class="bi bi-soundwave"></i>
                            <div class="label-text">流通量</div>
                            <div class="text">${y(r.totalStake)}</div>
                          </div>
                        </div>
                      </div>
                    </button>
                  `).join("")}
            </div>
          `:""}
    </section>
  `;const i=e.querySelector("#search-theme-card");if(i&&n){let r=!1;i.addEventListener("touchstart",()=>{r=!1},{passive:!0}),i.addEventListener("touchmove",()=>{r=!0},{passive:!0}),i.addEventListener("click",()=>{r||(location.href=`/detail/?id=${n.id}`)})}e.querySelectorAll(".search-list-panel .article-item").forEach(r=>{r.addEventListener("click",()=>{location.href=`/detail/?id=${r.dataset.id}`})}),ve(e.querySelector("#search-cube-scene"))}function Q(e){e.innerHTML=`
    <section class="claims-panel notification-panel">
      <div class="claims-panel-head">
        <h3>通知</h3>
        <div class="claims-panel-meta">latest 12</div>
      </div>
      <div class="sim-events">
        ${o.recentEvents.slice(0,12).map(t=>`<div class="sim-event-item">${m(t.message)}</div>`).join("")}
      </div>
    </section>
  `}function ee(e){const t=o.pendingWithdrawals.reduce((n,a)=>n+a.amount,0),s=[{icon:"bi-qr-code-scan",label:"スキャン"},{icon:"bi-arrow-left-right",label:"送る・受け取る"},{icon:"bi-piggy-bank",label:"おトク"},{icon:"bi-plus-circle",label:"チャージ"},{icon:"bi-ticket-perforated",label:"クーポン"},{icon:"bi-graph-up-arrow",label:"ボーナス運用"},{icon:"bi-receipt",label:"請求書払い"},{icon:"bi-bag",label:"ピックアップ"},{icon:"bi-wallet2",label:"お金を作りる"},{icon:"bi-cart3",label:"OZCモール"},{icon:"bi-shirt",label:"OZCフリマ"},{icon:"bi-grid-3x3-gap",label:"もっと見る"}];e.innerHTML=`
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
                <div class="wallet-pay-balance">${y(o.user.availableBalance)} OZC</div>
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
        <div><span>ロック中</span><strong>${y(o.user.lockedBalance)} OZC</strong></div>
        <div><span>引き出し待ち</span><strong>${y(t)} OZC</strong></div>
        <div><span>星</span><strong>${o.favorites.length}</strong></div>
      </div>

      <div class="wallet-service-grid">
        ${s.map(n=>`
              <button class="wallet-service-item">
                <div class="wallet-service-icon"><i class="bi ${n.icon}"></i></div>
                <div class="wallet-service-label">${m(n.label)}</div>
              </button>
            `).join("")}
      </div>
    </section>
  `}function te(e){let t=0,s=0,n=!1,a=!1;const i=e.dataset.id,r=(d,l)=>{t=d,s=l,n=!0,e.classList.remove("swiping-right")},c=(d,l)=>{if(!n)return;const b=d-t,B=l-s;Math.abs(B)>Math.abs(b)||b>0&&(e.style.transform=`translateX(${Math.min(b,72)}px)`,e.classList.toggle("swiping-right",b>36))},u=d=>{if(!n)return;const l=d-t;if(n=!1,l>72){o=D(i),a=!0,e.classList.remove("swiping-right"),e.classList.add("swipe-away-right"),e.style.pointerEvents="none",window.setTimeout(()=>{h()},220);return}e.style.transform="",e.classList.remove("swiping-right")};e.addEventListener("touchstart",d=>{const l=d.changedTouches[0];r(l.clientX,l.clientY)},{passive:!0}),e.addEventListener("touchmove",d=>{const l=d.changedTouches[0];c(l.clientX,l.clientY)},{passive:!0}),e.addEventListener("touchend",d=>{const l=d.changedTouches[0];u(l.clientX)}),e.addEventListener("transitionend",()=>{a&&(e.style.transform="")})}function h(){ae(),V(),ce(),se(),le()}function ae(){const e=document.querySelector("#main .inner-menu"),t=document.getElementById("bottom-menu"),s=document.getElementById("search-tab-header"),n=document.getElementById("search-input"),a=p==="search";document.body.classList.toggle("search-mode",a),e&&(e.style.display="none"),t&&(t.style.display=p==="home"?"":"none"),s&&(s.style.display=a?"block":"none"),n&&(n.value=$)}function se(){document.querySelectorAll(".category-button").forEach(e=>{const t=e.textContent.trim()===S;e.classList.toggle("active",t)})}function ne(){document.querySelectorAll(".category-button").forEach(e=>{e.addEventListener("click",()=>{const t=e.textContent.trim();S=S===t?null:t,h()})})}function ie(){const e=document.getElementById("search-input"),t=document.getElementById("search-button");if(!e||!t)return;const s=()=>{$=e.value,h()};t.addEventListener("click",s),e.addEventListener("input",s),e.addEventListener("keydown",n=>{n.key==="Enter"&&s()})}function re(){const e=document.querySelector(".sort-button"),t=document.querySelector(".sort-select");e.addEventListener("click",()=>t.classList.toggle("show")),document.querySelectorAll(".select-element").forEach(s=>{s.addEventListener("click",()=>{k.key=s.dataset.value,t.classList.remove("show"),h()})})}function ce(){const e=document.getElementById("wallet-connect-button");e&&(e.innerHTML=`<i class="bi bi-wallet2"></i><span>${y(o.user.availableBalance)} OZC</span>`)}function le(){document.querySelectorAll(".underbar-item").forEach(e=>{e.classList.toggle("active",e.dataset.section===p)})}function O(){document.getElementById("theme-create-modal").classList.remove("show")}function oe(){document.getElementById("theme-create-modal").classList.add("show")}function de(){document.querySelector(".label-header .modal-title").textContent="論点作成",document.querySelector(".label-group .modal-text").textContent="カテゴリ・論点・最初の主張・初期ステークをまとめて入れます";const e=document.querySelector(".create-form-container");e.innerHTML=`
    <form id="sim-create-form" class="ozc-create-form">
      <label class="create-label">カテゴリ
        <select name="category">
          ${f.map(t=>`<option value="${m(t)}">${m(t)}</option>`).join("")}
        </select>
      </label>
      <label class="create-label">論点（40字以内）
        <input name="title" maxlength="${w.issueMaxLength}" required />
      </label>
      <label class="create-label">最初の主張（140字以内）
        <textarea name="claimText" rows="4" maxlength="${w.claimMaxLength}" required></textarea>
      </label>
      <label class="create-label">初期ステーク
        <input name="stakeAmount" type="number" min="${w.minStake}" step="1" value="${w.minStake}" required />
      </label>
      <button type="submit" class="button secondary"><div class="text">論点を作成</div></button>
      <div id="ozc-create-status" class="ozc-create-status"></div>
    </form>
  `,e.querySelector("form").addEventListener("submit",t=>{t.preventDefault();const s=new FormData(t.currentTarget),n=document.getElementById("ozc-create-status");try{const a=String(s.get("category")||"");o=X({category:a,title:String(s.get("title")||""),claimText:String(s.get("claimText")||""),stakeAmount:Number(s.get("stakeAmount")||0)}),n.textContent="論点を作成しました",S=a,$="",k.key="new",O(),h(),window.scrollTo({top:0,behavior:"smooth"})}catch(a){n.textContent=`失敗: ${a.message||a}`}})}function ue(){document.querySelector(".create-button")?.addEventListener("click",oe),document.querySelectorAll("#theme-create-modal .modal-close-button, #theme-create-modal .complete-close-button").forEach(e=>{e.addEventListener("click",O)})}function pe(){document.querySelectorAll(".underbar-item").forEach(e=>{e.addEventListener("click",()=>{p=e.dataset.section,h()})})}function me(e){const t=(E+e+f.length)%f.length,s=document.getElementById("search-cube-scene");s&&(s.classList.remove("cube-next","cube-prev"),s.offsetWidth,s.classList.add(e>0?"cube-next":"cube-prev")),E=t,window.setTimeout(()=>{h()},170)}function ve(e){if(!e)return;let t=0,s=0,n=!1;e.addEventListener("touchstart",a=>{const i=a.changedTouches[0];t=i.clientX,s=i.clientY,n=!0},{passive:!0}),e.addEventListener("touchend",a=>{if(!n)return;n=!1;const i=a.changedTouches[0],r=i.clientX-t,c=i.clientY-s;Math.abs(r)<42||Math.abs(r)<Math.abs(c)||me(r<0?1:-1)},{passive:!0})}function fe(){localStorage.getItem(C)||(o=J(),localStorage.setItem(C,"1")),p="home";const e=document.querySelector(".create-button .text");e&&(e.textContent="論点を作成"),document.querySelectorAll(".select-element")[0].textContent="流通量順",document.querySelectorAll(".select-element")[1].textContent="新着順",document.querySelectorAll(".select-element")[2].textContent="投票数順",de(),ue(),pe(),ne(),ie(),re(),h()}fe();
