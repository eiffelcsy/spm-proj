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
          <form @submit.prevent="handleUpdate" :class="cn('flex flex-col gap-6')">
            <div class="flex flex-col items-center gap-2 text-center">
              <h1 class="text-2xl font-bold">
                Update your password
              </h1>
              <p class="text-balance text-sm text-muted-foreground">
                Enter a new password for your account.
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
                <Label for="new-password">New Password</Label>
                <Input id="new-password" v-model="newPassword" type="password" required />
              </div>
              <Button type="submit" class="w-full" :disabled="loading">
                <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ loading ? 'Updating...' : 'Update Password' }}
              </Button>
            </div>
            <div class="text-center text-sm">
              Remembered your password?
              <NuxtLink href="/login" class="underline underline-offset-4">
                Back to Login
              </NuxtLink>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
  
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useSupabaseClient, useRouter } from '#imports'
import { cn } from '@/lib/utils'
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
  
  const newPassword = ref('');
  const loading = ref(false);
  const successMsg = ref('');
  const errorMsg = ref('');

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  function parseHashParams(hash: string): Record<string, string> {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
const handleUpdate = async () => {
  try {
    loading.value = true;
    errorMsg.value = '';
    successMsg.value = '';

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error('Auth session missing. Please use the password reset link from your email.');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword.value,
    });

    if (error) {
      throw error;
    }

    successMsg.value = 'Password updated successfully! Redirecting to login...';
    
    setTimeout(() => {
      router.push('/login');
    }, 2000);

  } catch (error: any) {
    errorMsg.value = error.message;
  } finally {
    loading.value = false;
  }
};

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================
  
  onMounted(async () => {
    // Ensure there's an active session. Recovery links often include tokens in the URL hash
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session && typeof window !== 'undefined' && window.location.hash) {
      const hashParams = parseHashParams(window.location.hash);
      const accessToken = hashParams['access_token'];
      const refreshToken = hashParams['refresh_token'];
      const type = hashParams['type'];
      try {
        if (type === 'recovery' && accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            throw error;
          }
        }
      } catch (e: any) {
        errorMsg.value = e?.message || 'Failed to initialize session from recovery link.';
      }
    }
  });
</script>

<style>
</style>