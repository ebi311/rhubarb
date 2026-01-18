import { Database } from '@/backend/types/supabase';
import { Shift, ShiftSchema } from '@/models/shift';
import { getJstDateOnly, getJstHours, getJstMinutes, setJstTime } from '@/utils/date';
import { SupabaseClient } from '@supabase/supabase-js';

type ShiftRow = Database['public']['Tables']['shifts']['Row'];
type ShiftInsert = Database['public']['Tables']['shifts']['Insert'];

export interface ShiftFilters {
	officeId?: string;
	startDate?: Date;
	endDate?: Date;
	staffId?: string;
	clientId?: string;
	status?: Shift['status'];
}

export class ShiftRepository {
	constructor(private supabase: SupabaseClient<Database>) {}

	/**
	 * DB行からドメインモデルに変換
	 * start_time, end_time は timestamptz (ISO文字列) として保存されている
	 * date は start_time から導出する（JST ベース）
	 */
	private toDomain(row: ShiftRow): Shift {
		const startTime = new Date(row.start_time);
		const endTime = new Date(row.end_time);

		return ShiftSchema.parse({
			...row,
			// date は start_time の JST 日付部分から導出
			date: getJstDateOnly(startTime),
			time: {
				start: { hour: getJstHours(startTime), minute: getJstMinutes(startTime) },
				end: { hour: getJstHours(endTime), minute: getJstMinutes(endTime) },
			},
		});
	}

	/**
	 * ドメインモデルからDB行に変換
	 * date と time を組み合わせて timestamptz を生成（JST ベース）
	 */
	private toDB(entity: Shift): ShiftInsert {
		// date と time.start/end を組み合わせて timestamptz を作成（JST ベース）
		const startTime = setJstTime(entity.date, entity.time.start.hour, entity.time.start.minute);

		const endTime = setJstTime(entity.date, entity.time.end.hour, entity.time.end.minute);

		return {
			id: entity.id,
			client_id: entity.client_id,
			service_type_id: entity.service_type_id,
			staff_id: entity.staff_id ?? null,
			start_time: startTime.toISOString(),
			end_time: endTime.toISOString(),
			status: entity.status,
			is_unassigned: entity.is_unassigned,
			created_at: entity.created_at.toISOString(),
			updated_at: entity.updated_at.toISOString(),
		};
	}

	async list(filters: ShiftFilters = {}): Promise<Shift[]> {
		// officeId フィルタ対応: clients テーブルを join して office_id でフィルタ
		const baseQuery = filters.officeId
			? this.supabase
					.from('shifts')
					.select('*, clients!inner(office_id)')
					.eq('clients.office_id', filters.officeId)
			: this.supabase.from('shifts').select('*');
		type Query = typeof baseQuery;

		// 条件付きフィルタ適用ヘルパー（分岐をここに閉じ込める）
		const applyIf = <T>(query: Query, value: T | undefined, apply: (q: Query, v: T) => Query) =>
			value !== undefined ? apply(query, value) : query;

		let query = baseQuery;
		query = applyIf(query, filters.startDate, (q, d) =>
			q.gte('start_time', setJstTime(d, 0, 0).toISOString()),
		);
		query = applyIf(query, filters.endDate, (q, d) =>
			q.lte('start_time', setJstTime(d, 23, 59).toISOString()),
		);
		query = applyIf(query, filters.staffId, (q, v) => q.eq('staff_id', v));
		query = applyIf(query, filters.clientId, (q, v) => q.eq('client_id', v));
		query = applyIf(query, filters.status, (q, v) => q.eq('status', v));

		const { data, error } = await query.order('start_time');
		if (error) throw error;
		return (data ?? []).map((row) => this.toDomain(row));
	}

	async findById(id: string): Promise<Shift | null> {
		const { data, error } = await this.supabase
			.from('shifts')
			.select('*')
			.eq('id', id)
			.maybeSingle();
		if (error) throw error;
		if (!data) return null;
		return this.toDomain(data);
	}

	async create(shift: Shift): Promise<void> {
		const dbData = this.toDB(shift);
		const { error } = await this.supabase.from('shifts').insert(dbData);
		if (error) throw error;
	}

	async createMany(shifts: Shift[]): Promise<void> {
		if (shifts.length === 0) return;
		const dbData = shifts.map((s) => this.toDB(s));
		const { error } = await this.supabase.from('shifts').insert(dbData);
		if (error) throw error;
	}

	async update(shift: Shift): Promise<void> {
		const dbData = this.toDB(shift);
		const { error } = await this.supabase.from('shifts').update(dbData).eq('id', shift.id);
		if (error) throw error;
	}

	async delete(id: string): Promise<void> {
		const { error } = await this.supabase.from('shifts').delete().eq('id', id);
		if (error) throw error;
	}

	/**
	 * 指定された条件で既存シフトが存在するかチェック
	 * clientId, date, startTime, endTime の組み合わせで一意性を確認
	 */
	async exists(params: {
		clientId: string;
		date: Date;
		startTime: { hour: number; minute: number };
		endTime: { hour: number; minute: number };
	}): Promise<boolean> {
		const startDateTime = setJstTime(params.date, params.startTime.hour, params.startTime.minute);

		const endDateTime = setJstTime(params.date, params.endTime.hour, params.endTime.minute);

		const { count, error } = await this.supabase
			.from('shifts')
			.select('id', { count: 'exact', head: true })
			.eq('client_id', params.clientId)
			.eq('start_time', startDateTime.toISOString())
			.eq('end_time', endDateTime.toISOString());

		if (error) throw error;
		return (count ?? 0) > 0;
	}

	/**
	 * 指定期間の既存シフトを取得（重複チェック用）
	 * キー形式: "clientId|start_time_iso|end_time_iso"
	 */
	async findExistingInRange(
		startDate: Date,
		endDate: Date,
		officeId?: string,
	): Promise<Map<string, Set<string>>> {
		const startOfRange = setJstTime(startDate, 0, 0);
		const endOfRange = setJstTime(endDate, 23, 59);

		// officeId フィルタ対応: clients テーブルを join して office_id でフィルタ
		let query = officeId
			? this.supabase
					.from('shifts')
					.select('client_id, start_time, end_time, clients!inner(office_id)')
					.eq('clients.office_id', officeId)
			: this.supabase.from('shifts').select('client_id, start_time, end_time');

		query = query
			.gte('start_time', startOfRange.toISOString())
			.lte('start_time', endOfRange.toISOString());

		const { data, error } = await query;

		if (error) throw error;

		// key = "clientId|start_time|end_time", value = Set of keys
		const existingMap = new Map<string, Set<string>>();
		for (const row of data ?? []) {
			const key = `${row.client_id}|${row.start_time}|${row.end_time}`;
			if (!existingMap.has(row.client_id)) {
				existingMap.set(row.client_id, new Set());
			}
			existingMap.get(row.client_id)!.add(key);
		}
		return existingMap;
	}
}
