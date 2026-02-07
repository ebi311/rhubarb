import { Icon } from '@/app/_components/Icon';

type StaffListHeaderProps = {
	onCreateRequest: () => void;
};

export const StaffListHeader = ({ onCreateRequest }: StaffListHeaderProps) => (
	<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<p className="text-sm text-base-content/70">
				サービス区分権限と備考情報を含む担当者の一覧です。
			</p>
		</div>
		<button type="button" className="btn btn-primary" onClick={onCreateRequest}>
			<Icon name="add" /> 担当者を追加
		</button>
	</div>
);
