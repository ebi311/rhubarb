type StaffListHeaderProps = {
	onCreateRequest: () => void;
};

export const StaffListHeader = ({ onCreateRequest }: StaffListHeaderProps) => (
	<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 className="text-3xl font-bold">担当者管理</h1>
			<p className="text-base-content/70 text-sm">
				サービス区分権限と備考情報を含む担当者の一覧です。
			</p>
		</div>
		<button type="button" className="btn btn-primary" onClick={onCreateRequest}>
			＋ 担当者を追加
		</button>
	</div>
);
