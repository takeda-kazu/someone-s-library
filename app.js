// アプリケーション状態管理
let currentMode = "normal"; // 'normal' or 'admin'
let currentScreen = "list"; // 'list', 'detail', 'edit'
let currentBookId = null;
let isAuthenticated = false;
let isViewPasswordVerified = false; // 閲覧パスワード検証済みフラグ

// 閲覧用パスワード（実際の運用では環境変数などから取得すべき）
const VIEW_PASSWORD = "teijin";

// DOM読み込み後に実行
document.addEventListener("DOMContentLoaded", () => {
  console.log("App initialized");
  checkViewPassword();
});

// 閲覧パスワードチェック
function checkViewPassword() {
  // セッションストレージでパスワード検証済みかチェック
  const verified = sessionStorage.getItem("viewPasswordVerified");

  if (verified === "true") {
    isViewPasswordVerified = true;
    initializeApp();
  } else {
    // パスワードモーダルを表示
    showViewPasswordModal();
  }
}

// 閲覧パスワードモーダルを表示
function showViewPasswordModal() {
  const modal = document.getElementById("view-password-modal");
  const form = document.getElementById("view-password-form");
  const input = document.getElementById("view-password-input");
  const error = document.getElementById("view-password-error");
  const btn = document.getElementById("view-password-btn");

  modal.style.display = "flex";

  // フォームの送信処理
  const handleSubmit = (e) => {
    e.preventDefault();
    const password = input.value.trim();

    if (password === VIEW_PASSWORD) {
      // パスワード正解
      isViewPasswordVerified = true;
      sessionStorage.setItem("viewPasswordVerified", "true");
      modal.style.display = "none";
      error.style.display = "none";
      input.value = "";
      initializeApp();
    } else {
      // パスワード不正解
      error.style.display = "block";
      input.value = "";
      input.focus();
    }
  };

  form.addEventListener("submit", handleSubmit);
  btn.addEventListener("click", handleSubmit);

  // モーダルが表示されたら入力欄にフォーカス
  setTimeout(() => input.focus(), 100);
}

// アプリケーション初期化
function initializeApp() {
  setupEventListeners();
  setupAuthStateListener();
  setupHistoryListener();
  // Firestoreからデータを読み込む（認証不要で読み取り可能な場合）
  loadBooksFromFirestore();
}

// Firestoreから書籍データを読み込む
async function loadBooksFromFirestore() {
  showLoading("書籍データを読み込んでいます...");

  // Firebaseが初期化されるまで待つ
  const checkFirebase = setInterval(async () => {
    if (window.firebaseDb && window.firestore) {
      clearInterval(checkFirebase);

      try {
        const db = window.firebaseDb;
        const { collection, getDocs, query, orderBy } = window.firestore;

        const booksCollection = collection(db, "books");
        const querySnapshot = await getDocs(booksCollection);

        if (!querySnapshot.empty) {
          // Firestoreからデータを取得
          const firestoreBooks = [];
          let maxId = 0;

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            // ドキュメントIDが数値の場合はそれを使用、そうでない場合は連番を生成
            let bookId;
            const parsedId = parseInt(doc.id);
            if (!isNaN(parsedId) && parsedId > 0) {
              bookId = parsedId;
            } else {
              // 既存のbooksDataから最大IDを取得
              maxId = Math.max(maxId, ...booksData.map((b) => b.id || 0));
              bookId = maxId + 1;
              maxId = bookId;
            }

            firestoreBooks.push({
              id: bookId,
              firestoreId: doc.id,
              title: data.title || "",
              author: data.author || "",
              imageUrl: data.imageUrl || "",
              introduction: data.introduction || data.description || "",
              summary: data.summary || data.description || "",
              quotes: data.quotes || [],
              reflections: data.reflections || [],
              // 後方互換性のため、古いフィールドも保持
              description: data.description || data.introduction || "",
              review: data.review || "",
              insights: data.insights || "",
              keywords: data.keywords || [],
            });
          });

          // booksDataを更新（Firestoreのデータを優先）
          booksData.length = 0;
          booksData.push(...firestoreBooks);

          renderBookList();
          hideLoading();
        } else {
          // Firestoreにデータがない場合はローカルデータを表示
          renderBookList();
          hideLoading();
        }
      } catch (error) {
        console.error("Firestore読み込みエラー:", error);
        showToast("データの読み込みに失敗しました", "error");
        // エラーが発生した場合はローカルデータを表示
        renderBookList();
        hideLoading();
      }
    }
  }, 100);

  // タイムアウト（5秒）
  setTimeout(() => {
    clearInterval(checkFirebase);
    // タイムアウトした場合もローカルデータを表示
    renderBookList();
    hideLoading();
  }, 5000);
}

// ブラウザの履歴管理の設定
function setupHistoryListener() {
  // 初期状態を履歴に追加
  if (!window.history.state) {
    window.history.replaceState({ screen: "list" }, "", "");
  }

  // ブラウザの戻る/進むボタンに対応
  window.addEventListener("popstate", (event) => {
    if (event.state) {
      const screen = event.state.screen;
      const bookId = event.state.bookId;

      if (screen === "list") {
        showScreenWithoutHistory("list");
      } else if (screen === "detail" && bookId) {
        showBookDetailWithoutHistory(bookId);
      } else if (screen === "edit") {
        if (bookId) {
          showEditScreenWithoutHistory(bookId);
        } else {
          showEditScreenWithoutHistory();
        }
      }
    }
  });
}

// 認証状態の監視
function setupAuthStateListener() {
  // Firebaseが初期化されるまで待つ
  const checkAuth = setInterval(() => {
    if (window.firebaseAuth && window.firebaseAuthFunctions) {
      clearInterval(checkAuth);
      const auth = window.firebaseAuth;
      const { onAuthStateChanged } = window.firebaseAuthFunctions;

      onAuthStateChanged(auth, (user) => {
        if (user) {
          // ユーザーがログインしている
          currentMode = "admin";
          isAuthenticated = true;
          document.getElementById("admin-mode-btn").style.display = "none";
          document.getElementById("normal-mode-btn").style.display =
            "inline-block";
          document.getElementById("search-controls").style.display = "flex";
          // ログイン時にデータを再読み込み
          loadBooksFromFirestore();
        } else {
          // ユーザーがログアウトしている
          currentMode = "normal";
          isAuthenticated = false;
          document.getElementById("admin-mode-btn").style.display =
            "inline-block";
          document.getElementById("normal-mode-btn").style.display = "none";
          document.getElementById("search-controls").style.display = "none";
        }
      });
    }
  }, 100);

  // タイムアウト（5秒）
  setTimeout(() => {
    clearInterval(checkAuth);
  }, 5000);
}

// イベントリスナー設定
function setupEventListeners() {
  // モード切り替え
  document
    .getElementById("admin-mode-btn")
    ?.addEventListener("click", showAuthModal);
  document
    .getElementById("normal-mode-btn")
    ?.addEventListener("click", switchToNormalMode);

  // 認証モーダル
  document
    .getElementById("close-auth-modal-x")
    ?.addEventListener("click", closeAuthModal);
  document
    .getElementById("close-auth-modal-btn")
    ?.addEventListener("click", closeAuthModal);
  document
    .getElementById("auth-login-btn")
    ?.addEventListener("click", handleLogin);

  // 画面遷移
  // 画面遷移
  document.getElementById("back-btn")?.addEventListener("click", () => {
    // 履歴があれば戻る、なければリストに戻る（安全策）
    if (window.history.state && window.history.state.screen === 'detail') {
        window.history.back();
    } else {
        showScreen('list');
    }
  });
  document.getElementById("back-edit-btn")?.addEventListener("click", () => {
    window.history.back();
  });

  // 検索・フィルター
  document
    .getElementById("search-input")
    ?.addEventListener("input", filterBooks);
  document
    .getElementById("author-filter")
    ?.addEventListener("change", filterBooks);
  document
    .getElementById("add-book-btn")
    ?.addEventListener("click", () => showEditScreen());

  // モーダルクローズ
  document
    .getElementById("close-modal-x")
    ?.addEventListener("click", closePromptModal);
  document
    .getElementById("close-modal-btn")
    ?.addEventListener("click", closePromptModal);
  document
    .getElementById("copy-btn")
    ?.addEventListener("click", copyPromptText);

  document
    .getElementById("close-copy-success-x")
    ?.addEventListener("click", closeCopySuccessModal);
  document
    .getElementById("close-copy-success-btn")
    ?.addEventListener("click", closeCopySuccessModal);

  // チャットモーダル
  document
    .getElementById("close-chat-modal-x")
    ?.addEventListener("click", closeChatModal);
  document
    .getElementById("close-chat-modal-btn")
    ?.addEventListener("click", closeChatModal);
}

// 書籍リスト表示
function renderBookList(books = booksData) {
  const bookListContainer = document.getElementById("book-list");
  if (!bookListContainer) return;

  bookListContainer.innerHTML = "";

  if (books.length === 0) {
    bookListContainer.innerHTML =
      '<p style="text-align: center; color: var(--color-text-secondary); margin-top: 3rem;">該当する本が見つかりませんでした</p>';
    return;
  }

  books.forEach((book) => {
    const bookCard = createBookCard(book);
    bookListContainer.appendChild(bookCard);
  });

  // 著者フィルター更新
  updateAuthorFilter();
}

// 書籍カード作成
function createBookCard(book) {
  const card = document.createElement("div");
  card.className = "book-card";
  card.setAttribute("role", "listitem");
  card.onclick = () => showBookDetail(book.id);

  const imageHtml = book.imageUrl
    ? `<img src="${escapeHtml(book.imageUrl)}" alt="${escapeHtml(
        book.title
      )}の表紙" class="book-image" onerror="this.style.display='none'">`
    : "";

  card.innerHTML = `
        <div class="book-card-header">
            <h3 class="book-title">${escapeHtml(book.title)}</h3>
            <p class="book-author">著者: ${escapeHtml(book.author)}</p>
        </div>
        ${imageHtml}
        <p class="book-description">${escapeHtml(
          book.introduction || book.description || ""
        )}</p>
    `;

  return card;
}

// 書籍詳細表示（履歴に追加）
function showBookDetail(bookId) {
  showBookDetailWithoutHistory(bookId);
  // 履歴に追加
  window.history.pushState({ screen: "detail", bookId: bookId }, "", "");
}

// 書籍詳細表示（履歴に追加しない）
function showBookDetailWithoutHistory(bookId) {
  const book = booksData.find((b) => b.id === bookId);
  if (!book) return;

  currentBookId = bookId;
  const detailContainer = document.getElementById("book-detail-content");
  if (!detailContainer) return;

  const imageHtml = book.imageUrl
    ? `<img src="${escapeHtml(book.imageUrl)}" alt="${escapeHtml(
        book.title
      )}の表紙" class="detail-image" onerror="this.style.display='none'">`
    : "";

  // 引用と考察を交互に表示するHTML生成
  let quotesAndReflectionsHtml = "";
  const quotes = book.quotes || [];
  const reflections = book.reflections || [];
  const maxLength = Math.max(quotes.length, reflections.length);

  for (let i = 0; i < maxLength; i++) {
    // 引用を表示
    if (quotes[i]) {
      quotesAndReflectionsHtml += `
                <div class="detail-section">
                    <h3 class="section-title">
                        <span class="section-icon">💬</span>
                        引用${i + 1}
                    </h3>
                    <div class="quote-card">
                        <h4 class="quote-title">${escapeHtml(
                          quotes[i].title
                        )}</h4>
                        <blockquote class="quote-content">${escapeHtml(
                          quotes[i].content
                        )}</blockquote>
                        <p class="quote-page">(${escapeHtml(
                          quotes[i].pageNumber
                        )}頁)</p>
                    </div>
                </div>
            `;
    }

    // 考察を表示
    if (reflections[i]) {
      quotesAndReflectionsHtml += `
                <div class="detail-section">
                    <h3 class="section-title">
                        <span class="section-icon">💡</span>
                        上司の考察${i + 1}
                    </h3>
                    <div class="reflection-card">
                        <h4 class="reflection-title">${escapeHtml(
                          reflections[i].title
                        )}</h4>
                        <p class="reflection-content">${escapeHtml(
                          reflections[i].content
                        )}</p>
                    </div>
                </div>
            `;
    }
  }

  detailContainer.innerHTML = `
        <h2 class="detail-title">${escapeHtml(book.title)}</h2>
        <p class="detail-author">著者: ${escapeHtml(book.author)}</p>

        ${imageHtml}

        <div class="detail-section">
            <h3 class="section-title">
                <span class="section-icon">📖</span>
                ご紹介
            </h3>
            <p>${escapeHtml(book.introduction || book.description || "")}</p>
        </div>

        <div class="detail-section">
            <h3 class="section-title">
                <span class="section-icon">🟰</span>
                本の要約
            </h3>
            <p>${escapeHtml(book.summary || book.description || "")}</p>
        </div>

        ${quotesAndReflectionsHtml}

        <div class="detail-section">
            <h3 class="section-title">
                <span class="section-icon">🏷️</span>
                キーワード
            </h3>
            <div class="keywords-container">
                ${book.keywords
                  .map(
                    (keyword) =>
                      `<span class="keyword-tag">${escapeHtml(keyword)}</span>`
                  )
                  .join("")}
            </div>
        </div>

        ${
          currentMode === "admin"
            ? `
            <div style="display: flex; gap: 1rem; margin-top: 2rem; flex-wrap: wrap;">
                <button onclick="showEditScreen(${bookId})" class="admin-button" style="flex: 1; min-width: 120px;">編集</button>
                <button onclick="generatePrompt(${bookId})" class="copy-button" style="flex: 1; min-width: 120px;">プロンプト生成</button>
                <button onclick="openChat(${bookId})" class="chat-button" style="flex: 1; min-width: 120px;">
                    <span aria-hidden="true">🤖</span> AIと対話
                </button>
            </div>
        `
            : `
            <div style="display: flex; gap: 1rem; margin-top: 2rem; flex-wrap: wrap;">
                <button onclick="generatePrompt(${bookId})" class="copy-button" style="flex: 1; min-width: 120px;">プロンプト生成</button>
                <button onclick="openChat(${bookId})" class="chat-button" style="flex: 1; min-width: 120px;">
                    <span aria-hidden="true">🤖</span> AIと対話
                </button>
            </div>
        `
        }
    `;

  showScreenWithoutHistory("detail");
}

// 画面切り替え（履歴に追加）
function showScreen(screenName, bookId = null) {
  showScreenWithoutHistory(screenName);

  // 履歴に追加
  const state = { screen: screenName };
  if (bookId) {
    state.bookId = bookId;
  }
  window.history.pushState(state, "", "");
}

// 画面切り替え（履歴に追加しない）
function showScreenWithoutHistory(screenName) {
  document.getElementById("screen-list").style.display = "none";
  document.getElementById("screen-detail").style.display = "none";
  document.getElementById("screen-edit").style.display = "none";

  document.getElementById(`screen-${screenName}`).style.display = "block";
  currentScreen = screenName;

  announceToScreenReader(
    `${
      screenName === "list" ? "一覧" : screenName === "detail" ? "詳細" : "編集"
    }画面に移動しました`
  );
}

// 管理モード切り替え
function switchToAdminMode() {
  currentMode = "admin";
  isAuthenticated = true;
  document.getElementById("admin-mode-btn").style.display = "none";
  document.getElementById("normal-mode-btn").style.display = "inline-block";
  document.getElementById("search-controls").style.display = "flex";
  announceToScreenReader("管理モードに切り替わりました");
  renderBookList();
}

async function switchToNormalMode() {
  try {
    const auth = window.firebaseAuth;
    const { signOut } = window.firebaseAuthFunctions;

    await signOut(auth);
  } catch (error) {
    console.error("ログアウトエラー:", error);
  }

  currentMode = "normal";
  isAuthenticated = false;
  document.getElementById("admin-mode-btn").style.display = "inline-block";
  document.getElementById("normal-mode-btn").style.display = "none";
  document.getElementById("search-controls").style.display = "none";
  announceToScreenReader("通常モードに切り替わりました");
  showScreen("list");
}

// 認証モーダル
function showAuthModal() {
  document.getElementById("auth-modal").style.display = "flex";
  setTimeout(() => document.getElementById("auth-email")?.focus(), 100);
}

function closeAuthModal() {
  document.getElementById("auth-modal").style.display = "none";
  document.getElementById("auth-email").value = "";
  document.getElementById("auth-password").value = "";
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;

  if (!email || !password) {
    showToast("メールアドレスとパスワードを入力してください", "warning");
    return;
  }

  try {
    const auth = window.firebaseAuth;
    const { signInWithEmailAndPassword } = window.firebaseAuthFunctions;

    await signInWithEmailAndPassword(auth, email, password);
    closeAuthModal();
    switchToAdminMode();
  } catch (error) {
    console.error("ログインエラー:", error);
    let errorMessage = "ログインに失敗しました";

    if (error.code === "auth/user-not-found") {
      errorMessage = "ユーザーが見つかりません";
    } else if (error.code === "auth/wrong-password") {
      errorMessage = "パスワードが正しくありません";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "メールアドレスの形式が正しくありません";
    } else if (error.code === "auth/too-many-requests") {
      errorMessage =
        "ログイン試行回数が多すぎます。しばらく待ってから再試行してください";
    }

    showToast(errorMessage, "error", "ログインエラー");
  }
}

// プロンプト生成
function generatePrompt(bookId) {
  const book = booksData.find((b) => b.id === bookId);
  if (!book) return;

  const prompt = `以下は私が読んだ本「${book.title}」（著者: ${
    book.author
  }）についての記録です。

【概要】
${book.description}

【私のレビュー】
${book.review}

【学んだこと・インサイト】
${book.insights}

【キーワード】
${book.keywords.join(", ")}

この本の内容を踏まえて、私の仕事や人生にどのように活かせるか、具体的なアクションプランを提案してください。`;

  document.getElementById("prompt-text").value = prompt;
  document.getElementById("prompt-modal").style.display = "flex";
}

function closePromptModal() {
  document.getElementById("prompt-modal").style.display = "none";
}

async function copyPromptText() {
  const promptText = document.getElementById("prompt-text");

  try {
    await navigator.clipboard.writeText(promptText.value);
    closePromptModal();
    showCopySuccessModal();
  } catch (error) {
    console.error("コピーに失敗しました:", error);
    // フォールバック: 古い方法を試す
    promptText.select();
    try {
      document.execCommand("copy");
      closePromptModal();
      showCopySuccessModal();
    } catch (fallbackError) {
      showToast("コピーに失敗しました。手動でコピーしてください。", "error");
    }
  }
}

function showCopySuccessModal() {
  document.getElementById("copy-success-modal").style.display = "flex";
  setTimeout(() => {
    closeCopySuccessModal();
  }, 3000);
}

function closeCopySuccessModal() {
  document.getElementById("copy-success-modal").style.display = "none";
}

// 検索・フィルター
function filterBooks() {
  const searchTerm =
    document.getElementById("search-input")?.value.toLowerCase() || "";
  const selectedAuthor = document.getElementById("author-filter")?.value || "";

  let filteredBooks = booksData;

  if (searchTerm) {
    filteredBooks = filteredBooks.filter(
      (book) =>
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm) ||
        book.description.toLowerCase().includes(searchTerm)
    );
  }

  if (selectedAuthor) {
    filteredBooks = filteredBooks.filter(
      (book) => book.author === selectedAuthor
    );
  }

  renderBookList(filteredBooks);
}

function updateAuthorFilter() {
  const authorFilter = document.getElementById("author-filter");
  if (!authorFilter) return;

  const authors = [...new Set(booksData.map((book) => book.author))];
  const currentValue = authorFilter.value;

  authorFilter.innerHTML = '<option value="">すべての著者</option>';
  authors.forEach((author) => {
    const option = document.createElement("option");
    option.value = author;
    option.textContent = author;
    authorFilter.appendChild(option);
  });

  authorFilter.value = currentValue;
}

// 編集画面（履歴に追加）
function showEditScreen(bookId = null) {
  showEditScreenWithoutHistory(bookId);
  // 履歴に追加
  const state = { screen: "edit" };
  if (bookId) {
    state.bookId = bookId;
  }
  window.history.pushState(state, "", "");
}

// 編集画面（履歴に追加しない）
function showEditScreenWithoutHistory(bookId = null) {
  const book = bookId ? booksData.find((b) => b.id === bookId) : null;
  const editContainer = document.getElementById("book-edit-content");
  if (!editContainer) return;

  // 引用データの整形
  const quotesHtml = (book?.quotes || [])
    .map(
      (quote, index) => `
        <div class="edit-quote-item" data-quote-id="${index}">
            <h4>引用 ${index + 1}</h4>
            <label>引用タイトル</label>
            <input type="text" class="edit-input quote-title" value="${escapeHtml(
              quote.title || ""
            )}" placeholder="例：新規事業における「適応課題」">
            <label>引用内容</label>
            <textarea class="edit-textarea quote-content" rows="4">${escapeHtml(
              quote.content || ""
            )}</textarea>
            <label>ページ番号</label>
            <input type="text" class="edit-input quote-page" value="${escapeHtml(
              quote.pageNumber || ""
            )}" placeholder="例：77-79">
            <button type="button" class="delete-button" onclick="removeQuote(${index})">この引用を削除</button>
        </div>
    `
    )
    .join("");

  // 考察データの整形
  const reflectionsHtml = (book?.reflections || [])
    .map(
      (reflection, index) => `
        <div class="edit-reflection-item" data-reflection-id="${index}">
            <h4>考察 ${index + 1}</h4>
            <label>考察タイトル</label>
            <input type="text" class="edit-input reflection-title" value="${escapeHtml(
              reflection.title || ""
            )}" placeholder="例：前提条件を揃える努力">
            <label>考察内容</label>
            <textarea class="edit-textarea reflection-content" rows="4">${escapeHtml(
              reflection.content || ""
            )}</textarea>
            <button type="button" class="delete-button" onclick="removeReflection(${index})">この考察を削除</button>
        </div>
    `
    )
    .join("");

  editContainer.innerHTML = `
        <h2 style="font-size: var(--font-size-2xl); font-weight: 700; margin-bottom: var(--spacing-xl);">
            ${book ? "本を編集" : "新しい本を追加"}
        </h2>
        <form class="edit-form" onsubmit="return false;">
            <div>
                <label>タイトル <span style="color: #ff6b6b;">*</span></label>
                <input type="text" class="edit-input" id="edit-title" value="${
                  book ? escapeHtml(book.title) : ""
                }" required>
            </div>
            <div>
                <label>著者 <span style="color: #ff6b6b;">*</span></label>
                <input type="text" class="edit-input" id="edit-author" value="${
                  book ? escapeHtml(book.author) : ""
                }" required>
            </div>
            <div>
                <label>画像URL（Amazonなどの画像リンク）</label>
                <input type="url" class="edit-input" id="edit-imageUrl" value="${
                  book ? escapeHtml(book.imageUrl || "") : ""
                }" placeholder="https://m.media-amazon.com/images/I/...">
            </div>
            <div>
                <label>📖 導入（ご紹介） <span style="color: #ff6b6b;">*</span></label>
                <textarea class="edit-textarea" id="edit-introduction" rows="4" required>${
                  book
                    ? escapeHtml(book.introduction || book.description || "")
                    : ""
                }</textarea>
            </div>
            <div>
                <label>🟰 本の要約（核となる概念） <span style="color: #ff6b6b;">*</span></label>
                <textarea class="edit-textarea" id="edit-summary" rows="4" required>${
                  book ? escapeHtml(book.summary || book.description || "") : ""
                }</textarea>
            </div>

            <div style="margin-top: 2rem; padding: 1.5rem; background: var(--color-surface); border-radius: var(--radius-md);">
                <h3 style="margin-bottom: 1rem;">💬 引用（複数可）</h3>
                <div id="quotes-container">
                    ${
                      quotesHtml ||
                      '<p style="color: var(--color-text-secondary);">引用が追加されていません</p>'
                    }
                </div>
                <button type="button" class="admin-button" onclick="addQuote()" style="margin-top: 1rem;">+ 引用を追加</button>
            </div>

            <div style="margin-top: 2rem; padding: 1.5rem; background: var(--color-surface); border-radius: var(--radius-md);">
                <h3 style="margin-bottom: 1rem;">💡 上司の考察（複数可）</h3>
                <div id="reflections-container">
                    ${
                      reflectionsHtml ||
                      '<p style="color: var(--color-text-secondary);">考察が追加されていません</p>'
                    }
                </div>
                <button type="button" class="admin-button" onclick="addReflection()" style="margin-top: 1rem;">+ 考察を追加</button>
            </div>

            <div>
                <label>🏷️ キーワード（カンマ区切り） <span style="color: #ff6b6b;">*</span></label>
                <input type="text" class="edit-input" id="edit-keywords" value="${
                  book ? book.keywords.join(", ") : ""
                }" required placeholder="例：対話, 適応課題, イノベーション">
            </div>
            <div class="edit-actions">
                <button type="button" class="save-button" onclick="saveBook(${bookId})">
                    ${book ? "更新" : "追加"}
                </button>
                ${
                  book
                    ? '<button type="button" class="delete-button" onclick="deleteBook(' +
                      bookId +
                      ')">削除</button>'
                    : ""
                }
            </div>
        </form>
    `;

  showScreenWithoutHistory("edit");
}

// 引用を追加
function addQuote() {
  const container = document.getElementById("quotes-container");
  const existingQuotes = container.querySelectorAll(".edit-quote-item");
  const newIndex = existingQuotes.length;

  const newQuoteHtml = `
        <div class="edit-quote-item" data-quote-id="${newIndex}">
            <h4>引用 ${newIndex + 1}</h4>
            <label>引用タイトル</label>
            <input type="text" class="edit-input quote-title" placeholder="例：新規事業における「適応課題」">
            <label>引用内容</label>
            <textarea class="edit-textarea quote-content" rows="4"></textarea>
            <label>ページ番号</label>
            <input type="text" class="edit-input quote-page" placeholder="例：77-79">
            <button type="button" class="delete-button" onclick="removeQuote(${newIndex})">この引用を削除</button>
        </div>
    `;

  container.insertAdjacentHTML("beforeend", newQuoteHtml);
}

// 引用を削除
function removeQuote(index) {
  const quoteItem = document.querySelector(
    `.edit-quote-item[data-quote-id="${index}"]`
  );
  if (quoteItem) {
    quoteItem.remove();
  }
}

// 考察を追加
function addReflection() {
  const container = document.getElementById("reflections-container");
  const existingReflections = container.querySelectorAll(
    ".edit-reflection-item"
  );
  const newIndex = existingReflections.length;

  const newReflectionHtml = `
        <div class="edit-reflection-item" data-reflection-id="${newIndex}">
            <h4>考察 ${newIndex + 1}</h4>
            <label>考察タイトル</label>
            <input type="text" class="edit-input reflection-title" placeholder="例：前提条件を揃える努力">
            <label>考察内容</label>
            <textarea class="edit-textarea reflection-content" rows="4"></textarea>
            <button type="button" class="delete-button" onclick="removeReflection(${newIndex})">この考察を削除</button>
        </div>
    `;

  container.insertAdjacentHTML("beforeend", newReflectionHtml);
}

// 考察を削除
function removeReflection(index) {
  const reflectionItem = document.querySelector(
    `.edit-reflection-item[data-reflection-id="${index}"]`
  );
  if (reflectionItem) {
    reflectionItem.remove();
  }
}

async function saveBook(bookId) {
  try {
    const title = document.getElementById("edit-title").value.trim();
    const author = document.getElementById("edit-author").value.trim();
    const imageUrl = document.getElementById("edit-imageUrl").value.trim();
    const introduction = document
      .getElementById("edit-introduction")
      .value.trim();
    const summary = document.getElementById("edit-summary").value.trim();
    const keywords = document
      .getElementById("edit-keywords")
      .value.split(",")
      .map((k) => k.trim())
      .filter((k) => k);

    // 引用データの収集
    const quotes = [];
    document.querySelectorAll(".edit-quote-item").forEach((item, index) => {
      const title = item.querySelector(".quote-title")?.value.trim();
      const content = item.querySelector(".quote-content")?.value.trim();
      const pageNumber = item.querySelector(".quote-page")?.value.trim();

      if (title && content) {
        quotes.push({
          id: index + 1,
          title,
          content,
          pageNumber: pageNumber || "",
        });
      }
    });

    // 考察データの収集
    const reflections = [];
    document
      .querySelectorAll(".edit-reflection-item")
      .forEach((item, index) => {
        const title = item.querySelector(".reflection-title")?.value.trim();
        const content = item.querySelector(".reflection-content")?.value.trim();

        if (title && content) {
          reflections.push({
            id: index + 1,
            title,
            content,
          });
        }
      });

    if (
      !title ||
      !author ||
      !introduction ||
      !summary ||
      keywords.length === 0
    ) {
      showToast(
        "タイトル、著者、導入、本の要約、キーワードは必須項目です",
        "warning",
        "入力エラー"
      );
      return;
    }

    const bookData = {
      title,
      author,
      imageUrl: imageUrl || "",
      introduction,
      summary,
      quotes,
      reflections,
      keywords,
    };

    const db = window.firebaseDb;
    const { collection, doc, addDoc, setDoc, updateDoc, getDoc } =
      window.firestore;

    if (bookId) {
      // 更新 - bookIdがFirestoreのドキュメントIDかローカルのIDかを確認
      // まずローカルのbooksDataからfirestoreIdを取得
      const localBook = booksData.find((b) => b.id === bookId);
      const firestoreId = localBook?.firestoreId || bookId.toString();

      const bookRef = doc(db, "books", firestoreId);

      // ドキュメントが存在するか確認
      const docSnap = await getDoc(bookRef);

      if (docSnap.exists()) {
        // ドキュメントが存在する場合は更新
        await updateDoc(bookRef, bookData);
      } else {
        // ドキュメントが存在しない場合は新規作成（setDocでmerge: true）
        await setDoc(bookRef, bookData, { merge: true });
      }

      // ローカルのbooksDataも更新
      const index = booksData.findIndex((b) => b.id === bookId);
      if (index !== -1) {
        booksData[index] = {
          ...booksData[index],
          firestoreId: firestoreId,
          ...bookData,
        };
      }

      showToast("本の情報を保存しました", "success");
    } else {
      // 新規追加
      const docRef = await addDoc(collection(db, "books"), bookData);
      const firestoreId = docRef.id;

      // ローカルのbooksDataにも追加
      const newId = Math.max(...booksData.map((b) => b.id), 0) + 1;
      booksData.push({
        id: newId,
        firestoreId: firestoreId,
        ...bookData,
      });

      showToast("新しい本を追加しました", "success");
    }

    // Firestoreからデータを再読み込み
    await loadBooksFromFirestore();
    showScreen("list");
  } catch (error) {
    console.error("保存エラー:", error);
    showToast("保存に失敗しました: " + error.message, "error", "保存エラー");
  }
}

async function deleteBook(bookId) {
  if (!confirm("本当に削除しますか？")) {
    return;
  }

  try {
    const db = window.firebaseDb;
    const { doc, deleteDoc } = window.firestore;

    // ローカルのbooksDataからfirestoreIdを取得
    const localBook = booksData.find((b) => b.id === bookId);
    const firestoreId = localBook?.firestoreId || bookId.toString();

    const bookRef = doc(db, "books", firestoreId);
    await deleteDoc(bookRef);

    // ローカルのbooksDataからも削除
    const index = booksData.findIndex((b) => b.id === bookId);
    if (index !== -1) {
      booksData.splice(index, 1);
    }

    showToast("本を削除しました", "success");
    // Firestoreからデータを再読み込み
    await loadBooksFromFirestore();
    showScreen("list");
  } catch (error) {
    console.error("削除エラー:", error);
    showToast("削除に失敗しました: " + error.message, "error", "削除エラー");
  }
}

// ユーティリティ関数
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function announceToScreenReader(message) {
  const statusElement = document.getElementById("status-message");
  if (statusElement) {
    statusElement.textContent = message;
    setTimeout(() => {
      statusElement.textContent = "";
    }, 1000);
  }
}

// ローディング表示
function showLoading(message = "読み込み中...") {
  const loadingEl = document.getElementById("loading-indicator");
  const textEl = loadingEl.querySelector(".loading-text");
  if (textEl) {
    textEl.textContent = message;
  }
  loadingEl.style.display = "flex";
}

function hideLoading() {
  const loadingEl = document.getElementById("loading-indicator");
  loadingEl.style.display = "none";
}

// トースト通知
function showToast(message, type = "info", title = "", duration = 4000) {
  const container = document.getElementById("toast-container");
  const toastId = `toast-${Date.now()}`;

  // アイコンの選択
  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  // タイトルのデフォルト値
  const titles = {
    success: "成功",
    error: "エラー",
    warning: "警告",
    info: "お知らせ",
  };

  const toastTitle = title || titles[type] || titles.info;
  const toastIcon = icons[type] || icons.info;

  // トースト要素を作成
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.id = toastId;
  toast.setAttribute("role", "alert");
  toast.innerHTML = `
        <span class="toast-icon">${toastIcon}</span>
        <div class="toast-content">
            <h3 class="toast-title">${escapeHtml(toastTitle)}</h3>
            <p class="toast-message">${escapeHtml(message)}</p>
        </div>
        <button class="toast-close" onclick="removeToast('${toastId}')" aria-label="通知を閉じる">
            <span aria-hidden="true">×</span>
        </button>
    `;

  container.appendChild(toast);

  // 自動削除
  if (duration > 0) {
    setTimeout(() => {
      removeToast(toastId);
    }, duration);
  }
}

function removeToast(toastId) {
  const toast = document.getElementById(toastId);
  if (toast) {
    toast.classList.add("toast-exit");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }
}

// Dify inputs をGZIP圧縮 + Base64エンコード (embed.jsと同じ処理)
function encodeDifyInputs(inputs) {
    try {
        // JSON文字列に変換
        const jsonString = JSON.stringify(inputs);
        
        // GZIP圧縮
        const compressed = pako.gzip(jsonString);
        
        // Base64エンコード
        const base64 = btoa(String.fromCharCode.apply(null, compressed));
        
        // URLエンコード
        return encodeURIComponent(base64);
    } catch (error) {
        console.error('Failed to encode Dify inputs:', error);
        return null;
    }
}

// チャット機能
function openChat(bookId) {
    const book = booksData.find(b => b.id === bookId);
    if (!book) return;

    const iframe = document.getElementById('dify-chatbot-iframe');
    const modal = document.getElementById('chat-modal');
    
    // モーダル内のタイトルを設定
    const modalTitle = document.getElementById('chat-modal-book-title');
    if (modalTitle) {
        modalTitle.textContent = book.title;
    }

    // コンテンツの構築（コピー用に完全版を保持）
    const baseInfo = `【タイトル】${book.title}\n【著者】${book.author}\n`;
    const summaryText = `\n【要約】\n${book.summary || 'なし'}`;
    const introText = `\n\n【導入・紹介】\n${book.introduction || book.description || 'なし'}`;
    
    const limitedQuotes = (book.quotes || []).slice(0, 3);
    const limitedReflections = (book.reflections || []).slice(0, 3);
    const quotesText = limitedQuotes.length > 0 ? `\n\n【引用(一部)】\n` + limitedQuotes.map(q => `・${q.title}\n  "${q.content}"`).join('\n') : '';
    const reflectionsText = limitedReflections.length > 0 ? `\n\n【考察(一部)】\n` + limitedReflections.map(r => `・${r.title}\n  ${r.content}`).join('\n') : '';
    const keywordsText = (book.keywords && book.keywords.length > 0) ? `\n\n【キーワード】\n${book.keywords.join(', ')}` : '';

    const fullContentForCopy = baseInfo + summaryText + introText + quotesText + reflectionsText + keywordsText;

    // Dify用のコンテンツ（簡潔版 - 要約と導入のみ）
    const difyContent = `${book.summary || ''}\n\n${book.introduction || book.description || ''}`.trim();

    // Difyに渡す変数
    const inputs = {
        book_title: book.title,
        book_author: book.author,
        book_content: difyContent
    };
    
    // inputs をGZIP圧縮 + Base64エンコード
    const encodedInputs = encodeDifyInputs(inputs);
    
    // DifyチャットボットのURL
    let difyUrl = 'https://udify.app/chatbot/7K7Ymm1N7MfjS6e1';
    
    if (encodedInputs) {
        // エンコード成功: URLにinputsパラメータを追加
        difyUrl += `?inputs=${encodedInputs}`;
        console.log('✅ Opening Dify chatbot with auto-filled book info:');
        console.log('  📖 Title:', book.title);
        console.log('  ✍️  Author:', book.author);
        console.log('  📝 Content preview:', difyContent.substring(0, 50) + '...');
        console.log('  🔗 Encoded URL length:', difyUrl.length);
    } else {
        // エンコード失敗: 通常のURLを使用
        console.warn('⚠️ Failed to encode inputs. Opening Dify without pre-filled data.');
        console.log('💡 Use "本の情報をコピー" button to share book info with the chatbot.');
    }

    // iframeにURLを設定
    iframe.src = difyUrl;
    
    // コピーボタンにデータを紐付け（フォールバック用）
    const copyBtn = document.getElementById('chat-copy-info-btn');
    if (copyBtn) {
        const originalText = '<span aria-hidden="true">📋</span> 本の情報をコピー';
        copyBtn.innerHTML = originalText;
        copyBtn.classList.remove('copied');
        
        copyBtn.onclick = () => {
            copyBookInfo(book, fullContentForCopy);
            
            copyBtn.innerHTML = '<span aria-hidden="true">✓</span> コピーしました';
            copyBtn.classList.add('copied');
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.classList.remove('copied');
            }, 2000);
        };
    }
    
    modal.style.display = 'flex';
}

function closeChatModal() {
    const modal = document.getElementById('chat-modal');
    const iframe = document.getElementById('dify-chatbot-iframe');
    
    modal.style.display = 'none';
    
    // iframeをリセット（次回開くときに再読み込み）
    iframe.src = '';
}

// 本の情報をクリップボードにコピー（バックアップ用）
async function copyBookInfo(book, fullContent) {
    const textToCopy = `書籍名: ${book.title}\n著者: ${book.author}\n\n${fullContent}`;
    
    try {
        await navigator.clipboard.writeText(textToCopy);
        showToast("本の情報をコピーしました。チャットに貼り付けてください。", "success");
    } catch (error) {
        console.error("コピー失敗:", error);
        showToast("コピーに失敗しました", "error");
    }
}
