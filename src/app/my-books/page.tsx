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

export default function MyBooks() {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

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
    fetch("/api/users").then(res => res.json()).then(setUsers);
  }, []);

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const itemId = deleteConfirmId;
    setDeleteConfirmId(null);
    setItems((prev) => prev.filter(item => item.id !== itemId));
    await fetch(`/api/library/${itemId}`, { method: "DELETE" });
  };

  const handleStatusChange = async (itemId: string, newStatus: string) => {
    setItems((prev) => prev.map(item => item.id === itemId ? { ...item, status: newStatus } : item));
    await fetch(`/api/library/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
  };

  const handleBorrowerChange = async (itemId: string, targetId: string) => {
    if (targetId === "OTHERS") {
      await handleStatusChange(itemId, "EXTERNAL_BORROW");
    } else if (targetId) {
      await fetch("/api/borrow", {
        method: "POST",
        body: JSON.stringify({ itemId, borrowerId: targetId }),
      });
      fetchItems();
    }
  };

  if (!currentUser) return <div>Loading user context...</div>;

  const myBooks = items.filter(it => it.owner.id === currentUser.id);

  return (
    <div>
      <h2>My Books</h2>
      <p style={{marginBottom: "2rem", color: "#cbd5e1"}}>A complete history of all the books you have shared to the library.</p>
      
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
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {myBooks.map((it) => {
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
                  <select
                    className="status-select"
                    value={it.status}
                    onChange={(e) => handleStatusChange(it.id, e.target.value)}
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="BORROWED">Borrowed (Internal)</option>
                    <option value="LOST">Lost</option>
                    <option value="EXTERNAL_BORROW">External Borrow</option>
                  </select>
                </td>
                <td>
                  <select
                    className="status-select"
                    value={
                      it.status === "EXTERNAL_BORROW" ? "OTHERS" :
                      (it.status === "BORROWED" ? (it.borrowRecords?.[0]?.borrower?.id || "") : "")
                    }
                    onChange={(e) => handleBorrowerChange(it.id, e.target.value)}
                    disabled={it.status === "AVAILABLE" || it.status === "LOST"}
                    style={{ opacity: (it.status === "AVAILABLE" || it.status === "LOST") ? 0.5 : 1 }}
                  >
                    <option value="" disabled>—</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                    <option value="OTHERS">OTHERS</option>
                  </select>
                </td>
                <td>
                  <button onClick={() => setDeleteConfirmId(it.id)} style={{background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', transition: 'transform 0.2s', padding: '0.4rem'}} title="Delete Book" onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                    🗑️
                  </button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
      {myBooks.length === 0 && (
        <div className="glass" style={{padding: "3rem", textAlign: "center", marginTop: "2rem"}}>
          <h3>You haven't added any books yet!</h3>
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
