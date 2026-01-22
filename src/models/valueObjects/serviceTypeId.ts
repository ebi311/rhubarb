import { z } from 'zod';

/**
 * サービス種別IDの値オブジェクト
 * 固定の3種類のサービス種別を定義
 */
export const ServiceTypeIdValues = [
	'life-support',
	'physical-care',
	'commute-support',
] as const;

export const ServiceTypeIdSchema = z.enum(ServiceTypeIdValues, {
	message:
		'service_type_id は life-support, physical-care, commute-support のいずれかで指定してください',
});

export type ServiceTypeId = z.infer<typeof ServiceTypeIdSchema>;

/**
 * サービス種別IDと表示名のマッピング
 */
export const ServiceTypeLabels: Record<ServiceTypeId, string> = {
	'life-support': '生活支援',
	'physical-care': '身体介護',
	'commute-support': '通院サポート',
};
