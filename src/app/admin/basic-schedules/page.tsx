import Link from 'next/link';

const BasicScheduleListPage = async () => {
	return (
		<div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
			<section className="space-y-2">
				<p className="text-sm font-semibold uppercase tracking-widest text-primary">
					基本スケジュール
				</p>
				<h1 className="text-3xl font-bold">週次スケジュール一覧</h1>
				<p className="text-base-content/70 text-sm">登録済みの基本スケジュールを確認できます。</p>
			</section>

			<div className="flex justify-end">
				<Link href="/admin/basic-schedules/new" className="btn btn-primary">
					新規登録
				</Link>
			</div>

			{/* TODO: フィルタバーとテーブルを実装 */}
			<div className="rounded-box border border-base-300 bg-base-100 p-8 text-center">
				<p className="text-base-content/60">まだ基本スケジュールがありません</p>
				<Link href="/admin/basic-schedules/new" className="btn btn-primary mt-4">
					新規登録
				</Link>
			</div>
		</div>
	);
};

export default BasicScheduleListPage;
