import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ServiceTypeBadges } from './ServiceTypeBadges';

describe('ServiceTypeBadges', () => {
	it('renders badges for each provided name', () => {
		render(<ServiceTypeBadges serviceType={['身体介護', '生活援助']} />);

		expect(screen.getByText('身体介護')).toBeInTheDocument();
		expect(screen.getByText('生活援助')).toBeInTheDocument();
		expect(screen.queryByText('未割当')).not.toBeInTheDocument();
	});

	it('renders empty label when no names provided', () => {
		render(<ServiceTypeBadges serviceType={[]} emptyLabel="担当なし" />);

		expect(screen.getByText('担当なし')).toBeInTheDocument();
	});
});
