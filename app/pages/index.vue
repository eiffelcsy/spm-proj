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
      <div v-else class="logged-out-card">
        <h1 class="logged-out-title">Welcome to Scrummies</h1>
        <p class="logged-out-subtitle">Your home for streamlined project management.</p>
        <p class="logged-out-text">
          Get started by logging in or creating a new account.
        </p>
        <div class="action-buttons">
          <NuxtLink to="/login" class="action-button login-button">Log In</NuxtLink>
          <NuxtLink to="/signup" class="action-button signup-button">Sign Up</NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Your script logic remains the same
import { useSupabaseUser, useSupabaseClient, useRouter } from '#imports';

const user = useSupabaseUser();
const supabase = useSupabaseClient();
const router = useRouter();

const handleLogout = async () => {
  try {
    await $fetch('/api/logout/logout', {
      method: 'POST',
    });
    await supabase.auth.signOut();
    router.push('/');
  } catch (error) {
    console.error('Error logging out:', error);
    if (typeof error === 'object' && error !== null && 'statusMessage' in error) {
      alert((error as { statusMessage: string }).statusMessage);
    } else {
      alert('Logout failed. Please try again.');
    }
  }
};
</script>

<style scoped>
/* You can add these new styles to your existing styles section in index.vue */

/* Shared Container Styles (from your original code) */
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

/* New Styles for the Logged-Out Card */
.logged-out-card {
  padding: 40px;
  background-color: #f7f9fc;
  border: 1px solid #e1e4e8;
  border-radius: 12px;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
  text-align: center;
  transform: translateY(-20px);
  animation: fadeIn 0.8s ease-in-out forwards;
}

.logged-out-title {
  font-size: 2.5em;
  font-weight: 700;
  color: #333;
  margin-bottom: 0.2em;
}

.logged-out-subtitle {
  font-size: 1.4em;
  color: #5a5a5a;
  margin-bottom: 1em;
}

.logged-out-text {
  font-size: 1em;
  color: #777;
  margin-bottom: 2em;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 15px;
}

.action-button {
  padding: 12px 30px;
  font-size: 1.1em;
  border: none;
  border-radius: 30px;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s ease;
  font-weight: 600;
}

.login-button {
  background-color: #007bff;
  color: white;
  border: 2px solid #007bff;
}

.login-button:hover {
  background-color: #0056b3;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.signup-button {
  background-color: white;
  color: #007bff;
  border: 2px solid #007bff;
}

.signup-button:hover {
  background-color: #eaf6ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

/* You can keep your existing logged-in-message styles as well */
.logged-in-message {
  padding: 40px;
  background-color: #ffffff;
  border: 1px solid #ddd;
  border-radius: 8px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.welcome-title {
  font-size: 2em;
  margin-bottom: 0.5em;
  color: #333;
}

.welcome-text {
  font-size: 1.2em;
  margin-bottom: 1.5em;
  color: #777;
}

.logout-button {
  padding: 12px 24px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s ease;
}

.logout-button:hover {
  background-color: #c82333;
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