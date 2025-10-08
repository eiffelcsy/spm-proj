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
          <form @submit.prevent="handleLogin" :class="cn('flex flex-col gap-6')">
            <div class="flex flex-col items-center gap-2 text-center">
              <h1 class="text-2xl font-bold">
                Login to your account
              </h1>
              <p class="text-balance text-sm text-muted-foreground">
                Enter your email below to login to your account
              </p>
            </div>
            <div class="grid gap-6">
              <div class="grid gap-2">
                <Label for="email">Email</Label>
                <Input id="email" v-model="email" type="email" placeholder="m@example.com" required />
              </div>
              <div class="grid gap-2">
                <div class="flex items-center">
                  <Label for="password">Password</Label>
                  <NuxtLink href="/forgot-password" class="ml-auto text-sm underline-offset-4 hover:underline">
                    Forgot your password?
                  </NuxtLink>
                </div>
                <Input id="password" v-model="password" type="password" required />
              </div>
              <Button type="submit" class="w-full">
                Login
              </Button>
            </div>
            <div class="text-center text-sm">
              Don't have an account?
              <NuxtLink href="/signup" class="underline underline-offset-4">
                Sign up
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
import { useSupabaseClient, useRouter } from '#imports';
import { cn } from '@/lib/utils';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckSquare } from "lucide-vue-next"

// ============================================================================
// ROUTING & SERVICES
// ============================================================================

const supabase = useSupabaseClient();
const router = useRouter();

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');

// ============================================================================
// FORM VALIDATION
// ============================================================================

function validateForm(): boolean {
  // Check if both fields are filled
  if (!email.value || !password.value) {
    errorMsg.value = 'Please enter both email and password.';
    return false;
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value)) {
    errorMsg.value = 'Please enter a valid email address.';
    return false;
  }
  
  return true;
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

const handleLogin = async () => {
  loading.value = true;
  errorMsg.value = '';

  // Frontend Validation
  if (!validateForm()) {
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
      router.push('/personal/dashboard');
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

<style>
</style>