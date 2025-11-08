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
    setupAuthStateListener();
    // Firestoreからデータを読み込む（認証不要で読み取り可能な場合）
    loadBooksFromFirestore();
}

// Firestoreから書籍データを読み込む
async function loadBooksFromFirestore() {
    // Firebaseが初期化されるまで待つ
    const checkFirebase = setInterval(async () => {
        if (window.firebaseDb && window.firestore) {
            clearInterval(checkFirebase);
            
            try {
                const db = window.firebaseDb;
                const { collection, getDocs, query, orderBy } = window.firestore;
                
                const booksCollection = collection(db, 'books');
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
                            maxId = Math.max(maxId, ...booksData.map(b => b.id || 0));
                            bookId = maxId + 1;
                            maxId = bookId;
                        }
                        
                        firestoreBooks.push({
                            id: bookId,
                            firestoreId: doc.id,
                            title: data.title || '',
                            author: data.author || '',
                            imageUrl: data.imageUrl || '',
                            description: data.description || '',
                            review: data.review || '',
                            insights: data.insights || '',
                            keywords: data.keywords || []
                        });
                    });
                    
                    // booksDataを更新（Firestoreのデータを優先）
                    booksData.length = 0;
                    booksData.push(...firestoreBooks);
                    
                    renderBookList();
                } else {
                    // Firestoreにデータがない場合はローカルデータを表示
                    renderBookList();
                }
            } catch (error) {
                console.error('Firestore読み込みエラー:', error);
                // エラーが発生した場合はローカルデータを表示
                renderBookList();
            }
        }
    }, 100);
    
    // タイムアウト（5秒）
    setTimeout(() => {
        clearInterval(checkFirebase);
        // タイムアウトした場合もローカルデータを表示
        renderBookList();
    }, 5000);
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
                    currentMode = 'admin';
                    isAuthenticated = true;
                    document.getElementById('admin-mode-btn').style.display = 'none';
                    document.getElementById('normal-mode-btn').style.display = 'inline-block';
                    document.getElementById('search-controls').style.display = 'flex';
                    // ログイン時にデータを再読み込み
                    loadBooksFromFirestore();
                } else {
                    // ユーザーがログアウトしている
                    currentMode = 'normal';
                    isAuthenticated = false;
                    document.getElementById('admin-mode-btn').style.display = 'inline-block';
                    document.getElementById('normal-mode-btn').style.display = 'none';
                    document.getElementById('search-controls').style.display = 'none';
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
    
    const imageHtml = book.imageUrl ? 
        `<img src="${escapeHtml(book.imageUrl)}" alt="${escapeHtml(book.title)}の表紙" class="book-image" onerror="this.style.display='none'">` : 
        '';
    
    card.innerHTML = `
        <h3 class="book-title">${escapeHtml(book.title)}</h3>
        <p class="book-author">${escapeHtml(book.author)}</p>
        <p class="book-description">${escapeHtml(book.description)}</p>
        ${imageHtml}
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
    
    const imageHtml = book.imageUrl ? 
        `<img src="${escapeHtml(book.imageUrl)}" alt="${escapeHtml(book.title)}の表紙" class="detail-image" onerror="this.style.display='none'">` : 
        '';
    
    detailContainer.innerHTML = `
        <h2 class="detail-title">${escapeHtml(book.title)}</h2>
        <p class="detail-author">${escapeHtml(book.author)}</p>
        
        <div class="detail-section">
            <h3>概要</h3>
            <p>${escapeHtml(book.description)}</p>
        </div>
        
        ${imageHtml}
        
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

async function switchToNormalMode() {
    try {
        const auth = window.firebaseAuth;
        const { signOut } = window.firebaseAuthFunctions;
        
        await signOut(auth);
    } catch (error) {
        console.error('ログアウトエラー:', error);
    }
    
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

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    
    if (!email || !password) {
        alert('メールアドレスとパスワードを入力してください');
        return;
    }
    
    try {
        const auth = window.firebaseAuth;
        const { signInWithEmailAndPassword } = window.firebaseAuthFunctions;
        
        await signInWithEmailAndPassword(auth, email, password);
        closeAuthModal();
        switchToAdminMode();
    } catch (error) {
        console.error('ログインエラー:', error);
        let errorMessage = 'ログインに失敗しました';
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'ユーザーが見つかりません';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'パスワードが正しくありません';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'メールアドレスの形式が正しくありません';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'ログイン試行回数が多すぎます。しばらく待ってから再試行してください';
        }
        
        alert(errorMessage);
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
                <label>画像URL（Amazonなどの画像リンク）</label>
                <input type="url" class="edit-input" id="edit-imageUrl" value="${book ? escapeHtml(book.imageUrl || '') : ''}" placeholder="https://example.com/image.jpg">
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

async function saveBook(bookId) {
    try {
        const title = document.getElementById('edit-title').value.trim();
        const author = document.getElementById('edit-author').value.trim();
        const imageUrl = document.getElementById('edit-imageUrl').value.trim();
        const description = document.getElementById('edit-description').value.trim();
        const review = document.getElementById('edit-review').value.trim();
        const insights = document.getElementById('edit-insights').value.trim();
        const keywords = document.getElementById('edit-keywords').value.split(',').map(k => k.trim()).filter(k => k);
        
        if (!title || !author || !description || !review || !insights || keywords.length === 0) {
            alert('すべての必須項目を入力してください');
            return;
        }
        
        const bookData = {
            title,
            author,
            imageUrl: imageUrl || '',
            description,
            review,
            insights,
            keywords
        };
        
        const db = window.firebaseDb;
        const { collection, doc, addDoc, setDoc, updateDoc, getDoc } = window.firestore;
        
        if (bookId) {
            // 更新 - bookIdがFirestoreのドキュメントIDかローカルのIDかを確認
            // まずローカルのbooksDataからfirestoreIdを取得
            const localBook = booksData.find(b => b.id === bookId);
            const firestoreId = localBook?.firestoreId || bookId.toString();
            
            const bookRef = doc(db, 'books', firestoreId);
            
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
            const index = booksData.findIndex(b => b.id === bookId);
            if (index !== -1) {
                booksData[index] = { 
                    ...booksData[index], 
                    firestoreId: firestoreId,
                    ...bookData 
                };
            }
            
            alert('本を保存しました');
        } else {
            // 新規追加
            const docRef = await addDoc(collection(db, 'books'), bookData);
            const firestoreId = docRef.id;
            
            // ローカルのbooksDataにも追加
            const newId = Math.max(...booksData.map(b => b.id), 0) + 1;
            booksData.push({ 
                id: newId, 
                firestoreId: firestoreId,
                ...bookData 
            });
            
            alert('本を追加しました');
        }
        
        // Firestoreからデータを再読み込み
        await loadBooksFromFirestore();
        showScreen('list');
    } catch (error) {
        console.error('保存エラー:', error);
        alert('保存に失敗しました: ' + error.message);
    }
}

async function deleteBook(bookId) {
    if (!confirm('本当に削除しますか？')) {
        return;
    }
    
    try {
        const db = window.firebaseDb;
        const { doc, deleteDoc } = window.firestore;
        
        // ローカルのbooksDataからfirestoreIdを取得
        const localBook = booksData.find(b => b.id === bookId);
        const firestoreId = localBook?.firestoreId || bookId.toString();
        
        const bookRef = doc(db, 'books', firestoreId);
        await deleteDoc(bookRef);
        
        // ローカルのbooksDataからも削除
        const index = booksData.findIndex(b => b.id === bookId);
        if (index !== -1) {
            booksData.splice(index, 1);
        }
        
        alert('本を削除しました');
        // Firestoreからデータを再読み込み
        await loadBooksFromFirestore();
        showScreen('list');
    } catch (error) {
        console.error('削除エラー:', error);
        alert('削除に失敗しました: ' + error.message);
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

