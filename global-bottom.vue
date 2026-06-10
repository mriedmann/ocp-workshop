<script setup>
import { useNav } from '@slidev/client'

const { currentLayout, currentPage, total } = useNav()

const suppressLayouts = new Set(['chapter-title', 'cover', 'end'])
</script>

<template>
  <footer
    v-if="!suppressLayouts.has(currentLayout)"
    class="absolute bottom-0 left-0 right-0 flex items-center justify-between px-10 py-2"
    style="background: rgba(255,255,255,0.92); border-top: 1px solid #e5e7eb;
           font-size: 0.72rem; color: #6b7280; backdrop-filter: blur(4px); z-index: 10;"
  >
    <span>Linux to OpenShift Workshop</span>
    <span>{{ currentPage }} / {{ total }}</span>
  </footer>
</template>
