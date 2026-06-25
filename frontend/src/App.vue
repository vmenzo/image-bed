<script setup lang="ts">
import { onErrorCaptured, onMounted, ref } from 'vue';

const runtimeError = ref('');

function reportRuntimeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  runtimeError.value = message || '页面加载失败，请刷新后重试';
}

function reloadApp() {
  window.location.reload();
}

onErrorCaptured((error) => {
  reportRuntimeError(error);
  return false;
});

onMounted(() => {
  window.addEventListener('error', (event) => {
    reportRuntimeError(event.error ?? event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    reportRuntimeError(event.reason);
  });
});
</script>

<template>
  <div v-if="runtimeError" class="runtime-error">
    <div>
      <strong>页面加载异常</strong>
      <span>请刷新页面后重试。若刚更新过系统，可能是浏览器缓存了旧资源。</span>
      <button type="button" @click="reloadApp">刷新页面</button>
    </div>
  </div>
  <RouterView v-else />
</template>
