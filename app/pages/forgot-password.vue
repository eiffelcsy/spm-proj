<template>
    <div class="forgot-password-container">
      <h1>Forgot Password</h1>
      <p>Enter your email to receive a password reset link.</p>
      <form @submit.prevent="handleReset">
        <div>
          <label for="email">Email</label>
          <input id="email" type="email" v-model="email" required />
        </div>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Sending...' : 'Send Reset Link' }}
        </button>
        <div v-if="successMsg" class="success-message">{{ successMsg }}</div>
        <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>
      </form>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue';
  
  const supabase = useSupabaseClient();
  const email = ref('');
  const loading = ref(false);
  const successMsg = ref('');
  const errorMsg = ref('');
  
  const handleReset = async () => {
    try {
      loading.value = true;
      errorMsg.value = '';
      successMsg.value = '';
  
      const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
        redirectTo: `${window.location.origin}/update-password`,
      });
  
      if (error) {
        throw error;
      }
  
      successMsg.value = 'Check your email for the password reset link.';
    } catch (error: any) {
      errorMsg.value = error.message;
    } finally {
      loading.value = false;
    }
  };
  </script>
  
  <style scoped>
  .forgot-password-container {
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
    background-color: #007bff;
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