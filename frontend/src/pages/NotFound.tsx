import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center slide-up">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-secondary mx-auto mb-6">
          <span className="text-3xl font-extrabold text-primary">404</span>
        </div>
        <h1 className="mb-2 text-2xl font-bold">Page not found</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or may have been removed.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 glow"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
