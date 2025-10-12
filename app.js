// グローバル変数
let currentScreen = 'list';  // 現在の画面（'list' or 'detail'）
let selectedBookId = null;   // 選択中の本のID

// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('[app] library_watch started');
    
    // 本の一覧を表示
    displayBookList();
    
    // 戻るボタンのイベントリスナーを設定
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            console.log('[click] back button');
            showScreen('list');
        });
    }
    
    // モーダルのイベントリスナーを設定
    setupModalEventListeners();
});

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
    
    // 各本のカードを作成
    booksData.forEach(book => {
        const card = createBookCard(book);
        bookListContainer.appendChild(card);
    });
    
    console.log('[data] displayed', booksData.length, 'books');
}

// 本のカードを作成する関数
function createBookCard(book) {
    // カードのdiv要素を作成
    const card = document.createElement('div');
    card.className = 'book-card';
    card.dataset.bookId = book.id;
    
    // カードの内容を設定
    card.innerHTML = `
        <h3 class="book-title">📚 ${book.title}</h3>
        <p class="book-author">著者: ${book.author}</p>
        <p class="book-summary">${book.summary}</p>
    `;
    
    // カードクリック時のイベントリスナー
    card.addEventListener('click', function() {
        console.log('[click] book card, bookId:', book.id);
        selectedBookId = book.id;
        showBookDetail(book.id);
    });
    
    return card;
}

// 画面を切り替える関数
function showScreen(screenName) {
    const listScreen = document.getElementById('screen-list');
    const detailScreen = document.getElementById('screen-detail');
    
    if (screenName === 'list') {
        listScreen.style.display = 'block';
        detailScreen.style.display = 'none';
        currentScreen = 'list';
        console.log('[nav] show screen: list');
    } else if (screenName === 'detail') {
        listScreen.style.display = 'none';
        detailScreen.style.display = 'block';
        currentScreen = 'detail';
        console.log('[nav] show screen: detail, bookId:', selectedBookId);
    }
}

// 本の詳細を表示する関数
function showBookDetail(bookId) {
    // 本のデータを取得
    const book = booksData.find(b => b.id === bookId);
    
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
    
    // 詳細画面の内容を設定
    detailContent.innerHTML = `
        <div class="book-detail-info">
            <h2 class="detail-title">📖 ${book.title}</h2>
            <p class="detail-author">著者: ${book.author}</p>
            <p class="detail-summary">あらすじ: ${book.summary}</p>
        </div>
        
        <div class="overall-review-section">
            <h3 class="section-title">全体の感想</h3>
            <div class="overall-review-content">${book.overallReview}</div>
        </div>
        
        ${quotesHTML}
        
        <button id="dialog-btn" class="dialog-button">🤖 上司と対話</button>
    `;
    
    // 「上司と対話」ボタンのイベントリスナーを設定
    // setTimeout で次のイベントループでイベントを設定（DOM追加後に実行）
    setTimeout(() => {
        const dialogBtn = document.getElementById('dialog-btn');
        if (dialogBtn) {
            dialogBtn.addEventListener('click', function() {
                console.log('[click] dialog button');
                const prompt = generatePrompt(bookId);
                console.log('[prompt] generated for bookId:', bookId);
                // プロンプトをモーダルで表示
                openModal(prompt);
            });
        }
    }, 0);
    
    // 詳細画面に切り替え
    showScreen('detail');
}

// プロンプトを自動生成する関数
function generatePrompt(bookId) {
    // 本のデータを取得
    const book = booksData.find(b => b.id === bookId);
    
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
    const prompt = `あなたは帝人株式会社・地域包括ケア事業部門の管理職の立場で、社員と対話してください。

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
        })
        .catch(function(err) {
            console.error('[copy] failed', err);
            alert('コピーに失敗しました。手動でコピーしてください。');
        });
}

