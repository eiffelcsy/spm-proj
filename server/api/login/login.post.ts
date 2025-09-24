// file: server/api/login/login.post.ts

import { defineEventHandler, readBody } from 'h3';
import { serverSupabaseClient } from '#supabase/server'; 

export default defineEventHandler(async (event) => {
  const { email, password } = await readBody(event);
  
  // --- BACKEND VALIDATION ---
  // 1. Check for empty fields
  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and password are required.',
    });
  }

  // 2. Check for email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof email !== 'string' || !emailRegex.test(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please enter a valid email address.',
    });
  }

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
    
    return { 
        success: true, 
        user,
        session
    };

  } catch (err) {
    throw err;
  }
});