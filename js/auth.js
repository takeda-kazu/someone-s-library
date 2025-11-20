import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { auth } from "./config.js";
import { showToast, announceToScreenReader } from "./utils.js";
import { loadBooksFromFirestore } from "./db.js";
import { showScreen } from "./ui.js";

export let isAuthenticated = false;
export let currentMode = "normal";

export function setupAuthStateListener() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is logged in
      currentMode = "admin";
      isAuthenticated = true;
      updateAuthUI(true);
      // Reload data on login
      loadBooksFromFirestore();
    } else {
      // User is logged out
      currentMode = "normal";
      isAuthenticated = false;
      updateAuthUI(false);
    }
  });
}

function updateAuthUI(isLoggedIn) {
  const adminBtn = document.getElementById("admin-mode-btn");
  const normalBtn = document.getElementById("normal-mode-btn");
  const searchControls = document.getElementById("search-controls");

  if (isLoggedIn) {
    if (adminBtn) adminBtn.style.display = "none";
    if (normalBtn) normalBtn.style.display = "inline-block";
    if (searchControls) searchControls.style.display = "flex";
  } else {
    if (adminBtn) adminBtn.style.display = "inline-block";
    if (normalBtn) normalBtn.style.display = "none";
    if (searchControls) searchControls.style.display = "none";
  }
}

export async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;

  if (!email || !password) {
    showToast("メールアドレスとパスワードを入力してください", "warning");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    closeAuthModal();
    announceToScreenReader("管理モードに切り替わりました");
  } catch (error) {
    console.error("Login error:", error);
    let errorMessage = "ログインに失敗しました";

    if (error.code === "auth/user-not-found") {
      errorMessage = "ユーザーが見つかりません";
    } else if (error.code === "auth/wrong-password") {
      errorMessage = "パスワードが正しくありません";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "メールアドレスの形式が正しくありません";
    } else if (error.code === "auth/too-many-requests") {
      errorMessage = "ログイン試行回数が多すぎます。しばらく待ってから再試行してください";
    }

    showToast(errorMessage, "error", "ログインエラー");
  }
}

export async function switchToNormalMode() {
  try {
    await signOut(auth);
    announceToScreenReader("通常モードに切り替わりました");
    showScreen("list");
  } catch (error) {
    console.error("Logout error:", error);
    showToast("ログアウトに失敗しました", "error");
  }
}

export function showAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) {
    modal.style.display = "flex";
    setTimeout(() => document.getElementById("auth-email")?.focus(), 100);
  }
}

export function closeAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) {
    modal.style.display = "none";
    document.getElementById("auth-email").value = "";
    document.getElementById("auth-password").value = "";
  }
}
