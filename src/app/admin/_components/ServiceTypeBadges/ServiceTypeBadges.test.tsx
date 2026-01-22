import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServiceTypeBadge } from './ServiceTypeBadge';
import { ServiceTypeBadges } from './ServiceTypeBadges';

describe('ServiceTypeBadge', () => {
	it('renders badge with correct label for physical-care', () => {
		render(<ServiceTypeBadge serviceTypeId="physical-care" />);
		expect(screen.getByText('身体介護')).toBeInTheDocument();
	});

	it('renders badge with correct label for life-support', () => {
		render(<ServiceTypeBadge serviceTypeId="life-support" />);
		expect(screen.getByText('生活支援')).toBeInTheDocument();
	});

	it('renders badge with correct label for commute-support', () => {
		render(<ServiceTypeBadge serviceTypeId="commute-support" />);
		expect(screen.getByText('通院サポート')).toBeInTheDocument();
	});
});

describe('ServiceTypeBadges', () => {
	it('renders badges for each provided service type id', () => {
		render(
			<ServiceTypeBadges serviceTypeIds={['physical-care', 'life-support']} />,
		);

		expect(screen.getByText('身体介護')).toBeInTheDocument();
		expect(screen.getByText('生活支援')).toBeInTheDocument();
		expect(screen.queryByText('未割当')).not.toBeInTheDocument();
	});

	it('renders empty label when no service type ids provided', () => {
		render(<ServiceTypeBadges serviceTypeIds={[]} emptyLabel="担当なし" />);

		expect(screen.getByText('担当なし')).toBeInTheDocument();
	});

	it('renders all three service types', () => {
		render(
			<ServiceTypeBadges
				serviceTypeIds={['physical-care', 'life-support', 'commute-support']}
			/>,
		);

		expect(screen.getByText('身体介護')).toBeInTheDocument();
		expect(screen.getByText('生活支援')).toBeInTheDocument();
		expect(screen.getByText('通院サポート')).toBeInTheDocument();
	});
});
