# library_watch

上司の本の感想をWebサイトに格納し、気軽にAI対話できるサービス

## 🌐 公開URL

https://takeda-kazu.github.io/someone-s-library/

## 📁 ファイル構成

- `index.html` - メインHTML
- `styles.css` - スタイルシート
- `books-data.js` - 本のデータ（9冊）
- `app.js` - アプリケーションロジック

## 🔧 開発方法

### ローカルで確認
1. `index.html` をブラウザで開く
2. F12で開発者ツールを開く
3. 動作確認

### GitHubに反映（Windows PowerShell）
```powershell
cd C:\Users\武田一樹\Desktop\someone-s-library
git add .
git commit -m "Update: 本のデータや機能を更新"
git push origin main
```

### Cursorで編集
1. Cursorで `C:\Users\武田一樹\Desktop\someone-s-library` フォルダを開く
2. ファイルを編集
3. 上記のGit コマンドで反映

## 📝 本のデータ追加方法

`books-data.js` の `booksData` 配列に追加：

```javascript
{
    id: 10,
    title: '本のタイトル',
    author: '著者名',
    summary: 'あらすじ...',
    overallReview: '全体の感想...',
    quotes: [
        {
            source: '出典（ページ番号など）',
            text: '引用文...',
            comment: '上司の感想...'
        }
    ]
}
```

## 🎯 プロダクト概要

**library_watch** - 上司の本の感想をもとに「仮上司AI」と対話することで、実際の上司に気を使わず、気軽に本について対話し学びを深められる

### 機能
- 📚 本の一覧表示（カード形式）
- 📖 本の詳細・感想表示
- 🤖 AI対話用プロンプト自動生成
- 📋 ワンタップでコピー

### 使い方
1. 本のカードをクリック
2. 詳細と上司の感想を読む
3. 「上司と対話」ボタンをクリック
4. プロンプトをコピー
5. ChatGPTに貼り付けて対話

## 🏆 開発情報

- **開発期間**: 2025-10-12
- **開発者**: Kazu
- **技術スタック**: HTML/CSS/Vanilla JavaScript
- **開発プロセス**: AIPMハッカソン（ペルソナ駆動開発）

## 📚 現在の本（9冊）

1. 嫌われる勇気
2. リーン・スタートアップ
3. イシューからはじめよ
4. 会社という迷宮
5. 人生の大問題と正しく向き合うための認知心理学
6. 伝授！哲学の極意
7. マッキンゼー リーダーの教室
8. 高学歴発達障害 エリートたちの転落と再生
9. 60歳から慕われる人、疎まれる人

---

**library_watch で、本を通じた対話を楽しんでください！📚💬**





