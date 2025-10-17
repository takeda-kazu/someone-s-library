// グローバル変数
let currentScreen = 'list';  // 現在の画面（'list', 'detail', 'edit'）
let selectedBookId = null;   // 選択中の本のID
let isAdminMode = false;     // 管理モードかどうか
let currentUser = null;      // 現在のユーザー
let firebaseBooksData = [];  // 本のデータ（Firebaseから取得）

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('[app] library_watch started');
    
    // Firebase初期化を待つ
    waitForFirebase().then(async () => {
        // 認証状態の監視
        setupAuthStateListener();
        
        // Firebaseから本の一覧を読み込み
        await loadBooksFromFirebase();
        
        // データが空の場合は初期データを移行
        if (firebaseBooksData.length === 0 && window.booksData && window.booksData.length > 0) {
            console.log('[migration] migrating initial data to Firebase');
            await migrateInitialDataToFirebase();
        }
        
        // window.booksDataのIDを数値型に統一
        if (window.booksData && window.booksData.length > 0) {
            window.booksData.forEach((book, index) => {
                if (typeof book.id === 'string') {
                    book.id = parseInt(book.id) || (index + 1);
                } else if (book.id === undefined || book.id === null) {
                    book.id = index + 1;
                }
            });
            console.log('[data] normalized book IDs');
        }
        
        // 本の一覧を表示
        displayBookList();
        
        // イベントリスナーの設定
        setupEventListeners();
        
        console.log('[app] initialization complete');
    });
});

// Firebase初期化を待つ関数
async function waitForFirebase() {
    return new Promise((resolve) => {
        const checkFirebase = () => {
            if (window.firebaseAuth && window.firebaseDb) {
                resolve();
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        checkFirebase();
    });
}

// 認証状態の監視を設定
function setupAuthStateListener() {
    import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js').then(({ onAuthStateChanged }) => {
        onAuthStateChanged(window.firebaseAuth, (user) => {
            currentUser = user;
            console.log('[auth] user state changed:', user ? 'logged in' : 'logged out');
            
            // 管理モードの表示を更新
            updateAdminModeDisplay();
        });
    });
}

// イベントリスナーを設定
function setupEventListeners() {
    // 戻るボタン
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            console.log('[click] back button');
            showScreen('list');
        });
    }
    
    // 編集画面の戻るボタン
    const backEditBtn = document.getElementById('back-edit-btn');
    if (backEditBtn) {
        backEditBtn.addEventListener('click', function() {
            console.log('[click] back edit button');
            showScreen('list');
        });
    }
    
    // 管理モードボタン
    const adminModeBtn = document.getElementById('admin-mode-btn');
    if (adminModeBtn) {
        adminModeBtn.addEventListener('click', function() {
            console.log('[click] admin mode button');
            showAuthModal();
        });
    }
    
    // 通常モードボタン
    const normalModeBtn = document.getElementById('normal-mode-btn');
    if (normalModeBtn) {
        normalModeBtn.addEventListener('click', function() {
            console.log('[click] normal mode button');
            exitAdminMode();
        });
    }
    
    // 認証モーダル
    setupAuthModalEventListeners();
    
    // 検索・フィルター機能
    setupSearchEventListeners();
    
    // 既存のモーダル
    setupModalEventListeners();
    setupCopySuccessModalEventListeners();
}

// 本の一覧をカード形式で表示する関数
function displayBookList() {
    // book-listコンテナを取得
    const bookListContainer = document.getElementById('book-list');
    
    if (!bookListContainer) {
        console.error('[error] book-list container not found');
        return;
    }
    
    // 既存のコンテンツをクリア
    bookListContainer.innerHTML = '';
    
    // データが空の場合は初期データを表示
    const dataToDisplay = window.booksData || [];
    
    // 各本のカードを作成
    dataToDisplay.forEach(book => {
        const card = createBookCard(book);
        bookListContainer.appendChild(card);
    });
    
    console.log('[data] displayed', dataToDisplay.length, 'books');
}

// 本のカードを作成する関数
function createBookCard(book) {
    // カードのdiv要素を作成
    const card = document.createElement('div');
    card.className = 'book-card';
    card.dataset.bookId = book.id;

    // 管理モードの場合は編集・削除ボタンを追加
    let adminButtons = '';
    if (isAdminMode && currentUser) {
        card.classList.add('admin-mode');
        adminButtons = `
            <div class="book-card-actions">
                <button class="book-action-btn edit" data-book-id="${book.id}">編集</button>
                <button class="book-action-btn delete" data-book-id="${book.id}">削除</button>
            </div>
        `;
    }

    // 表紙画像の表示
    let coverImageHTML = '';
    if (book.coverImageUrl && book.coverImageUrl.trim() !== '') {
        coverImageHTML = `<img src="${book.coverImageUrl}" alt="${book.title}" class="book-cover-image" onerror="this.parentElement.querySelector('.no-cover-placeholder').style.display='flex'; this.style.display='none';">`;
    }

    // 画像なしの場合のプレースホルダー
    const placeholderStyle = (book.coverImageUrl && book.coverImageUrl.trim() !== '') ? 'style="display: none;"' : '';

    // カードの内容を設定（本屋さん風レイアウト）
    card.innerHTML = `
        <div class="book-cover">
            ${coverImageHTML}
            <div class="no-cover-placeholder" ${placeholderStyle}>
                <span class="book-icon">📚</span>
                <span class="no-image-text">画像なし</span>
            </div>
        </div>
        <div class="book-info">
            <h3 class="book-title" id="book-title-${book.id}">${book.title}</h3>
            <p class="book-author" id="book-author-${book.id}">${book.author}</p>
        </div>
        ${adminButtons}
    `;

    // カードクリック時のイベントリスナー
    card.addEventListener('click', function(e) {
        // 管理ボタンのクリックでない場合のみ詳細画面に遷移
        if (!e.target.classList.contains('book-action-btn')) {
            console.log('[click] book card, bookId:', book.id);
            selectedBookId = book.id;
            showBookDetail(book.id);
        }
    });

    // 管理ボタンのイベントリスナー
    if (isAdminMode && currentUser) {
        const editBtn = card.querySelector('.edit');
        const deleteBtn = card.querySelector('.delete');

        if (editBtn) {
            editBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                console.log('[click] edit button, bookId:', book.id);
                editBook(book.id);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                console.log('[click] delete button, bookId:', book.id);
                deleteBook(book.id);
            });
        }
    }

    return card;
}

// 画面を切り替える関数
function showScreen(screenName) {
    const listScreen = document.getElementById('screen-list');
    const detailScreen = document.getElementById('screen-detail');
    const editScreen = document.getElementById('screen-edit');
    
    if (screenName === 'list') {
        listScreen.style.display = 'block';
        detailScreen.style.display = 'none';
        if (editScreen) editScreen.style.display = 'none';
        currentScreen = 'list';
        console.log('[nav] show screen: list');
    } else if (screenName === 'detail') {
        listScreen.style.display = 'none';
        detailScreen.style.display = 'block';
        if (editScreen) editScreen.style.display = 'none';
        currentScreen = 'detail';
        console.log('[nav] show screen: detail, bookId:', selectedBookId);
    } else if (screenName === 'edit') {
        listScreen.style.display = 'none';
        detailScreen.style.display = 'none';
        if (editScreen) editScreen.style.display = 'block';
        currentScreen = 'edit';
        console.log('[nav] show screen: edit');
    }
}

// 本の詳細を表示する関数
function showBookDetail(bookId) {
    // 本のデータを取得
    const currentData = firebaseBooksData.length > 0 ? firebaseBooksData : window.booksData || [];
    const book = currentData.find(b => b.id === bookId);
    
    if (!book) {
        console.error('[error] book not found, bookId:', bookId);
        return;
    }
    
    // 詳細コンテンツを取得
    const detailContent = document.getElementById('book-detail-content');
    
    if (!detailContent) {
        console.error('[error] book-detail-content not found');
        return;
    }
    
    // 引用セクションのHTMLを生成
    let quotesHTML = '';
    if (book.quotes && book.quotes.length > 0) {
        quotesHTML = book.quotes.map((quote, index) => `
            <div class="quote-section">
                <h4 class="quote-header">【引用${index + 1}】${quote.source}</h4>
                <div class="quote-text">「${quote.text}」</div>
                <div class="quote-comment">${quote.comment}</div>
            </div>
        `).join('');
    }
    
    // 表紙画像の表示
    let coverImageHTML = '';
    if (book.coverImageUrl && book.coverImageUrl.trim() !== '') {
        coverImageHTML = `
            <div class="detail-cover-image">
                <img src="${book.coverImageUrl}" alt="${book.title}" onerror="this.parentElement.innerHTML='<div class=\\'no-cover-placeholder\\'><span class=\\'book-icon\\'>📚</span><span class=\\'no-image-text\\'>画像なし</span></div>'">
            </div>
        `;
    } else {
        coverImageHTML = `
            <div class="detail-cover-image">
                <div class="no-cover-placeholder">
                    <span class="book-icon">📚</span>
                    <span class="no-image-text">画像なし</span>
                </div>
            </div>
        `;
    }

    // 詳細画面の内容を設定
    detailContent.innerHTML = `
        ${coverImageHTML}
        <div class="book-detail-info">
            <h2 class="detail-title">${book.title}</h2>
            <p class="detail-author">著者: ${book.author}</p>
            <p class="detail-summary">あらすじ: ${book.summary}</p>
        </div>

        <div class="overall-review-section">
            <h3 class="section-title">全体の感想</h3>
            <div class="overall-review-content">${book.overallReview}</div>
        </div>

        ${quotesHTML}
    `;
    
    // 詳細画面に切り替え
    showScreen('detail');
}

// プロンプトを自動生成する関数
function generatePrompt(bookId) {
    // 本のデータを取得
    const currentData = window.booksData || [];
    // bookIdを数値に変換してから検索
    const numericBookId = parseInt(bookId);
    const book = currentData.find(b => b.id === numericBookId);
    
    console.log('[debug] generatePrompt called with bookId:', bookId, typeof bookId);
    console.log('[debug] converted to numericBookId:', numericBookId, typeof numericBookId);
    console.log('[debug] currentData length:', currentData.length);
    console.log('[debug] found book:', book);
    
    if (!book) {
        console.error('[error] book not found for prompt generation, bookId:', bookId);
        return '';
    }
    
    // 引用部分のテキストを生成
    let quotesText = '';
    if (book.quotes && book.quotes.length > 0) {
        quotesText = book.quotes.map((quote, index) => `
【引用${index + 1}】${quote.source}
【引用】
「${quote.text}」

【感想】
${quote.comment}
`).join('\n');
    }
    
    // プロンプトテンプレート
    const prompt = `あなたは企業の新規事業部管理職の立場で、社員と対話してください。

【人物像】
- 哲学・心理学・経営思想を横断的に読み解く知的で内省的なリーダー
- 誠実・謙虚で、常に本質を問い、人の成長を大切にする
- 「良心」「倫理」「社会的感情」をキーワードに、人間と組織の在り方を考える
- オーセンティック・リーダーシップを実践（支配ではなく支援・共感）
- 表面的な効率よりも深い理解と人格の成熟を重んじる

【本の情報】
タイトル: ${book.title}
著者: ${book.author}
あらすじ: ${book.summary}

【全体の感想】
${book.overallReview}

${quotesText}

【対話の前提】
- あなた（上司）がこの本を読み、上記の感想や引用をまとめました
- 社員があなたに質問してきています
- 社員は本を読んでいない、または読む前/読んだ後に質問しています
- あなたの役割は、自分の視点や気づきを共有し、社員の理解を深めることです

【対話指示】
- 最初のメッセージは必ず以下の形式で簡潔に始めてください：
  「『${book.title}』だね。じゃあ何から話しましょうか？」
- その後、社員からの質問や反応を待ってください
- 社員からの質問には、まず共感を示してから答えてください
- あなた（上司）が感じたこと、考えたことを率直に共有してください
- 上記の【全体の感想】と【引用】【感想】を参考にしながら、対話を深めてください
- 抽象的な概念は、あなた自身の経験や具体例で説明してください
- 必要に応じて、他の本や哲学者を引用して視野を広げてください
- 一方的に教えるのではなく、社員と一緒に考える姿勢を大切にしてください
- 温かみのある、やや硬めだが親しみやすい口調で話してください
- 表面的な答えではなく、深い理解と気づきを促すような対話を心がけてください
- 社員が気軽に質問できる雰囲気を作ってください`;
    
    console.log('[debug] generated prompt length:', prompt.length);
    console.log('[debug] prompt preview:', prompt.substring(0, 200) + '...');
    
    return prompt;
}

// モーダルを開く関数
function openModal(prompt) {
    const modal = document.getElementById('prompt-modal');
    const promptText = document.getElementById('prompt-text');
    
    if (!modal || !promptText) {
        console.error('[error] modal elements not found');
        return;
    }
    
    // プロンプトをテキストエリアに設定
    promptText.value = prompt;
    
    // モーダルを表示
    modal.style.display = 'flex';
    console.log('[modal] opened');
}

// モーダルを閉じる関数
function closeModal() {
    const modal = document.getElementById('prompt-modal');
    
    if (!modal) {
        console.error('[error] modal not found');
        return;
    }
    
    // モーダルを非表示
    modal.style.display = 'none';
    console.log('[modal] closed');
}

// モーダルのイベントリスナーを設定
function setupModalEventListeners() {
    // コピーボタン
    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            console.log('[click] copy button');
            copyPromptToClipboard();
        });
    }
    
    // 閉じるボタン
    const closeBtn = document.getElementById('close-modal-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            console.log('[click] close button');
            closeModal();
        });
    }
    
    // ×ボタン
    const closeX = document.getElementById('close-modal-x');
    if (closeX) {
        closeX.addEventListener('click', function() {
            console.log('[click] close x button');
            closeModal();
        });
    }
    
    // 背景クリックで閉じる
    const modal = document.getElementById('prompt-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            // モーダルの背景をクリックした場合のみ閉じる
            if (e.target === modal) {
                console.log('[click] modal overlay');
                closeModal();
            }
        });
    }
    
    // Escキーでモーダルを閉じる（キーボード操作対応）
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
            const modal = document.getElementById('prompt-modal');
            if (modal && modal.style.display === 'flex') {
                console.log('[keyboard] Esc key pressed');
                closeModal();
            }
        }
    });
}

// プロンプトをクリップボードにコピーする関数
function copyPromptToClipboard() {
    const promptText = document.getElementById('prompt-text');
    
    if (!promptText) {
        console.error('[error] prompt-text not found');
        return;
    }
    
    // クリップボードにコピー
    navigator.clipboard.writeText(promptText.value)
        .then(function() {
            console.log('[copy] success');
            
            // コピー成功のフィードバック表示
            const copyBtn = document.getElementById('copy-btn');
            if (copyBtn) {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '✅ コピーしました！';
                
                // 2秒後に元に戻す
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                }, 2000);
            }
            
            // 追加のモーダルを表示
            showCopySuccessModal();
        })
        .catch(function(err) {
            console.error('[copy] failed', err);
            alert('コピーに失敗しました。手動でコピーしてください。');
        });
}

// コピー成功モーダルを表示する関数
function showCopySuccessModal() {
    const modal = document.getElementById('copy-success-modal');
    
    if (!modal) {
        console.error('[error] copy-success-modal not found');
        return;
    }
    
    // モーダルを表示
    modal.style.display = 'flex';
    console.log('[modal] copy success modal opened');
}

// コピー成功モーダルを閉じる関数
function closeCopySuccessModal() {
    const modal = document.getElementById('copy-success-modal');
    
    if (!modal) {
        console.error('[error] copy-success-modal not found');
        return;
    }
    
    // モーダルを非表示
    modal.style.display = 'none';
    console.log('[modal] copy success modal closed');
}

// 認証モーダルのイベントリスナーを設定
function setupAuthModalEventListeners() {
    // ログインボタン
    const loginBtn = document.getElementById('auth-login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function() {
            console.log('[click] login button');
            handleLogin();
        });
    }
    
    // 閉じるボタン
    const closeBtn = document.getElementById('close-auth-modal-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            console.log('[click] close auth modal button');
            closeAuthModal();
        });
    }
    
    // ×ボタン
    const closeX = document.getElementById('close-auth-modal-x');
    if (closeX) {
        closeX.addEventListener('click', function() {
            console.log('[click] close auth modal x button');
            closeAuthModal();
        });
    }
    
    // Enterキーでログイン
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    
    if (emailInput && passwordInput) {
        [emailInput, passwordInput].forEach(input => {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleLogin();
                }
            });
        });
    }
}

// 認証モーダルを表示
function showAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.style.display = 'flex';
        console.log('[modal] auth modal opened');
    }
}

// 認証モーダルを閉じる
function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.style.display = 'none';
        console.log('[modal] auth modal closed');
    }
}

// ログイン処理
async function handleLogin() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    if (!email || !password) {
        alert('メールアドレスとパスワードを入力してください');
        return;
    }
    
    try {
        // Firebase AuthのsignInWithEmailAndPasswordをインポート
        const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js');
        
        // ログイン実行
        await signInWithEmailAndPassword(window.firebaseAuth, email, password);
        
        console.log('[auth] login successful');
        closeAuthModal();
        
        // 管理モードに切り替え
        isAdminMode = true;
        updateAdminModeDisplay();
        
        // 本の一覧を再表示（管理モード用）
        displayBookList();
        
    } catch (error) {
        console.error('[auth] login failed:', error);
        alert('ログインに失敗しました: ' + error.message);
    }
}

// 管理モードの表示を更新
function updateAdminModeDisplay() {
    const adminModeBtn = document.getElementById('admin-mode-btn');
    const normalModeBtn = document.getElementById('normal-mode-btn');
    const searchControls = document.getElementById('search-controls');
    
    if (currentUser && isAdminMode) {
        // 管理モード時
        if (adminModeBtn) adminModeBtn.style.display = 'none';
        if (normalModeBtn) normalModeBtn.style.display = 'block';
        if (searchControls) searchControls.style.display = 'flex';
    } else {
        // 通常モード時
        if (adminModeBtn) adminModeBtn.style.display = 'block';
        if (normalModeBtn) normalModeBtn.style.display = 'none';
        if (searchControls) searchControls.style.display = 'none';
        isAdminMode = false;
    }
}

// 管理モードを終了
async function exitAdminMode() {
    try {
        // Firebase AuthのsignOutをインポート
        const { signOut } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js');
        
        // ログアウト実行
        await signOut(window.firebaseAuth);
        
        console.log('[auth] logout successful');
        isAdminMode = false;
        updateAdminModeDisplay();
        
        // 本の一覧を再表示（通常モード用）
        displayBookList();
        
    } catch (error) {
        console.error('[auth] logout failed:', error);
    }
}

// 検索・フィルター機能のイベントリスナーを設定
function setupSearchEventListeners() {
    // 新規追加ボタン
    const addBookBtn = document.getElementById('add-book-btn');
    if (addBookBtn) {
        addBookBtn.addEventListener('click', function() {
            console.log('[click] add book button');
            showAddBookForm();
        });
    }
    
    // 検索入力
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            console.log('[search] input changed:', this.value);
            filterBooks();
        });
    }
    
    // 著者フィルター
    const authorFilter = document.getElementById('author-filter');
    if (authorFilter) {
        authorFilter.addEventListener('change', function() {
            console.log('[filter] author changed:', this.value);
            filterBooks();
        });
    }
}

// 本を検索・フィルターする関数
function filterBooks() {
    const searchInput = document.getElementById('search-input');
    const authorFilter = document.getElementById('author-filter');
    
    if (!searchInput || !authorFilter) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    const selectedAuthor = authorFilter.value;
    
    // 現在表示中の本を取得
    const currentData = firebaseBooksData.length > 0 ? firebaseBooksData : window.booksData || [];
    
    // フィルタリング
    const filteredBooks = currentData.filter(book => {
        // 検索条件
        const matchesSearch = searchTerm === '' || 
            book.title.toLowerCase().includes(searchTerm) ||
            book.author.toLowerCase().includes(searchTerm) ||
            book.summary.toLowerCase().includes(searchTerm) ||
            book.overallReview.toLowerCase().includes(searchTerm);
        
        // 著者フィルター
        const matchesAuthor = selectedAuthor === '' || book.author === selectedAuthor;
        
        return matchesSearch && matchesAuthor;
    });
    
    // フィルタリング結果を表示
    displayFilteredBooks(filteredBooks);
    
    // 著者フィルターのオプションを更新
    updateAuthorFilterOptions(currentData);
}

// フィルタリング結果を表示
function displayFilteredBooks(filteredBooks) {
    const bookListContainer = document.getElementById('book-list');
    
    if (!bookListContainer) {
        console.error('[error] book-list container not found');
        return;
    }
    
    // 既存のコンテンツをクリア
    bookListContainer.innerHTML = '';
    
    // フィルタリングされた本のカードを作成
    filteredBooks.forEach(book => {
        const card = createBookCard(book);
        bookListContainer.appendChild(card);
    });
    
    console.log('[filter] displayed', filteredBooks.length, 'filtered books');
}

// 著者フィルターのオプションを更新
function updateAuthorFilterOptions(books) {
    const authorFilter = document.getElementById('author-filter');
    if (!authorFilter) return;
    
    // 現在の選択値を保存
    const currentValue = authorFilter.value;
    
    // 著者リストを取得（重複を除く）
    const authors = [...new Set(books.map(book => book.author))].sort();
    
    // オプションを更新
    authorFilter.innerHTML = '<option value="">すべての著者</option>';
    authors.forEach(author => {
        const option = document.createElement('option');
        option.value = author;
        option.textContent = author;
        if (author === currentValue) {
            option.selected = true;
        }
        authorFilter.appendChild(option);
    });
}

// 本を追加するフォームを表示
function showAddBookForm() {
    console.log('[action] show add book form');
    showBookEditForm(null); // nullを渡すことで新規追加モード
}

// 本を編集するフォームを表示
function editBook(bookId) {
    console.log('[action] edit book:', bookId);
    
    // 本のデータを取得
    const currentData = firebaseBooksData.length > 0 ? firebaseBooksData : window.booksData || [];
    const book = currentData.find(b => b.id === bookId);
    
    if (!book) {
        console.error('[error] book not found:', bookId);
        return;
    }
    
    showBookEditForm(book);
}

// 本の編集フォームを表示
function showBookEditForm(book) {
    const isEditMode = book !== null;
    const formTitle = isEditMode ? '本を編集' : '新しい本を追加';
    
    const editContent = document.getElementById('book-edit-content');
    if (!editContent) return;
    
    // 引用文のHTMLを生成
    let quotesHTML = '';
    if (isEditMode && book.quotes) {
        quotesHTML = book.quotes.map((quote, index) => `
            <div class="quote-section">
                <h4>引用文 ${index + 1}</h4>
                <button type="button" class="remove-quote-btn" data-index="${index}">削除</button>
                <input type="text" name="quote-source-${index}" placeholder="出典" value="${quote.source || ''}" class="form-input">
                <textarea name="quote-text-${index}" placeholder="引用文" class="form-textarea">${quote.text || ''}</textarea>
                <textarea name="quote-comment-${index}" placeholder="コメント" class="form-textarea">${quote.comment || ''}</textarea>
            </div>
        `).join('');
    }
    
    // フォームのHTMLを生成
    editContent.innerHTML = `
        <div class="edit-form">
            <h2>${formTitle}</h2>

            <form id="book-form">
                <div class="form-section">
                    <h3>基本情報</h3>
                    <input type="text" name="title" placeholder="タイトル" value="${isEditMode ? book.title : ''}" class="form-input" required>
                    <input type="text" name="author" placeholder="著者" value="${isEditMode ? book.author : ''}" class="form-input" required>
                    <textarea name="summary" placeholder="あらすじ" class="form-textarea" required>${isEditMode ? book.summary : ''}</textarea>
                    <textarea name="overallReview" placeholder="全体の感想" class="form-textarea" required>${isEditMode ? book.overallReview : ''}</textarea>
                </div>

                <div class="form-section">
                    <h3>表紙画像</h3>
                    <input type="url" name="coverImageUrl" id="cover-image-url" placeholder="表紙画像URL (例: https://m.media-amazon.com/images/I/...)" value="${isEditMode && book.coverImageUrl ? book.coverImageUrl : ''}" class="form-input">
                    <div class="image-preview-container">
                        <div id="image-preview" class="image-preview">
                            ${isEditMode && book.coverImageUrl ? `<img src="${book.coverImageUrl}" alt="表紙プレビュー" onerror="this.parentElement.innerHTML='<div class=\\'image-error\\'>画像を読み込めません</div>'">` : '<div class="no-image-placeholder">📚<br>画像URLを入力すると<br>プレビューが表示されます</div>'}
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <h3>引用文</h3>
                    <div id="quotes-container">
                        ${quotesHTML}
                    </div>
                    <button type="button" id="add-quote-btn" class="add-quote-button">引用文を追加</button>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="save-button">保存</button>
                    <button type="button" id="cancel-edit-btn" class="cancel-button">キャンセル</button>
                </div>
            </form>
        </div>
    `;
    
    // 編集画面に切り替え
    showScreen('edit');
    
    // フォームのイベントリスナーを設定
    setupEditFormEventListeners(book);
}

// 編集フォームのイベントリスナーを設定
function setupEditFormEventListeners(book) {
    const isEditMode = book !== null;

    // フォーム送信
    const bookForm = document.getElementById('book-form');
    if (bookForm) {
        bookForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('[form] submit');
            handleSaveBook(book);
        });
    }

    // キャンセルボタン
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            console.log('[click] cancel edit button');
            showScreen('list');
        });
    }

    // 引用文追加ボタン
    const addQuoteBtn = document.getElementById('add-quote-btn');
    if (addQuoteBtn) {
        addQuoteBtn.addEventListener('click', function() {
            console.log('[click] add quote button');
            addQuoteField();
        });
    }

    // 引用文削除ボタン
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-quote-btn')) {
            console.log('[click] remove quote button');
            e.target.closest('.quote-section').remove();
        }
    });

    // 表紙画像URLの入力時にプレビューを更新
    const coverImageUrlInput = document.getElementById('cover-image-url');
    if (coverImageUrlInput) {
        coverImageUrlInput.addEventListener('input', function() {
            updateImagePreview(this.value);
        });
    }
}

// 画像プレビューを更新する関数
function updateImagePreview(url) {
    const imagePreview = document.getElementById('image-preview');
    if (!imagePreview) return;

    if (url && url.trim() !== '') {
        // URLが入力されている場合は画像を表示
        imagePreview.innerHTML = `<img src="${url}" alt="表紙プレビュー" onerror="this.parentElement.innerHTML='<div class=\\'image-error\\'>画像を読み込めません</div>'">`;
    } else {
        // URLが空の場合はプレースホルダーを表示
        imagePreview.innerHTML = '<div class="no-image-placeholder">📚<br>画像URLを入力すると<br>プレビューが表示されます</div>';
    }
}

// 引用文フィールドを追加
function addQuoteField() {
    const quotesContainer = document.getElementById('quotes-container');
    if (!quotesContainer) return;
    
    const quoteIndex = quotesContainer.children.length;
    
    const quoteSection = document.createElement('div');
    quoteSection.className = 'quote-section';
    quoteSection.innerHTML = `
        <h4>引用文 ${quoteIndex + 1}</h4>
        <button type="button" class="remove-quote-btn">削除</button>
        <input type="text" name="quote-source-${quoteIndex}" placeholder="出典" class="form-input">
        <textarea name="quote-text-${quoteIndex}" placeholder="引用文" class="form-textarea"></textarea>
        <textarea name="quote-comment-${quoteIndex}" placeholder="コメント" class="form-textarea"></textarea>
    `;
    
    quotesContainer.appendChild(quoteSection);
}

// 本を保存する処理
async function handleSaveBook(originalBook) {
    const form = document.getElementById('book-form');
    if (!form) return;

    const formData = new FormData(form);

    // 基本情報を取得
    const bookData = {
        title: formData.get('title'),
        author: formData.get('author'),
        coverImageUrl: formData.get('coverImageUrl') || '',
        summary: formData.get('summary'),
        overallReview: formData.get('overallReview'),
        updatedAt: new Date().toISOString()
    };
    
    // 引用文を取得
    const quotes = [];
    const quoteKeys = Array.from(formData.keys()).filter(key => key.startsWith('quote-text-'));
    
    quoteKeys.forEach(key => {
        const index = key.split('-')[2];
        const source = formData.get(`quote-source-${index}`) || '';
        const text = formData.get(`quote-text-${index}`) || '';
        const comment = formData.get(`quote-comment-${index}`) || '';
        
        if (text.trim()) { // 引用文が入力されている場合のみ追加
            quotes.push({
                source: source,
                text: text,
                comment: comment,
                createdAt: new Date().toISOString()
            });
        }
    });
    
    bookData.quotes = quotes;
    
    try {
        if (originalBook) {
            // 編集モード
            bookData.id = originalBook.id;
            bookData.createdAt = originalBook.createdAt;
            await updateBookInFirebase(bookData);
            console.log('[save] book updated:', bookData.id);
        } else {
            // 新規追加モード
            const newBookId = await addBookToFirebase(bookData);
            console.log('[save] book added:', newBookId);
        }
        
        // 一覧画面に戻る
        showScreen('list');
        
        // 本の一覧を再表示
        await loadBooksFromFirebase();
        displayBookList();
        
        alert('保存しました！');
        
    } catch (error) {
        console.error('[save] failed:', error);
        alert('保存に失敗しました: ' + error.message);
    }
}

// 本を削除する処理
async function deleteBook(bookId) {
    if (!confirm('この本を削除してもよろしいですか？')) {
        return;
    }
    
    try {
        await deleteBookFromFirebase(bookId);
        console.log('[delete] book deleted:', bookId);
        
        // 本の一覧を再表示
        await loadBooksFromFirebase();
        displayBookList();
        
        alert('削除しました！');
        
    } catch (error) {
        console.error('[delete] failed:', error);
        alert('削除に失敗しました: ' + error.message);
    }
}

// Firebaseデータベース操作関数

// 本の一覧をFirebaseから読み込み
async function loadBooksFromFirebase() {
    try {
        const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js');
        
        const booksRef = collection(window.firebaseDb, 'books');
        const q = query(booksRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        firebaseBooksData = [];
        querySnapshot.forEach((doc) => {
            const bookData = doc.data();
            bookData.id = doc.id;
            firebaseBooksData.push(bookData);
        });
        
        console.log('[firebase] loaded', firebaseBooksData.length, 'books');
        
    } catch (error) {
        console.error('[firebase] load failed:', error);
        // Firebase読み込みに失敗した場合は、ローカルデータを使用
        firebaseBooksData = window.booksData || [];
    }
}

// 本をFirebaseに追加
async function addBookToFirebase(bookData) {
    const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js');

    // 本の基本情報を保存（引用文も一緒に保存）
    const bookRef = await addDoc(collection(window.firebaseDb, 'books'), {
        title: bookData.title,
        author: bookData.author,
        coverImageUrl: bookData.coverImageUrl || '',
        summary: bookData.summary,
        overallReview: bookData.overallReview,
        quotes: bookData.quotes || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    return bookRef.id;
}

// 本をFirebaseで更新
async function updateBookInFirebase(bookData) {
    const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js');

    // 基本情報と引用文を更新
    const bookRef = doc(window.firebaseDb, 'books', bookData.id);
    await updateDoc(bookRef, {
        title: bookData.title,
        author: bookData.author,
        coverImageUrl: bookData.coverImageUrl || '',
        summary: bookData.summary,
        overallReview: bookData.overallReview,
        quotes: bookData.quotes || [],
        updatedAt: serverTimestamp()
    });
}

// 本をFirebaseから削除
async function deleteBookFromFirebase(bookId) {
    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js');
    
    // 本を削除（引用文も一緒に削除される）
    const bookRef = doc(window.firebaseDb, 'books', bookId);
    await deleteDoc(bookRef);
}

// 初期データをFirebaseに移行
async function migrateInitialDataToFirebase() {
    try {
        console.log('[migration] starting data migration...');

        for (const book of window.booksData) {
            const bookData = {
                title: book.title,
                author: book.author,
                coverImageUrl: book.coverImageUrl || '',
                summary: book.summary,
                overallReview: book.overallReview,
                quotes: book.quotes || []
            };

            await addBookToFirebase(bookData);
            console.log('[migration] migrated book:', book.title);
        }

        // 移行完了後にFirebaseから再読み込み
        await loadBooksFromFirebase();

        console.log('[migration] data migration completed');

    } catch (error) {
        console.error('[migration] failed:', error);
    }
}

// コピー成功モーダルのイベントリスナーを設定
function setupCopySuccessModalEventListeners() {
    // 閉じるボタン
    const closeBtn = document.getElementById('close-copy-success-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            console.log('[click] close copy success button');
            closeCopySuccessModal();
        });
    }
    
    // ×ボタン
    const closeX = document.getElementById('close-copy-success-x');
    if (closeX) {
        closeX.addEventListener('click', function() {
            console.log('[click] close copy success x button');
            closeCopySuccessModal();
        });
    }
}

