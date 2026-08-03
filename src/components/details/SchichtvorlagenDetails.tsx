import type { Schichtvorlagen, Schichtplan } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface SchichtvorlagenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Schichtvorlagen;
  /** 1:N „Schichtplan": VOLLE Liste — der Block filtert auf diesen Record. */
  schichtplanList: Schichtplan[];
  /** Zeilen-Klick → overlay.push auf das Schichtplan-Detail (nie der Edit-Dialog). */
  onOpenSchichtplan: (record: Schichtplan) => void;
  /** Kontextuelles „+": öffnet den Schichtplan-Dialog mit diesem Record vorgesetzt. */
  onAddSchichtplan: () => void;
}

export function SchichtvorlagenDetails({
  record,
  schichtplanList,
  onOpenSchichtplan,
  onAddSchichtplan,
}: SchichtvorlagenDetailsProps) {
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Schichtname" value={record.fields.schichtname} format="text" />
        <RecordField label="Schichttyp" value={record.fields.schichttyp} format="pill" />
        <RecordField label="Startzeit" value={record.fields.startzeit} format="text" />
        <RecordField label="Endzeit" value={record.fields.endzeit} format="text" />
        <RecordField label="Bereich / Abteilung" value={record.fields.bereich} format="text" />
        <RecordField label="Mindestbesetzung (Personen)" value={record.fields.mindestbesetzung} format="text" />
        <RecordField label="Beschreibung" value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title="Schichtplan"
        items={schichtplanList.filter(r => extractRecordId(r.fields.schichtvorlage) === record.record_id)}
        map={r => ({ name: 'Schichtplan', meta: r.fields.datum })}
        onOpen={onOpenSchichtplan}
        onAdd={onAddSchichtplan}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.SCHICHTVORLAGEN} recordId={record.record_id} />
    </>
  );
}
