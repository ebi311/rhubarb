'use server';

import { createSupabaseClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function signOutAction() {
	const supabase = await createSupabaseClient();
	await supabase.auth.signOut();
	redirect('/login');
}
