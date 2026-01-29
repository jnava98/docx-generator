import { computed, ref } from "vue";
import type { Batch, ConstructionForm } from "../domain/construction.types";
import {
  applyBatchesNumber,
  buildResultBatches,
  validateConstructionForm,
} from "../domain/construction";

import * as yup from "yup";

/* ---------------------------------- */
/* Helpers                            */
/* ---------------------------------- */

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

type ErrorMap = Record<string, string>;

function normalizeYupPath(path: string) {
  // Convierte: resultBatches[0].northData.meters  -> resultBatches.0.northData.meters
  return path.replace(/\[(\d+)\]/g, ".$1");
}

function yupToErrorMap(err: unknown): ErrorMap {
  const map: ErrorMap = {};

  if (err instanceof yup.ValidationError) {
    const list = err.inner?.length ? err.inner : [err];

    for (const e of list) {
      if (!e.path) continue;
      const p = normalizeYupPath(e.path);
      if (!map[p]) map[p] = e.message;
    }
  }

  return map;
}

/* ---------------------------------- */
/* Yup Schemas                        */
/* ---------------------------------- */

const borderSchema = yup.object({
  meters: yup
    .number()
    .typeError("Debe ser un número")
    .moreThan(0, "Debe ser mayor a 0")
    .required("Requerido"),
  text: yup.string().trim().required("Requerido"),
});

const batchSchema = yup.object({
  address: yup.string().trim().required("Dirección requerida"),
  catastralKey: yup.string().trim().required("Clave catastral requerida"),
  area: yup
    .number()
    .typeError("Debe ser un número")
    .moreThan(0, "Debe ser mayor a 0")
    .required("Área requerida"),
  northData: borderSchema.required(),
  southData: borderSchema.required(),
  eastData: borderSchema.required(),
  westData: borderSchema.required(),
});

// Paso 0
const step0Schema = yup.object({
  folium: yup.string().trim().required("Folio requerido"),
  owner: yup.string().trim().required("Propietario requerido"),
  date: yup.date().typeError("Fecha inválida").required("Fecha requerida"),
});

// Paso 1 (ahora también valida colindancias)
const step1Schema = yup.object({
  originalBatch: yup.object({
    address: yup.string().trim().required("Dirección requerida"),
    catastralKey: yup.string().trim().required("Clave catastral requerida"),
    area: yup
      .number()
      .typeError("Debe ser un número")
      .moreThan(0, "Debe ser mayor a 0")
      .required("Área requerida"),

    northData: borderSchema.required(),
    southData: borderSchema.required(),
    eastData: borderSchema.required(),
    westData: borderSchema.required(),
  }),
});

// Paso 2
const step2Schema = yup.object({
  batchesNumber: yup
    .number()
    .typeError("Debe ser un número")
    .integer("Debe ser entero")
    .min(1, "Debe ser al menos 1")
    .required("Requerido"),
});

// Paso 3 (resultantes)
const step3Schema = yup.object({
  resultBatches: yup
    .array()
    .of(batchSchema)
    .min(1, "Debes generar al menos un lote")
    .required("Requerido"),
});

const schemasByStep = [step0Schema, step1Schema, step2Schema, step3Schema] as const;

/* ---------------------------------- */
/* Composable                         */
/* ---------------------------------- */

export function useConstructionWizard() {
  const step = ref(0);

  const form = ref<ConstructionForm>({
    folium: "",
    owner: "",
    date: new Date(),
    originalBatch: emptyBatch(),
    batchesNumber: 1,
    resultBatches: [],
  });

  const errors = ref<ErrorMap>({});

  function clearErrors() {
    errors.value = {};
  }

  async function validateStep(targetStep = step.value): Promise<boolean> {
    clearErrors();

    // Paso 4 (Resumen): lo controlas con reglas extra
    if (targetStep >= 4) return true;

    const schema = schemasByStep[targetStep as 0 | 1 | 2 | 3];
    if (!schema) return true;

    try {
      await schema.validate(form.value, { abortEarly: false });
      return true;
    } catch (e) {
      errors.value = yupToErrorMap(e);
      return false;
    }
  }

  function generateResultBatches() {
    const { originalBatch, batchesNumber } = form.value;

    if (!originalBatch.catastralKey || !Number.isInteger(batchesNumber) || batchesNumber <= 0) {
      form.value.resultBatches = [];
      return;
    }

    form.value.resultBatches = buildResultBatches({
      original: originalBatch,
      batchesNumber,
    });

    // Limpia errores viejos de arrays (si cambiaste cantidad)
    const nextErrors: ErrorMap = {};
    for (const [k, v] of Object.entries(errors.value)) {
      if (!k.startsWith("resultBatches")) nextErrors[k] = v;
    }
    errors.value = nextErrors;
  }

  function setBatchesNumber(n: number) {
    form.value = applyBatchesNumber(form.value, n);
  }

  const areaValidation = computed(() => validateConstructionForm(form.value));

  const missingKeyFoundInBatches = computed(() => {
    const { resultBatches } = form.value;
    return resultBatches.some(batchHasMissingKeys);
  });

  function batchHasMissingKeys(batch: Batch): boolean {
    if (!batch.address?.trim()) return true;
    if (!batch.catastralKey?.trim()) return true;
    if (!(Number(batch.area) > 0)) return true;

    const borders = [batch.northData, batch.southData, batch.eastData, batch.westData];
    return borders.some((b) => !(Number(b?.meters) > 0) || !b?.text?.trim());
  }

  const canGoNext = computed(() => {
    const f = form.value;

    if (step.value === 2) {
      return (
        Number.isInteger(f.batchesNumber) &&
        f.batchesNumber > 0 &&
        f.resultBatches.length === f.batchesNumber
      );
    }

    return true;
  });

  async function next() {
    const ok = await validateStep(step.value);
    if (!ok) return;

    if (step.value === 2) {
      const f = form.value;
      if (!(f.resultBatches.length === f.batchesNumber)) {
        errors.value = {
          ...errors.value,
          resultBatches: "Debes generar los lotes antes de continuar.",
        };
        return;
      }
    }

    if (step.value === 3) {
      if (!areaValidation.value.ok) return;
    }

    step.value = Math.min(step.value + 1, 4);
  }

  function prev() {
    clearErrors();
    step.value = Math.max(step.value - 1, 0);
  }

  return {
    step,
    form,
    errors,
    regenerateResultBatches: generateResultBatches,
    setBatchesNumber,
    areaValidation,
    missingKeyFoundInBatches,
    canGoNext,
    next,
    prev,
    clearErrors,
  };
}
