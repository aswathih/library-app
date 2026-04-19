"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

type LibraryItem = {
  id: string;
  status: string;
  book: { title: string; author: string; coverUrl: string };
  owner: { name: string; id: string };
  borrowRecords?: { borrower: { name: string; id: string } }[];
};

export default function Home() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchItems = () => {
    fetch("/api/library")
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setErrorMsg(data.error);
        } else {
          setItems(data);
          setErrorMsg(null);
        }
      });
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleBorrow = async (itemId: string) => {
    if (!currentUser) return;
    await fetch("/api/borrow", {
      method: "POST",
      body: JSON.stringify({ itemId, borrowerId: currentUser.id }),
    });
    fetchItems();
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const itemId = deleteConfirmId;
    setDeleteConfirmId(null);
    setItems((prev) => prev.filter(item => item.id !== itemId));
    await fetch(`/api/library/${itemId}`, { method: "DELETE" });
  };

  return (
    <div>
      <h2>Library Inventory</h2>
      {errorMsg && (
        <div style={{ color: '#ef4444', marginBottom: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px' }}>
          <strong>Error:</strong> {errorMsg} (Please check database connection)
        </div>
      )}
      <div className="glass table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Status</th>
              <th>Borrower</th>
              <th>Owner</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const currentBorrower = it.borrowRecords?.[0]?.borrower?.name || "None";
              return (
              <tr key={it.id}>
                <td>
                  <div style={{display: "flex", alignItems: "center", gap: "1rem"}}>
                    {it.book.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.book.coverUrl} alt="cover" style={{width: 40, height: 60, objectFit: "cover", borderRadius: "4px"}} />
                    ) : (
                      <div style={{width: 40, height: 60, background: "rgba(255,255,255,0.1)", borderRadius: "4px"}} />
                    )}
                    <span style={{fontWeight: 600}}>{it.book.title}</span>
                  </div>
                </td>
                <td>{it.book.author || "Unknown"}</td>
                <td>
                  <span className={`badge ${
                    it.status === "AVAILABLE" ? "badge-available" : 
                    it.status === "BORROWED" ? "badge-borrowed" :
                    it.status === "LOST" ? "badge-lost" :
                    "badge-external"
                  }`}>
                    {it.status.replace("_", " ")}
                  </span>
                </td>
                <td>{it.status === "BORROWED" ? currentBorrower : "—"}</td>
                <td>{it.owner.name}</td>
                <td>
                  <div style={{display: "flex", gap: "0.75rem", alignItems: "center"}}>
                    {it.status === "AVAILABLE" && it.owner.id !== currentUser?.id && (
                      <button className="btn btn-primary" style={{padding: "0.4rem 0.8rem", fontSize: "0.85rem"}} onClick={() => handleBorrow(it.id)}>Borrow</button>
                    )}
                    {it.owner.id === currentUser?.id && (
                      <span style={{color: "#94a3b8", fontSize: "0.85rem"}}>Your Book</span>
                    )}
                    {it.owner.id === currentUser?.id && (
                      <button onClick={() => setDeleteConfirmId(it.id)} style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', transition: 'transform 0.2s'}} title="Delete Book" onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
      {items.length === 0 && (
        <div className="glass" style={{padding: "3rem", textAlign: "center", marginTop: "2rem"}}>
          <h3>No books in the library yet!</h3>
          <p style={{marginTop: "1rem"}}>Go to Add Book to start building your collection.</p>
        </div>
      )}

      {deleteConfirmId && (
        <div style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100}}>
          <div className="glass" style={{padding: '2rem', maxWidth: '400px', textAlign: 'center'}}>
            <h3 style={{marginBottom: '1rem', color: 'white'}}>Confirm Deletion</h3>
            <p style={{marginBottom: '1.5rem', color: '#cbd5e1', lineHeight: '1.6'}}>Are you sure you want to delete this book? All traces of its history along with the borrowed details will be permanently removed.</p>
            <div style={{display: 'flex', gap: '1rem', justifyContent: 'center'}}>
              <button className="btn" onClick={() => setDeleteConfirmId(null)}>Cancel</button>
              <button className="btn btn-primary" style={{background: 'var(--danger)'}} onClick={confirmDelete}>OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
