// file: server/api/login/signup.post.ts

import { defineEventHandler, readBody, createError } from 'h3';
import { serverSupabaseServiceRole } from '#supabase/server';

export default defineEventHandler(async (event) => {
  // 1. Capture fullname along with email and password
  const { email, password, fullname } = await readBody(event);
  const supabase = await serverSupabaseServiceRole(event);

  // --- Step 1: Sign up the new user in the 'auth.users' table ---
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    const rawMessage = authError.message || '';
    const looksLikeDuplicateEmail = /already\s+registered|already\s+exists|email\s+exists/i.test(rawMessage);
    throw createError({
      statusCode: looksLikeDuplicateEmail ? 409 : (authError.status || 400),
      statusMessage: looksLikeDuplicateEmail
        ? 'An account with this email already exists. Try signing in or resetting your password.'
        : rawMessage,
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
      is_manager: false,
      is_admin: false,
    }]);

  if (staffInsertError) {
    const code = (staffInsertError as any).code;
    const message = staffInsertError.message || '';
    const fkViolation = code === '23503' || /staff_user_id_fkey/i.test(message);
    throw createError({
      statusCode: fkViolation ? 409 : 500,
      statusMessage: fkViolation
        ? 'An account with this email already exists. Try signing in or resetting your password.'
        : message,
    });
  }

  return { success: true, message: 'Please check your email to confirm your account!' };
});