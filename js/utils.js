// Utility functions

export function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function showLoading(message = "読み込み中...") {
  const loadingEl = document.getElementById("loading-indicator");
  if (!loadingEl) return;
  
  const textEl = loadingEl.querySelector(".loading-text");
  if (textEl) {
    textEl.textContent = message;
  }
  loadingEl.style.display = "flex";
}

export function hideLoading() {
  const loadingEl = document.getElementById("loading-indicator");
  if (loadingEl) {
    loadingEl.style.display = "none";
  }
}

export function showToast(message, type = "info", title = "", duration = 4000) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toastId = `toast-${Date.now()}`;

  // Icons
  const icons = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  // Default titles
  const titles = {
    success: "成功",
    error: "エラー",
    warning: "警告",
    info: "お知らせ",
  };

  const toastTitle = title || titles[type] || titles.info;
  const toastIcon = icons[type] || icons.info;

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.id = toastId;
  toast.setAttribute("role", "alert");
  toast.innerHTML = `
        <span class="toast-icon">${toastIcon}</span>
        <div class="toast-content">
            <h3 class="toast-title">${escapeHtml(toastTitle)}</h3>
            <p class="toast-message">${escapeHtml(message)}</p>
        </div>
        <button class="toast-close" aria-label="通知を閉じる">
            <span aria-hidden="true">×</span>
        </button>
    `;

  // Close button event listener
  toast.querySelector(".toast-close").addEventListener("click", () => {
    removeToast(toastId);
  });

  container.appendChild(toast);

  // Auto remove
  if (duration > 0) {
    setTimeout(() => {
      removeToast(toastId);
    }, duration);
  }
}

export function removeToast(toastId) {
  const toast = document.getElementById(toastId);
  if (toast) {
    toast.classList.add("toast-exit");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }
}

export function announceToScreenReader(message) {
  const statusElement = document.getElementById("status-message");
  if (statusElement) {
    statusElement.textContent = message;
    setTimeout(() => {
      statusElement.textContent = "";
    }, 1000);
  }
}

// Dify inputs GZIP compression + Base64 encoding
export function encodeDifyInputs(inputs) {
    try {
        // Convert to JSON string
        const jsonString = JSON.stringify(inputs);
        
        // GZIP compression (assuming pako is loaded globally via script tag as in original)
        // If pako is not available, we might need to import it or skip compression
        if (typeof pako !== 'undefined') {
            const compressed = pako.gzip(jsonString);
            const base64 = btoa(String.fromCharCode.apply(null, compressed));
            return encodeURIComponent(base64);
        } else {
            console.warn("pako library not found, skipping compression");
            return null;
        }
    } catch (error) {
        console.error('Failed to encode Dify inputs:', error);
        return null;
    }
}
