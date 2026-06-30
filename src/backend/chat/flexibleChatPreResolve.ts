import { ShiftRepository } from '@/backend/repositories/shiftRepository';
import { StaffRepository } from '@/backend/repositories/staffRepository';
import { isValidDate } from '@/backend/tools/_shared/dateValidation';
import { Database } from '@/backend/types/supabase';
import { ServiceTypeLabels } from '@/models/valueObjects/serviceTypeId';
import { parseJstDateString, timeObjectToString } from '@/utils/date';
import { SupabaseClient } from '@supabase/supabase-js';

const ISO_DATE_PATTERN = /(\d{4}-\d{2}-\d{2})/;
const SLASH_DATE_PATTERN = /(\d{1,2})\/(\d{1,2})(?=\s|$|の|に|、|[^0-9])/;
const JP_DATE_PATTERN = /(\d{1,2})月(\d{1,2})日/;
const HELPER_NAME_PATTERN = /(ヘルパー[-\s]?\d+)/i;
const NAME_BEFORE_SAN_PATTERN =
	/([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{L}\p{N}-]+?)さん/u;

const GENERIC_NAME_BEFORE_SAN = /^(代わり|担当|該当|この|その|本人)$/;

export type WeekRange = {
	startDate: string;
	endDate: string;
};

export type ChatMessageForPreResolve = {
	role: string;
	content?: string;
	parts?: Array<{ type: string; text?: string }>;
};

export type PreResolvedShift = {
	id: string;
	date: string;
	startTime: string;
	endTime: string;
	clientId: string;
	clientName: string;
	staffName: string;
	serviceTypeId: string;
	serviceTypeLabel: string;
};

export type FlexiblePreResolveResult = {
	promptSection: string;
	staffSearchQuery?: string;
	extractedDate?: string;
	matchedStaffCount: number;
	shiftCount: number;
};

type ResolveFlexibleChatContextOptions = {
	supabase: SupabaseClient<Database>;
	officeId: string;
	weekRange: WeekRange;
	messages: ChatMessageForPreResolve[];
	shiftRepository?: Pick<ShiftRepository, 'list'>;
	staffRepository?: Pick<StaffRepository, 'searchByNameOrKana'>;
};

const isDateInWeekRange = (date: string, weekRange: WeekRange): boolean => {
	const target = parseJstDateString(date);
	const start = parseJstDateString(weekRange.startDate);
	const end = parseJstDateString(weekRange.endDate);
	return target >= start && target <= end;
};

export const resolveDateInWeekRange = (
	month: number,
	day: number,
	weekRange: WeekRange,
): string | null => {
	if (month < 1 || month > 12 || day < 1 || day > 31) {
		return null;
	}

	const startYear = Number(weekRange.startDate.slice(0, 4));
	const endYear = Number(weekRange.endDate.slice(0, 4));
	const years = startYear === endYear ? [startYear] : [startYear, endYear];

	for (const year of years) {
		const candidate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
		if (!isValidDate(candidate)) {
			continue;
		}
		if (isDateInWeekRange(candidate, weekRange)) {
			return candidate;
		}
	}

	return null;
};

export const extractDateFromMessage = (
	message: string,
	weekRange: WeekRange,
): string | null => {
	const isoMatch = message.match(ISO_DATE_PATTERN);
	if (isoMatch && isDateInWeekRange(isoMatch[1], weekRange)) {
		return isoMatch[1];
	}

	const slashMatch = message.match(SLASH_DATE_PATTERN);
	if (slashMatch) {
		return resolveDateInWeekRange(
			Number(slashMatch[1]),
			Number(slashMatch[2]),
			weekRange,
		);
	}

	const jpMatch = message.match(JP_DATE_PATTERN);
	if (jpMatch) {
		return resolveDateInWeekRange(
			Number(jpMatch[1]),
			Number(jpMatch[2]),
			weekRange,
		);
	}

	return null;
};

export const extractStaffSearchQuery = (message: string): string | null => {
	const trimmed = message.trim();
	if (!trimmed) {
		return null;
	}

	const helperMatch = trimmed.match(HELPER_NAME_PATTERN);
	if (helperMatch) {
		return helperMatch[1].replace(/\s+/g, '');
	}

	const sanMatch = trimmed.match(NAME_BEFORE_SAN_PATTERN);
	if (sanMatch) {
		const name = sanMatch[1].trim();
		if (name.length >= 2 && !GENERIC_NAME_BEFORE_SAN.test(name)) {
			return name;
		}
	}

	return null;
};

export const extractLatestUserMessageText = (
	messages: ChatMessageForPreResolve[],
): string | null => {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const message = messages[index];
		if (message.role !== 'user') {
			continue;
		}

		if (typeof message.content === 'string' && message.content.trim()) {
			return message.content.trim();
		}

		if (message.parts?.length) {
			const text = message.parts
				.filter((part) => part.type === 'text')
				.map((part) => part.text ?? '')
				.join('')
				.trim();
			if (text) {
				return text;
			}
		}
	}

	return null;
};

const buildShiftSelectionPrompt = (shiftCount: number): string =>
	shiftCount === 1
		? `

### 対象シフトの扱い
- 上記1件を対象シフトとして扱い、日時・サービス内容・利用者の追加確認は行わないでください
- date / clientId / serviceTypeId をそのまま searchAvailableHelpers の入力に使用してください
- shiftId は内部識別子のため、ユーザーに shiftId を尋ねたり提示したりしないでください
- ユーザーが代替ヘルパーの提案を求めている場合は、追加質問なしで searchAvailableHelpers を呼び出してください`
		: `

### 対象シフトの扱い
- 複数シフトがあるため、どのシフトを対象にするかを日時・利用者名でユーザーに確認してください
- shiftId は内部識別子のため、ユーザーに shiftId を尋ねたり提示したりしないでください`;

export const buildPreResolvedContextPrompt = (input: {
	staffSearchQuery?: string;
	matchedStaffs: Array<{ staffId: string; name: string; role?: string }>;
	extractedDate?: string;
	shifts: PreResolvedShift[];
}): string => {
	const sections: string[] = [
		'',
		'## 事前確認済みの情報（サーバー自動取得）',
		'以下はユーザーの最新メッセージから自動取得した情報です。この情報を前提として対応してください。',
	];

	if (input.staffSearchQuery && input.matchedStaffs.length > 0) {
		const staffLines = input.matchedStaffs.map(
			(staff) =>
				`- ${staff.name} (staffId: ${staff.staffId}${staff.role ? `, role: ${staff.role}` : ''})`,
		);
		sections.push(
			'',
			`### スタッフ検索結果（query: "${input.staffSearchQuery}"）`,
			...staffLines,
		);
	}

	if (input.extractedDate && input.shifts.length > 0) {
		const shiftLines = input.shifts.map(
			(shift) =>
				`- ${shift.date} ${shift.startTime}〜${shift.endTime}: ${shift.clientName} / ${shift.staffName} (${shift.serviceTypeLabel}（serviceTypeId: ${shift.serviceTypeId}）, clientId: ${shift.clientId}, shiftId: ${shift.id})`,
		);
		sections.push(
			'',
			`### ${input.extractedDate} のシフト`,
			...shiftLines,
			buildShiftSelectionPrompt(input.shifts.length),
		);
	} else if (input.extractedDate && input.shifts.length === 0) {
		sections.push(
			'',
			`### ${input.extractedDate} のシフト`,
			'- 該当するシフトは見つかりませんでした',
		);
	}

	return sections.join('\n');
};

const mapShiftToPreResolved = (
	shift: Awaited<ReturnType<ShiftRepository['list']>>[number],
	date: string,
): PreResolvedShift => ({
	id: shift.id,
	date,
	startTime: timeObjectToString(shift.time.start),
	endTime: timeObjectToString(shift.time.end),
	clientId: shift.client_id,
	clientName: shift.client_name ?? '(利用者不明)',
	staffName: shift.staff_name ?? '(未割当)',
	serviceTypeId: shift.service_type_id,
	serviceTypeLabel: ServiceTypeLabels[shift.service_type_id],
});

const fetchPreResolvedShifts = async (
	shiftRepository: Pick<ShiftRepository, 'list'>,
	officeId: string,
	extractedDate: string,
	staffIdForShifts?: string,
): Promise<PreResolvedShift[]> => {
	const rawShifts = await shiftRepository.list({
		officeId,
		date: extractedDate,
		includeNames: true,
		...(staffIdForShifts ? { staffId: staffIdForShifts } : {}),
	});

	return rawShifts.map((shift) => mapShiftToPreResolved(shift, extractedDate));
};

const hasUsefulPreResolveData = (
	matchedStaffCount: number,
	extractedDate: string | null,
	shiftCount: number,
): boolean =>
	matchedStaffCount > 0 || (extractedDate !== null && shiftCount > 0);

const fetchFlexiblePreResolveData = async (
	options: ResolveFlexibleChatContextOptions,
	staffSearchQuery: string | null,
	extractedDate: string | null,
) => {
	const shiftRepository =
		options.shiftRepository ?? new ShiftRepository(options.supabase);
	const staffRepository =
		options.staffRepository ?? new StaffRepository(options.supabase);

	const matchedStaffs = staffSearchQuery
		? await staffRepository.searchByNameOrKana(
				options.officeId,
				staffSearchQuery,
				10,
			)
		: [];

	const staffIdForShifts =
		matchedStaffs.length === 1 ? matchedStaffs[0].id : undefined;

	const shifts = extractedDate
		? await fetchPreResolvedShifts(
				shiftRepository,
				options.officeId,
				extractedDate,
				staffIdForShifts,
			)
		: [];

	return { matchedStaffs, shifts };
};

export const resolveFlexibleChatContext = async (
	options: ResolveFlexibleChatContextOptions,
): Promise<FlexiblePreResolveResult | null> => {
	const userMessage = extractLatestUserMessageText(options.messages);
	if (!userMessage) {
		return null;
	}

	const staffSearchQuery = extractStaffSearchQuery(userMessage);
	const extractedDate = extractDateFromMessage(userMessage, options.weekRange);

	if (!staffSearchQuery && !extractedDate) {
		return null;
	}

	const { matchedStaffs, shifts } = await fetchFlexiblePreResolveData(
		options,
		staffSearchQuery,
		extractedDate,
	);

	if (
		!hasUsefulPreResolveData(matchedStaffs.length, extractedDate, shifts.length)
	) {
		return null;
	}

	const promptSection = buildPreResolvedContextPrompt({
		staffSearchQuery: staffSearchQuery ?? undefined,
		matchedStaffs: matchedStaffs.map((staff) => ({
			staffId: staff.id,
			name: staff.name,
			role: staff.role,
		})),
		extractedDate: extractedDate ?? undefined,
		shifts,
	});

	return {
		promptSection,
		staffSearchQuery: staffSearchQuery ?? undefined,
		extractedDate: extractedDate ?? undefined,
		matchedStaffCount: matchedStaffs.length,
		shiftCount: shifts.length,
	};
};
