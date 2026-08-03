import type { Mitarbeiter, Schichtplan } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface MitarbeiterDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Mitarbeiter;
  /** 1:N „Schichtplan": VOLLE Liste — der Block filtert auf diesen Record. */
  schichtplanList: Schichtplan[];
  /** Zeilen-Klick → overlay.push auf das Schichtplan-Detail (nie der Edit-Dialog). */
  onOpenSchichtplan: (record: Schichtplan) => void;
  /** Kontextuelles „+": öffnet den Schichtplan-Dialog mit diesem Record vorgesetzt. */
  onAddSchichtplan: () => void;
}

export function MitarbeiterDetails({
  record,
  schichtplanList,
  onOpenSchichtplan,
  onAddSchichtplan,
}: MitarbeiterDetailsProps) {
  return (
    <>
      <RecordSection title="Details" cols={2}>
        <RecordField label="Vorname" value={record.fields.vorname} format="text" />
        <RecordField label="Nachname" value={record.fields.nachname} format="text" />
        <RecordField label="Telefonnummer" value={record.fields.telefon} format="text" />
        <RecordField label="E-Mail-Adresse" value={record.fields.email} format="email" />
        <RecordField label="Abteilung" value={record.fields.abteilung} format="text" />
        <RecordField label="Position / Rolle" value={record.fields.position} format="text" />
        <RecordField label="Beschäftigungsart" value={record.fields.beschaeftigungsart} format="pill" />
        <RecordField label="Bemerkungen" value={record.fields.bemerkung} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <SatelliteSection
        title="Schichtplan"
        items={schichtplanList.filter(r => extractRecordId(r.fields.mitarbeiter) === record.record_id)}
        map={r => ({ name: 'Schichtplan', meta: r.fields.datum })}
        onOpen={onOpenSchichtplan}
        onAdd={onAddSchichtplan}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.MITARBEITER} recordId={record.record_id} />
    </>
  );
}
