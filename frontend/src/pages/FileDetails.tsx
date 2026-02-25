import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  FileText, Download, Clock, Eye, Globe, Lock, Trash2, ArrowLeft, Share2,
} from "lucide-react";
import { fileService, type UploadedFile } from "@/services/api";
import Layout from "@/components/Layout";
import ExpiryCountdown from "@/components/ExpiryCountdown";
import CopyLinkButton from "@/components/CopyLinkButton";
import { toast } from "@/hooks/use-toast";

const formatSize = (bytes: number) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + " GB";
};

const visibilityConfig = {
  public: { icon: Globe, label: "Public", className: "text-success" },
  private: { icon: Eye, label: "Private", className: "text-warning" },
  password: { icon: Lock, label: "Protected", className: "text-primary" },
};

const FileDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (id) {
      fileService.getFile(id)
        .then((data) => {
          setFile(data || null);
        })
        .catch((error) => {
          console.error('Failed to fetch file:', error);
          setFile(null);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id]);

  const handleDelete = async () => {
    if (!file) return;
    try {
      await fileService.deleteFile(file.id);
      toast({ title: "File deleted", description: `${file.name} has been removed.` });
      navigate("/dashboard");
    } catch {
      toast({ title: "Error", description: "Could not delete file.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!file) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-lg font-medium">File not found</p>
          <p className="text-sm text-muted-foreground mt-1">It may have expired or been deleted.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  const vis = visibilityConfig[file.visibility];
  const VisIcon = vis.icon;

  return (
    <Layout>
      <div className="mx-auto max-w-2xl slide-up space-y-6">
        {/* Back */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* File info card */}
        <div className="glass rounded-2xl p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary">
                <FileText className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">{file.name}</h1>
                <p className="text-sm text-muted-foreground font-mono">{formatSize(file.size)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {file.isExpired ? (
                <span className="rounded-full bg-expired/10 px-3 py-1 text-xs font-medium text-expired">
                  Expired
                </span>
              ) : (
                <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-success">
                  Active
                </span>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Expires in</p>
              <ExpiryCountdown expiresAt={file.expiresAt} isExpired={file.isExpired} />
            </div>
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Downloads</p>
              <p className="font-mono text-sm font-medium">
                {file.downloads}
                {file.downloadLimit && <span className="text-muted-foreground">/{file.downloadLimit}</span>}
              </p>
            </div>
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Visibility</p>
              <div className="flex items-center gap-1.5">
                <VisIcon className={`h-3.5 w-3.5 ${vis.className}`} />
                <span className="text-sm font-medium">{vis.label}</span>
              </div>
            </div>
            <div className="rounded-xl bg-secondary p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Expiration</p>
              <p className="text-sm font-medium font-mono">{file.expiration}</p>
            </div>
          </div>

          {/* Share URL */}
          <div className="rounded-xl bg-secondary p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Share Link</p>
            <div className="flex items-center justify-between gap-3">
              <code className="text-xs text-primary font-mono truncate">{file.url}</code>
              <CopyLinkButton url={file.url} />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowQR(!showQR)}
              className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <Share2 className="h-4 w-4" />
              {showQR ? "Hide QR" : "QR Code"}
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>

          {/* QR Code */}
          {showQR && (
            <div className="flex justify-center rounded-xl bg-foreground/5 p-6 fade-in">
              <div className="rounded-xl bg-white p-4">
                <QRCodeSVG
                  value={file.url}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#0d1117"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default FileDetails;
