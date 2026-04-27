import { prisma } from "@/lib/prisma";
import Link from "next/link";
import BorrowButton from "@/components/BorrowButton";

export const dynamic = 'force-dynamic';

export default async function UserProfilePage({ params }: { params: { id: string } }) {
  const targetUser = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      ownedItems: {
        include: {
          book: true
        }
      }
    }
  });

  if (!targetUser) {
    return <div style={{padding: "2rem", textAlign: "center"}}>Reader not found.</div>;
  }

  return (
    <div>
      <div style={{display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem"}}>
        <Link href="/users" style={{color: "#3b82f6", textDecoration: "none", fontWeight: 600}}>
          ← Back to Readers
        </Link>
      </div>

      <div className="glass" style={{padding: "2rem", display: "flex", alignItems: "center", gap: "2rem", marginBottom: "3rem"}}>
        {targetUser.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={targetUser.image} alt={targetUser.name || "Reader"} style={{width: 80, height: 80, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.2)"}} />
        ) : (
          <div style={{width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem"}}>👤</div>
        )}
        <div>
          <h2 style={{margin: 0}}>{targetUser.name}&apos;s Library</h2>
          <p style={{color: "#94a3b8", margin: "0.5rem 0 0"}}>{targetUser.ownedItems.length} Books available to borrow</p>
        </div>
      </div>

      <div className="book-grid">
        {targetUser.ownedItems.map(item => (
          <div key={item.id} className="card glass">
            {item.book.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.book.coverUrl} alt="Cover" style={{width: '100%', height: '220px', objectFit: 'cover', borderRadius: '4px', marginBottom: '1rem'}} />
            )}
            <h3 style={{marginBottom: "0.25rem", fontSize: "1.1rem"}}>{item.book.title}</h3>
            <p style={{color: "#94a3b8", fontSize: "0.9rem", marginBottom: "1rem"}}>{item.book.author}</p>
            <div style={{marginTop: "auto"}}>
               <BorrowButton itemId={item.id} ownerId={targetUser.id} status={item.status} />
            </div>
          </div>
        ))}
        {targetUser.ownedItems.length === 0 && (
           <p style={{gridColumn: "1 / -1", textAlign: "center", color: "#94a3b8", padding: "2rem"}}>They haven&apos;t shared any books yet.</p>
        )}
      </div>
    </div>
  );
}
