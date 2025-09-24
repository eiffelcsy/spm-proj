// file: server/api/logout/logout.post.ts

import { defineEventHandler } from 'h3';
import { serverSupabaseClient } from '#supabase/server'; 

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event);
  
  if (!supabase) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase client could not be initialized.',
    });
  }

  // We attempt to sign out, but we don't throw an error if it fails,
  // as the user's session might have already expired, which is a success for logout.
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Server-side logout error:', error.message);
  }

  // Always return a success message on the server,
  // so the frontend can reliably redirect.
  return { success: true };
});