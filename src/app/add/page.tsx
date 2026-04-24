"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useZxing } from "react-zxing";

type BookResult = {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: { thumbnail: string };
  }
};

function ScannerModal({ onResult, onClose }: { onResult: (text: string) => void, onClose: () => void }) {
  const { ref } = useZxing({
    constraints: { 
      video: { 
        facingMode: "environment",
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        // @ts-ignore - focusMode is an experimental property but essential for Android autofocus
        advanced: [{ focusMode: "continuous" }]
      } 
    },
    onResult(result) {
      onResult(result.getText());
    },
  });

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', width: '100%', height: '75%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video ref={ref} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover' }} autoPlay playsInline muted />
        
        {/* Visual Scanner Guide Overlay */}
        <div style={{
          position: 'absolute',
          width: '80%',
          maxWidth: '350px',
          height: '150px',
          border: '4px solid rgba(16, 185, 129, 0.8)',
          borderRadius: '12px',
          boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.5)',
          zIndex: 10
        }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: '2px', background: 'rgba(239, 68, 68, 0.8)', animation: 'scan 2s infinite linear' }} />
        </div>
      </div>
      
      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: '#0f172a', flex: 1, boxShadow: '0 -4px 20px rgba(0,0,0,0.5)', zIndex: 11 }}>
        <p style={{ color: 'white', fontWeight: 600, fontSize: '1.1rem', textAlign: 'center' }}>Align back camera exactly over barcode</p>
        <button className="btn btn-primary" style={{ background: '#ef4444', padding: '0.8rem 2rem' }} onClick={onClose}>Cancel Scan</button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(-75px); }
          50% { transform: translateY(75px); }
          100% { transform: translateY(-75px); }
        }
      `}} />
    </div>
  );
}

export default function AddBook() {
  const { currentUser } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);

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

  const handleBarcodeScan = (isbn: string) => {
    // Play a quick success beep natively perfectly compatible with phones
    const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU");
    audio.play().catch(() => {}); // silent catch if browser blocks autoplay

    setShowScanner(false);
    setQuery(isbn); // Auto fill search box for visual feedback
    searchBooks(isbn); // Trigger search!
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
      {showScanner && (
        <ScannerModal onClose={() => setShowScanner(false)} onResult={handleBarcodeScan} />
      )}

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
        
        <button 
          className="btn" 
          onClick={() => setShowScanner(true)}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
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
          <span style={{fontSize: '1.5rem'}}>📸</span> 
          <span>Snap the Barcode</span>
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
