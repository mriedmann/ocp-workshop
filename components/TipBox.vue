<script setup>
import { computed } from 'vue'

const props = defineProps({
  type:  { default: 'tip' },
  title: { default: null },
})

const styles = {
  tip:     { border: '#0066CC', bg: '#EBF4FF' },
  note:    { border: '#6B7280', bg: '#F3F4F6' },
  warning: { border: '#D97706', bg: '#FFFBEB' },
  danger:  { border: '#EE0000', bg: '#FEF2F2' },
}

const s = computed(() => styles[props.type] || styles.tip)
</script>

<template>
  <div
    class="tip-box rounded px-4 py-3 my-3 border-l-4"
    :style="{ borderColor: s.border, background: s.bg }"
  >
    <div v-if="title" class="font-700 mb-1 text-sm uppercase tracking-wide" :style="{ color: s.border }">
      {{ title }}
    </div>
    <slot />
  </div>
</template>
