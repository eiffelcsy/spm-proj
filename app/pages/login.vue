<template>
    <div class="login-container">
      <h1>Log In</h1>
      <form @submit.prevent="handleLogin">
        <div>
          <label for="email">Email</label>
          <input id="email" type="email" v-model="email" required />
        </div>
        <div>
          <label for="password">Password</label>
          <input id="password" type="password" v-model="password" required />
          <p class="forgot-password-link">
            <NuxtLink to="/forgot-password" class="link">Forgot password?</NuxtLink>
          </p>
        </div>
        <button type="submit" :disabled="!isFormValid || loading">
          {{ loading ? 'Loading...' : 'Log In' }}
        </button>
        <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>
      </form>
      
      <div class="links-container">
        <p>Don't have an account? <NuxtLink to="/signup" class="link">Sign up</NuxtLink></p>
        <p><NuxtLink to="/" class="link">Go to Home</NuxtLink></p>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref, watch, computed } from 'vue';
  
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();
  const router = useRouter();
  
  const email = ref('');
  const password = ref('');
  const loading = ref(false);
  const errorMsg = ref('');
  
  // Computed property to check if both fields are filled
  const isFormValid = computed(() => {
    return email.value.length > 0 && password.value.length > 0;
  });
  
  watch(user, (newUser) => {
    if (newUser) {
      router.push('/');
    }
  });
  
  const handleLogin = async () => {
    try {
      loading.value = true;
      errorMsg.value = '';
  
      const { error } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value,
      });
  
      if (error) {
        throw error;
      }
    } catch (error: any) {
      errorMsg.value = error.message;
    } finally {
      loading.value = false;
    }
  };
  </script>
  
  <style scoped>
  .login-container {
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
  
  .forgot-password-link {
    margin-top: 5px;
    text-align: right;
    font-size: 0.9em;
  }
  
  .link {
    color: #007bff;
    text-decoration: none;
  }
  
  .link:hover {
    text-decoration: underline;
  }
  </style>