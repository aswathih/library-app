import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import ApprovalForm from "./ApprovalForm";
import NotificationsPrompt from "./NotificationsPrompt";

export default async function RequestsDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return <div style={{padding: "2rem"}}>Please log in to manage requests.</div>;
  
  const user = await prisma.user.findUnique({
     where: { email: session.user.email! }
  });
  if (!user) return null;
  
  const incomingRequests = await prisma.borrowRequest.findMany({
    where: { ownerId: user.id, status: "PENDING" },
    include: { requester: true, book: { include: { book: true } } }
  });

  // Pull all reminders meant for THIS user
  const reminders = await prisma.reminder.findMany({
    where: { targetUserId: user.id },
    include: { creator: true, target: true, book: { include: { book: true } } }
  });

  return (
    <div>
      <h2>Manage Requests & Reminders</h2>
      <NotificationsPrompt userId={user.id} />

      <h3 style={{marginTop: "2rem", marginBottom: "1rem"}}>Incoming Requests</h3>
      {incomingRequests.length === 0 ? <p style={{color: "#94a3b8"}}>No pending borrow requests right now.</p> : null}
      
      {incomingRequests.map(req => (
        <div key={req.id} className="card glass" style={{marginBottom: "1rem"}}>
           <p style={{fontSize: "1.1rem"}}>
             <strong style={{color: "#fff"}}>{req.requester.name}</strong> wants to borrow <strong>&quot;{req.book.book.title}&quot;</strong>
           </p>
           <ApprovalForm requestId={req.id} />
        </div>
      ))}
      
      <h3 style={{marginTop: "3rem", marginBottom: "1rem"}}>Scheduled Handovers</h3>
      {reminders.length === 0 ? <p style={{color: "#94a3b8"}}>No upcoming handovers.</p> : null}
      {reminders.map(rem => (
         <div key={rem.id} className="card glass" style={{marginBottom: "1rem", borderLeft: "4px solid #3b82f6"}}>
           <p style={{fontSize: "1.1rem"}}>
             Hand over <strong>&quot;{rem.book.book.title}&quot;</strong> on <strong style={{color: "#3b82f6"}}>{new Date(rem.reminderDate).toDateString()}</strong>
           </p>
           <p style={{color: "#94a3b8", fontSize: "0.9rem", marginTop: "0.5rem"}}>
             Scheduled with {rem.creator.name}
           </p>
         </div>
      ))}
    </div>
  )
}
