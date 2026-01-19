<template>
    <div class="p-6 max-w-5xl mx-auto space-y-6">
        <UCard>
            <template #header>
                <div class="flex items-center justify-between">
                    <div class="space-y-1">
                        <h2 class="text-xl font-semibold">
                            Formulario de subdivisión de lotes
                        </h2>
                        <p class="text-sm text-gray-500">
                            Paso {{ step + 1 }} de 5
                        </p>
                    </div>

                    <div class="flex gap-2">
                        <UButton
                            variant="ghost"
                            :disabled="step === 0"
                            @click="prev"
                            >Atrás</UButton
                        >
                        <UButton :disabled="!canGoNext" @click="next">
                            {{ step === 4 ? "Finalizar" : "Siguiente" }}
                        </UButton>
                    </div>
                </div>
            </template>

            <!-- Stepper -->
            <div class="mb-6">
                <USteps :items="steps" :active="step" />
            </div>

            <!-- CONTENT -->
            <div v-if="step === 0" class="space-y-4">
                <h3 class="text-lg font-semibold">Datos generales</h3>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <UFormField label="Folio" required>
                        <UInput
                            v-model="form.folium"
                            placeholder="Ej: FOL-2026-001"
                        />
                    </UFormField>

                    <UFormField label="Fecha" required>
                        <!-- si no tienes UDatePicker en tu versión, usa input type="date" -->
                        <UInput
                            type="date"
                            :model-value="toDateInput(form.date)"
                            @update:model-value="onDateChange"
                        />
                    </UFormField>
                </div>
            </div>

            <div v-else-if="step === 1" class="space-y-4">
                <h3 class="text-lg font-semibold">Lote original</h3>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <UFormField label="Dirección" required>
                        <UTextarea
                            v-model="form.originalBatch.address"
                            placeholder="Dirección del predio"
                        />
                    </UFormField>

                    <div class="space-y-4">
                        <UFormField label="Clave catastral" required>
                            <UInput
                                v-model="form.originalBatch.catastralKey"
                                placeholder="ABCD123"
                            />
                        </UFormField>

                        <UFormField label="Área (m²)" required>
                            <UInput
                                v-model.number="form.originalBatch.area"
                                type="number"
                                min="0"
                                step="0.01"
                            />
                        </UFormField>
                    </div>
                </div>

                <UDivider label="Colindancias (opcional por ahora)" />

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <BorderEditor
                        title="Norte"
                        v-model="form.originalBatch.northData"
                    />
                    <BorderEditor
                        title="Sur"
                        v-model="form.originalBatch.southData"
                    />
                    <BorderEditor
                        title="Este"
                        v-model="form.originalBatch.eastData"
                    />
                    <BorderEditor
                        title="Oeste"
                        v-model="form.originalBatch.westData"
                    />
                </div>
            </div>

            <div v-else-if="step === 2" class="space-y-4">
                <h3 class="text-lg font-semibold">Subdivisión</h3>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <UFormField label="Cantidad de lotes resultantes" required>
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
                            :disabled="
                                !form.originalBatch.catastralKey ||
                                form.batchesNumber <= 0
                            "
                            @click="onGenerate"
                        >
                            Generar lotes
                        </UButton>
                    </div>
                </div>

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
                        <UCard
                            v-for="(b, idx) in form.resultBatches"
                            :key="b.catastralKey"
                        >
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="font-semibold">
                                        Lote {{ idx + 1 }}
                                    </p>
                                    <p class="text-sm text-gray-500">
                                        {{ b.catastralKey }}
                                    </p>
                                </div>
                                <UBadge color="gray"
                                    >{{ b.area || 0 }} m²</UBadge
                                >
                            </div>
                        </UCard>
                    </div>
                </div>
            </div>

            <div v-else-if="step === 3" class="space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold">
                        Captura de lotes resultantes
                    </h3>

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
                    <UCard
                        v-for="(b, i) in form.resultBatches"
                        :key="b.catastralKey"
                    >
                        <div class="flex items-center justify-between mb-3">
                            <div>
                                <p class="font-semibold">Lote {{ i + 1 }}</p>
                                <p class="text-sm text-gray-500">
                                    Clave catastral:
                                    <span class="font-mono">{{
                                        b.catastralKey
                                    }}</span>
                                </p>
                            </div>

                            <UFormField label="Área (m²)" class="w-40">
                                <UInput
                                    v-model.number="form.resultBatches[i].area"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                />
                            </UFormField>
                        </div>

                        <UDivider label="Colindancias" />

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <BorderEditor
                                title="Norte"
                                v-model="form.resultBatches[i].northData"
                            />
                            <BorderEditor
                                title="Sur"
                                v-model="form.resultBatches[i].southData"
                            />
                            <BorderEditor
                                title="Este"
                                v-model="form.resultBatches[i].eastData"
                            />
                            <BorderEditor
                                title="Oeste"
                                v-model="form.resultBatches[i].westData"
                            />
                        </div>
                    </UCard>
                </div>
            </div>

            <div v-else class="space-y-4">
                <h3 class="text-lg font-semibold">Resumen</h3>

                <UCard>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                            <span class="font-semibold">Folio:</span>
                            {{ form.folium }}
                        </div>
                        <div>
                            <span class="font-semibold">Fecha:</span>
                            {{ form.date.toLocaleDateString() }}
                        </div>
                        <div class="md:col-span-2">
                            <span class="font-semibold">Lote original:</span>
                            {{ form.originalBatch.catastralKey }} —
                            {{ form.originalBatch.area }} m²
                        </div>
                        <div>
                            <span class="font-semibold">Cantidad:</span>
                            {{ form.batchesNumber }}
                        </div>
                        <div>
                            <span class="font-semibold"
                                >Sumatoria resultante:</span
                            >
                            {{ sumResultAreas }} m²
                        </div>
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

                <div class="flex justify-end">
                    <UButton
                        :disabled="areaValidation.ok === false"
                        @click="submit"
                    >
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

const steps = [
    { label: "General" },
    { label: "Original" },
    { label: "Subdivisión" },
    { label: "Lotes" },
    { label: "Resumen" },
];

const {
    step,
    form,
    setBatchesNumber,
    areaValidation,
    canGoNext,
    next,
    prev,
    regenerateResultBatches,
} = useConstructionWizard();

const sumResultAreas = computed(() =>
    form.value.resultBatches.reduce((acc, b) => acc + (Number(b.area) || 0), 0),
);

function toDateInput(d: Date) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function onDateChange(v: string) {
    // v viene como "YYYY-MM-DD"
    form.value.date = v ? new Date(`${v}T00:00:00`) : new Date();
}

function onGenerate() {
    regenerateResultBatches();
    // también forzamos el ajuste por si cambió batchesNumber
    if (
        Number.isInteger(form.value.batchesNumber) &&
        form.value.batchesNumber > 0
    ) {
        setBatchesNumber(form.value.batchesNumber);
    }
}

function onBatchesNumberBlur() {
    // genera de inmediato al salir del input si ya hay clave base
    if (form.value.originalBatch.catastralKey && form.value.batchesNumber > 0) {
        setBatchesNumber(form.value.batchesNumber);
    }
}

async function submit() {
  await downloadSubdivisionDocxFromTemplate({
    templateUrl: '/templates/template.docx',
    form: form.value,
  });
}
</script>
