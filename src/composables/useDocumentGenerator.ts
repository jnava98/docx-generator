import type { ConstructionForm, Batch } from "../domain/construction.types";
import { patchDocument, PatchType, Paragraph, TextRun, UnderlineType } from "docx";
import { validateConstructionForm } from "../domain/construction";

/* ------------------------------------------------ */
/* Utils                                            */
/* ------------------------------------------------ */

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function fmt(n: number) {
  return (Number(n) || 0).toFixed(2);
}

type ParagraphPatch = {
  type: typeof PatchType.PARAGRAPH;
  children: TextRun[];
};

type DocumentPatch = {
  type: typeof PatchType.DOCUMENT;
  children: Paragraph[];
};

type PatchMap = Record<string, ParagraphPatch | DocumentPatch>;

function p(text = ""): Paragraph {
  return new Paragraph({
    children: [new TextRun(text)],
  });
}

function paragraphPatch(text = ""): ParagraphPatch {
  return {
    type: PatchType.PARAGRAPH,
    children: [new TextRun(text)],
  };
}

function formatDate(date: Date): string {
  const months = [
    "ENERO",
    "FEBRERO",
    "MARZO",
    "ABRIL",
    "MAYO",
    "JUNIO",
    "JULIO",
    "AGOSTO",
    "SEPTIEMBRE",
    "OCTUBRE",
    "NOVIEMBRE",
    "DICIEMBRE",
  ];

  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  return `${day} DE ${month} DE ${year}`;
}

/**
 * En el template hay placeholders con typo `]`
 * Ej: {{original_batch_north_meters]}
 * Parcheamos ambas variantes.
 */
function setPatchWithBracketVariants(
  patches: PatchMap,
  key: string,
  value: string
) {
  patches[key] = paragraphPatch(value);
  patches[`${key}]`] = paragraphPatch(value);
}

/* ------------------------------------------------ */
/* BLOQUE IDENTICO AL LOTE ORIGINAL                  */
/* ------------------------------------------------ */

function buildBatchBlock(batch: Batch): Paragraph[] {
  return [
    // Dirección (negrita + subrayado)
    new Paragraph({
      children: [
        new TextRun({
          text: batch.address,
          bold: true,
          underline: { type: UnderlineType.SINGLE },
        }),
      ],
    }),

    new Paragraph(""),

    // Colindancias
    new Paragraph({
      children: [
        new TextRun({
          text: "Norte:",
          bold: true,
          underline: { type: UnderlineType.SINGLE },
        }),
        new TextRun({
          text: ` mts. Con ${batch.northData?.text || ""}`,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Sur:",
          bold: true,
          underline: { type: UnderlineType.SINGLE },
        }),
        new TextRun({
          text: ` mts. Con ${batch.southData?.text || ""}`,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Este:",
          bold: true,
          underline: { type: UnderlineType.SINGLE },
        }),
        new TextRun({
          text: ` mts. Con ${batch.eastData?.text || ""}`,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Oeste:",
          bold: true,
          underline: { type: UnderlineType.SINGLE },
        }),
        new TextRun({
          text: ` mts. Con ${batch.westData?.text || ""}`,
        }),
      ],
    }),
    // new Paragraph(`Norte: ${fmt(batch.northData?.meters)} mts. Con ${batch.northData?.text || ""}`),
    // new Paragraph(`Sur: ${fmt(batch.southData?.meters)} mts. Con ${batch.southData?.text || ""}`),
    // new Paragraph(`Este: ${fmt(batch.eastData?.meters)} mts. Con ${batch.eastData?.text || ""}`),
    // new Paragraph(`Oeste: ${fmt(batch.westData?.meters)} mts. Con ${batch.westData?.text || ""}`),

    new Paragraph(""),

    // Superficie
    new Paragraph(`Superficie: ${fmt(batch.area)} m2`),

    // Clave
    new Paragraph(`Clave Catastral: ${batch.catastralKey}`),

    new Paragraph(""),
  ];
}

function buildResultBatchesBlock(batches: Batch[]): DocumentPatch {
  const children: Paragraph[] = [];

  batches.forEach((batch, index) => {
    children.push(...buildBatchBlock(batch));

    // Separación entre lotes (excepto el último)
    if (index < batches.length - 1) {
      children.push(p(""));
    }
  });

  return {
    type: PatchType.DOCUMENT,
    children,
  };
}

/* ------------------------------------------------ */
/* Patches                                          */
/* ------------------------------------------------ */

export function buildSubdivisionTemplatePatches(
  form: ConstructionForm
): PatchMap {
  const patches: PatchMap = {};

  // Generales
  patches["folium"] = paragraphPatch(form.folium ?? "");

  patches["formatted_date"] = paragraphPatch(
    formatDate(form.date ?? new Date())
  )

  patches["owner"] = paragraphPatch(form.owner.toUpperCase() ?? "");

  // Original
  patches["original_batch_address"] = paragraphPatch(
    form.originalBatch.address.toUpperCase() ?? ""
  );

  setPatchWithBracketVariants(
    patches,
    "original_batch_north_meters",
    fmt(form.originalBatch.northData?.meters)
  );
  patches["original_batch_north_text"] = paragraphPatch(
    form.originalBatch.northData?.text ?? ""
  );

  setPatchWithBracketVariants(
    patches,
    "original_batch_south_meters",
    fmt(form.originalBatch.southData?.meters)
  );
  patches["original_batch_south_text"] = paragraphPatch(
    form.originalBatch.southData?.text ?? ""
  );

  setPatchWithBracketVariants(
    patches,
    "original_batch_east_meters",
    fmt(form.originalBatch.eastData?.meters)
  );
  patches["original_batch_east_text"] = paragraphPatch(
    form.originalBatch.eastData?.text ?? ""
  );

  setPatchWithBracketVariants(
    patches,
    "original_batch_west_meters",
    fmt(form.originalBatch.westData?.meters)
  );
  patches["original_batch_west_text"] = paragraphPatch(
    form.originalBatch.westData?.text ?? ""
  );

  patches["original_batch_area"] = paragraphPatch(
    fmt(form.originalBatch.area)
  );
  patches["original_batch_catastral_key"] = paragraphPatch(
    form.originalBatch.catastralKey ?? ""
  );

  // 🔥 RESULTANTES (N sin límite, mismo estilo)
  patches["result_batches_block"] = buildResultBatchesBlock(
    form.resultBatches
  );

  return patches;
}

/* ------------------------------------------------ */
/* Generate + Download                              */
/* ------------------------------------------------ */

export async function downloadSubdivisionDocxFromTemplate(options: {
  templateUrl: string;
  form: ConstructionForm;
  filename?: string;
}) {
  const validation = validateConstructionForm(options.form);
  if (!validation.ok) {
    throw new Error(
      `Áreas no coinciden. Esperado=${validation.expected}, Actual=${validation.got}`
    );
  }

  const res = await fetch(options.templateUrl);
  if (!res.ok) throw new Error("No se pudo cargar el template");

  const buffer = await res.arrayBuffer();

  const patched = await patchDocument({
    data: buffer,
    outputType: "blob",
    patches: buildSubdivisionTemplatePatches(options.form),
    keepOriginalStyles: true,
    placeholderDelimiters: { start: "{{", end: "}}" },
    recursive: true,
  });

  const safe = (options.form.folium || "subdivision").replace(/[^\w\-]+/g, "_");
  downloadBlob(patched as Blob, options.filename ?? `${safe}.docx`);
}
