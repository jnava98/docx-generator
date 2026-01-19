import { computed, ref } from "vue";
import type { Batch, ConstructionForm } from "../domain/construction.types";
import {
  applyBatchesNumber,
  buildResultBatches,
  validateConstructionForm,
} from "../domain/construction";

function emptyBatch(): Batch {
  return {
    address: "",
    northData: { meters: 0, text: "" },
    eastData: { meters: 0, text: "" },
    westData: { meters: 0, text: "" },
    southData: { meters: 0, text: "" },
    catastralKey: "",
    area: 0,
  };
}

export function useConstructionWizard() {
  const step = ref(0);

  const form = ref<ConstructionForm>({
    folium: "",
    date: new Date(),
    originalBatch: emptyBatch(),
    batchesNumber: 1,
    resultBatches: [],
  });

  
  function generateResultBatches() {
    const { originalBatch, batchesNumber } = form.value;
    if (!originalBatch.catastralKey || !Number.isInteger(batchesNumber) || batchesNumber <= 0) {
      form.value.resultBatches = [];
      return;
    }
    form.value.resultBatches = buildResultBatches({ original: originalBatch, batchesNumber });
  }

  function setBatchesNumber(n: number) {
    form.value = applyBatchesNumber(form.value, n);
  }

  const areaValidation = computed(() => validateConstructionForm(form.value));

  // Validaciones por paso (simple y efectivo)
  const canGoNext = computed(() => {
    const f = form.value;

    if (step.value === 0) {
      return !!f.folium && !!f.date;
    }

    if (step.value === 1) {
      const o = f.originalBatch;
      return (
        !!o.address &&
        !!o.catastralKey &&
        (Number(o.area) || 0) > 0
      );
    }

    if (step.value === 2) {
      return Number.isInteger(f.batchesNumber) && f.batchesNumber > 0 && f.resultBatches.length === f.batchesNumber;
    }

    if (step.value === 3) {
      // debe cuadrar el area
      return areaValidation.value.ok === true;
    }

    return true;
  });

  function next() {
    if (!canGoNext.value) return;
    step.value = Math.min(step.value + 1, 4);
  }

  function prev() {
    step.value = Math.max(step.value - 1, 0);
  }

  return {
    step,
    form,
    regenerateResultBatches: generateResultBatches,
    setBatchesNumber,
    areaValidation,
    canGoNext,
    next,
    prev,
  };
}
