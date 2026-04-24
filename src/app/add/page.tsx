"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

type BookResult = {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: { thumbnail: string };
  }
};

function ScannerModal({ onResult, onClose }: { onResult: (text: string) => void, onClose: () => void }) {
  useEffect(() => {
    let html5QrCode: Html5Qrcode;

    const timer = setTimeout(() => {
      try {
        html5QrCode = new Html5Qrcode("reader");
        
        const config = { 
          fps: 10, 
          qrbox: { width: 250, height: 150 }, 
          // Strictly look for ISBN barcodes for massive performance boost
          formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13]
        };
        
        html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            // Play native beep
            const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU");
            audio.play().catch(() => {});
            
            // Stop scanning and return result safely
            if (html5QrCode.isScanning) {
               html5QrCode.stop().then(() => onResult(decodedText)).catch(() => onResult(decodedText));
            } else {
               onResult(decodedText);
            }
          },
          () => {} // Ignore continuous noise errors
        ).catch(console.error);
      } catch (err) {
        console.error("Failed to initialize scanner", err);
      }
    }, 150); // slight buffer for React DOM paint sync

    return () => {
      clearTimeout(timer);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [onResult]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', background: '#0f172a', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <p style={{ color: 'white', fontWeight: 600, fontSize: '1.2rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          Align the ISBN barcode inside the box
        </p>
        {/* The target ID reader where HTML5Qrcode injects the stream */}
        <div id="reader" style={{ width: '100%', maxWidth: '400px', background: 'black', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}></div>
      </div>
      
      {/* Footer Anchored definitively to the bottom so "Cancel" never gets cut off */}
      <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', background: '#0f172a', boxShadow: '0 -4px 20px rgba(0,0,0,0.5)', zIndex: 11 }}>
        <button className="btn btn-primary" style={{ background: '#ef4444', padding: '1rem 3rem', fontSize: '1.2rem', borderRadius: '50px' }} onClick={onClose}>
          Cancel Scan
        </button>
      </div>
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
    setShowScanner(false);
    setQuery(isbn); 
    searchBooks(isbn);
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
