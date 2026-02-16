import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_DIR = path.join(process.cwd(), 'test-data', 'tsv');

const getArgValue = (name) => {
	const idx = process.argv.indexOf(name);
	if (idx === -1) return null;
	return process.argv[idx + 1] ?? null;
};

const chunk = (arr, size) => {
	const result = [];
	for (let i = 0; i < arr.length; i += size)
		result.push(arr.slice(i, i + size));
	return result;
};

const parseTsv = (text) => {
	const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
	if (lines.length === 0) return [];
	const headers = lines[0].split('\t');
	return lines.slice(1).map((line) => {
		const cells = line.split('\t');
		/** @type {Record<string, string | null>} */
		const row = {};
		for (let i = 0; i < headers.length; i++) {
			const raw = cells[i] ?? '';
			row[headers[i]] = raw === '' ? null : raw;
		}
		return row;
	});
};

const upsertAll = async (supabase, table, rows, options = {}) => {
	const batchSize = options.batchSize ?? 500;
	const onConflict = options.onConflict;
	let total = 0;
	for (const batch of chunk(rows, batchSize)) {
		const builder = supabase
			.from(table)
			.upsert(batch, onConflict ? { onConflict } : undefined);
		const { error } = await builder;
		if (error) {
			throw new Error(
				`Upsert failed: table=${table}, message=${error.message}`,
			);
		}
		total += batch.length;
	}
	return total;
};

const main = async () => {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!supabaseUrl || !serviceRoleKey) {
		throw new Error(
			'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required',
		);
	}

	const dir = getArgValue('--dir') ?? DEFAULT_DIR;
	const resolve = (file) => path.join(dir, file);

	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	});

	const files = [
		{ table: 'offices', file: 'offices.tsv', onConflict: 'id' },
		{ table: 'staffs', file: 'staffs.tsv', onConflict: 'id' },
		{ table: 'clients', file: 'clients.tsv', onConflict: 'id' },
		{ table: 'basic_schedules', file: 'basic_schedules.tsv', onConflict: 'id' },
		{
			table: 'basic_schedule_staff_assignments',
			file: 'basic_schedule_staff_assignments.tsv',
			onConflict: 'basic_schedule_id,staff_id',
		},
	];

	for (const { table, file, onConflict } of files) {
		const tsv = await fs.readFile(resolve(file), 'utf8');
		const rows = parseTsv(tsv);
		const inserted = await upsertAll(supabase, table, rows, {
			onConflict,
			batchSize: 500,
		});
		console.log(`Imported: ${table} (${inserted} rows)`);
	}

	console.log('Done.');
};

await main();
