import { useState, useCallback } from "react";
import { Upload, X, FileText, Clock, Globe, Lock, Eye, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fileService } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSessionContext } from "@/contexts/SessionContext";

const expirationOptions = [
  { value: "10m", label: "10 min", minutes: 10 },
  { value: "1h", label: "1 hour", minutes: 60 },
  { value: "24h", label: "24 hours", minutes: 1440 },
  { value: "7d", label: "7 days", minutes: 10080 },
];

const visibilityOptions = [
  { value: "public" as const, label: "Public", icon: Globe, desc: "Anyone with the link" },
  { value: "private" as const, label: "Private", icon: Eye, desc: "Only you" },
  { value: "password" as const, label: "Password", icon: Lock, desc: "Requires password" },
];

const UploadZone = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addFile } = useSessionContext();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [expiration, setExpiration] = useState("24h");
  const [visibility, setVisibility] = useState<"public" | "private" | "password">("public");
  const [password, setPassword] = useState("");
  const [downloadLimit, setDownloadLimit] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;

    // Simple client-side size caps to differentiate modes (approx MB).
    const maxAnonymousMb = 25;
    const maxAuthedMb = 512;
    const sizeMb = file.size / (1024 * 1024);

    if (!isAuthenticated && sizeMb > maxAnonymousMb) {
      toast({
        title: "File too large for anonymous mode",
        description: `Anonymous uploads are limited to ~${maxAnonymousMb} MB. Sign in for higher limits.`,
        variant: "destructive",
      });
      return;
    }

    if (isAuthenticated && sizeMb > maxAuthedMb) {
      toast({
        title: "File too large",
        description: `This demo limits uploads to ~${maxAuthedMb} MB.`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      // Convert display expiration string to minutes for the backend API
      const expiryOption = expirationOptions.find((o) => o.value === expiration);
      const expiresInMinutes = expiryOption ? expiryOption.minutes : 1440;

      const result = await fileService.uploadFile({
        file,
        expiration,
        visibility,
        password: visibility === "password" ? password : undefined,
        downloadLimit: downloadLimit ? parseInt(downloadLimit) : undefined,
        expiresInMinutes,
      });
      // Track in anonymous session only when not authenticated
      if (!isAuthenticated) {
        addFile(result);
      }
      toast({
        title: "File uploaded!",
        description: `${file.name} is ready to share.`,
      });
      navigate(`/file/${result.id}`);
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { error?: { message?: string } }, message?: string }, message?: string })?.response?.data?.error?.message || (error as { message?: string })?.message || "Something went wrong. Please try again.";
      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="slide-up space-y-6">
      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all ${dragActive
            ? "border-primary bg-primary/5 glow"
            : file
              ? "border-success/50 bg-success/5"
              : "border-border hover:border-primary/50 hover:bg-primary/5"
          }`}
        onClick={() => !file && document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          onChange={handleFileSelect}
          className="hidden"
        />

        {file ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <FileText className="h-12 w-12 text-success" />
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="flex items-center gap-1 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
            >
              <X className="h-3 w-3" />
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Drop your file here</p>
              <p className="text-xs text-muted-foreground">or click to browse</p>
            </div>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Expiration */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Expiration
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {expirationOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setExpiration(opt.value)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${expiration === opt.value
                    ? "bg-primary text-primary-foreground glow"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Visibility */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Eye className="h-4 w-4 text-muted-foreground" />
            Visibility
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {visibilityOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setVisibility(opt.value)}
                className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${visibility === opt.value
                    ? "bg-primary text-primary-foreground glow"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
              >
                <opt.icon className="h-4 w-4" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Password */}
        {visibility === "password" && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set a password"
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}

        {/* Download limit */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Download className="h-4 w-4 text-muted-foreground" />
            Download Limit
          </label>
          <input
            type="number"
            value={downloadLimit}
            onChange={(e) => setDownloadLimit(e.target.value)}
            placeholder="Unlimited"
            min="1"
            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed glow"
      >
        {uploading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            Upload & Share
          </>
        )}
      </button>
    </div>
  );
};

export default UploadZone;
