import { describe, expect, it } from 'vitest';
import { formatTime } from './date';

describe('formatTime', () => {
	it('should format time with time zone to HH:mm', () => {
		expect(formatTime('09:00:00+00')).toBe('18:00');
		expect(formatTime('13:30:00+09')).toBe('13:30');
		expect(formatTime('10:30:00+10:00')).toBe('09:30');
		expect(formatTime('23:59:00+00')).toBe('08:59');
		expect(formatTime('00:00:00+00')).toBe('09:00');
	});

	it('should handle time without seconds', () => {
		expect(formatTime('09:00+00')).toBe('18:00');
		expect(formatTime('13:30+09')).toBe('13:30');
	});

	it('should return original string if format is invalid', () => {
		expect(() => formatTime('invalid')).toThrow('Invalid time string: invalid');
		expect(() => formatTime('')).toThrow('Invalid time string: ');
		expect(() => formatTime('9:00')).toThrow('Invalid time string: 9:00');
	});
});
