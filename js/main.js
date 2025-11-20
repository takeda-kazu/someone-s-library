import { setupAuthStateListener, showAuthModal, switchToNormalMode, handleLogin, closeAuthModal } from "./auth.js";
import { loadBooksFromFirestore } from "./db.js";
import { 
  showScreen, 
  showScreenWithoutHistory, 
  showBookDetailWithoutHistory, 
  showEditScreenWithoutHistory, 
  showEditScreen, 
  filterBooks, 
  closeChatModal 
} from "./ui.js";

// Initialize App
document.addEventListener("DOMContentLoaded", () => {
  console.log("App initialized");
  initializeApp();
});

function initializeApp() {
  setupEventListeners();
  setupAuthStateListener();
  setupHistoryListener();
  loadBooksFromFirestore();
}

function setupHistoryListener() {
  if (!window.history.state) {
    window.history.replaceState({ screen: "list" }, "", "");
  }

  window.addEventListener("popstate", (event) => {
    if (event.state) {
      const screen = event.state.screen;
      const bookId = event.state.bookId;

      if (screen === "list") {
        showScreenWithoutHistory("list");
      } else if (screen === "detail" && bookId) {
        showBookDetailWithoutHistory(bookId);
      } else if (screen === "edit") {
        if (bookId) {
          showEditScreenWithoutHistory(bookId);
        } else {
          showEditScreenWithoutHistory();
        }
      }
    }
  });
}

function setupEventListeners() {
  // Mode switching
  document.getElementById("admin-mode-btn")?.addEventListener("click", showAuthModal);
  document.getElementById("normal-mode-btn")?.addEventListener("click", switchToNormalMode);

  // Auth Modal
  document.getElementById("close-auth-modal-x")?.addEventListener("click", closeAuthModal);
  document.getElementById("close-auth-modal-btn")?.addEventListener("click", closeAuthModal);
  document.getElementById("auth-login-btn")?.addEventListener("click", handleLogin);

  // Navigation
  document.getElementById("back-btn")?.addEventListener("click", () => {
    if (window.history.state && window.history.state.screen === 'detail') {
        window.history.back();
    } else {
        showScreen('list');
    }
  });
  document.getElementById("back-edit-btn")?.addEventListener("click", () => {
    window.history.back();
  });

  // Search & Filter
  document.getElementById("search-input")?.addEventListener("input", filterBooks);
  document.getElementById("author-filter")?.addEventListener("change", filterBooks);
  document.getElementById("add-book-btn")?.addEventListener("click", () => showEditScreen());

  // Chat Modal
  document.getElementById("close-chat-modal-x")?.addEventListener("click", closeChatModal);
  document.getElementById("close-chat-modal-btn")?.addEventListener("click", closeChatModal);
}
