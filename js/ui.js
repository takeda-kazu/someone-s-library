import { escapeHtml, announceToScreenReader, showToast, encodeDifyInputs } from "./utils.js";
import { booksData } from "./books-data.js";
import { currentMode, isAuthenticated, showAuthModal, switchToNormalMode } from "./auth.js";
import { saveBook, deleteBook } from "./db.js";

export let currentScreen = "list";
export let currentBookId = null;

export function showScreen(screenName, bookId = null) {
  showScreenWithoutHistory(screenName);

  const state = { screen: screenName };
  if (bookId) {
    state.bookId = bookId;
  }
  window.history.pushState(state, "", "");
}

export function showScreenWithoutHistory(screenName) {
  document.getElementById("screen-list").style.display = "none";
  document.getElementById("screen-detail").style.display = "none";
  document.getElementById("screen-edit").style.display = "none";

  const targetScreen = document.getElementById(`screen-${screenName}`);
  if (targetScreen) {
    targetScreen.style.display = "block";
  }
  currentScreen = screenName;

  announceToScreenReader(
    `${screenName === "list" ? "一覧" : screenName === "detail" ? "詳細" : "編集"}画面に移動しました`
  );
}

export function renderBookList(books = booksData) {
  const bookListContainer = document.getElementById("book-list");
  if (!bookListContainer) return;

  bookListContainer.innerHTML = "";

  if (books.length === 0) {
    bookListContainer.innerHTML =
      '<p style="text-align: center; color: var(--text-secondary); margin-top: 3rem;">該当する本が見つかりませんでした</p>';
    return;
  }

  books.forEach((book) => {
    const bookCard = createBookCard(book);
    bookListContainer.appendChild(bookCard);
  });

  updateAuthorFilter();
}

function createBookCard(book) {
  const card = document.createElement("div");
  card.className = "book-card";
  card.setAttribute("role", "listitem");
  card.onclick = () => showBookDetail(book.id);

  const imageHtml = book.imageUrl
    ? `<div class="book-card-image-wrapper"><img src="${escapeHtml(book.imageUrl)}" alt="${escapeHtml(
        book.title
      )}の表紙" class="book-card-image" onerror="this.style.display='none'"></div>`
    : `<div class="book-card-image-wrapper" style="background: linear-gradient(135deg, #333 0%, #444 100%); display: flex; align-items: center; justify-content: center;"><span style="font-size: 2rem;">📚</span></div>`;

  card.innerHTML = `
        ${imageHtml}
        <div class="book-card-content">
            <h3 class="book-card-title">${escapeHtml(book.title)}</h3>
            <p class="book-card-author">${escapeHtml(book.author)}</p>
            <p class="book-description" style="font-size: 13px; color: var(--text-tertiary); margin-top: 8px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(
              book.introduction || book.description || ""
            )}</p>
        </div>
    `;

  return card;
}

export function showBookDetail(bookId) {
  showBookDetailWithoutHistory(bookId);
  window.history.pushState({ screen: "detail", bookId: bookId }, "", "");
}

export function showBookDetailWithoutHistory(bookId) {
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

  let quotesAndReflectionsHtml = "";
  const quotes = book.quotes || [];
  const reflections = book.reflections || [];
  const maxLength = Math.max(quotes.length, reflections.length);

  for (let i = 0; i < maxLength; i++) {
    if (quotes[i]) {
      quotesAndReflectionsHtml += `
                <div class="detail-section">
                    <h3 class="section-title">
                        <span class="section-icon">💬</span>
                        引用${i + 1}
                    </h3>
                    <div class="quote-card">
                        <h4 class="quote-title">${escapeHtml(quotes[i].title)}</h4>
                        <blockquote class="quote-content">${escapeHtml(quotes[i].content)}</blockquote>
                        <p class="quote-page">(${escapeHtml(quotes[i].pageNumber)}頁)</p>
                    </div>
                </div>
            `;
    }

    if (reflections[i]) {
      quotesAndReflectionsHtml += `
                <div class="detail-section">
                    <h3 class="section-title">
                        <span class="section-icon">💡</span>
                        上司の考察${i + 1}
                    </h3>
                    <div class="reflection-card">
                        <h4 class="reflection-title">${escapeHtml(reflections[i].title)}</h4>
                        <p class="reflection-content">${escapeHtml(reflections[i].content)}</p>
                    </div>
                </div>
            `;
    }
  }

  // Button generation based on auth state
  const buttonsHtml = isAuthenticated
    ? `
        <div style="display: flex; gap: 1rem; margin-top: 2rem; flex-wrap: wrap; justify-content: center;">
            <button id="edit-btn-${bookId}" class="admin-button" style="flex: 0 1 auto; min-width: 120px;">編集</button>
            <button id="chat-btn-${bookId}" class="chat-button-modern" style="flex: 0 1 auto; min-width: 200px;">
                <span aria-hidden="true">🤖</span> AIと対話
            </button>
        </div>
    `
    : `
        <div style="display: flex; gap: 1rem; margin-top: 2rem; flex-wrap: wrap; justify-content: center;">
            <button id="chat-btn-${bookId}" class="chat-button-modern" style="flex: 0 1 auto; min-width: 200px;">
                <span aria-hidden="true">🤖</span> AIと対話
            </button>
        </div>
    `;

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
                ${(book.keywords || [])
                  .map((keyword) => `<span class="keyword-tag">${escapeHtml(keyword)}</span>`)
                  .join("")}
            </div>
        </div>

        ${buttonsHtml}
    `;

  // Attach event listeners for dynamic buttons
  setTimeout(() => {
    const editBtn = document.getElementById(`edit-btn-${bookId}`);
    if (editBtn) editBtn.onclick = () => showEditScreen(bookId);

    const chatBtn = document.getElementById(`chat-btn-${bookId}`);
    if (chatBtn) chatBtn.onclick = () => openChat(bookId);
  }, 0);

  showScreenWithoutHistory("detail");
}

export function showEditScreen(bookId = null) {
  showEditScreenWithoutHistory(bookId);
  const state = { screen: "edit" };
  if (bookId) {
    state.bookId = bookId;
  }
  window.history.pushState(state, "", "");
}

export function showEditScreenWithoutHistory(bookId = null) {
  const book = bookId ? booksData.find((b) => b.id === bookId) : null;
  const editContainer = document.getElementById("book-edit-content");
  if (!editContainer) return;

  const quotesHtml = (book?.quotes || [])
    .map(
      (quote, index) => `
        <div class="edit-quote-item" data-quote-id="${index}">
            <h4>引用 ${index + 1}</h4>
            <label>引用タイトル</label>
            <input type="text" class="edit-input quote-title" value="${escapeHtml(quote.title || "")}" placeholder="例：新規事業における「適応課題」">
            <label>引用内容</label>
            <textarea class="edit-textarea quote-content" rows="4">${escapeHtml(quote.content || "")}</textarea>
            <label>ページ番号</label>
            <input type="text" class="edit-input quote-page" value="${escapeHtml(quote.pageNumber || "")}" placeholder="例：77-79">
            <button type="button" class="delete-button" onclick="this.parentElement.remove()">この引用を削除</button>
        </div>
    `
    )
    .join("");

  const reflectionsHtml = (book?.reflections || [])
    .map(
      (reflection, index) => `
        <div class="edit-reflection-item" data-reflection-id="${index}">
            <h4>考察 ${index + 1}</h4>
            <label>考察タイトル</label>
            <input type="text" class="edit-input reflection-title" value="${escapeHtml(reflection.title || "")}" placeholder="例：前提条件を揃える努力">
            <label>考察内容</label>
            <textarea class="edit-textarea reflection-content" rows="4">${escapeHtml(reflection.content || "")}</textarea>
            <button type="button" class="delete-button" onclick="this.parentElement.remove()">この考察を削除</button>
        </div>
    `
    )
    .join("");

  editContainer.innerHTML = `
        <h2 style="font-size: 24px; font-weight: 700; margin-bottom: 32px;">
            ${book ? "本を編集" : "新しい本を追加"}
        </h2>
        <form class="edit-form" onsubmit="return false;">
            <div>
                <label>タイトル <span style="color: #ff6b6b;">*</span></label>
                <input type="text" class="edit-input" id="edit-title" value="${book ? escapeHtml(book.title) : ""}" required>
            </div>
            <div>
                <label>著者 <span style="color: #ff6b6b;">*</span></label>
                <input type="text" class="edit-input" id="edit-author" value="${book ? escapeHtml(book.author) : ""}" required>
            </div>
            <div>
                <label>画像URL（Amazonなどの画像リンク）</label>
                <input type="url" class="edit-input" id="edit-imageUrl" value="${book ? escapeHtml(book.imageUrl || "") : ""}" placeholder="https://m.media-amazon.com/images/I/...">
            </div>
            <div>
                <label>📖 導入（ご紹介） <span style="color: #ff6b6b;">*</span></label>
                <textarea class="edit-textarea" id="edit-introduction" rows="4" required>${book ? escapeHtml(book.introduction || book.description || "") : ""}</textarea>
            </div>
            <div>
                <label>🟰 本の要約（核となる概念） <span style="color: #ff6b6b;">*</span></label>
                <textarea class="edit-textarea" id="edit-summary" rows="4" required>${book ? escapeHtml(book.summary || book.description || "") : ""}</textarea>
            </div>

            <div style="margin-top: 2rem; padding: 1.5rem; background: var(--bg-card); border-radius: var(--radius-md);">
                <h3 style="margin-bottom: 1rem;">💬 引用（複数可）</h3>
                <div id="quotes-container">
                    ${quotesHtml || '<p style="color: var(--text-secondary);">引用が追加されていません</p>'}
                </div>
                <button type="button" id="add-quote-btn" class="admin-button" style="margin-top: 1rem;">+ 引用を追加</button>
            </div>

            <div style="margin-top: 2rem; padding: 1.5rem; background: var(--bg-card); border-radius: var(--radius-md);">
                <h3 style="margin-bottom: 1rem;">💡 上司の考察（複数可）</h3>
                <div id="reflections-container">
                    ${reflectionsHtml || '<p style="color: var(--text-secondary);">考察が追加されていません</p>'}
                </div>
                <button type="button" id="add-reflection-btn" class="admin-button" style="margin-top: 1rem;">+ 考察を追加</button>
            </div>

            <div>
                <label>🏷️ キーワード（カンマ区切り） <span style="color: #ff6b6b;">*</span></label>
                <input type="text" class="edit-input" id="edit-keywords" value="${book ? (book.keywords || []).join(", ") : ""}" required placeholder="例：対話, 適応課題, イノベーション">
            </div>
            <div class="edit-actions">
                <button type="button" id="save-book-btn" class="save-button">
                    ${book ? "更新" : "追加"}
                </button>
                ${book ? `<button type="button" id="delete-book-btn" class="delete-button">削除</button>` : ""}
            </div>
        </form>
    `;

  // Attach event listeners
  setTimeout(() => {
    document.getElementById("add-quote-btn").onclick = addQuote;
    document.getElementById("add-reflection-btn").onclick = addReflection;
    document.getElementById("save-book-btn").onclick = () => saveBook(bookId);
    const deleteBtn = document.getElementById("delete-book-btn");
    if (deleteBtn) deleteBtn.onclick = () => deleteBook(bookId);
  }, 0);

  showScreenWithoutHistory("edit");
}

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
            <button type="button" class="delete-button" onclick="this.parentElement.remove()">この引用を削除</button>
        </div>
    `;
  container.insertAdjacentHTML("beforeend", newQuoteHtml);
}

function addReflection() {
  const container = document.getElementById("reflections-container");
  const existingReflections = container.querySelectorAll(".edit-reflection-item");
  const newIndex = existingReflections.length;

  const newReflectionHtml = `
        <div class="edit-reflection-item" data-reflection-id="${newIndex}">
            <h4>考察 ${newIndex + 1}</h4>
            <label>考察タイトル</label>
            <input type="text" class="edit-input reflection-title" placeholder="例：前提条件を揃える努力">
            <label>考察内容</label>
            <textarea class="edit-textarea reflection-content" rows="4"></textarea>
            <button type="button" class="delete-button" onclick="this.parentElement.remove()">この考察を削除</button>
        </div>
    `;
  container.insertAdjacentHTML("beforeend", newReflectionHtml);
}

export function updateAuthorFilter() {
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

export function filterBooks() {
  const searchTerm = document.getElementById("search-input")?.value.toLowerCase() || "";
  const selectedAuthor = document.getElementById("author-filter")?.value || "";

  let filteredBooks = booksData;

  if (searchTerm) {
    filteredBooks = filteredBooks.filter(
      (book) =>
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm) ||
        (book.description || "").toLowerCase().includes(searchTerm)
    );
  }

  if (selectedAuthor) {
    filteredBooks = filteredBooks.filter((book) => book.author === selectedAuthor);
  }

  renderBookList(filteredBooks);
}

// Chat functionality
export function openChat(bookId) {
    const book = booksData.find(b => b.id === bookId);
    if (!book) return;

    const iframe = document.getElementById('dify-chatbot-iframe');
    const modal = document.getElementById('chat-modal');
    
    const modalTitle = document.getElementById('chat-modal-book-title');
    if (modalTitle) {
        modalTitle.textContent = book.title;
    }

    const baseInfo = "";
    const summaryText = `\n【要約】\n${book.summary || 'なし'}`;
    const introText = `\n\n【導入・紹介】\n${book.introduction || book.description || 'なし'}`;
    
    let quotesAndReflectionsText = "";
    const quotes = book.quotes || [];
    const reflections = book.reflections || [];
    const maxLength = Math.max(quotes.length, reflections.length);

    for (let i = 0; i < maxLength; i++) {
        if (quotes[i]) {
            quotesAndReflectionsText += `\n\n【引用${i + 1}: ${quotes[i].title}】\n"${quotes[i].content}"\n(p.${quotes[i].pageNumber})`;
        }
        if (reflections[i]) {
            quotesAndReflectionsText += `\n\n【考察${i + 1}: ${reflections[i].title}】\n${reflections[i].content}`;
        }
    }

    const keywordsText = (book.keywords && book.keywords.length > 0) ? `\n\n【キーワード】\n${book.keywords.join(', ')}` : '';
    const fullContentForCopy = baseInfo + summaryText + introText + quotesAndReflectionsText + keywordsText;

    const difyContent = `${book.summary || ''}\n\n${book.introduction || book.description || ''}`.trim();

    const inputs = {
        book_title: book.title,
        book_author: book.author,
        book_content: difyContent
    };
    
    const encodedInputs = encodeDifyInputs(inputs);
    let difyUrl = 'https://udify.app/chatbot/7K7Ymm1N7MfjS6e1';
    
    if (encodedInputs) {
        difyUrl += `?inputs=${encodedInputs}`;
    }

    iframe.src = difyUrl;
    
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

export function closeChatModal() {
    const modal = document.getElementById('chat-modal');
    const iframe = document.getElementById('dify-chatbot-iframe');
    modal.style.display = 'none';
    iframe.src = '';
}

async function copyBookInfo(book, fullContent) {
    const textToCopy = `書籍名: ${book.title}\n著者: ${book.author}\n\n${fullContent}`;
    
    try {
        await navigator.clipboard.writeText(textToCopy);
        showToast("本の情報をコピーしました。チャットに貼り付けてください。", "success");
    } catch (error) {
        console.error("Copy failed:", error);
        showToast("コピーに失敗しました", "error");
    }
}
