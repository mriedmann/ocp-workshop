<script setup>
defineProps({
  current: { type: Number, default: 1 },
  total:   { type: Number, default: 4 },
})

const labels = ['Linux', 'Containers', 'Kubernetes', 'OpenShift']
</script>

<template>
  <div class="progress-bar flex gap-2 items-center text-sm mt-2">
    <div
      v-for="i in total"
      :key="i"
      class="flex-1 rounded-full h-2 transition-all duration-500"
      :style="{
        background: i <= current ? 'var(--ocp-blue, #0066CC)' : '#e5e7eb',
      }"
    />
    <span class="ml-2 opacity-50 whitespace-nowrap">{{ labels[current - 1] }} complete</span>
  </div>
</template>
