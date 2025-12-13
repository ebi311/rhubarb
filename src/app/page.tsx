import { Header } from "@/app/_components/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-base-200">
      <Header />
      <main className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">ダッシュボード</h1>
        <p>ようこそ、Rhubarbへ。</p>
      </main>
    </div>
  );
}
