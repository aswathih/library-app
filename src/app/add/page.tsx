"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import Tesseract from "tesseract.js";

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
  const [ocrLoading, setOcrLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchBooks = async (searchQuery: string) => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=12`);
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

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchBooks(query);
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setScanStatus("Analyzing book cover...");
    
    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            setScanStatus(`Reading text: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      let text = result.data.text;
      // Clean up string
      text = text.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Grab top 5 longest words to simulate title/author searching safely ignoring small noise
      const words = text.split(' ').filter(w => w.length > 2);
      const topWords = words.slice(0, 7).join(' ');
      
      const definitiveQuery = topWords || text;
      setQuery(definitiveQuery);
      setScanStatus("Found text! Searching...");
      
      searchBooks(definitiveQuery);
    } catch (err) {
      console.error(err);
      setToast({ msg: "Couldn't read the cover clearly. Try typing it instead!", type: 'error' });
      setTimeout(() => setToast(null), 4000);
    }
    
    setOcrLoading(false);
    setScanStatus("");
    if (fileInputRef.current) fileInputRef.current.value = "";
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

      <div style={{display: "flex", gap: "1rem", marginBottom: "2rem", flexDirection: "column"}}>
        <form onSubmit={handleManualSearch} style={{display: "flex", gap: "1rem"}}>
          <input 
            type="text" 
            className="input" 
            placeholder="Search by title or author..." 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
          />
          <button type="submit" className="btn btn-primary" disabled={loading || ocrLoading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        <div style={{display: "flex", alignItems: "center", gap: "1rem"}}>
          <div style={{flex: 1, height: "1px", background: "rgba(255,255,255,0.1)"}}></div>
          <span style={{color: "#94a3b8", fontSize: "0.9rem"}}>OR FOR KIDS</span>
          <div style={{flex: 1, height: "1px", background: "rgba(255,255,255,0.1)"}}></div>
        </div>

        <input 
          type="file" 
          accept="image/*" 
          capture="environment" 
          ref={fileInputRef} 
          style={{display: "none"}} 
          onChange={handleImageCapture}
        />
        
        <button 
          className="btn" 
          onClick={() => fileInputRef.current?.click()}
          disabled={ocrLoading || loading}
          style={{
            background: ocrLoading ? 'var(--bg-card)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white',
            padding: '1rem',
            fontSize: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
          }}
        >
          {ocrLoading ? (
            <span>Processing...</span>
          ) : (
            <>
              <span style={{fontSize: '1.5rem'}}>📷</span> 
              <span>Snap Book Cover</span>
            </>
          )}
        </button>
        {scanStatus && (
          <p style={{textAlign: "center", color: "#60a5fa", marginTop: "0.5rem", fontWeight: 500}}>
            {scanStatus}
          </p>
        )}
      </div>

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
