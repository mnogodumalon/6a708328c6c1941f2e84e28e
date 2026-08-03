import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import type { Schichtplan, Mitarbeiter, Schichtvorlagen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { IconArrowLeft, IconTrash } from '@tabler/icons-react';
import {
  RecordView, RecordHeader, RecordKeyFacts, RecordSection, RecordField,
  RecordAttachments, RecordViewSkeleton, RecordViewEmpty,
} from '@/components/widgets/RecordView';
import { SchichtplanDialog } from '@/components/dialogs/SchichtplanDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formEnhancements } from '@/config/form-enhancements/Schichtplan';
import { evalComputed } from '@/config/form-enhancements/types';

export default function SchichtplanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<Schichtplan | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [mitarbeiterList, setMitarbeiterList] = useState<Mitarbeiter[]>([]);
  const [schichtvorlagenList, setSchichtvorlagenList] = useState<Schichtvorlagen[]>([]);

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, mitarbeiterData, schichtvorlagenData] = await Promise.all([
        LivingAppsService.getSchichtplan(),
        LivingAppsService.getMitarbeiter(),
        LivingAppsService.getSchichtvorlagen(),
      ]);
      setMitarbeiterList(mitarbeiterData);
      setSchichtvorlagenList(schichtvorlagenData);
      setRecord(mainData.find(r => r.record_id === id) ?? null);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(fields: Schichtplan['fields']) {
    if (!record) return;
    await LivingAppsService.updateSchichtplanEntry(record.record_id, fields);
    await loadData();
    setEditing(false);
  }

  async function handleDelete() {
    if (!record) return;
    await LivingAppsService.deleteSchichtplanEntry(record.record_id);
    setDeleteOpen(false);
    navigate('/schichtplan');
  }

  function getMitarbeiterDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return mitarbeiterList.find(r => r.record_id === refId)?.fields.vorname ?? '—';
  }

  function getSchichtvorlagenDisplayName(url?: unknown) {
    if (!url) return '—';
    const refId = extractRecordId(url);
    return schichtvorlagenList.find(r => r.record_id === refId)?.fields.schichtname ?? '—';
  }

  if (loading) {
    return <RecordViewSkeleton />;
  }

  if (!record) {
    return (
      <RecordViewEmpty
        title="Eintrag nicht gefunden"
        action={
          <Button variant="ghost" onClick={() => navigate('/schichtplan')}>
            <IconArrowLeft className="h-4 w-4 mr-1.5" />
            Zurück
          </Button>
        }
      />
    );
  }

  return (
    <RecordView
      onBack={() => navigate('/schichtplan')}
      onEdit={() => setEditing(true)}
      backLabel="Zurück"
      editLabel="Bearbeiten"
    >
      <RecordHeader title={'Schichtplan'} />

      {(() => {
        const lookupLists: Record<string, unknown> = {
          mitarbeiter: mitarbeiterList,
          schichtvorlage: schichtvorlagenList,
        };
        const fmtComputed = (k: string, n: number) =>
          /(?:kosten|preis|betrag|gesamt|netto|brutto|summe|mwst|rabatt|anzahlung|umsatz|saldo)/i.test(k)
            ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : n.toLocaleString('de-DE', { maximumFractionDigits: 2 });
        const computedFacts = Object.entries(formEnhancements.computed)
          .map(([key, formula]) => {
            const v = evalComputed(formula, record!.fields as Record<string, unknown>, { lookupLists });
            return v != null
              ? { label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '), value: fmtComputed(key, v) }
              : null;
          })
          .filter((f): f is { label: string; value: string } => f !== null);
        return computedFacts.length > 0 ? <RecordKeyFacts items={computedFacts} /> : null;
      })()}

      <RecordSection title="Details" cols={2}>
        <RecordField label="Einsatzdatum" value={record.fields.datum} format="date" />
        <RecordField label="Mitarbeiter" value={getMitarbeiterDisplayName(record.fields.mitarbeiter)} format="text" />
        <RecordField label="Schichtvorlage" value={getSchichtvorlagenDisplayName(record.fields.schichtvorlage)} format="text" />
        <RecordField label="Status" value={record.fields.status} format="pill" />
        <RecordField label="Notizen" value={record.fields.notizen} format="longtext" className="md:col-span-2" />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.SCHICHTPLAN} recordId={record.record_id} />

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className="text-destructive hover:text-destructive">
          <IconTrash className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>

      <SchichtplanDialog
        open={editing}
        onClose={() => setEditing(false)}
        onSubmit={handleUpdate}
        defaultValues={record.fields}
        recordId={record.record_id}
        mitarbeiterList={mitarbeiterList}
        schichtvorlagenList={schichtvorlagenList}
        enablePhotoScan={AI_PHOTO_SCAN['Schichtplan']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Schichtplan']}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Schichtplan löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />
    </RecordView>
  );
}
