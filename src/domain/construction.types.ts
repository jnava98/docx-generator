export interface BorderData {
  meters: number,
  text: string
}

export interface Batch {
  address: string;
  northData: BorderData;
  eastData: BorderData;
  westData: BorderData;
  southData: BorderData;
  catastralKey: string;
  area: number;
}

export interface ConstructionForm {
  folium: string;
  date: Date;
  owner: string;
  originalBatch: Batch;
  batchesNumber: number;
  resultBatches: Batch[];
}
