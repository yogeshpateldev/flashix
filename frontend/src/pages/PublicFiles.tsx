import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Upload, Filter, BarChart2, Globe, Users } from "lucide-react";
import { publicService, type UploadedFile } from "@/services/api";
import Layout from "@/components/Layout";
import FileCard from "@/components/FileCard";

type SortKey = "date" | "expiry" | "name" | "downloads";
type FilterKey = "all" | "active" | "expired";

const PublicFiles = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("date");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [stats, setStats] = useState({ total: 0, active: 0, expired: 0 });

  useEffect(() => {
    fetchFiles();
  }, [pagination.page, sort, filter]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const result = await publicService.getPublicFiles({
        page: pagination.page,
        limit: pagination.limit,
        sort,
        search: search || undefined,
      });
      
      setFiles(result.files);
      setPagination(result.pagination);
      setStats(result.stats);
    } catch (error) {
      console.error('Failed to fetch public files:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = useMemo(() => {
    let result = files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

    if (filter === "active") result = result.filter((f) => !f.isExpired);
    if (filter === "expired") result = result.filter((f) => f.isExpired);

    result = [...result].sort((a, b) => {
      if (sort === "date") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "expiry") return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      if (sort === "downloads") return b.downloads - a.downloads;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [files, search, sort, filter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles();
  };

  const handleSortChange = (newSort: SortKey) => {
    setSort(newSort);
  };

  const handleFilterChange = (newFilter: FilterKey) => {
    setFilter(newFilter);
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <Layout>
      <div className="slide-up space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              Public Files
            </h1>
            <p className="text-sm text-muted-foreground">
              {stats.total} total · {stats.active} active · {stats.expired} expired
            </p>
          </div>
          <Link
            to="/upload"
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 glow"
          >
            <Upload className="h-4 w-4" />
            Upload File
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-secondary p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total files</p>
            <p className="mt-1 text-xl font-semibold">{stats.total}</p>
          </div>
          <div className="rounded-xl bg-secondary p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active</p>
            <p className="mt-1 text-xl font-semibold text-green-600">{stats.active}</p>
          </div>
          <div className="rounded-xl bg-secondary p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Expired</p>
            <p className="mt-1 text-xl font-semibold text-red-600">{stats.expired}</p>
          </div>
          <div className="rounded-xl bg-secondary p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Downloads</p>
              <p className="mt-1 text-sm font-semibold">
                {files.reduce((acc, f) => acc + f.downloads, 0)}
              </p>
            </div>
            <BarChart2 className="h-6 w-6 text-primary" />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form onSubmit={handleSearch} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search public files..."
              className="w-full rounded-lg border border-border bg-secondary pl-10 pr-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </form>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
              {(["all", "active", "expired"] as FilterKey[]).map((f) => (
                <button
                  key={f}
                  onClick={() => handleFilterChange(f)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    filter === f
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-background"
                  }`}
                >
                  {f === "all" && "All"}
                  {f === "active" && "Active"}
                  {f === "expired" && "Expired"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
              {(["date", "expiry", "name", "downloads"] as SortKey[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleSortChange(s)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    sort === s
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-background"
                  }`}
                >
                  {s === "date" && "Date"}
                  {s === "expiry" && "Expiry"}
                  {s === "name" && "Name"}
                  {s === "downloads" && "Downloads"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Files Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Globe className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No public files found</h3>
            <p className="text-sm text-muted-foreground">
              {search ? "Try adjusting your search terms" : "Be the first to share a public file!"}
            </p>
            {!search && (
              <Link
                to="/upload"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 glow"
              >
                <Upload className="h-4 w-4" />
                Upload First File
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredFiles.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center items-center gap-2 pt-4">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-secondary hover:bg-secondary/80"
            >
              Previous
            </button>
            
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>Page</span>
              <span className="font-medium text-foreground">{pagination.page}</span>
              <span>of</span>
              <span className="font-medium text-foreground">{pagination.pages}</span>
            </div>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="rounded-lg px-3 py-2 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-secondary hover:bg-secondary/80"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PublicFiles;
