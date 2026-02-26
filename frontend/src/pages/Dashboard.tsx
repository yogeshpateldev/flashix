import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Upload, Filter, BarChart2, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSessionContext } from "@/contexts/SessionContext";
import { fileService, type UploadedFile } from "@/services/api";
import Layout from "@/components/Layout";
import FileCard from "@/components/FileCard";

type SortKey = "date" | "expiry" | "name";
type FilterKey = "all" | "active" | "expired";

const Dashboard = () => {
  const { isAuthenticated } = useAuth();
  const { sessionFiles, isSessionExpired, resetSession } = useSessionContext();
  const location = useLocation();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [filter, setFilter] = useState<FilterKey>("all");

  const fetchFiles = useCallback(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fileService
      .getFiles()
      .then((data) => {
        console.log('Dashboard: Fetched files:', data);
        setFiles(data);
      })
      .catch((error) => {
        console.error('Failed to fetch files:', error);
      })
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  // Re-fetch whenever we land on the dashboard (covers post-delete navigation)
  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, location.key]);

  // Check if we're coming from a deletion and refresh files
  useEffect(() => {
    if (location.state?.refresh) {
      fetchFiles();
      // Clear the state to avoid infinite refreshes
      window.history.replaceState({}, document.title);
    }
  }, [location.state, fetchFiles]);

  // Refresh when window gains focus (user returns from file details)
  useEffect(() => {
    const handleFocus = () => {
      if (isAuthenticated) {
        fetchFiles();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isAuthenticated, fetchFiles]);

  const filteredFiles = useMemo(() => {
    const source = isAuthenticated ? files : sessionFiles;

    let result = source.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

    if (filter === "active") result = result.filter((f) => !f.isExpired);
    if (filter === "expired") result = result.filter((f) => f.isExpired);

    result = [...result].sort((a, b) => {
      if (sort === "date") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "expiry") return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [files, sessionFiles, search, sort, filter, isAuthenticated]);

  const activeCount = (isAuthenticated ? files : sessionFiles).filter((f) => !f.isExpired).length;
  const expiredCount = (isAuthenticated ? files : sessionFiles).filter((f) => f.isExpired).length;

  const totalDownloads = (isAuthenticated ? files : sessionFiles).reduce(
    (acc, f) => acc + f.downloads,
    0
  );

  if (!isAuthenticated && isSessionExpired) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center slide-up">
          <div className="glass rounded-2xl p-8 max-w-md space-y-4">
            <h2 className="text-lg font-bold">Session expired</h2>
            <p className="text-sm text-muted-foreground">
              Your anonymous session has expired. Start a new one to continue sharing files.
            </p>
            <button
              onClick={resetSession}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 glow"
            >
              <RefreshCw className="h-4 w-4" />
              New session
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="slide-up space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isAuthenticated ? "Dashboard" : "My session files"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {activeCount} active · {expiredCount} expired · {totalDownloads} downloads
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={fetchFiles}
                disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground transition-all hover:bg-secondary/80 disabled:opacity-50"
                title="Refresh file list"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            )}
            <Link
              to="/upload"
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 glow"
            >
              <Upload className="h-4 w-4" />
              Upload File
            </Link>
          </div>
        </div>

        {/* Analytics (logged in) */}
        {isAuthenticated && (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-secondary p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total files</p>
              <p className="mt-1 text-xl font-semibold">{files.length}</p>
            </div>
            <div className="rounded-xl bg-secondary p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total downloads</p>
              <p className="mt-1 text-xl font-semibold">{totalDownloads}</p>
            </div>
            <div className="rounded-xl bg-secondary p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
                <p className="mt-1 text-sm font-semibold">
                  {activeCount} active · {expiredCount} expired
                </p>
              </div>
              <BarChart2 className="h-6 w-6 text-primary" />
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search files..."
              className="w-full rounded-lg border border-border bg-secondary pl-10 pr-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
              {(["all", "active", "expired"] as FilterKey[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all ${filter === f
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Filter className="mr-1 inline-block h-3 w-3" />
                  {f}
                </button>
              ))}
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground focus:border-primary focus:outline-none"
            >
              <option value="date">Latest</option>
              <option value="expiry">Expiry</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {/* File list */}
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass animate-pulse rounded-xl p-4 h-28" />
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary mb-4">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No files found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {search
                ? "Try a different search term"
                : isAuthenticated
                  ? "Upload your first file to get started"
                  : "Files uploaded in this session will appear here"}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredFiles.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
