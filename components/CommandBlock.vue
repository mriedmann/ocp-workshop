<script setup>
defineProps({
  prompt: { default: '$' },
})
</script>

<template>
  <div
    class="command-block rounded font-mono text-sm px-4 py-3 my-2 flex items-start gap-2"
    style="background: #1a1a1a; color: #f0f0f0; line-height: 1.6;"
  >
    <span style="color: #0066CC; user-select: none; flex-shrink: 0;">{{ prompt }}</span>
    <span><slot /></span>
  </div>
</template>
