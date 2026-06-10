<script setup>
defineProps({
  chapter:  { default: '01' },
  title:    { default: 'Chapter Title' },
  subtitle: { default: '' },
})
</script>

<template>
  <div
    class="slidev-layout chapter-title h-full flex flex-col justify-center px-16"
    style="background: linear-gradient(135deg, #151515 60%, #1a2e44 100%); color: #fff;"
  >
    <div
      class="text-sm tracking-widest uppercase mb-3"
      style="color: rgba(255,255,255,0.5);"
    >
      Chapter {{ chapter }}
    </div>
    <h1
      class="text-6xl font-700 leading-tight mb-4 m-0"
      style="color: #fff; border: none; padding: 0;"
    >
      {{ title }}
    </h1>
    <p
      v-if="subtitle"
      class="text-2xl m-0"
      style="color: rgba(255,255,255,0.65);"
    >
      {{ subtitle }}
    </p>
    <slot />
  </div>
</template>
