// file: server/api/login/signup.post.ts

import { defineEventHandler, readBody } from 'h3';
import { serverSupabaseClient } from '#supabase/server';

export default defineEventHandler(async (event) => {
  // 1. Capture fullname along with email and password
  const { email, password, fullname } = await readBody(event);
  const supabase = await serverSupabaseClient(event);

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
  const { error: staffInsertError } = await (supabase as any)
    .from('staff')
    .insert([{
      user_id: newUser.id, // Link to the auth.users table
      email: newUser.email,
      fullname: fullname, // Use the fullname from the request body
      // You can add default values for other columns here
      // e.g., staff_type: 'staff'
    }]);

  // --- Step 3: Handle potential errors and clean up ---
  if (staffInsertError) {
    // If the staff profile creation fails, delete the newly created user
    // to prevent orphaned auth users. This is a crucial cleanup step.
    await supabase.auth.admin.deleteUser(newUser.id);
    
    throw createError({
      statusCode: 500,
      statusMessage: `Could not create staff profile: ${staffInsertError.message}`,
    });
  }

  return { 
    success: true, 
    message: 'Please check your email to confirm your account!' 
  };
});