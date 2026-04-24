'use client';

import React, { createContext, useContext } from 'react';
import Link from 'next/link';
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";

type User = { id: string; name: string; image?: string };

type AuthContextType = {
  currentUser: User | null;
};

const AuthContext = createContext<AuthContextType>({ currentUser: null });

export const useAuth = () => useContext(AuthContext);

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  
  const currentUser = session?.user ? { 
    id: (session.user as any).id, 
    name: session.user.name || "Unknown",
    image: session.user.image || undefined
  } : null;

  return (
    <AuthContext.Provider value={{ currentUser }}>
      <div className="navbar glass">
        <Link href="/"><h1>Library</h1></Link>
        <div className="nav-links">
          {currentUser && <Link href="/">Dashboard</Link>}
          {currentUser && <Link href="/my-books">My Books</Link>}
          {currentUser && <Link href="/add">Add Book</Link>}
          {currentUser && <Link href="/users">Readers</Link>}
          
          <div className="auth-select-wrapper" style={{background: 'transparent', padding: 0}}>
            {status === "loading" ? (
              <span style={{color: "#94a3b8"}}>Loading...</span>
            ) : currentUser ? (
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                {currentUser.image && <img src={currentUser.image} alt="User" style={{width: 32, height: 32, borderRadius: '50%'}} />}
                <span style={{fontWeight: 600}}>{currentUser.name}</span>
                <button onClick={() => signOut()} className="btn btn-primary" style={{padding: '0.4rem 0.8rem'}}>Sign Out</button>
              </div>
            ) : (
              <button onClick={() => signIn('google')} className="btn btn-primary" style={{padding: '0.5rem 1rem'}}>
                Sign In with Google
              </button>
            )}
          </div>
        </div>
      </div>
      <main className="container">
        {children}
      </main>
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProviderInner>
        {children}
      </AuthProviderInner>
    </SessionProvider>
  );
}
