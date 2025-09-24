// file: server/api/login/login.post.ts

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
    const { data: { user, session }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid credentials. Please check your email and password.',
      });
    }
    
    // **CRITICAL CHANGE:** Return the full session object.
    return { 
        success: true, 
        user,
        session
    };

  } catch (err) {
    throw err;
  }
});