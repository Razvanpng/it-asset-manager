export interface Angajat {
  id: string;
  nume: string;
  prenume: string;
  email: string;
  departament?: string;
  activ: number;
  created_at: string;
  updated_at: string;
}

export interface Echipament {
  id: string;
  serial: string;
  denumire: string;
  tip: string;
  producator?: string;
  model?: string;
  data_achizitie: string;
  valoare?: number;
  status: string;
  proprietar_curent_id?: string;
  magazie_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Componenta {
  id: string;
  echipament_id: string;
  tip: string;
  descriere?: string;
  serial_componenta?: string;
  created_at: string;
}

export interface Operatiune {
  id: string;
  echipament_id: string;
  tip: string;
  status: string;
  angajat_sursa_id?: string;
  angajat_destinatie_id?: string;
  magazie_sursa_id?: string;
  magazie_destinatie_id?: string;
  initiat_de?: string;
  observatii?: string;
  created_at: string;
  finalizat_at?: string;
}

export interface QrToken {
  id: string;
  echipament_id: string;
  token: string;
  activ: number;
  created_at: string;
}