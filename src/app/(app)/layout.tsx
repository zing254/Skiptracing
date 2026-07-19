import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0f1117]">
      <Sidebar />
      <main
        className="flex-1 min-h-screen overflow-auto"
        style={{ marginLeft: "260px" }}
      >
        {children}
      </main>
    </div>
  );
}
