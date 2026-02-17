import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR =
	process.env.TEST_DATA_DIR || path.join(process.cwd(), 'test-data', 'tsv');

const padHex = (n, width) => n.toString(16).padStart(width, '0');

// Deterministic RFC4122-ish UUIDv4 string: xxxxxxxx-0000-4000-8000-xxxxxxxxxxxx
const makeUuid = (suffixNumber) => {
	// suffixNumber: integer -> 12 hex digits
	const suffix = padHex(suffixNumber, 12);
	return `019b1d20-0000-4000-8000-${suffix}`;
};

const toTsv = (rows) => {
	if (rows.length === 0) return '';
	const headers = Object.keys(rows[0]);
	const lines = [headers.join('\t')];
	for (const row of rows) {
		lines.push(headers.map((h) => row[h] ?? '').join('\t'));
	}
	return lines.join('\n') + '\n';
};

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const serviceTypeIds = ['physical-care', 'life-support', 'commute-support'];

const main = async () => {
	await mkdir(OUT_DIR, { recursive: true });

	const officeId = makeUuid(1);
	const offices = [{ id: officeId, name: 'テスト介護ステーション' }];

	const staffs = Array.from({ length: 20 }).map((_, i) => {
		const staffNo = i + 1;
		const id = makeUuid(100 + staffNo);
		return {
			id,
			office_id: officeId,
			auth_user_id: '',
			name: `ヘルパー ${String(staffNo).padStart(2, '0')}`,
			role: staffNo === 1 ? 'admin' : 'helper',
			email: '',
			note: '',
		};
	});

	const clients = Array.from({ length: 50 }).map((_, i) => {
		const clientNo = i + 1;
		const id = makeUuid(2000 + clientNo);
		const isSuspended = clientNo % 10 === 0; // 10%, 20%, ...
		return {
			id,
			office_id: officeId,
			name: `利用者 ${String(clientNo).padStart(3, '0')}`,
			address: `架空県架空市${clientNo}丁目${clientNo}番${clientNo}号`,
			contract_status: isSuspended ? 'suspended' : 'active',
		};
	});

	// Build staff/day "slots" so that scheduled staff has 2-3 items per day.
	const staffIds = staffs.map((s) => s.id);
	const slots = [];
	for (let weekdayIndex = 0; weekdayIndex < weekdays.length; weekdayIndex++) {
		const weekday = weekdays[weekdayIndex];
		const startIndex = (weekdayIndex * 3) % staffIds.length;
		const staffIdsForDay = Array.from({ length: 7 }).map(
			(_, j) => staffIds[(startIndex + j) % staffIds.length],
		);

		for (let j = 0; j < staffIdsForDay.length; j++) {
			const staffId = staffIdsForDay[j];
			const count = (weekdayIndex + j) % 2 === 0 ? 2 : 3;
			for (let k = 0; k < count; k++) {
				slots.push({ weekday, staffId, slotIndex: k });
			}
		}
	}

	// Distribute clients: each client gets 2 schedules, plus some get 3.
	const clientIds = clients.map((c) => c.id);
	const base = [...clientIds, ...clientIds]; // 100
	const extraNeeded = Math.max(0, slots.length - base.length);
	const extra = clientIds.slice(0, Math.min(extraNeeded, clientIds.length)); // up to 50
	const clientSequence = [...base, ...extra].slice(0, slots.length);

	const timeBySlotIndex = [
		{ start: '09:00:00+09:00', end: '10:00:00+09:00' },
		{ start: '10:30:00+09:00', end: '11:30:00+09:00' },
		{ start: '13:00:00+09:00', end: '14:00:00+09:00' },
	];

	const basicSchedules = [];
	const basicScheduleStaffAssignments = [];
	for (let i = 0; i < slots.length; i++) {
		const scheduleId = makeUuid(3000 + i + 1);
		const assignmentId = makeUuid(4000 + i + 1);
		const { weekday, staffId, slotIndex } = slots[i];
		const clientId = clientSequence[i];
		const serviceTypeId = serviceTypeIds[i % serviceTypeIds.length];
		const time = timeBySlotIndex[slotIndex % timeBySlotIndex.length];

		basicSchedules.push({
			id: scheduleId,
			client_id: clientId,
			service_type_id: serviceTypeId,
			day_of_week: weekday,
			start_time: time.start,
			end_time: time.end,
			note: '',
			deleted_at: '',
		});

		basicScheduleStaffAssignments.push({
			id: assignmentId,
			basic_schedule_id: scheduleId,
			staff_id: staffId,
		});
	}

	const staffServiceTypeAbilities = [];
	for (const staffId of staffIds) {
		for (const serviceTypeId of serviceTypeIds) {
			staffServiceTypeAbilities.push({
				staff_id: staffId,
				service_type_id: serviceTypeId,
			});
		}
	}

	await writeFile(path.join(OUT_DIR, 'offices.tsv'), toTsv(offices), 'utf8');
	await writeFile(path.join(OUT_DIR, 'staffs.tsv'), toTsv(staffs), 'utf8');
	await writeFile(path.join(OUT_DIR, 'clients.tsv'), toTsv(clients), 'utf8');
	await writeFile(
		path.join(OUT_DIR, 'basic_schedules.tsv'),
		toTsv(basicSchedules),
		'utf8',
	);
	await writeFile(
		path.join(OUT_DIR, 'basic_schedule_staff_assignments.tsv'),
		toTsv(basicScheduleStaffAssignments),
		'utf8',
	);
	await writeFile(
		path.join(OUT_DIR, 'staff_service_type_abilities.tsv'),
		toTsv(staffServiceTypeAbilities),
		'utf8',
	);

	console.log(`Generated TSV files into: ${OUT_DIR}`);
	console.log(`- offices: ${offices.length}`);
	console.log(`- staffs: ${staffs.length}`);
	console.log(`- clients: ${clients.length}`);
	console.log(`- basic_schedules: ${basicSchedules.length}`);
	console.log(
		`- basic_schedule_staff_assignments: ${basicScheduleStaffAssignments.length}`,
	);
	console.log(
		`- staff_service_type_abilities: ${staffServiceTypeAbilities.length}`,
	);
};

await main();
