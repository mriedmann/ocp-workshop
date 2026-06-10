<template>
  <div
    class="slidev-layout two-cols-code h-full grid"
    style="grid-template-columns: 1fr 1.2fr; gap: 0;"
  >
    <div class="left-col px-10 py-8 flex flex-col justify-center">
      <slot />
    </div>
    <div class="right-col py-8 pr-8 pl-4 flex flex-col justify-center">
      <slot name="right" />
    </div>
  </div>
</template>

<style scoped>
.right-col :deep(pre) {
  border-radius: 0.5rem;
  font-size: 0.85rem;
  height: 100%;
  max-height: 75vh;
  overflow: auto;
}
</style>
