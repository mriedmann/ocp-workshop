<script setup>
defineProps({
  lab:      { default: '' },
  heading:  { default: 'Lab Exercise' },
  duration: { default: '' },
})
</script>

<template>
  <div class="slidev-layout lab-exercise h-full flex flex-col">
    <div
      class="lab-header px-10 py-4 flex items-center gap-4 flex-shrink-0"
      style="background: #0066CC; color: #fff;"
    >
      <LabBadge />
      <div>
        <div class="text-sm uppercase tracking-widest" style="opacity: 0.8;">
          Lab {{ lab }}<span v-if="duration"> · {{ duration }}</span>
        </div>
        <h1 class="text-2xl font-700 m-0" style="color: #fff; border: none; padding: 0;">
          {{ heading }}
        </h1>
      </div>
    </div>
    <div class="flex-1 px-10 py-6 overflow-auto" style="font-size: 0.95rem;">
      <slot />
    </div>
  </div>
</template>
