import Layout from "@/components/Layout";
import UploadZone from "@/components/UploadZone";

const UploadPage = () => {
  return (
    <Layout>
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upload File</h1>
          <p className="text-sm text-muted-foreground">
            Share files that self-destruct after expiry
          </p>
        </div>
        <UploadZone />
      </div>
    </Layout>
  );
};

export default UploadPage;
