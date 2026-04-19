"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";

type BookResult = {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: { thumbnail: string };
  }
};

export default function AddBook() {
  const { currentUser } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  const searchBooks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setLoading(true);
    try {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12`);
      const data = await res.json();
      const mappedBooks: BookResult[] = (data.docs || []).map((doc: any) => ({
        id: doc.key,
        volumeInfo: {
          title: doc.title,
          authors: doc.author_name,
          imageLinks: doc.cover_i ? { thumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` } : undefined,
        }
      }));
      setResults(mappedBooks);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const addBookToLibrary = async (book: BookResult) => {
    if (!currentUser) return;
    
    const payload = {
      ownerId: currentUser.id,
      bookId: book.id,
      title: book.volumeInfo.title,
      author: book.volumeInfo.authors?.join(", ") || "Unknown",
      coverUrl: book.volumeInfo.imageLinks?.thumbnail?.replace("http:", "https:") || "",
    };

    try {
      const res = await fetch("/api/books", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ msg: `Added "${payload.title}" to your library!`, type: 'success' });
      } else {
        setToast({ msg: data.error || "Failed to add book.", type: 'error' });
      }
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error(err);
      setToast({ msg: "An unexpected error occurred.", type: 'error' });
      setTimeout(() => setToast(null), 4000);
    }
  };

  if (!currentUser) {
    return <div>Loading user context...</div>;
  }

  return (
    <div>
      <h2>Add a Book to Inventory</h2>
      <p style={{marginBottom: "2rem"}}>Search for a book you own to add it to the shared library.</p>
      
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            {toast.msg}
          </div>
        </div>
      )}

      <form onSubmit={searchBooks} style={{display: "flex", gap: "1rem", marginBottom: "2rem"}}>
        <input 
          type="text" 
          className="input" 
          placeholder="Search by title or author..." 
          value={query} 
          onChange={e => setQuery(e.target.value)} 
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="book-grid">
        {results.map(b => (
          <div key={b.id} className="card glass">
            {b.volumeInfo.imageLinks?.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.volumeInfo.imageLinks.thumbnail.replace("http:", "https:")} alt={b.volumeInfo.title} className="w-full" style={{height: "300px", objectFit: "cover"}} />
            ) : (
              <div className="card-img-placeholder">No Cover</div>
            )}
            <div className="card-content">
              <div className="card-title">{b.volumeInfo.title}</div>
              <div className="card-subtitle">{b.volumeInfo.authors?.join(", ") || "Unknown"}</div>
              <div className="mt-4" style={{marginTop: 'auto'}}>
                <button className="btn btn-success w-full" onClick={() => addBookToLibrary(b)}>
                  Add to My Books
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
