<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  DataBoard,
  Refresh,
  SuccessFilled,
  WarningFilled,
} from '@element-plus/icons-vue';
import { systemHealthApi, type SystemHealth } from '@/api/system';
import { formatBytes, formatDate } from '@/utils/format';

const loading = ref(false);
const health = ref<SystemHealth | null>(null);

const uptimeText = computed(() => {
  const seconds = health.value?.uptimeSeconds ?? 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours} 小时 ${minutes} 分钟`;
});

const queuePending = computed(
  () =>
    (health.value?.services.queue.waiting ?? 0) +
    (health.value?.services.queue.active ?? 0),
);

const diskPercent = computed(() => {
  const disk = health.value?.services.disk;
  if (!disk?.totalBytes) return 0;
  return Math.round((disk.usedBytes / disk.totalBytes) * 100);
});

async function load() {
  loading.value = true;
  try {
    health.value = await systemHealthApi();
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="page-stack" v-loading="loading">
    <section class="metrics-grid">
      <el-card shadow="never" class="metric-card">
        <div class="metric-icon">
          <el-icon><SuccessFilled /></el-icon>
        </div>
        <div>
          <span>服务状态</span>
          <strong>{{ health?.status || '-' }}</strong>
        </div>
      </el-card>
      <el-card shadow="never" class="metric-card">
        <div class="metric-icon">
          <el-icon><DataBoard /></el-icon>
        </div>
        <div>
          <span>运行时长</span>
          <strong>{{ uptimeText }}</strong>
        </div>
      </el-card>
      <el-card shadow="never" class="metric-card">
        <div class="metric-icon">
          <el-icon><WarningFilled /></el-icon>
        </div>
        <div>
          <span>内存占用</span>
          <strong>{{ formatBytes(health?.memory.rss ?? 0) }}</strong>
        </div>
      </el-card>
      <el-card shadow="never" class="metric-card">
        <div class="metric-icon">
          <el-icon><DataBoard /></el-icon>
        </div>
        <div>
          <span>图片记录</span>
          <strong>{{ health?.counts.images ?? 0 }}</strong>
        </div>
      </el-card>
      <el-card shadow="never" class="metric-card">
        <div class="metric-icon">
          <el-icon><DataBoard /></el-icon>
        </div>
        <div>
          <span>处理队列</span>
          <strong>{{ queuePending }}</strong>
        </div>
      </el-card>
      <el-card shadow="never" class="metric-card">
        <div class="metric-icon">
          <el-icon><WarningFilled /></el-icon>
        </div>
        <div>
          <span>磁盘使用</span>
          <strong>{{ diskPercent }}%</strong>
        </div>
      </el-card>
    </section>

    <section class="content-grid">
      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <strong>依赖服务</strong>
            <el-button :icon="Refresh" @click="load">刷新</el-button>
          </div>
        </template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="数据库">
            <el-tag type="success">{{ health?.services.database }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="Redis">
            {{ health?.services.redis.host }}:{{ health?.services.redis.port }}
          </el-descriptions-item>
          <el-descriptions-item label="对象存储">
            {{ health?.services.storage.provider }} /
            {{ health?.services.storage.endpoint }}
          </el-descriptions-item>
          <el-descriptions-item label="Bucket">
            {{ health?.services.storage.bucket }}
          </el-descriptions-item>
          <el-descriptions-item label="公开域名">
            {{ health?.services.storage.publicBaseUrl }}
          </el-descriptions-item>
          <el-descriptions-item label="Telegram Bot">
            {{ health?.services.telegram.enabledAccounts ?? 0 }} 个账号启用
          </el-descriptions-item>
          <el-descriptions-item label="处理队列">
            等待 {{ health?.services.queue.waiting ?? 0 }} / 运行
            {{ health?.services.queue.active ?? 0 }} / 失败
            {{ health?.services.queue.failed ?? 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="磁盘">
            {{ health?.services.disk.path }}， 已用
            {{ formatBytes(health?.services.disk.usedBytes ?? 0) }} /
            {{ formatBytes(health?.services.disk.totalBytes ?? 0) }}
          </el-descriptions-item>
          <el-descriptions-item label="最近备份">
            <template v-if="health?.services.backup.latest">
              {{ health.services.backup.latest.name }}，
              {{ formatBytes(health.services.backup.latest.sizeBytes) }}，
              {{ health.services.backup.latest.fileCount }} 个文件
            </template>
            <template v-else>暂无备份</template>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <strong>系统信息</strong>
          </div>
        </template>
        <div class="feature-list">
          <div>
            <strong>Node</strong>
            <span>{{ health?.nodeVersion }}</span>
          </div>
          <div>
            <strong>启动时间</strong>
            <span>{{ formatDate(health?.startedAt) }}</span>
          </div>
          <div>
            <strong>用户 / 相册 / API Key</strong>
            <span>
              {{ health?.counts.users ?? 0 }} /
              {{ health?.counts.albums ?? 0 }} /
              {{ health?.counts.apiKeys ?? 0 }}
            </span>
          </div>
          <div>
            <strong>备份目录</strong>
            <span>{{ health?.services.backup.directory }}</span>
          </div>
          <div>
            <strong>历史备份数</strong>
            <span>{{ health?.services.backup.count ?? 0 }}</span>
          </div>
        </div>
      </el-card>
    </section>
  </div>
</template>
