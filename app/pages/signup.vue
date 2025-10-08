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
                <Input id="confirm-password" type="password" required />
              </div>
              <Button type="submit" class="w-full">
                Create Account
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

const email = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');

// ============================================================================
// EVENT HANDLERS
// ============================================================================

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

<style>
</style>