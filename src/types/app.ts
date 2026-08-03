// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Mitarbeiter {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    telefon?: string;
    email?: string;
    abteilung?: string;
    position?: string;
    beschaeftigungsart?: LookupValue;
    bemerkung?: string;
  };
}

export interface Schichtvorlagen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    schichtname?: string;
    schichttyp?: LookupValue;
    startzeit?: string;
    endzeit?: string;
    bereich?: string;
    mindestbesetzung?: number;
    beschreibung?: string;
  };
}

export interface Schichtplan {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    datum?: string; // Format: YYYY-MM-DD oder ISO String
    mitarbeiter?: string; // applookup -> URL zu 'Mitarbeiter' Record
    schichtvorlage?: string; // applookup -> URL zu 'Schichtvorlagen' Record
    status?: LookupValue;
    notizen?: string;
  };
}

export const APP_IDS = {
  MITARBEITER: '6a70830bc84e9a4f74f3cb6f',
  SCHICHTVORLAGEN: '6a70831379fa7c1967baadc6',
  SCHICHTPLAN: '6a70831379a59dcd93b1b949',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'mitarbeiter': {
    beschaeftigungsart: [{ key: "vollzeit", label: "Vollzeit" }, { key: "teilzeit", label: "Teilzeit" }, { key: "minijob", label: "Minijob" }, { key: "aushilfe", label: "Aushilfe" }],
  },
  'schichtvorlagen': {
    schichttyp: [{ key: "fruehschicht", label: "Frühschicht" }, { key: "spaetschicht", label: "Spätschicht" }, { key: "nachtschicht", label: "Nachtschicht" }, { key: "tagschicht", label: "Tagschicht" }, { key: "sonderschicht", label: "Sonderschicht" }],
  },
  'schichtplan': {
    status: [{ key: "geplant", label: "Geplant" }, { key: "bestaetigt", label: "Bestätigt" }, { key: "abwesend", label: "Abwesend" }, { key: "vertreten", label: "Vertreten" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'mitarbeiter': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'telefon': 'string/tel',
    'email': 'string/email',
    'abteilung': 'string/text',
    'position': 'string/text',
    'beschaeftigungsart': 'lookup/radio',
    'bemerkung': 'string/textarea',
  },
  'schichtvorlagen': {
    'schichtname': 'string/text',
    'schichttyp': 'lookup/select',
    'startzeit': 'string/text',
    'endzeit': 'string/text',
    'bereich': 'string/text',
    'mindestbesetzung': 'number',
    'beschreibung': 'string/textarea',
  },
  'schichtplan': {
    'datum': 'date/date',
    'mitarbeiter': 'applookup/select',
    'schichtvorlage': 'applookup/select',
    'status': 'lookup/select',
    'notizen': 'string/textarea',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateMitarbeiter = StripLookup<Mitarbeiter['fields']>;
export type CreateSchichtvorlagen = StripLookup<Schichtvorlagen['fields']>;
export type CreateSchichtplan = StripLookup<Schichtplan['fields']>;