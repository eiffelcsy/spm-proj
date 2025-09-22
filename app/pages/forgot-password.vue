<template>
  <div class="home-container">
    <!-- Left Section with Photo -->
    <div class="left-section">
      <img src="/Users/xlium/Documents/SPM/Github/scrummies/app/assets/office picture.jpg" alt="office"
        class="left-image" />
    </div>

    <!-- Right Section with Forgot Password Card -->
    <div class="right-section">
      <div class="forgot-password-card">
        <h1 class="forgot-password-title">Forgot Password</h1>
        <p class="forgot-password-description">Enter your email to receive a password reset link.</p>
        <form @submit.prevent="handleReset" class="forgot-password-form">
          <div class="form-group">
            <label for="email" class="form-label">Email</label>
            <input id="email" type="email" v-model="email" class="form-input" placeholder="Enter your email" required />
          </div>
          <button type="submit" class="forgot-password-button" :disabled="loading">
            {{ loading ? 'Sending...' : 'Send Reset Link' }}
          </button>
          <div v-if="successMsg" class="success-message">{{ successMsg }}</div>
          <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>
        </form>
      </div>
    </div>
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
/* Main container for the layout */
.home-container {
  display: flex;
  min-height: 100vh;
  overflow: hidden;
}

/* Left Section with Photo */
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

/* Right Section with Forgot Password Card */
.right-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
}

.forgot-password-card {
  padding: 40px;
  background-color: #ffffff;
  border: 1px solid #ddd;
  border-radius: 8px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.forgot-password-title {
  font-size: 2em;
  margin-bottom: 0.5em;
  color: #333;
}

.forgot-password-description {
  font-size: 1.2em;
  margin-bottom: 1.5em;
  color: #777;
}

.forgot-password-form {
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

.forgot-password-button {
  padding: 12px 24px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s ease;
}

.forgot-password-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.success-message {
  color: green;
  margin-top: 10px;
}

.error-message {
  color: red;
  margin-top: 10px;
}
</style>