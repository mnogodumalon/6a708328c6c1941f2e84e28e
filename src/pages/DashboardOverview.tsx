import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichSchichtplan } from '@/lib/enrich';
import type { Schichtplan, Mitarbeiter, Schichtvorlagen } from '@/types/app';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { DashboardSkeleton, DashboardError } from '@/components/DashboardStates';
import { DashboardGrid } from '@/components/DashboardGrid';
import { HeroBanner } from '@/components/HeroBanner';
import { WorkList } from '@/components/WorkList';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import {
  ResourceTimeline,
  type ResourceEvent,
  type ResourceGroup,
  type ResourceTone,
} from '@/components/widgets/ResourceTimeline';
import {
  useRecordOverlayStack,
  RecordOverlayHost,
  RecordHeader,
} from '@/components/widgets/RecordView';
import { SchichtplanDetails } from '@/components/details/SchichtplanDetails';
import { MitarbeiterDetails } from '@/components/details/MitarbeiterDetails';
import { SchichtvorlagenDetails } from '@/components/details/SchichtvorlagenDetails';
import { SchichtplanDialog } from '@/components/dialogs/SchichtplanDialog';
import type { SchichtplanDialogDefaults } from '@/components/dialogs/SchichtplanDialog';
import { AI_PHOTO_SCAN } from '@/config/ai-features';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import {
  IconAlertTriangle,
  IconPlus,
  IconCheck,
} from '@tabler/icons-react';

type OverlayItem =
  | { type: 'schichtplan'; id: string }
  | { type: 'mitarbeiter'; id: string }
  | { type: 'schichtvorlagen'; id: string };

function toneForStatus(status: string | undefined): ResourceTone {
  if (status === 'bestaetigt') return 'success';
  if (status === 'abwesend') return 'destructive';
  if (status === 'vertreten') return 'warning';
  return 'default'; // geplant
}

export default function DashboardOverview() {
  const clock = useClock();

  const {
    mitarbeiter, setMitarbeiter,
    schichtvorlagen, setSchichtvorlagen,
    schichtplan, setSchichtplan,
    mitarbeiterMap, schichtvorlagenMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedSchichtplan = enrichSchichtplan(schichtplan, { mitarbeiterMap, schichtvorlagenMap });

  const overlay = useRecordOverlayStack<OverlayItem>();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDefaults, setDialogDefaults] = useState<SchichtplanDialogDefaults | undefined>(undefined);
  const [editingRecord, setEditingRecord] = useState<Schichtplan | undefined>(undefined);

  const today = format(clock, 'yyyy-MM-dd');

  // Groups: employees as the resource axis
  const groups = useMemo<ResourceGroup[]>(
    () => mitarbeiter.map(m => ({
      key: m.record_id,
      label: `${m.fields.vorname ?? ''} ${m.fields.nachname ?? ''}`.trim() || m.record_id,
    })),
    [mitarbeiter],
  );

  // Events: Schichtplan entries
  const events = useMemo<ResourceEvent[]>(
    () => schichtplan
      .filter(s => !!s.fields.datum && !!s.fields.mitarbeiter)
      .map(s => {
        const mitarbeiterId = extractRecordId(s.fields.mitarbeiter) ?? '';
        const vorlageId = extractRecordId(s.fields.schichtvorlage);
        const vorlage = vorlageId ? schichtvorlagenMap.get(vorlageId) : undefined;
        const mitarb = mitarbeiterId ? mitarbeiterMap.get(mitarbeiterId) : undefined;
        const statusKey = s.fields.status?.key;
        return {
          id: `schichtplan:${s.record_id}`,
          start: s.fields.datum!,
          allDay: true,
          title: vorlage?.fields.schichtname ?? 'Schicht',
          subtitle: vorlage
            ? `${vorlage.fields.startzeit ?? ''}–${vorlage.fields.endzeit ?? ''}`
            : undefined,
          tone: toneForStatus(statusKey),
          group: mitarbeiterId,
        };
      }),
    [schichtplan, mitarbeiterMap, schichtvorlagenMap],
  );

  // Today's shifts
  const todaySchichten = useMemo(
    () => enrichedSchichtplan.filter(s => s.fields.datum === today),
    [enrichedSchichtplan, today],
  );

  // Unconfirmed shifts (geplant)
  const ungeplant = useMemo(
    () => enrichedSchichtplan.filter(s => s.fields.status?.key === 'geplant'),
    [enrichedSchichtplan],
  );

  // Absent without substitute today
  const abwesendHeute = useMemo(
    () => todaySchichten.filter(s => s.fields.status?.key === 'abwesend'),
    [todaySchichten],
  );

  // Advance status helper (geplant → bestaetigt)
  const bestaetige = useCallback(async (s: Schichtplan) => {
    const prev = { ...s.fields };
    const neu = LOOKUP_OPTIONS['schichtplan']['status'].find(o => o.key === 'bestaetigt')!;
    setSchichtplan(prev2 => prev2.map(r =>
      r.record_id === s.record_id
        ? { ...r, fields: { ...r.fields, status: neu } }
        : r,
    ));
    undoToast(`Schicht bestätigt`, async () => {
      setSchichtplan(p => p.map(r =>
        r.record_id === s.record_id ? { ...r, fields: { ...r.fields, status: prev.status } } : r,
      ));
      await LivingAppsService.updateSchichtplanEntry(s.record_id, { status: prev.status?.key ?? 'geplant' });
    });
    try {
      await LivingAppsService.updateSchichtplanEntry(s.record_id, { status: 'bestaetigt' });
    } catch {
      fetchAll();
    }
  }, [setSchichtplan, fetchAll]);

  const openCreate = useCallback((defaults?: SchichtplanDialogDefaults) => {
    setEditingRecord(undefined);
    setDialogDefaults(defaults);
    setDialogOpen(true);
  }, []);

  const openEdit = useCallback((s: Schichtplan) => {
    setEditingRecord(s);
    setDialogDefaults(undefined);
    setDialogOpen(true);
  }, []);

  // ─── Every hook goes ABOVE this line ───────────────────────────────────────
  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;
  // ─── Below this line: plain derivations only ──────────────────────────────

  const greeting = gruss(clock);
  const todayLabel = format(clock, 'EEEE, d. MMMM', { locale: de });

  // Context line
  const abwesendNamen = abwesendHeute.map(s => s.mitarbeiterName).filter(Boolean);
  const contextLine = todaySchichten.length === 0
    ? `Heute sind noch keine Schichten geplant.`
    : abwesendNamen.length > 0
      ? `${namen(abwesendNamen)} ${abwesendNamen.length === 1 ? 'ist' : 'sind'} heute als abwesend gemeldet.`
      : `Heute ${todaySchichten.length === 1 ? 'ist' : 'sind'} ${todaySchichten.length} ${todaySchichten.length === 1 ? 'Schicht' : 'Schichten'} eingeplant — ${namen(todaySchichten.map(s => s.mitarbeiterName).filter(Boolean))}.`;

  const bestaetigt = enrichedSchichtplan.filter(s => s.fields.status?.key === 'bestaetigt').length;
  const gesamt = enrichedSchichtplan.length;
  const offeneHeute = todaySchichten.filter(s => s.fields.status?.key === 'geplant').length;

  return (
    <>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {greeting} · <span className="text-muted-foreground font-normal text-lg">{todayLabel}</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{contextLine}</p>
          </div>
          <button
            onClick={() => openCreate({ datum: today })}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
          >
            <IconPlus size={16} className="shrink-0" />
            Schicht eintragen
          </button>
        </div>
      </div>

      <DashboardGrid
        variant="wide"
        hero={abwesendHeute.length > 0 && (
          <HeroBanner
            icon={<IconAlertTriangle size={18} />}
            action={{
              label: 'Vertretung eintragen',
              onClick: () => openCreate({ status: 'vertreten', datum: today }),
            }}
          >
            <b>{namen(abwesendNamen)}</b> {abwesendNamen.length === 1 ? 'ist' : 'sind'} heute abwesend — bitte Vertretung einplanen.
          </HeroBanner>
        )}
        kpis={
          <StatStrip>
            <StatStripItem
              title="Heute eingeplant"
              value={todaySchichten.length}
              tone={todaySchichten.length === 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title="Unbestätigt"
              value={ungeplant.length}
              tone={ungeplant.length > 0 ? 'warning' : 'default'}
            />
            <StatStripItem
              title="Bestätigt"
              value={gesamt > 0 ? `${bestaetigt} / ${gesamt}` : '—'}
              tone={gesamt > 0 && bestaetigt === gesamt ? 'success' : bestaetigt < gesamt ? 'warning' : 'default'}
            />
            <StatStripItem
              title="Offen heute"
              value={offeneHeute}
              tone={offeneHeute > 0 ? 'warning' : 'default'}
            />
          </StatStrip>
        }
        primary={
          <ResourceTimeline
            events={events}
            groups={groups}
            axis="day"
            defaultRange="week"
            locale={de}
            weekDays={5}
            onEventClick={ev => {
              const id = ev.id.split(':')[1] ?? '';
              overlay.replace({ type: 'schichtplan', id });
            }}
            onEmptyClick={(date, group) => {
              openCreate({
                datum: format(date, 'yyyy-MM-dd'),
                mitarbeiter: group,
              });
            }}
            onRangeCreate={(start, _end, group) => {
              openCreate({
                datum: format(start, 'yyyy-MM-dd'),
                mitarbeiter: group,
              });
            }}
            onEventDrop={async (id, newStart, _newEnd, newGroup) => {
              const rid = id.split(':')[1] ?? '';
              const s = schichtplan.find(r => r.record_id === rid);
              if (!s) return;
              const mitarbPatch = newGroup
                ? { mitarbeiter: createRecordUrl(APP_IDS.MITARBEITER, newGroup) }
                : {};
              setSchichtplan(prev => prev.map(r =>
                r.record_id === rid
                  ? { ...r, fields: { ...r.fields, datum: newStart, ...mitarbPatch } }
                  : r,
              ));
              undoToast('Schicht verschoben', async () => {
                setSchichtplan(prev => prev.map(r =>
                  r.record_id === rid ? { ...r, fields: { ...r.fields, ...s.fields } } : r,
                ));
                await LivingAppsService.updateSchichtplanEntry(rid, {
                  datum: s.fields.datum,
                  ...(newGroup ? { mitarbeiter: s.fields.mitarbeiter } : {}),
                });
              });
              try {
                await LivingAppsService.updateSchichtplanEntry(rid, {
                  datum: newStart,
                  ...mitarbPatch,
                });
              } catch {
                fetchAll();
              }
            }}
          />
        }
        aside={
          <>
            <WorkList
              title="Heute unbestätigt"
              items={todaySchichten
                .filter(s => s.fields.status?.key === 'geplant')
                .map(s => ({
                  id: s.record_id,
                  title: s.mitarbeiterName || 'Mitarbeiter',
                  secondLine: (
                    <>
                      <span className="font-medium text-warning-foreground" style={{ color: 'var(--warning)' }}>Geplant</span>
                      <span className="text-muted-foreground"> · {s.schichtvorlageName || 'Schicht'} · {formatDate(s.fields.datum)}</span>
                    </>
                  ),
                  action: {
                    label: '✓ Bestätigen',
                    onClick: () => bestaetige(s),
                  },
                }))}
              onItemClick={id => overlay.replace({ type: 'schichtplan', id })}
              empty={{
                text: todaySchichten.length > 0
                  ? 'Alle Schichten für heute bestätigt!'
                  : 'Noch keine Schichten für heute — jetzt eintragen.',
                action: { label: 'Schicht eintragen', onClick: () => openCreate({ datum: today }) },
              }}
            />
            <WorkList
              title="Alle unbestätigten Schichten"
              items={ungeplant.slice(0, 8).map(s => ({
                id: s.record_id,
                title: s.mitarbeiterName || 'Mitarbeiter',
                secondLine: (
                  <>
                    <span className="font-medium" style={{ color: 'var(--muted-foreground)' }}>Geplant</span>
                    <span className="text-muted-foreground"> · {formatDate(s.fields.datum)}</span>
                  </>
                ),
                action: {
                  label: '✓',
                  onClick: () => bestaetige(s),
                },
              }))}
              onItemClick={id => overlay.replace({ type: 'schichtplan', id })}
              empty={{
                text: 'Alle Schichten sind bestätigt.',
              }}
            />
          </>
        }
      />

      {/* Dialog */}
      <SchichtplanDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingRecord(undefined); }}
        onSubmit={async (fields) => {
          if (editingRecord) {
            await LivingAppsService.updateSchichtplanEntry(editingRecord.record_id, fields);
          } else {
            await LivingAppsService.createSchichtplanEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editingRecord ? editingRecord.fields : dialogDefaults}
        recordId={editingRecord?.record_id}
        mitarbeiterList={mitarbeiter}
        schichtvorlagenList={schichtvorlagen}
        enablePhotoScan={AI_PHOTO_SCAN['Schichtplan']}
      />

      {/* Overlay host — ONE shell, all entity types */}
      <RecordOverlayHost
        overlay={overlay}
        render={top => {
          if (top.type === 'schichtplan') {
            const s = schichtplan.find(r => r.record_id === top.id);
            if (!s) return null;
            const ma = mitarbeiterMap.get(extractRecordId(s.fields.mitarbeiter) ?? '');
            return (
              <>
                <RecordHeader
                  title={`${ma?.fields.vorname ?? ''} ${ma?.fields.nachname ?? ''}`.trim() || 'Schicht'}
                  subtitle={formatDate(s.fields.datum)}
                  badges={
                    s.fields.status ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground">
                        {s.fields.status.label}
                      </span>
                    ) : undefined
                  }
                />
                <SchichtplanDetails
                  record={s}
                  mitarbeiterList={mitarbeiter}
                  schichtvorlagenList={schichtvorlagen}
                  onOpenMitarbeiter={r => overlay.push({ type: 'mitarbeiter', id: r.record_id })}
                  onOpenSchichtvorlagen={r => overlay.push({ type: 'schichtvorlagen', id: r.record_id })}
                />
              </>
            );
          }
          if (top.type === 'mitarbeiter') {
            const m = mitarbeiter.find(r => r.record_id === top.id);
            if (!m) return null;
            return (
              <>
                <RecordHeader
                  title={`${m.fields.vorname ?? ''} ${m.fields.nachname ?? ''}`.trim() || 'Mitarbeiter'}
                  subtitle={m.fields.position ?? m.fields.abteilung}
                />
                <MitarbeiterDetails
                  record={m}
                  schichtplanList={schichtplan}
                  onOpenSchichtplan={r => overlay.push({ type: 'schichtplan', id: r.record_id })}
                  onAddSchichtplan={() => openCreate({ mitarbeiter: m.record_id })}
                />
              </>
            );
          }
          if (top.type === 'schichtvorlagen') {
            const v = schichtvorlagen.find(r => r.record_id === top.id);
            if (!v) return null;
            return (
              <>
                <RecordHeader
                  title={v.fields.schichtname ?? 'Schichtvorlage'}
                  subtitle={v.fields.schichttyp?.label}
                />
                <SchichtvorlagenDetails
                  record={v}
                  schichtplanList={schichtplan}
                  onOpenSchichtplan={r => overlay.push({ type: 'schichtplan', id: r.record_id })}
                  onAddSchichtplan={() => openCreate({ schichtvorlage: v.record_id })}
                />
              </>
            );
          }
          return null;
        }}
        footer={top => {
          if (top.type === 'schichtplan') {
            const s = schichtplan.find(r => r.record_id === top.id);
            if (!s || s.fields.status?.key === 'bestaetigt') return undefined;
            return {
              label: '✓ Schicht bestätigen',
              onClick: () => { void bestaetige(s); overlay.close(); },
            };
          }
          return undefined;
        }}
        onEdit={top => {
          if (top.type === 'schichtplan') {
            const s = schichtplan.find(r => r.record_id === top.id);
            if (s) { openEdit(s); overlay.close(); }
          }
        }}
      />
    </>
  );
}
