<template>
  <div class="home-container">
    <div v-if="user" class="logged-in-message">
      <h1 class="welcome-title">Welcome!</h1>
      <p class="welcome-text">You have successfully logged in as **{{ user.email }}**.</p>
      <button @click="handleLogout" class="logout-button">Log Out</button>
    </div>
    <div v-else class="logged-out-section">
      <h1 class="logged-out-title">Welcome to Scrummies</h1>
      <p class="logged-out-text">Please <NuxtLink to="/login" class="link">log in</NuxtLink> to continue.</p>
      <p class="logged-out-text">Don't have an account? 
        <NuxtLink to="/signup" class="link">Sign up here</NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const router = useRouter();

// Handles user logout
const handleLogout = async () => {
  try {
    await supabase.auth.signOut();
    router.push('/');
  } catch (error) {
    console.error('Error logging out:', error);
  }
};
</script>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  text-align: center;
  padding: 20px;
}

.logged-in-message {
  padding: 40px;
  background-color: #e8f5e9;
  border: 1px solid #a5d6a7;
  border-radius: 8px;
  max-width: 500px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.welcome-title {
  font-size: 2.5em;
  margin-bottom: 0.5em;
  color: #388e3c;
}

.welcome-text {
  font-size: 1.3em;
  margin-bottom: 1.5em;
  color: #555;
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

.logged-out-section {
  width: 100%;
  max-width: 600px;
}

.logged-out-title {
  font-size: 2.5em;
  margin-bottom: 0.5em;
  color: #333;
}

.logged-out-text {
  font-size: 1.3em;
  margin-bottom: 2em;
  color: #777;
}

.link {
  color: #007bff;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}
</style>