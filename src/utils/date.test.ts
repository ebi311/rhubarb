import { describe, expect, it } from 'vitest';
import { formatTime, toAbsMinutesFrom0600 } from './date';

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

describe('toAbsMinutesFrom0600', () => {
	it('06:00 (360分) を 0 に変換する', () => {
		expect(toAbsMinutesFrom0600(360)).toBe(0);
	});

	it('12:00 (720分) を 360 に変換する', () => {
		expect(toAbsMinutesFrom0600(720)).toBe(360);
	});

	it('23:59 (1439分) を 1079 に変換する', () => {
		expect(toAbsMinutesFrom0600(1439)).toBe(1079);
	});

	it('00:00 (0分) を 1080 に変換する', () => {
		expect(toAbsMinutesFrom0600(0)).toBe(1080);
	});

	it('05:59 (359分) を 1439 に変換する', () => {
		expect(toAbsMinutesFrom0600(359)).toBe(1439);
	});
});
