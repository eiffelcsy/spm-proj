// file: server/api/login/forgot-password.post.ts

import { defineEventHandler, readBody } from 'h3';
import { serverSupabaseClient } from '#supabase/server';

export default defineEventHandler(async (event) => {
  const { email } = await readBody(event);
  const supabase = await serverSupabaseClient(event);

  if (!supabase) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase client could not be initialized.',
    });
  }

  try {
    // The redirectTo URL is where the user will be sent after clicking the link in their email.
    // In a production app, this should be a configurable environment variable.
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/update-password'
    });

    if (error) {
      // Throw an error with the message from Supabase
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      });
    }

    // Return a success message.
    return { 
      success: true, 
      message: 'Password reset link sent to your email.' 
    };

  } catch (err) {
    throw err;
  }
});