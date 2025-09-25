<template>
    <div class="update-password-container">
      <h1>Update Your Password</h1>
      <p>Please enter your new password below.</p>
      <form @submit.prevent="handleUpdate">
        <div>
          <label for="new-password">New Password</label>
          <input id="new-password" type="password" v-model="newPassword" required />
        </div>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Updating...' : 'Update Password' }}
        </button>
        <div v-if="successMsg" class="success-message">{{ successMsg }}</div>
        <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>
      </form>
    </div>
  </template>
  
  <script setup lang="ts">
  import { onMounted, ref } from 'vue';
  
  const supabase = useSupabaseClient();
  const router = useRouter();
  
  const newPassword = ref('');
  const loading = ref(false);
  const successMsg = ref('');
  const errorMsg = ref('');
  
  function parseHashParams(hash: string): Record<string, string> {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  
  onMounted(async () => {
    // Ensure there's an active session. Recovery links often include tokens in the URL hash
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session && typeof window !== 'undefined' && window.location.hash) {
      const hashParams = parseHashParams(window.location.hash);
      const accessToken = hashParams['access_token'];
      const refreshToken = hashParams['refresh_token'];
      const type = hashParams['type'];
      try {
        if (type === 'recovery' && accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            throw error;
          }
        }
      } catch (e: any) {
        errorMsg.value = e?.message || 'Failed to initialize session from recovery link.';
      }
    }
  });
  
  const handleUpdate = async () => {
    try {
      loading.value = true;
      errorMsg.value = '';
      successMsg.value = '';
  
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Auth session missing. Please use the password reset link from your email.');
      }
  
      const { error } = await supabase.auth.updateUser({
        password: newPassword.value,
      });
  
      if (error) {
        throw error;
      }
  
      successMsg.value = 'Password updated successfully! Redirecting to login...';
      
      // Redirect to login page after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
  
    } catch (error: any) {
      errorMsg.value = error.message;
    } finally {
      loading.value = false;
    }
  };
  </script>
  
  <style scoped>
  .update-password-container {
    max-width: 400px;
    margin: 50px auto;
    padding: 20px;
    border: 1px solid #ccc;
    border-radius: 8px;
    text-align: center;
  }
  
  form {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  input {
    width: 100%;
    padding: 8px;
    box-sizing: border-box;
  }
  
  button {
    padding: 10px;
    cursor: pointer;
    background-color: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
  }
  
  button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
  
  .error-message {
    color: red;
    margin-top: 10px;
  }
  
  .success-message {
    color: green;
    margin-top: 10px;
  }
  </style>