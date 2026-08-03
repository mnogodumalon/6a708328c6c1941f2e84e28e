import type { Schichtplan, Mitarbeiter, Schichtvorlagen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';

export interface SchichtplanDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Schichtplan;
  /** N:1-Ziel „Mitarbeiter": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  mitarbeiterList: Mitarbeiter[];
  /** Klick auf die Mitarbeiter-Relation → overlay.push auf dessen Detail. */
  onOpenMitarbeiter?: (record: Mitarbeiter) => void;
  /** N:1-Ziel „Schichtvorlagen": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  schichtvorlagenList: Schichtvorlagen[];
  /** Klick auf die Schichtvorlagen-Relation → overlay.push auf dessen Detail. */
  onOpenSchichtvorlagen?: (record: Schichtvorlagen) => void;
}

export function SchichtplanDetails({
  record,
  mitarbeiterList,
  onOpenMitarbeiter,
  schichtvorlagenList,
  onOpenSchichtvorlagen,
}: SchichtplanDetailsProps) {
  const mitarbeiterTarget = mitarbeiterList.find(r => r.record_id === extractRecordId(record.fields.mitarbeiter));
  const schichtvorlageTarget = schichtvorlagenList.find(r => r.record_id === extractRecordId(record.fields.schichtvorlage));
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Einsatzdatum" value={record.fields.datum} format="date" />
        <RecordField label="Status" value={record.fields.status} format="pill" />
        <RecordField label="Notizen" value={record.fields.notizen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title="Verknüpft" cols={2}>
        <RecordRelation
          label="Mitarbeiter"
          name={mitarbeiterTarget?.fields.vorname ?? '—'}
          meta={[mitarbeiterTarget?.fields.telefon, mitarbeiterTarget?.fields.email].filter(Boolean).join(' · ') || undefined}
          onClick={mitarbeiterTarget && onOpenMitarbeiter ? () => onOpenMitarbeiter!(mitarbeiterTarget!) : undefined}
        />
        <RecordRelation
          label="Schichtvorlage"
          name={schichtvorlageTarget?.fields.schichtname ?? '—'}
          meta={[schichtvorlageTarget?.fields.startzeit, schichtvorlageTarget?.fields.endzeit].filter(Boolean).join(' · ') || undefined}
          onClick={schichtvorlageTarget && onOpenSchichtvorlagen ? () => onOpenSchichtvorlagen!(schichtvorlageTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.SCHICHTPLAN} recordId={record.record_id} />
    </>
  );
}
