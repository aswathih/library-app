"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Html5Qrcode } from "html5-qrcode";

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'success'|'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2000);
  };

  const searchBooks = async (searchQuery: string, isIsbn = false) => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const queryParam = isIsbn ? `isbn=${encodeURIComponent(searchQuery)}` : `q=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(`https://openlibrary.org/search.json?${queryParam}&limit=12`);
      
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
      
      if (isIsbn && mappedBooks.length === 0) {
         showToast(`Book with ISBN ${searchQuery} not found. Try searching its Title manually!`, 'error');
      } else if (isIsbn && mappedBooks.length > 0) {
         showToast(`Barcode Scanned! Found: ${mappedBooks[0].volumeInfo.title}`, 'success');
      }
      
    } catch (err) {
      console.error(err);
      showToast(`Network error retrieving book info.`, 'error');
    }
    setLoading(false);
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchBooks(query, false);
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    showToast("Analyzing barcode image...", 'success');
    
    try {
      const html5QrCode = new Html5Qrcode("hidden-scanner-div");
      const decodedText = await html5QrCode.scanFile(file, true);
      const cleanDigits = decodedText.replace(/[^0-9]/g, '');
      
      if (cleanDigits.length < 9) {
        showToast(`Scanned code is too short to be an ISBN.`, 'error');
      } else {
        const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU");
        audio.play().catch(() => {});
        setQuery(cleanDigits);
        searchBooks(cleanDigits, true);
      }
      html5QrCode.clear();
    } catch (err) {
      console.error(err);
      showToast("No readable barcode found in that photo! Make sure it's crisp and centered.", 'error');
    }
    
    setIsProcessing(false);
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
        showToast(`Added "${payload.title}" to your library!`, 'success');
      } else {
        showToast(data.error || "Failed to add book.", 'error');
      }
    } catch (err) {
      console.error(err);
      showToast("An unexpected error occurred.", 'error');
    }
  };

  if (!currentUser) {
    return <div>Loading user context...</div>;
  }

  return (
    <div>
      {/* Hidden div required by html5-qrcode for memory processing */}
      <div id="hidden-scanner-div" style={{ display: 'none' }}></div>

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
        <form onSubmit={handleManualSearch} style={{display: "flex", gap: "1rem", flexWrap: "wrap"}}>
          <input 
            type="text" 
            className="input" 
            placeholder="Search by title, author, or ISBN..." 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            style={{ flex: "1 1 200px" }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: "0 0 auto" }}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
        
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
          disabled={isProcessing}
          style={{
            background: isProcessing ? 'gray' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            padding: '1rem',
            fontSize: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
            marginTop: '0.5rem'
          }}
        >
          {isProcessing ? (
             <span>Analyzing Photo...</span>
          ) : (
            <>
              <span style={{fontSize: '1.5rem'}}>📸</span> 
              <span>Snap the Barcode</span>
            </>
          )}
        </button>
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
        {results.length === 0 && query && !loading && (
          <div className="glass" style={{padding: "2rem", gridColumn: "1 / -1", textAlign: "center"}}>
            <p>No books found. Try a different search!</p>
          </div>
        )}
      </div>
    </div>
  );
}
