import type { Batch, ConstructionForm } from "./construction.types";

/* ------------------------------------------------------------------ */
/* Utils                                                               */
/* ------------------------------------------------------------------ */

const DEFAULT_EPS = 1e-6;

function emptyBorder() {
  return { meters: 0, text: "" };
}

function equalsWithTolerance(a: number, b: number, eps = DEFAULT_EPS) {
  return Math.abs(a - b) <= eps;
}

/* ------------------------------------------------------------------ */
/* Catastral keys                                                      */
/* ------------------------------------------------------------------ */

function buildResultCatastralKey(baseKey: string, index1Based: number) {
  return `${baseKey}-${index1Based}`;
}

function buildCatastralKeys(baseKey: string, count: number): string[] {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error("batchesNumber debe ser un entero mayor a 0");
  }

  return Array.from({ length: count }, (_, i) =>
    buildResultCatastralKey(baseKey, i + 1)
  );
}

/* ------------------------------------------------------------------ */
/* Area helpers                                                        */
/* ------------------------------------------------------------------ */

function sumAreas(batches: { area: number }[]): number {
  return batches.reduce((acc, b) => acc + (Number(b.area) || 0), 0);
}

export function validateAreasMatch(params: {
  originalArea: number;
  resultBatches: { area: number }[];
}): { ok: true } | { ok: false; expected: number; got: number; diff: number } {
  const expected = Number(params.originalArea) || 0;
  const got = sumAreas(params.resultBatches);
  const diff = got - expected;

  if (equalsWithTolerance(got, expected)) return { ok: true };

  return { ok: false, expected, got, diff };
}

/* ------------------------------------------------------------------ */
/* Result batches generation                                           */
/* ------------------------------------------------------------------ */

function createResultBatchFromOriginal(params: {
  original: Batch;
  cadastralKey: string;
}): Batch {
  return {
    address: params.original.address,
    northData: emptyBorder(),
    eastData: emptyBorder(),
    westData: emptyBorder(),
    southData: emptyBorder(),
    catastralKey: params.cadastralKey,
    area: 0,
  };
}

export function buildResultBatches(params: {
  original: Batch;
  batchesNumber: number;
}): Batch[] {
  const { original, batchesNumber } = params;

  const keys = buildCatastralKeys(original.catastralKey, batchesNumber);

  return keys.map((key) =>
    createResultBatchFromOriginal({
      original,
      cadastralKey: key,
    })
  );
}

/* ------------------------------------------------------------------ */
/* Form orchestration                                                  */
/* ------------------------------------------------------------------ */

/**
 * Regenera los lotes cuando cambia batchesNumber
 */
export function applyBatchesNumber(
  form: ConstructionForm,
  batchesNumber: number
): ConstructionForm {
  const resultBatches = buildResultBatches({
    original: form.originalBatch,
    batchesNumber,
  });

  return {
    ...form,
    batchesNumber,
    resultBatches,
  };
}

/**
 * Regla de negocio #3:
 * La suma de áreas debe coincidir con el área del lote original
 */
export function validateConstructionForm(form: ConstructionForm) {
  return validateAreasMatch({
    originalArea: form.originalBatch.area,
    resultBatches: form.resultBatches,
  });
}
