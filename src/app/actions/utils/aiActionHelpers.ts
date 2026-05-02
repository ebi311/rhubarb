import { createSupabaseClient } from '@/utils/supabase/server';

export const isTestRuntime = (): boolean =>
	process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

export const shouldSkipAuditLog = (status: number): boolean =>
	status === 401 || status === 403;

export const getAuthUser = async () => {
	const supabase = await createSupabaseClient();
	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();

	return { supabase, user, error } as const;
};
