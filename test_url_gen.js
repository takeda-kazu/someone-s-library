
// Mock data
const book = {
    title: "テスト書籍",
    author: "テスト著者",
    introduction: "これはテスト用の導入文です。",
    summary: "これはテスト用の要約です。",
    quotes: [
        { title: "引用1", content: "引用内容1" },
        { title: "引用2", content: "引用内容2" }
    ],
    reflections: [
        { title: "考察1", content: "考察内容1" }
    ],
    keywords: ["キーワード1", "キーワード2"]
};

// URLのバイト数制限を考慮してテキストを切り詰める関数
function truncateTextForUrl(text, maxBytes = 1500) {
    if (!text) return '';
    
    // URLエンコード後のサイズを概算
    let truncated = text;
    let encoded = encodeURIComponent(truncated);
    
    // 安全マージンを確保しながら切り詰め
    while (encoded.length > maxBytes && truncated.length > 0) {
        // 末尾から少しずつ削る
        const cutLength = Math.max(1, Math.floor((encoded.length - maxBytes) / 3));
        truncated = truncated.slice(0, -cutLength);
        encoded = encodeURIComponent(truncated);
    }
    
    return truncated + (text.length > truncated.length ? '...' : '');
}

function generateUrl(book) {
    const limitedQuotes = (book.quotes || []).slice(0, 2);
    const limitedReflections = (book.reflections || []).slice(0, 2);

    const quotesText = limitedQuotes.map(q => `・${q.title}\n  "${q.content}"`).join('\n');
    const reflectionsText = limitedReflections.map(r => `・${r.title}\n  ${r.content}`).join('\n');

    let contentBase = `【導入・紹介】\n${book.introduction || 'なし'}\n\n【要約】\n${book.summary || 'なし'}`;
    let contentExtras = `\n\n【引用(一部)】\n${quotesText || 'なし'}\n\n【考察(一部)】\n${reflectionsText || 'なし'}\n\n【キーワード】\n${(book.keywords || []).join(', ')}`;

    let fullContent = contentBase + contentExtras;
    const SAFE_ENCODED_LIMIT = 1500; 
    const truncatedContent = truncateTextForUrl(fullContent, SAFE_ENCODED_LIMIT);

    const inputs = {
        book_title: book.title,
        book_author: book.author,
        book_content: truncatedContent
    };

    const baseUrl = 'https://udify.app/chatbot/7K7Ymm1N7MfjS6e1';
    const inputsJson = JSON.stringify(inputs);
    const src = `${baseUrl}?inputs=${encodeURIComponent(inputsJson)}`;
    
    return { src, inputs };
}

const result = generateUrl(book);
console.log("Generated URL:", result.src);
console.log("Inputs:", JSON.stringify(result.inputs, null, 2));
console.log("URL Length:", result.src.length);
