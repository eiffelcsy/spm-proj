// file: server/api/login/signup.post.ts

import { defineEventHandler, readBody } from 'h3';
import { serverSupabaseServiceRole } from '#supabase/server';

export default defineEventHandler(async (event) => {
  // 1. Capture fullname along with email and password
  const { email, password, fullname } = await readBody(event);
  const supabase = await serverSupabaseServiceRole(event);

  if (!supabase) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase client could not be initialized.',
    });
  }

  // --- Step 1: Sign up the new user in the 'auth.users' table ---
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    throw createError({
      statusCode: authError.status || 400,
      statusMessage: authError.message,
    });
  }
  
  // Ensure the user object was returned
  if (!authData.user) {
      throw createError({
          statusCode: 500,
          statusMessage: 'User could not be created.',
      });
  }

  const newUser = authData.user;

  // --- Step 2: Insert a new row into the public 'staff' table ---
  // Using service role to bypass RLS since user is not authenticated during signup
  const { error: staffInsertError } = await (supabase as any)
    .from('staff')
    .insert([{
      user_id: newUser.id, // Link to the auth.users table
      fullname: fullname,
      staff_type: 'staff',
    }]);

  if (staffInsertError) {
    throw createError({
      statusCode: 500,
      statusMessage: staffInsertError.message,
    });
  }

  return { success: true, message: 'Please check your email to confirm your account!' };
});