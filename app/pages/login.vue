<template>
  <div class="home-container">
    <div class="left-section">
      <img src="../assets/office-picture.jpg" alt="office" class="left-image" />
    </div>
    <div class="right-section">
      <div v-if="user" class="logged-in-message">
        <h1 class="welcome-title">Welcome!</h1>
        <p class="welcome-text">You have successfully logged in as **{{ user.email }}**.</p>
        <button @click="handleLogout" class="logout-button">Log Out</button>
      </div>
      <div v-else class="login-card">
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
          <p class="forgot-password">
            <NuxtLink to="/forgot-password" class="link">Forgot password?</NuxtLink>
          </p>
          <button type="submit" class="login-button">Log In</button>
        </form>
        <p class="signup-link">
          Don't have an account? <NuxtLink to="/signup" class="link">Sign up here</NuxtLink>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSupabaseUser, useSupabaseClient } from '#imports';

const email = ref('');
const password = ref('');
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const router = useRouter();

// Handles user login by calling the server API
const handleLogin = async () => {
  try {
    const response = await $fetch('/api/login/login', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value,
      },
    });

    if (response.success && response.session) {
      await supabase.auth.setSession(response.session);
      router.push('/');
    } else {
      alert('Login failed. Please try again.');
    }
  } catch (error) {
    // **CRITICAL CHANGE:** Safely check the type of the error object
    if (typeof error === 'object' && error !== null && 'statusMessage' in error) {
      alert((error as { statusMessage: string }).statusMessage);
    } else {
      alert('An unexpected error occurred during login.');
    }
    console.error('Login failed:', error);
  }
};

const handleLogout = async () => {
  try {
    await $fetch('/api/login/logout', {
      method: 'POST',
    });
    router.push('/');
  } catch (error) {
    // **CRITICAL CHANGE:** Safely check the type of the error object
    if (typeof error === 'object' && error !== null && 'statusMessage' in error) {
      alert((error as { statusMessage: string }).statusMessage);
    } else {
      alert('An unexpected error occurred during logout.');
    }
    console.error('Error logging out:', error);
  }
};
</script>


<style scoped>
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
  background-color: #ffffff;
}

.logged-in-message,
.login-card {
  padding: 40px;
  background-color: #ffffff;
  border: 1px solid #ddd;
  border-radius: 8px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  text-align: left;
}

.login-title {
  font-size: 2em;
  margin-bottom: 0.5em;
  color: #333;
  text-align: center;
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
  padding: 10px;
  font-size: 1em;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.forgot-password {
  text-align: right;
  margin-bottom: 1.5em;
}

.login-button {
  padding: 12px 24px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s ease;
}

.login-button:hover {
  background-color: #0056b3;
}

.signup-link {
  margin-top: 1.5em;
  text-align: center;
  font-size: 1em;
}

.link {
  color: #007bff;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}
</style>