<template>
  <div class="home-container">
    <!-- Left Section with Photo -->
    <div class="left-section">
      <img src="../assets/office-picture.jpg" alt="office" class="left-image" />
    </div>

    <!-- Right Section with Sign-Up Card -->
    <div class="right-section">
      <div class="signup-card">
        <h1 class="signup-title">Create an Account</h1>
        <p class="signup-description">Enter your email and password to create an account</p>
        <form @submit.prevent="handleSignup" class="signup-form">
          <div class="form-group">
            <label for="email" class="form-label">Email</label>
            <input id="email" v-model="email" type="email" class="form-input" placeholder="Enter your email" required />
          </div>
          <div class="form-group">
            <label for="password" class="form-label">Password</label>
            <input id="password" v-model="password" type="password" class="form-input" placeholder="Enter your password"
              required />
          </div>
          <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>
          <button type="submit" class="signup-button" :disabled="loading">
            {{ loading ? 'Loading...' : 'Sign Up' }}
          </button>
        </form>
        <p class="signup-footer">
          Already have an account? <NuxtLink to="/login" class="link">Log in</NuxtLink>
        </p>
        <p class="signup-footer">
          <NuxtLink to="/" class="link">Go to Home</NuxtLink>
        </p>
      </div>
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

.signup-card {
  padding: 40px;
  background-color: #ffffff;
  border: 1px solid #ddd;
  border-radius: 8px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.signup-title {
  font-size: 2em;
  margin-bottom: 0.5em;
  color: #333;
}

.signup-description {
  font-size: 1.2em;
  margin-bottom: 1.5em;
  color: #777;
}

.signup-form {
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

.error-message {
  color: red;
  margin-top: 10px;
}

.signup-button {
  padding: 12px 24px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s ease;
}

.signup-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.signup-footer {
  margin-top: 1.5em;
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