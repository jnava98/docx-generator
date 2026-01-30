<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <h2 class="text-xl font-semibold">Formulario de subdivisión de lotes</h2>
            <p class="text-sm text-gray-500">Paso {{ step + 1 }} de 5</p>
          </div>

          <div class="flex gap-2">
            <UButton variant="ghost" :disabled="step === 0" @click="prev">Atrás</UButton>
            <UButton :disabled="!canGoNext" @click="next">
              {{ step === 4 ? "Finalizar" : "Siguiente" }}
            </UButton>
          </div>
        </div>
      </template>

      <!-- CONTENT -->
      <div v-if="step === 0" class="space-y-4">
        <h3 class="text-lg font-semibold">Datos generales</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Folio" required :error="errors.folium">
            <UInput v-model="form.folium" placeholder="Ej: FOL-2026-001" />
          </UFormField>

          <UFormField label="Fecha" required :error="errors.date">
            <UInput
              type="date"
              :model-value="toDateInput(form.date)"
              @update:model-value="onDateChange"
            />
          </UFormField>

          <UFormField label="Propietario" required :error="errors.owner">
            <UInput type="text" v-model="form.owner" />
          </UFormField>
        </div>
      </div>

      <div v-else-if="step === 1" class="space-y-4">
        <h3 class="text-lg font-semibold">Lote original</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField label="Dirección" required :error="errors['originalBatch.address']">
            <UTextarea v-model="form.originalBatch.address" placeholder="Dirección del predio" />
          </UFormField>

          <div class="space-y-4">
            <UFormField
              label="Clave catastral"
              required
              :error="errors['originalBatch.catastralKey']"
            >
              <UInput v-model="form.originalBatch.catastralKey" placeholder="ABCD123" />
            </UFormField>

            <UFormField label="Área (m²)" required :error="errors['originalBatch.area']">
              <UInput v-model.number="form.originalBatch.area" type="number" min="0" step="0.01" />
            </UFormField>
          </div>
        </div>


        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <BorderEditor
            title="Norte"
            v-model="form.originalBatch.northData"
            :error-meters="errors['originalBatch.northData.meters']"
            :error-text="errors['originalBatch.northData.text']"
          />
          <BorderEditor
            title="Sur"
            v-model="form.originalBatch.southData"
            :error-meters="errors['originalBatch.southData.meters']"
            :error-text="errors['originalBatch.southData.text']"
          />
          <BorderEditor
            title="Este"
            v-model="form.originalBatch.eastData"
            :error-meters="errors['originalBatch.eastData.meters']"
            :error-text="errors['originalBatch.eastData.text']"
          />
          <BorderEditor
            title="Oeste"
            v-model="form.originalBatch.westData"
            :error-meters="errors['originalBatch.westData.meters']"
            :error-text="errors['originalBatch.westData.text']"
          />
        </div>
      </div>

      <div v-else-if="step === 2" class="space-y-4">
        <h3 class="text-lg font-semibold">Subdivisión</h3>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <UFormField label="Cantidad de lotes resultantes" required :error="errors.batchesNumber">
            <UInput
              v-model.number="form.batchesNumber"
              type="number"
              min="1"
              step="1"
              @blur="onBatchesNumberBlur"
            />
          </UFormField>

          <div class="md:col-span-2 flex gap-2">
            <UButton
              variant="outline"
              :disabled="!form.originalBatch.catastralKey || form.batchesNumber <= 0"
              @click="onGenerate"
            >
              Generar lotes
            </UButton>
          </div>
        </div>

        <UAlert
          v-if="errors.resultBatches"
          title="No puedes continuar"
          :description="errors.resultBatches"
          icon="i-heroicons-exclamation-triangle"
          color="red"
        />

        <UAlert
          v-if="!form.originalBatch.catastralKey"
          title="Falta la clave catastral del lote original"
          description="Vuelve al paso anterior y captura la clave para poder generar las claves consecutivas."
          icon="i-heroicons-exclamation-triangle"
          color="yellow"
        />

        <div v-if="form.resultBatches.length" class="space-y-3">
          <h4 class="font-semibold">Lotes generados</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <UCard v-for="(b, idx) in form.resultBatches" :key="b.catastralKey">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-semibold">Lote {{ idx + 1 }}</p>
                  <p class="text-sm text-gray-500">{{ b.catastralKey }}</p>
                </div>
                <UBadge color="gray">{{ b.area || 0 }} m²</UBadge>
              </div>
            </UCard>
          </div>
        </div>
      </div>

      <div v-else-if="step === 3" class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">Captura de lotes resultantes</h3>

          <UAlert
            v-if="areaValidation.ok === false"
            icon="i-heroicons-exclamation-triangle"
            color="error"
            :title="`La sumatoria no cuadra`"
            :description="`Esperado: ${areaValidation.expected} m² | Actual: ${areaValidation.got} m² | Diferencia: ${areaValidation.diff} m²`"
          />
          <UAlert
            v-else
            icon="i-heroicons-check-circle"
            color="success"
            title="Área validada"
            :description="`La sumatoria coincide con ${form.originalBatch.area} m²`"
          />
        </div>

        <div class="space-y-3">
          <UCard v-for="(b, i) in form.resultBatches" :key="b.catastralKey">
            <div class="flex items-center justify-between mb-3">
              <div>
                <p class="font-semibold">Lote {{ i + 1 }}</p>
                <p class="text-sm text-gray-500">
                  Clave catastral:
                  <span class="font-mono">{{ b.catastralKey }}</span>
                </p>
              </div>

              <UFormField label="Área (m²)" class="w-40" required :error="errors[`resultBatches.${i}.area`]">
                <UInput v-model.number="form.resultBatches[i]!.area" type="number" min="0" step="1" />
              </UFormField>
              <UFormField label="Dirección" class="w-40" required :error="errors[`resultBatches.${i}.address`]">
                <UInput v-model="form.resultBatches[i]!.address" type="text" />
              </UFormField>
            </div>


            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BorderEditor
                title="Norte"
                v-model="form.resultBatches[i]!.northData"
                :error-meters="errors[`resultBatches.${i}.northData.meters`]"
                :error-text="errors[`resultBatches.${i}.northData.text`]"
              />
              <BorderEditor
                title="Sur"
                v-model="form.resultBatches[i]!.southData"
                :error-meters="errors[`resultBatches.${i}.southData.meters`]"
                :error-text="errors[`resultBatches.${i}.southData.text`]"
              />
              <BorderEditor
                title="Este"
                v-model="form.resultBatches[i]!.eastData"
                :error-meters="errors[`resultBatches.${i}.eastData.meters`]"
                :error-text="errors[`resultBatches.${i}.eastData.text`]"
              />
              <BorderEditor
                title="Oeste"
                v-model="form.resultBatches[i]!.westData"
                :error-meters="errors[`resultBatches.${i}.westData.meters`]"
                :error-text="errors[`resultBatches.${i}.westData.text`]"
              />
            </div>
          </UCard>
        </div>
      </div>

      <div v-else class="space-y-4">
        <h3 class="text-lg font-semibold">Resumen</h3>

        <UCard>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div><span class="font-semibold">Folio:</span> {{ form.folium }}</div>
            <div><span class="font-semibold">Fecha:</span> {{ form.date.toLocaleDateString() }}</div>
            <div class="md:col-span-2">
              <span class="font-semibold">Lote original:</span>
              {{ form.originalBatch.catastralKey }} — {{ form.originalBatch.area }} m²
            </div>
            <div><span class="font-semibold">Cantidad:</span> {{ form.batchesNumber }}</div>
            <div><span class="font-semibold">Sumatoria resultante:</span> {{ sumResultAreas }} m²</div>
          </div>
        </UCard>

        <UAlert
          v-if="areaValidation.ok === false"
          icon="i-heroicons-exclamation-triangle"
          color="red"
          title="No puedes finalizar aún"
          :description="`La sumatoria de áreas no coincide con el área del lote original.`"
        />
        <UAlert
          v-else
          icon="i-heroicons-check-circle"
          color="green"
          title="Listo para finalizar"
          description="El formulario cumple las reglas de negocio."
        />
        <UAlert
          v-if="missingKeyFoundInBatches"
          icon="i-heroicons-exclamation-triangle"
          color="red"
          title="No puedes finalizar aún"
          description="Uno de los lotes tiene un valor en 0 o no tiene valor."
        />

        <div class="flex justify-end">
          <UButton :disabled="areaValidation.ok === false || missingKeyFoundInBatches" @click="submit">
            Guardar / Generar
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import BorderEditor from "./BorderEditor.vue";
import { useConstructionWizard } from "../composables/useConstructionWizard";
import { downloadSubdivisionDocxFromTemplate } from "../composables/useDocumentGenerator";

const {
  step,
  form,
  errors,
  setBatchesNumber,
  missingKeyFoundInBatches,
  areaValidation,
  canGoNext,
  next,
  prev,
  regenerateResultBatches,
} = useConstructionWizard();

const sumResultAreas = computed(() =>
  form.value.resultBatches.reduce((acc, b) => acc + (Number(b.area) || 0), 0)
);

function toDateInput(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function onDateChange(v: string) {
  form.value.date = v ? new Date(`${v}T00:00:00`) : new Date();
}

function onGenerate() {
  regenerateResultBatches();
  if (Number.isInteger(form.value.batchesNumber) && form.value.batchesNumber > 0) {
    setBatchesNumber(form.value.batchesNumber);
  }
}

function onBatchesNumberBlur() {
  if (form.value.originalBatch.catastralKey && form.value.batchesNumber > 0) {
    setBatchesNumber(form.value.batchesNumber);
  }
}

async function submit() {
  await downloadSubdivisionDocxFromTemplate({
    templateUrl: "/templates/template.docx",
    form: form.value,
  });
}
</script>
