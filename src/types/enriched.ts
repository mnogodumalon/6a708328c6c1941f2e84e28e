import type { Schichtplan } from './app';

export type EnrichedSchichtplan = Schichtplan & {
  mitarbeiterName: string;
  schichtvorlageName: string;
};
