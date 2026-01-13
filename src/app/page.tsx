import { Header } from '@/app/_components/Header';

export default function Home() {
	return (
		<div className="min-h-screen bg-base-200">
			<Header />
			<main className="container mx-auto p-4">
				<h1 className="mb-4 text-2xl font-bold">ダッシュボード</h1>
				<p>ようこそ、Rhubarbへ。</p>
			</main>
		</div>
	);
}
