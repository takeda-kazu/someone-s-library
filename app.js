// アプリケーション状態管理
let currentMode = 'normal'; // 'normal' or 'admin'
let currentScreen = 'list'; // 'list', 'detail', 'edit'
let currentBookId = null;
let isAuthenticated = false;

// DOM読み込み後に実行
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized');
    initializeApp();
});

// アプリケーション初期化
function initializeApp() {
    setupEventListeners();
    renderBookList();
}

// イベントリスナー設定
function setupEventListeners() {
    // モード切り替え
    document.getElementById('admin-mode-btn')?.addEventListener('click', showAuthModal);
    document.getElementById('normal-mode-btn')?.addEventListener('click', switchToNormalMode);
    
    // 認証モーダル
    document.getElementById('close-auth-modal-x')?.addEventListener('click', closeAuthModal);
    document.getElementById('close-auth-modal-btn')?.addEventListener('click', closeAuthModal);
    document.getElementById('auth-login-btn')?.addEventListener('click', handleLogin);
    
    // 画面遷移
    document.getElementById('back-btn')?.addEventListener('click', () => showScreen('list'));
    document.getElementById('back-edit-btn')?.addEventListener('click', () => showScreen('list'));
    
    // 検索・フィルター
    document.getElementById('search-input')?.addEventListener('input', filterBooks);
    document.getElementById('author-filter')?.addEventListener('change', filterBooks);
    document.getElementById('add-book-btn')?.addEventListener('click', () => showEditScreen());
    
    // モーダルクローズ
    document.getElementById('close-modal-x')?.addEventListener('click', closePromptModal);
    document.getElementById('close-modal-btn')?.addEventListener('click', closePromptModal);
    document.getElementById('copy-btn')?.addEventListener('click', copyPromptText);
    
    document.getElementById('close-copy-success-x')?.addEventListener('click', closeCopySuccessModal);
    document.getElementById('close-copy-success-btn')?.addEventListener('click', closeCopySuccessModal);
}

// 書籍リスト表示
function renderBookList(books = booksData) {
    const bookListContainer = document.getElementById('book-list');
    if (!bookListContainer) return;
    
    bookListContainer.innerHTML = '';
    
    if (books.length === 0) {
        bookListContainer.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); margin-top: 3rem;">該当する本が見つかりませんでした</p>';
        return;
    }
    
    books.forEach(book => {
        const bookCard = createBookCard(book);
        bookListContainer.appendChild(bookCard);
    });
    
    // 著者フィルター更新
    updateAuthorFilter();
}

// 書籍カード作成
function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';
    card.setAttribute('role', 'listitem');
    card.onclick = () => showBookDetail(book.id);
    
    const stars = '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating);
    
    card.innerHTML = `
        <h3 class="book-title">${escapeHtml(book.title)}</h3>
        <p class="book-author">${escapeHtml(book.author)}</p>
        <div class="book-rating" aria-label="評価: ${book.rating}つ星">
            ${stars.split('').map(star => `<span class="star">${star}</span>`).join('')}
        </div>
        <p class="book-description">${escapeHtml(book.description)}</p>
    `;
    
    return card;
}

// 書籍詳細表示
function showBookDetail(bookId) {
    const book = booksData.find(b => b.id === bookId);
    if (!book) return;
    
    currentBookId = bookId;
    const detailContainer = document.getElementById('book-detail-content');
    if (!detailContainer) return;
    
    const stars = '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating);
    
    detailContainer.innerHTML = `
        <h2 class="detail-title">${escapeHtml(book.title)}</h2>
        <p class="detail-author">${escapeHtml(book.author)}</p>
        
        <div class="book-rating" style="margin-bottom: 2rem;" aria-label="評価: ${book.rating}つ星">
            ${stars.split('').map(star => `<span class="star">${star}</span>`).join('')}
        </div>
        
        <div class="detail-section">
            <h3>概要</h3>
            <p>${escapeHtml(book.description)}</p>
        </div>
        
        <div class="detail-section">
            <h3>レビュー</h3>
            <p>${escapeHtml(book.review)}</p>
        </div>
        
        <div class="detail-section">
            <h3>学んだこと・インサイト</h3>
            <p>${escapeHtml(book.insights)}</p>
        </div>
        
        <div class="detail-section">
            <h3>キーワード</h3>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                ${book.keywords.map(keyword => 
                    `<span style="padding: 0.25rem 0.75rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-full); font-size: 0.875rem;">${escapeHtml(keyword)}</span>`
                ).join('')}
            </div>
        </div>
        
        ${currentMode === 'admin' ? `
            <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                <button onclick="showEditScreen(${bookId})" class="admin-button" style="flex: 1;">編集</button>
                <button onclick="generatePrompt(${bookId})" class="copy-button" style="flex: 1;">プロンプト生成</button>
            </div>
        ` : `
            <div style="margin-top: 2rem;">
                <button onclick="generatePrompt(${bookId})" class="copy-button" style="width: 100%;">プロンプト生成</button>
            </div>
        `}
    `;
    
    showScreen('detail');
}

// 画面切り替え
function showScreen(screenName) {
    document.getElementById('screen-list').style.display = 'none';
    document.getElementById('screen-detail').style.display = 'none';
    document.getElementById('screen-edit').style.display = 'none';
    
    document.getElementById(`screen-${screenName}`).style.display = 'block';
    currentScreen = screenName;
    
    announceToScreenReader(`${screenName === 'list' ? '一覧' : screenName === 'detail' ? '詳細' : '編集'}画面に移動しました`);
}

// 管理モード切り替え
function switchToAdminMode() {
    currentMode = 'admin';
    isAuthenticated = true;
    document.getElementById('admin-mode-btn').style.display = 'none';
    document.getElementById('normal-mode-btn').style.display = 'inline-block';
    document.getElementById('search-controls').style.display = 'flex';
    announceToScreenReader('管理モードに切り替わりました');
    renderBookList();
}

function switchToNormalMode() {
    currentMode = 'normal';
    isAuthenticated = false;
    document.getElementById('admin-mode-btn').style.display = 'inline-block';
    document.getElementById('normal-mode-btn').style.display = 'none';
    document.getElementById('search-controls').style.display = 'none';
    announceToScreenReader('通常モードに切り替わりました');
    showScreen('list');
}

// 認証モーダル
function showAuthModal() {
    document.getElementById('auth-modal').style.display = 'flex';
    setTimeout(() => document.getElementById('auth-email')?.focus(), 100);
}

function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-password').value = '';
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    // デモ用の簡易認証（実際はFirebase Authを使用）
    if (email && password) {
        closeAuthModal();
        switchToAdminMode();
    } else {
        alert('メールアドレスとパスワードを入力してください');
    }
}

// プロンプト生成
function generatePrompt(bookId) {
    const book = booksData.find(b => b.id === bookId);
    if (!book) return;
    
    const prompt = `以下は私が読んだ本「${book.title}」（著者: ${book.author}）についての記録です。

【概要】
${book.description}

【私のレビュー】
${book.review}

【学んだこと・インサイト】
${book.insights}

【キーワード】
${book.keywords.join(', ')}

この本の内容を踏まえて、私の仕事や人生にどのように活かせるか、具体的なアクションプランを提案してください。`;

    document.getElementById('prompt-text').value = prompt;
    document.getElementById('prompt-modal').style.display = 'flex';
}

function closePromptModal() {
    document.getElementById('prompt-modal').style.display = 'none';
}

function copyPromptText() {
    const promptText = document.getElementById('prompt-text');
    promptText.select();
    document.execCommand('copy');
    
    closePromptModal();
    showCopySuccessModal();
}

function showCopySuccessModal() {
    document.getElementById('copy-success-modal').style.display = 'flex';
    setTimeout(() => {
        closeCopySuccessModal();
    }, 3000);
}

function closeCopySuccessModal() {
    document.getElementById('copy-success-modal').style.display = 'none';
}

// 検索・フィルター
function filterBooks() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const selectedAuthor = document.getElementById('author-filter')?.value || '';
    
    let filteredBooks = booksData;
    
    if (searchTerm) {
        filteredBooks = filteredBooks.filter(book =>
            book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm) ||
            book.description.toLowerCase().includes(searchTerm)
        );
    }
    
    if (selectedAuthor) {
        filteredBooks = filteredBooks.filter(book => book.author === selectedAuthor);
    }
    
    renderBookList(filteredBooks);
}

function updateAuthorFilter() {
    const authorFilter = document.getElementById('author-filter');
    if (!authorFilter) return;
    
    const authors = [...new Set(booksData.map(book => book.author))];
    const currentValue = authorFilter.value;
    
    authorFilter.innerHTML = '<option value="">すべての著者</option>';
    authors.forEach(author => {
        const option = document.createElement('option');
        option.value = author;
        option.textContent = author;
        authorFilter.appendChild(option);
    });
    
    authorFilter.value = currentValue;
}

// 編集画面
function showEditScreen(bookId = null) {
    const book = bookId ? booksData.find(b => b.id === bookId) : null;
    const editContainer = document.getElementById('book-edit-content');
    if (!editContainer) return;
    
    editContainer.innerHTML = `
        <h2 style="font-size: var(--font-size-2xl); font-weight: 700; margin-bottom: var(--spacing-xl);">
            ${book ? '本を編集' : '新しい本を追加'}
        </h2>
        <form class="edit-form" onsubmit="return false;">
            <div>
                <label>タイトル</label>
                <input type="text" class="edit-input" id="edit-title" value="${book ? escapeHtml(book.title) : ''}" required>
            </div>
            <div>
                <label>著者</label>
                <input type="text" class="edit-input" id="edit-author" value="${book ? escapeHtml(book.author) : ''}" required>
            </div>
            <div>
                <label>評価（1-5）</label>
                <input type="number" class="edit-input" id="edit-rating" min="1" max="5" value="${book ? book.rating : 5}" required>
            </div>
            <div>
                <label>概要</label>
                <textarea class="edit-textarea" id="edit-description" required>${book ? escapeHtml(book.description) : ''}</textarea>
            </div>
            <div>
                <label>レビュー</label>
                <textarea class="edit-textarea" id="edit-review" required>${book ? escapeHtml(book.review) : ''}</textarea>
            </div>
            <div>
                <label>学んだこと・インサイト</label>
                <textarea class="edit-textarea" id="edit-insights" required>${book ? escapeHtml(book.insights) : ''}</textarea>
            </div>
            <div>
                <label>キーワード（カンマ区切り）</label>
                <input type="text" class="edit-input" id="edit-keywords" value="${book ? book.keywords.join(', ') : ''}" required>
            </div>
            <div class="edit-actions">
                <button type="button" class="save-button" onclick="saveBook(${bookId})">
                    ${book ? '更新' : '追加'}
                </button>
                ${book ? '<button type="button" class="delete-button" onclick="deleteBook(' + bookId + ')">削除</button>' : ''}
            </div>
        </form>
    `;
    
    showScreen('edit');
}

function saveBook(bookId) {
    // 実際はFirestoreに保存
    alert('保存機能は実装中です（Firebaseとの連携が必要）');
    showScreen('list');
}

function deleteBook(bookId) {
    if (confirm('本当に削除しますか？')) {
        // 実際はFirestoreから削除
        alert('削除機能は実装中です（Firebaseとの連携が必要）');
        showScreen('list');
    }
}

// ユーティリティ関数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function announceToScreenReader(message) {
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
        statusElement.textContent = message;
        setTimeout(() => {
            statusElement.textContent = '';
        }, 1000);
    }
}

