import { z } from 'zod';
import { TimeValueSchema } from './valueObjects/time';

/**
 * ダッシュボード統計データ
 */
export const DashboardStatsSchema = z.object({
	todayShiftCount: z.number().int().nonnegative(),
	weekShiftCount: z.number().int().nonnegative(),
	unassignedCount: z.number().int().nonnegative(),
});

export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

/**
 * タイムラインアイテム
 */
export const TodayTimelineItemSchema = z.object({
	id: z.string().uuid(),
	startTime: TimeValueSchema,
	endTime: TimeValueSchema,
	clientName: z.string(),
	staffName: z.string().nullable(),
	isUnassigned: z.boolean(),
	serviceTypeName: z.string(),
});

export type TodayTimelineItem = z.infer<typeof TodayTimelineItemSchema>;

/**
 * アラートタイプ
 */
export const AlertTypeSchema = z.enum(['unassigned', 'shortage']);
export type AlertType = z.infer<typeof AlertTypeSchema>;

/**
 * アラートアイテム
 */
export const AlertItemSchema = z.object({
	id: z.string().uuid(),
	type: AlertTypeSchema,
	date: z.coerce.date(),
	startTime: TimeValueSchema,
	clientName: z.string(),
	message: z.string(),
});

export type AlertItem = z.infer<typeof AlertItemSchema>;

/**
 * ダッシュボードデータ（統合型）
 */
export const DashboardDataSchema = z.object({
	stats: DashboardStatsSchema,
	timeline: z.array(TodayTimelineItemSchema),
	alerts: z.array(AlertItemSchema),
});

export type DashboardData = z.infer<typeof DashboardDataSchema>;
