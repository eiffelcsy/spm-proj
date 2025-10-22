<template>
  <div class="grid min-h-svh lg:grid-cols-2">
    <div class="relative hidden bg-muted lg:block">
      <img src="/assets/office-picture.jpg" alt="Image"
        class="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale">
    </div>
    <div class="flex flex-col gap-4 p-6 md:p-10">
      <div class="flex flex-1 items-center justify-center">
        <div class="w-full max-w-sm">
          <div class="flex items-center justify-center text-center mb-10">
            <CheckSquare class="w-10 h-10 mr-2" />
            <h1 class="text-4xl font-bold">
              TaskAIO
            </h1>
          </div>
          <form @submit.prevent="handleSignup" :class="cn('flex flex-col gap-6')">
            <div class="flex flex-col items-center gap-2 text-center">
              <h1 class="text-2xl font-bold">
                Create an account
              </h1>
              <p class="text-balance text-sm text-muted-foreground">
                Enter your information below to sign up
              </p>
            </div>
            <div class="grid gap-6">
              <div v-if="errorMsg" class="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                {{ errorMsg }}
              </div>
              <div v-if="successMsg" class="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md">
                {{ successMsg }}
              </div>
              <div class="grid gap-2">
                <Label for="fullname">Full Name</Label>
                <Input id="fullname" v-model="fullname" type="text" placeholder="John Doe" required />
              </div>
              <div class="grid gap-2">
                <Label for="email">Email</Label>
                <Input id="email" v-model="email" type="email" placeholder="m@example.com" required />
              </div>
              <div class="grid gap-2">
                <Label for="password">Password</Label>
                <Input id="password" v-model="password" type="password" required />
              </div>
              <div class="grid gap-2">
                <Label for="confirm-password">Confirm Password</Label>
                <Input id="confirm-password" v-model="confirmPassword" type="password" required />
              </div>
              <Button type="submit" class="w-full" :disabled="loading">
                <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ loading ? 'Creating Account...' : 'Create Account' }}
              </Button>
            </div>
            <div class="text-center text-sm">
              Already have an account?
              <NuxtLink href="/login" class="underline underline-offset-4">
                Sign in
              </NuxtLink>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from '#imports';
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckSquare } from "lucide-vue-next"

// ============================================================================
// ROUTING
// ============================================================================

const router = useRouter();

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const fullname = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

// ============================================================================
// FORM VALIDATION
// ============================================================================

function validateForm(): boolean {
  // Check if all fields are filled
  if (!fullname.value || !email.value || !password.value || !confirmPassword.value) {
    errorMsg.value = 'Please fill in all fields.';
    return false;
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value)) {
    errorMsg.value = 'Please enter a valid email address.';
    return false;
  }
  
  // Validate password length
  if (password.value.length < 6) {
    errorMsg.value = 'Password must be at least 6 characters long.';
    return false;
  }
  
  // Check if passwords match
  if (password.value !== confirmPassword.value) {
    errorMsg.value = 'Passwords do not match.';
    return false;
  }
  
  return true;
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

const handleSignup = async () => {
  loading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  // Frontend Validation
  if (!validateForm()) {
    loading.value = false;
    return;
  }

  try {
    const response = await $fetch('/api/signup/signup', {
      method: 'POST',
      body: {
        fullname: fullname.value,
        email: email.value,
        password: password.value,
      },
    });

    // Show success message with email confirmation instruction
    successMsg.value = response.message || 'Account created! Please check your email to confirm your account before logging in.';
    
    // Clear form fields after successful signup
    fullname.value = '';
    email.value = '';
    password.value = '';
    confirmPassword.value = '';
    
    // Redirect to login after 3 seconds
    setTimeout(() => {
      router.push('/login');
    }, 3000);
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

<style>
</style>