<template>
  <UCard>
    <p class="font-semibold mb-3">{{ title }}</p>

    <div class="grid grid-cols-1 gap-3">
      <UFormField label="Metros" required :error="errorMeters">
        <UInput v-model.number="model.meters" type="number" min="0" step="1" />
      </UFormField>

      <UFormField label="Colindancia" required :error="errorText">
        <UInput v-model="model.text" placeholder="Colinda con..." />
      </UFormField>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { BorderData } from "../domain/construction.types";

defineProps<{
  title: string;
  errorMeters?: string;
  errorText?: string;
}>();

const model = defineModel<BorderData>({
  required: true,
});
</script>
