<template>
    <div class="signup-container">
      <h1>Sign Up</h1>
      <form @submit.prevent="handleSignup">
        <div>
          <label for="email">Email</label>
          <input id="email" type="email" v-model="email" required />
        </div>
        <div>
          <label for="password">Password</label>
          <input id="password" type="password" v-model="password" required />
        </div>
        <button type="submit" :disabled="loading">
          {{ loading ? 'Loading...' : 'Sign Up' }}
        </button>
        <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>
      </form>
      
      <div class="links-container">
        <p>Already have an account? <NuxtLink to="/login" class="link">Log in</NuxtLink></p>
        <p><NuxtLink to="/" class="link">Go to Home</NuxtLink></p>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue';
  
  const supabase = useSupabaseClient();
  const router = useRouter(); 
  const email = ref('');
  const password = ref('');
  const loading = ref(false);
  const errorMsg = ref('');
  
  const handleSignup = async () => {
    try {
      loading.value = true;
      errorMsg.value = '';
  
      const { error } = await supabase.auth.signUp({
        email: email.value,
        password: password.value,
      });
  
      if (error) {
        throw error;
      }
      
      alert('Please check your email to confirm your account!');
      router.push('/login');
      
    } catch (error: any) {
      errorMsg.value = error.message;
    } finally {
      loading.value = false;
    }
  };
  </script>
  
  <style scoped>
  .signup-container {
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
  
  .links-container {
    margin-top: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .link {
    color: #007bff;
    text-decoration: none;
  }
  
  .link:hover {
    text-decoration: underline;
  }
  </style>