// file: server/api/login/signup.post.ts

import { defineEventHandler, readBody } from 'h3';
import { serverSupabaseClient } from '#supabase/server';

export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event);
  const supabase = await serverSupabaseClient(event);

  if (!supabase) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase client could not be initialized.',
    });
  }

  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      });
    }

    return { 
      success: true, 
      message: 'Please check your email to confirm your account!' 
    };

  } catch (err) {
    throw err;
  }
});