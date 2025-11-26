// js/comments.js

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc,
  deleteDoc, 
  getDocs,
  query,
  orderBy 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { db } from "./config.js";
import { showToast, escapeHtml } from "./utils.js";
import { getUserInfo } from "./reactions.js";

/**
 * 書籍のコメント一覧を取得
 */
export async function getComments(bookId) {
  try {
    const commentsRef = collection(db, "books", bookId.toString(), "comments");
    const q = query(commentsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ 
      commentId: doc.id, 
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date()
    }));
  } catch (error) {
    console.error("Error getting comments:", error);
    return [];
  }
}

/**
 * コメントを投稿
 */
export async function postComment(bookId, content) {
  const userInfo = getUserInfo();
  if (!userInfo) {
    throw new Error("ユーザー情報がありません");
  }
  
  if (!content || content.trim().length === 0) {
    throw new Error("コメントを入力してください");
  }
  
  if (content.length > 500) {
    throw new Error("コメントは500文字以内で入力してください");
  }
  
  try {
    const commentsRef = collection(db, "books", bookId.toString(), "comments");
    const newComment = {
      authorId: userInfo.odcId,
      authorName: userInfo.odcName,
      content: content.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isEdited: false
    };
    
    const docRef = await addDoc(commentsRef, newComment);
    showToast("コメントを投稿しました", "success");
    
    return { commentId: docRef.id, ...newComment };
  } catch (error) {
    console.error("Error posting comment:", error);
    showToast("投稿に失敗しました", "error");
    throw error;
  }
}

/**
 * コメントを編集
 */
export async function editComment(bookId, commentId, newContent) {
  const userInfo = getUserInfo();
  if (!userInfo) {
    throw new Error("ユーザー情報がありません");
  }
  
  if (!newContent || newContent.trim().length === 0) {
    throw new Error("コメントを入力してください");
  }
  
  if (newContent.length > 500) {
    throw new Error("コメントは500文字以内で入力してください");
  }
  
  try {
    const commentRef = doc(db, "books", bookId.toString(), "comments", commentId);
    await updateDoc(commentRef, {
      content: newContent.trim(),
      updatedAt: new Date(),
      isEdited: true
    });
    
    showToast("コメントを更新しました", "success");
    return true;
  } catch (error) {
    console.error("Error editing comment:", error);
    showToast("更新に失敗しました", "error");
    throw error;
  }
}

/**
 * コメントを削除
 */
export async function deleteComment(bookId, commentId) {
  try {
    const commentRef = doc(db, "books", bookId.toString(), "comments", commentId);
    await deleteDoc(commentRef);
    showToast("コメントを削除しました", "success");
    return true;
  } catch (error) {
    console.error("Error deleting comment:", error);
    showToast("削除に失敗しました", "error");
    throw error;
  }
}

/**
 * コメントが自分のものか確認
 */
export function isOwnComment(comment) {
  const userInfo = getUserInfo();
  if (!userInfo) return false;
  return comment.authorId === userInfo.odcId;
}

/**
 * 日時をフォーマット
 */
export function formatDate(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * コメントカードHTMLを生成
 */
export function renderCommentCard(comment) {
  const isOwn = isOwnComment(comment);
  const initial = comment.authorName ? comment.authorName.charAt(0) : "?";
  const editedBadge = comment.isEdited ? '<span class="comment-edited-badge">(編集済み)</span>' : '';
  
  const actionsHtml = isOwn ? `
    <div class="comment-actions">
      <button class="comment-action-btn edit" data-comment-id="${comment.commentId}">編集</button>
      <button class="comment-action-btn delete" data-comment-id="${comment.commentId}">削除</button>
    </div>
  ` : '';
  
  return `
    <article class="comment-card" data-comment-id="${comment.commentId}">
      <div class="comment-header">
        <div class="comment-author">
          <div class="comment-avatar">${escapeHtml(initial)}</div>
          <div>
            <div class="comment-author-name">${escapeHtml(comment.authorName)} ${editedBadge}</div>
            <div class="comment-date">${formatDate(comment.createdAt)}</div>
          </div>
        </div>
      </div>
      <p class="comment-content">${escapeHtml(comment.content)}</p>
      ${actionsHtml}
    </article>
  `;
}

