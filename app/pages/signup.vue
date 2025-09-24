<template>
  <div class="home-container">
    <div class="left-section">
      <img src="../assets/office-picture.jpg" alt="office" class="left-image" />
    </div>

    <div class="right-section signup-section">
      <div class="signup-card-container">
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
              <input id="password" v-model="password" type="password" class="form-input" placeholder="Enter your password" required />
            </div>
            <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>
            <button type="submit" class="signup-button" :disabled="loading">
              {{ loading ? 'Loading...' : 'Sign Up' }}
            </button>
          </form>
          <p class="signup-footer">
            Already have an account? <NuxtLink to="/login" class="link">Log in</NuxtLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Your script logic remains the same
import { ref } from 'vue';
import { useRouter } from '#imports';

const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');

const handleSignup = async () => {
  loading.value = true;
  errorMsg.value = '';

  try {
    const response = await $fetch('/api/signup/signup', {
      method: 'POST',
      body: {
        email: email.value,
        password: password.value,
      },
    });

    alert(response.message);
    router.push('/login');
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'statusMessage' in error) {
      errorMsg.value = (error as { statusMessage: string }).statusMessage;
    } else {
      errorMsg.value = 'An unexpected error occurred. Please try again.';
    }
    console.error('Signup failed:', error);
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

/* Signup Card Styling */
.signup-card-container {
  position: relative;
  padding: 40px;
  background-color: #ffffff;
  border-radius: 12px;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  animation: fadeIn 0.8s ease-in-out forwards;
}

.signup-card {
  text-align: left;
}

.signup-title {
  font-size: 2.5em;
  margin-bottom: 0.2em;
  color: #333;
  text-align: center;
  font-weight: 700;
}

.signup-description {
  font-size: 1.2em;
  margin-bottom: 1.5em;
  color: #777;
  text-align: center;
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

.error-message {
  color: #dc3545;
  font-size: 0.9em;
  margin-bottom: 1em;
  text-align: center;
}

.signup-button {
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

.signup-button:hover {
  background-color: #0056b3;
  transform: translateY(-2px);
}

.signup-footer {
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