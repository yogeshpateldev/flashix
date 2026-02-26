import { Link } from "react-router-dom";
import { FileText, Image, Video, FileCode, File, Lock, Globe, Eye, Download } from "lucide-react";
import type { UploadedFile } from "@/services/api";
import ExpiryCountdown from "./ExpiryCountdown";
import CopyLinkButton from "./CopyLinkButton";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

const getFileIcon = (type: string) => {
  if (type.startsWith("image/")) return Image;
  if (type.startsWith("video/")) return Video;
  if (type.includes("pdf") || type.includes("text")) return FileText;
  if (type.includes("javascript") || type.includes("json") || type.includes("html")) return FileCode;
  return File;
};

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

const FileCard = ({ file }: { file: UploadedFile }) => {
  const Icon = getFileIcon(file.type);
  const vis = visibilityConfig[file.visibility];
  const VisIcon = vis.icon;

  return (
    <Link
      to={`/file/${file.id}`}
      className={`group glass rounded-xl p-4 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 ${file.isExpired ? "opacity-60" : ""
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium group-hover:text-primary transition-colors">
              {file.name}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {formatSize(file.size)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <VisIcon className={`h-3.5 w-3.5 ${vis.className}`} />
          {file.isExpired ? (
            <span className="rounded-full bg-expired/10 px-2 py-0.5 text-[10px] font-medium text-expired">
              Expired
            </span>
          ) : (
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
              Active
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
        <ExpiryCountdown expiresAt={file.expiresAt} isExpired={file.isExpired} />

        <div className="flex items-center gap-2">
          {/* Download count */}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Download className="h-3 w-3" />
            {file.downloads}
            {file.downloadLimit && `/${file.downloadLimit}`}
          </span>

          {/* Download button — stops propagation so the card link doesn't fire */}
          {!file.isExpired && (
            <div onClick={(e) => e.preventDefault()}>
              <a
                href={`${API_BASE}/files/${file.id}/download`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                title="Download file"
              >
                <Download className="h-3 w-3" />
                Download
              </a>
            </div>
          )}

          <div onClick={(e) => e.preventDefault()}>
            <CopyLinkButton url={file.url} />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default FileCard;
