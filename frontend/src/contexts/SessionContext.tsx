import React, { createContext, useContext } from "react";
import { useSession } from "@/hooks/useSession";
import type { UploadedFile } from "@/services/api";

interface SessionState {
  sessionId: string;
  sessionFiles: UploadedFile[];
  addFile: (file: UploadedFile) => void;
  removeFile: (fileId: string) => void;
  resetSession: () => void;
  isSessionExpired: boolean;
}

const SessionContext = createContext<SessionState | undefined>(undefined);

export const useSessionContext = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSessionContext must be used within SessionProvider");
  return context;
};

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const session = useSession();

  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
};
