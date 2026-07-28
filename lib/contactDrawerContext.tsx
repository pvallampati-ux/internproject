"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ContactDrawerContextValue {
  openContactId: string | null;
  openDrawer: (contactId: string) => void;
  closeDrawer: () => void;
}

const ContactDrawerContext = createContext<ContactDrawerContextValue | null>(null);

export function ContactDrawerProvider({ children }: { children: ReactNode }) {
  const [openContactId, setOpenContactId] = useState<string | null>(null);
  const openDrawer = useCallback((id: string) => setOpenContactId(id), []);
  const closeDrawer = useCallback(() => setOpenContactId(null), []);

  return (
    <ContactDrawerContext.Provider value={{ openContactId, openDrawer, closeDrawer }}>
      {children}
    </ContactDrawerContext.Provider>
  );
}

// Any component can call useContactDrawer().openDrawer(contact.id) to pop
// the universal drawer open instead of navigating away — the drawer is
// mounted once in app/layout.tsx.
export function useContactDrawer(): ContactDrawerContextValue {
  const ctx = useContext(ContactDrawerContext);
  if (!ctx) throw new Error("useContactDrawer must be used within ContactDrawerProvider");
  return ctx;
}
