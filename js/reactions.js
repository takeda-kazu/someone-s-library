// js/reactions.js

import { 
  collection, 
  doc, 
  addDoc, 
  deleteDoc, 
  getDocs
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { db } from "./config.js";
import { showToast } from "./utils.js";

// ローカルストレージキー
const STORAGE_KEY_USER = "library_user_info";

/**
 * ユーザー情報を取得（なければnull）
 */
export function getUserInfo() {
  const stored = localStorage.getItem(STORAGE_KEY_USER);
  return stored ? JSON.parse(stored) : null;
}

/**
 * ユーザー情報を保存
 */
export function saveUserInfo(name) {
  const userInfo = {
    odcId: generateUUID(),
    odcName: name,
    wantToReadBooks: []
  };
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userInfo));
  return userInfo;
}

/**
 * ユーザー名のみ更新
 */
export function updateUserName(name) {
  let userInfo = getUserInfo();
  if (userInfo) {
    userInfo.odcName = name;
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userInfo));
  }
  return userInfo;
}

/**
 * 読みたいリストを更新
 */
export function updateWantToReadList(bookId, isAdding) {
  const userInfo = getUserInfo();
  if (!userInfo) return;
  
  if (isAdding) {
    if (!userInfo.wantToReadBooks.includes(bookId)) {
      userInfo.wantToReadBooks.push(bookId);
    }
  } else {
    userInfo.wantToReadBooks = userInfo.wantToReadBooks.filter(id => id !== bookId);
  }
  
  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userInfo));
}

/**
 * 書籍の「読みたい」一覧を取得
 */
export async function getWantToReadList(bookId) {
  try {
    const wantToReadRef = collection(db, "books", bookId.toString(), "wantToRead");
    const snapshot = await getDocs(wantToReadRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting want to read list:", error);
    return [];
  }
}

/**
 * 「読みたい」を追加
 */
export async function addWantToRead(bookId, userInfo) {
  try {
    const wantToReadRef = collection(db, "books", bookId.toString(), "wantToRead");
    await addDoc(wantToReadRef, {
      odcId: userInfo.odcId,
      odcName: userInfo.odcName,
      createdAt: new Date()
    });
    updateWantToReadList(bookId.toString(), true);
    return true;
  } catch (error) {
    console.error("Error adding want to read:", error);
    showToast("登録に失敗しました", "error");
    return false;
  }
}

/**
 * 「読みたい」を削除
 */
export async function removeWantToRead(bookId, odcId) {
  try {
    const wantToReadRef = collection(db, "books", bookId.toString(), "wantToRead");
    const snapshot = await getDocs(wantToReadRef);
    
    const targetDoc = snapshot.docs.find(d => d.data().odcId === odcId);
    if (targetDoc) {
      await deleteDoc(doc(db, "books", bookId.toString(), "wantToRead", targetDoc.id));
      updateWantToReadList(bookId.toString(), false);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error removing want to read:", error);
    showToast("解除に失敗しました", "error");
    return false;
  }
}

/**
 * ユーザーが「読みたい」を押しているか確認
 */
export function hasUserWantToRead(bookId) {
  const userInfo = getUserInfo();
  if (!userInfo) return false;
  return userInfo.wantToReadBooks.includes(bookId.toString());
}

/**
 * UUID生成
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

