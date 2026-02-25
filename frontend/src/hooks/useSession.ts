import { useState, useEffect, useCallback } from "react";
import type { UploadedFile } from "@/services/api";
import api from "@/services/api";

const SESSION_KEY = "flashix_session_id";
const SESSION_FILES_KEY = "flashix_session_files";
const SESSION_CREATED_KEY = "flashix_session_created";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const generateSessionId = (): string => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "ses_";
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
};

const createBackendSession = async (): Promise<string | null> => {
  try {
    const response = await api.post('/sessions/create');
    return response.data.data.session.sessionId;
  } catch (error) {
    console.error('Failed to create backend session:', error);
    return null;
  }
};

export const useSession = () => {
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionFiles, setSessionFiles] = useState<UploadedFile[]>([]);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  useEffect(() => {
    const initSession = async () => {
      let id = localStorage.getItem(SESSION_KEY);
      const created = localStorage.getItem(SESSION_CREATED_KEY);

      // Check if session expired locally
      if (id && created) {
        const elapsed = Date.now() - parseInt(created, 10);
        if (elapsed > SESSION_DURATION_MS) {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(SESSION_FILES_KEY);
          localStorage.removeItem(SESSION_CREATED_KEY);
          id = null;
          setIsSessionExpired(true);
        }
      }

      if (!id) {
        // Create session on backend
        const backendSessionId = await createBackendSession();
        
        if (backendSessionId) {
          id = backendSessionId;
          localStorage.setItem(SESSION_KEY, id);
          localStorage.setItem(SESSION_CREATED_KEY, String(Date.now()));
          localStorage.setItem(SESSION_FILES_KEY, "[]");
          setSessionId(id);
        } else {
          console.error('Failed to create backend session - retrying in 2 seconds');
          // Retry after 2 seconds
          setTimeout(() => {
            initSession();
          }, 2000);
          return;
        }
      } else {
        setSessionId(id);
      }

      // Load session files
      try {
        const stored = localStorage.getItem(SESSION_FILES_KEY);
        if (stored) setSessionFiles(JSON.parse(stored));
      } catch {
        setSessionFiles([]);
      }
    };

    initSession();
  }, []);

  const addFile = useCallback((file: UploadedFile) => {
    setSessionFiles((prev) => {
      const next = [file, ...prev];
      localStorage.setItem(SESSION_FILES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setSessionFiles((prev) => {
      const next = prev.filter((f) => f.id !== fileId);
      localStorage.setItem(SESSION_FILES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetSession = useCallback(async () => {
    // Create new session on backend
    const backendSessionId = await createBackendSession();
    
    const newId = backendSessionId || generateSessionId();
    localStorage.setItem(SESSION_KEY, newId);
    localStorage.setItem(SESSION_CREATED_KEY, String(Date.now()));
    localStorage.setItem(SESSION_FILES_KEY, "[]");
    setSessionId(newId);
    setSessionFiles([]);
    setIsSessionExpired(false);
  }, []);

  return { sessionId, sessionFiles, addFile, removeFile, resetSession, isSessionExpired };
};
