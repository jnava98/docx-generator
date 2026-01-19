<template>
  <UCard>
    <p class="font-semibold mb-3">{{ title }}</p>
    <div class="grid grid-cols-1 gap-3">
      <UFormField label="Metros">
        <UInput v-model.number="model.meters" type="number" min="0" step="0.01" />
      </UFormField>

      <UFormField label="Colindancia">
        <UInput v-model="model.text" placeholder="Colinda con..." />
      </UFormField>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { BorderData } from "../domain/construction.types";

defineProps<{ title: string }>();

const model = defineModel<BorderData>({
  required: true,
});
</script>
