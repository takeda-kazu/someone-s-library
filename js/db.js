import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { db } from "./config.js";
import { showToast, showLoading, hideLoading } from "./utils.js";
import { renderBookList, showScreen } from "./ui.js";
import { booksData, updateBooksData } from "./books-data.js";

export async function loadBooksFromFirestore() {
  showLoading("書籍データを読み込んでいます...");

  try {
    const booksCollection = collection(db, "books");
    const querySnapshot = await getDocs(booksCollection);

    if (!querySnapshot.empty) {
      const firestoreBooks = [];
      let maxId = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Use numeric ID if available, otherwise generate one
        let bookId;
        const parsedId = parseInt(doc.id);
        if (!isNaN(parsedId) && parsedId > 0) {
          bookId = parsedId;
        } else {
          // Get max ID from existing data
          maxId = Math.max(maxId, ...booksData.map((b) => b.id || 0));
          bookId = maxId + 1;
          maxId = bookId;
        }

        firestoreBooks.push({
          id: bookId,
          firestoreId: doc.id,
          title: data.title || "",
          author: data.author || "",
          imageUrl: data.imageUrl || "",
          introduction: data.introduction || data.description || "",
          summary: data.summary || data.description || "",
          quotes: data.quotes || [],
          reflections: data.reflections || [],
          description: data.description || data.introduction || "",
          review: data.review || "",
          insights: data.insights || "",
          keywords: data.keywords || [],
        });
      });

      // Update local data
      updateBooksData(firestoreBooks);
      renderBookList();
    } else {
      // No data in Firestore, use local data
      renderBookList();
    }
  } catch (error) {
    console.error("Firestore load error:", error);
    showToast("データの読み込みに失敗しました", "error");
    renderBookList();
  } finally {
    hideLoading();
  }
}

export async function saveBook(bookId) {
  try {
    const title = document.getElementById("edit-title").value.trim();
    const author = document.getElementById("edit-author").value.trim();
    const imageUrl = document.getElementById("edit-imageUrl").value.trim();
    const introduction = document.getElementById("edit-introduction").value.trim();
    const summary = document.getElementById("edit-summary").value.trim();
    const keywords = document.getElementById("edit-keywords").value.split(",").map((k) => k.trim()).filter((k) => k);

    // Collect quotes
    const quotes = [];
    document.querySelectorAll(".edit-quote-item").forEach((item, index) => {
      const title = item.querySelector(".quote-title")?.value.trim();
      const content = item.querySelector(".quote-content")?.value.trim();
      const pageNumber = item.querySelector(".quote-page")?.value.trim();

      if (title && content) {
        quotes.push({
          id: index + 1,
          title,
          content,
          pageNumber: pageNumber || "",
        });
      }
    });

    // Collect reflections
    const reflections = [];
    document.querySelectorAll(".edit-reflection-item").forEach((item, index) => {
      const title = item.querySelector(".reflection-title")?.value.trim();
      const content = item.querySelector(".reflection-content")?.value.trim();

      if (title && content) {
        reflections.push({
          id: index + 1,
          title,
          content,
        });
      }
    });

    if (!title || !author || !introduction || !summary || keywords.length === 0) {
      showToast("タイトル、著者、導入、本の要約、キーワードは必須項目です", "warning", "入力エラー");
      return;
    }

    const bookData = {
      title,
      author,
      imageUrl: imageUrl || "",
      introduction,
      summary,
      quotes,
      reflections,
      keywords,
    };

    if (bookId) {
      // Update
      const localBook = booksData.find((b) => b.id === bookId);
      const firestoreId = localBook?.firestoreId || bookId.toString();
      const bookRef = doc(db, "books", firestoreId);
      
      // Check if doc exists
      const docSnap = await getDoc(bookRef);
      if (docSnap.exists()) {
         await updateDoc(bookRef, bookData);
      } else {
         await setDoc(bookRef, bookData, { merge: true });
      }

      showToast("本の情報を保存しました", "success");
    } else {
      // Create
      await addDoc(collection(db, "books"), bookData);
      showToast("新しい本を追加しました", "success");
    }

    await loadBooksFromFirestore();
    showScreen("list");
  } catch (error) {
    console.error("Save error:", error);
    showToast("保存に失敗しました: " + error.message, "error", "保存エラー");
  }
}

export async function deleteBook(bookId) {
  if (!confirm("本当に削除しますか？")) {
    return;
  }

  try {
    const localBook = booksData.find((b) => b.id === bookId);
    const firestoreId = localBook?.firestoreId || bookId.toString();
    const bookRef = doc(db, "books", firestoreId);
    
    await deleteDoc(bookRef);
    showToast("本を削除しました", "success");
    await loadBooksFromFirestore();
    showScreen("list");
  } catch (error) {
    console.error("Delete error:", error);
    showToast("削除に失敗しました: " + error.message, "error", "削除エラー");
  }
}
