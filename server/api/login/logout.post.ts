// file: server/api/logout/logout.post.ts

import { defineEventHandler } from 'h3';
import { serverSupabaseClient } from '#supabase/server';

export default defineEventHandler(async (event) => {
  // Get the Supabase client instance
  const supabase = await serverSupabaseClient(event);

  // Check if the client was retrieved successfully
  if (!supabase) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase client could not be initialized.',
    });
  }

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      // You should handle different error types from Supabase here
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to log out.',
      });
    }

    return { success: true };
  } catch (err) {
    // Pass the error up the chain to be handled by Nuxt
    throw err;
  }
});