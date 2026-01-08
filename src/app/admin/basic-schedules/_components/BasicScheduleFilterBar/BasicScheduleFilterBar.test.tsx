import { fireEvent, render, screen } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BasicScheduleFilterBar } from './BasicScheduleFilterBar';

vi.mock('next/navigation');

const replaceMock = vi.fn();

const createMockSearchParams = (params: Record<string, string> = {}) => {
	const searchParams = new URLSearchParams(params);
	return searchParams;
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.mocked(useRouter).mockReturnValue({
		replace: replaceMock,
	} as any);
	vi.mocked(useSearchParams).mockReturnValue(createMockSearchParams() as any);
});

const sampleClients = [
	{ id: 'client-1', name: '山田太郎' },
	{ id: 'client-2', name: '鈴木花子' },
];

const sampleServiceTypes = [
	{ id: 'st-1', name: '身体介護' },
	{ id: 'st-2', name: '生活援助' },
];

describe('BasicScheduleFilterBar', () => {
	it('曜日セレクトで曜日を選択できる', () => {
		render(<BasicScheduleFilterBar clients={sampleClients} serviceTypes={sampleServiceTypes} />);

		fireEvent.change(screen.getByLabelText('曜日'), { target: { value: 'Mon' } });

		expect(replaceMock).toHaveBeenCalledWith('?weekday=Mon');
	});

	it('利用者セレクトで利用者を選択できる', () => {
		render(<BasicScheduleFilterBar clients={sampleClients} serviceTypes={sampleServiceTypes} />);

		fireEvent.change(screen.getByLabelText('利用者'), { target: { value: 'client-1' } });

		expect(replaceMock).toHaveBeenCalledWith('?clientId=client-1');
	});

	it('サービス区分セレクトでサービス区分を選択できる', () => {
		render(<BasicScheduleFilterBar clients={sampleClients} serviceTypes={sampleServiceTypes} />);

		fireEvent.change(screen.getByLabelText('サービス区分'), { target: { value: 'st-1' } });

		expect(replaceMock).toHaveBeenCalledWith('?serviceTypeId=st-1');
	});

	it('リセットボタンで初期状態に戻す', () => {
		vi.mocked(useSearchParams).mockReturnValue(
			createMockSearchParams({
				weekday: 'Mon',
				clientId: 'client-1',
				serviceTypeId: 'st-1',
			}) as any,
		);

		render(<BasicScheduleFilterBar clients={sampleClients} serviceTypes={sampleServiceTypes} />);

		fireEvent.click(screen.getByRole('button', { name: 'リセット' }));

		expect(replaceMock).toHaveBeenCalledWith('?');
	});

	it('URLパラメータから初期値が設定される', () => {
		vi.mocked(useSearchParams).mockReturnValue(
			createMockSearchParams({ weekday: 'Tue', clientId: 'client-2' }) as any,
		);

		render(<BasicScheduleFilterBar clients={sampleClients} serviceTypes={sampleServiceTypes} />);

		expect(screen.getByLabelText('曜日')).toHaveValue('Tue');
		expect(screen.getByLabelText('利用者')).toHaveValue('client-2');
		expect(screen.getByLabelText('サービス区分')).toHaveValue('');
	});

	it('不正な曜日パラメータは無視される', () => {
		vi.mocked(useSearchParams).mockReturnValue(
			createMockSearchParams({ weekday: 'Invalid' }) as any,
		);

		render(<BasicScheduleFilterBar clients={sampleClients} serviceTypes={sampleServiceTypes} />);

		expect(screen.getByLabelText('曜日')).toHaveValue('');
	});
});
