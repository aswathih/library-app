import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: { ownedItems: true }
      }
    }
  });

  return (
    <div>
      <h2>Reader Profiles</h2>
      <p style={{marginBottom: "2rem", color: "#cbd5e1"}}>Browse the amazing readers who are part of our library!</p>
      
      <div className="book-grid">
        {users.map(user => (
          <div key={user.id} className="card glass" style={{alignItems: 'center', textAlign: 'center', padding: '2rem'}}>
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={user.image} 
                alt={user.name || "Reader"} 
                style={{width: "120px", height: "120px", borderRadius: "50%", objectFit: "cover", marginBottom: "1rem", border: "3px solid rgba(255,255,255,0.2)"}} 
              />
            ) : (
              <div style={{width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem", marginBottom: "1rem", border: "3px solid rgba(255,255,255,0.2)"}}>
                👤
              </div>
            )}
            <h3 style={{marginBottom: "0.5rem", fontSize: "1.2rem"}}>{user.name || "Anonymous Reader"}</h3>
            <p style={{color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1rem"}}>{user.email || ""}</p>
            
            <div className="badge badge-available" style={{display: "inline-block"}}>
              {user._count.ownedItems} Books Shared
            </div>
          </div>
        ))}
        {users.length === 0 && (
          <div className="glass" style={{padding: "3rem", textAlign: "center", gridColumn: "1 / -1"}}>
            <h3>No readers found!</h3>
          </div>
        )}
      </div>
    </div>
  );
}
