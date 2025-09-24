<template>
  <div class="home-container">
    <div class="left-section">
      <img src="../assets/office-picture.jpg" alt="office" class="left-image" />
    </div>
    <div class="right-section login-section">
      <div class="login-card-container">
        <NuxtLink to="/" class="back-link">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="back-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span class="back-text">Back to Home</span>
        </NuxtLink>
        <div class="login-card">
          <h1 class="login-title">Welcome Back</h1>
          <p class="login-description">Sign in to continue</p>
          <form @submit.prevent="handleLogin" class="login-form">
            <div class="form-group">
              <label for="email" class="form-label">Email Address</label>
              <input v-model="email" type="email" id="email" class="form-input" placeholder="Enter your email" required />
            </div>
            <div class="form-group">
              <label for="password" class="form-label">Password</label>
              <input v-model="password" type="password" id="password" class="form-input" placeholder="Enter your password" required />
            </div>
            <p v-if="errorMsg" class="error-message">{{ errorMsg }}</p>
            <p class="forgot-password">
              <NuxtLink to="/forgot-password" class="link">Forgot password?</NuxtLink>
            </p>
            <button type="submit" class="login-button" :disabled="loading">
              {{ loading ? 'Logging in...' : 'Log In' }}
            </button>
          </form>
          <p class="signup-link">
            Don't have an account? <NuxtLink to="/signup" class="link">Sign up here</NuxtLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Your script logic remains the same
import { ref } from 'vue';
import { useSupabaseClient, useRouter } from '#imports';

const supabase = useSupabaseClient();
const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');

const handleLogin = async () => {
  loading.value = true;
  errorMsg.value = '';

  // Frontend Validation (checks and logic)
  if (!email.value || !password.value) {
    errorMsg.value = 'Please enter both email and password.';
    loading.value = false;
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value)) {
    errorMsg.value = 'Please enter a valid email address.';
    loading.value = false;
    return;
  }

  try {
    const response = await $fetch('/api/login/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    });

    if (response.success && response.session) {
      await supabase.auth.setSession(response.session);
      router.push('/');
    } else {
      errorMsg.value = 'Login failed. Please try again.';
    }
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'statusMessage' in error) {
      errorMsg.value = (error as { statusMessage: string }).statusMessage;
    } else {
      errorMsg.value = 'An unexpected error occurred.';
    }
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
/* Base layout and sections */
.home-container {
  display: flex;
  min-height: 100vh;
  overflow: hidden;
}

.left-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.left-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  max-height: 100vh;
}

.right-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f2f5; /* Light gray background */
}

/* Back Link Styling */
.back-link {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #5a5a5a;
  text-decoration: none;
  font-size: 1em;
  font-weight: 500;
  transition: color 0.3s ease, transform 0.3s ease;
}

.back-link:hover {
  color: #007bff;
  transform: translateX(-4px);
}

.back-icon {
  width: 20px;
  height: 20px;
}

/* Login Card Styling */
.login-card-container {
  position: relative;
  padding: 40px;
  background-color: #ffffff;
  border-radius: 12px;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  animation: fadeIn 0.8s ease-in-out forwards;
}

.login-card {
  text-align: left;
}

.login-title {
  font-size: 2.5em;
  margin-bottom: 0.2em;
  color: #333;
  text-align: center;
  font-weight: 700;
}

.login-description {
  font-size: 1.2em;
  margin-bottom: 1.5em;
  color: #777;
  text-align: center;
}

.login-form {
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: 1.5em;
}

.form-label {
  display: block;
  margin-bottom: 0.5em;
  font-size: 1em;
  color: #555;
}

.form-input {
  width: 100%;
  padding: 12px;
  font-size: 1em;
  border: 1px solid #ddd;
  border-radius: 6px;
  transition: border-color 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
}

.forgot-password {
  text-align: right;
  margin-bottom: 1.5em;
  font-size: 0.9em;
}

.login-button {
  padding: 14px 24px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1em;
  transition: background-color 0.3s ease, transform 0.3s ease;
  font-weight: 600;
}

.login-button:hover {
  background-color: #0056b3;
  transform: translateY(-2px);
}

.signup-link {
  margin-top: 1.5em;
  text-align: center;
  font-size: 1em;
}

.link {
  color: #007bff;
  text-decoration: none;
  font-weight: 600;
  transition: text-decoration 0.3s ease;
}

.link:hover {
  text-decoration: underline;
}

.error-message {
  color: #dc3545;
  font-size: 0.9em;
  margin-bottom: 1em;
  text-align: center;
}

/* Optional animation to make it look nicer */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>