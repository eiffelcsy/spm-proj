<template>
  <div class="min-h-screen bg-background">
    <!-- Navigation -->
    <nav class="border-b border-border">
      <div class="container mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="size-10 rounded-lg bg-primary flex items-center justify-center">
              <CheckSquare class="size-6 text-primary-foreground" />
            </div>
            <span class="text-xl font-semibold tracking-tight">TaskAIO</span>
          </div>
          <div v-if="user" class="flex items-center gap-4">
            <span class="text-sm text-muted-foreground">{{ user.email }}</span>
            <Button @click="handleLogout" variant="ghost" size="sm">
              Log Out
            </Button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <main class="container mx-auto px-6">
      <div v-if="user" class="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] text-center">
        <div class="max-w-2xl space-y-6">
          <div class="inline-flex items-center rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground mb-4">
            <span class="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
            Logged in
          </div>
          <h1 class="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Welcome back
          </h1>
          <p class="text-xl text-muted-foreground max-w-xl mx-auto">
            Ready to manage your projects? Head to your dashboard to continue where you left off.
          </p>
          <div class="flex items-center justify-center gap-4 pt-4">
            <Button @click="router.push('/personal/dashboard')" size="lg" class="text-base">
              Go to Dashboard
              <svg xmlns="http://www.w3.org/2000/svg" class="ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14"/>
                <path d="m12 5 7 7-7 7"/>
              </svg>
            </Button>
          </div>
        </div>
      </div>

      <div v-else class="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-10rem)] py-12">
        <!-- Left Content -->
        <div class="space-y-8">
          <div class="space-y-4">
            <div class="inline-flex items-center rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground">
              Project Management Simplified
            </div>
            <h1 class="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Streamline your
              <span class="text-primary"> workflow</span>
            </h1>
            <p class="text-xl text-muted-foreground max-w-xl">
              TaskAIO helps teams collaborate efficiently with intuitive project management tools designed for modern workflows. Tailor-made for All In One Co.
            </p>
          </div>

          <div class="flex items-center gap-4">
            <Button @click="router.push('/signup')" size="lg" class="text-base">
              Get Started
              <svg xmlns="http://www.w3.org/2000/svg" class="ml-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14"/>
                <path d="m12 5 7 7-7 7"/>
              </svg>
            </Button>
            <Button @click="router.push('/login')" variant="outline" size="lg" class="text-base">
              Log In
            </Button>
          </div>

          <!-- Features -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-8">
            <div class="space-y-2">
              <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2v20M2 12h20"/>
                </svg>
              </div>
              <h3 class="font-semibold">Task Management</h3>
              <p class="text-sm text-muted-foreground">Organize and track tasks with ease</p>
            </div>
            <div class="space-y-2">
              <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3 class="font-semibold">Team Collaboration</h3>
              <p class="text-sm text-muted-foreground">Work together seamlessly</p>
            </div>
            <div class="space-y-2">
              <div class="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 3v18h18"/>
                  <path d="m19 9-5 5-4-4-3 3"/>
                </svg>
              </div>
              <h3 class="font-semibold">Progress Tracking</h3>
              <p class="text-sm text-muted-foreground">Monitor project milestones</p>
            </div>
          </div>
        </div>

        <!-- Right Image -->
        <div class="relative hidden lg:block h-[500px] xl:h-[600px]">
          <div class="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-3xl"></div>
          <img 
            src="../assets/office-picture.jpg" 
            alt="Modern office workspace" 
            class="rounded-3xl shadow-2xl w-full h-full object-cover border border-border"
          />
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-border mt-auto">
      <div class="container mx-auto px-6 py-8">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p class="text-sm text-muted-foreground">
            © 2025 Scrummies.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useSupabaseUser, useSupabaseClient, useRouter } from '#imports';
import { Button } from '~/components/ui/button';
import { CheckSquare } from 'lucide-vue-next';

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