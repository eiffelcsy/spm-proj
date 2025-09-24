<template>
  <div class="home-container">
    <div class="left-section">
      <img src="../assets/office-picture.jpg" alt="office" class="left-image" />
    </div>

    <div class="right-section forgot-password-section">
      <div class="forgot-password-card-container">
        <NuxtLink to="/login" class="back-link">
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
          <span class="back-text">Back to Login</span>
        </NuxtLink>
        <div class="forgot-password-card">
          <h1 class="forgot-password-title">Forgot Password</h1>
          <p class="forgot-password-description">
            Enter your email to receive a password reset link.
          </p>
          <form @submit.prevent="handleReset" class="forgot-password-form">
            <div class="form-group">
              <label for="email" class="form-label">Email</label>
              <input
                id="email"
                type="email"
                v-model="email"
                class="form-input"
                placeholder="Enter your email"
                required
              />
            </div>
            <button
              type="submit"
              class="forgot-password-button"
              :disabled="loading"
            >
              {{ loading ? 'Sending...' : 'Send Reset Link' }}
            </button>
            <div v-if="successMsg" class="success-message">{{ successMsg }}</div>
            <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Your script logic remains the same
import { ref } from 'vue';

const email = ref('');
const loading = ref(false);
const successMsg = ref('');
const errorMsg = ref('');

const handleReset = async () => {
  loading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    const response = await $fetch('/api/forgot-password/forgot-password', {
      method: 'POST',
      body: { email: email.value },
    });

    successMsg.value = response.message;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'statusMessage' in error) {
      errorMsg.value = (error as { statusMessage: string }).statusMessage;
    } else {
      errorMsg.value = 'An unexpected error occurred. Please try again.';
    }
    console.error('Forgot password failed:', error);
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
  background-color: #f0f2f5;
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

/* Forgot Password Card Styling */
.forgot-password-card-container {
  position: relative;
  padding: 40px;
  background-color: #ffffff;
  border-radius: 12px;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  animation: fadeIn 0.8s ease-in-out forwards;
}

.forgot-password-card {
  text-align: left;
}

.forgot-password-title {
  font-size: 2.5em;
  margin-bottom: 0.2em;
  color: #333;
  text-align: center;
  font-weight: 700;
}

.forgot-password-description {
  font-size: 1.2em;
  margin-bottom: 1.5em;
  color: #777;
  text-align: center;
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

.forgot-password-button {
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

.forgot-password-button:hover {
  background-color: #0056b3;
  transform: translateY(-2px);
}

.success-message {
  color: #28a745;
  font-size: 1em;
  margin-top: 1.5em;
  text-align: center;
  background-color: #e9f7ef;
  border: 1px solid #d4edda;
  padding: 10px;
  border-radius: 6px;
}

.error-message {
  color: #dc3545;
  font-size: 1em;
  margin-top: 1.5em;
  text-align: center;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  padding: 10px;
  border-radius: 6px;
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