/**
 * Schicht-Status-Review — 4-Schritt-Wizard.
 * Steps: 1) Mitarbeiter auswählen → 2) Zeitraum wählen → 3) Schichten reviewen & Status setzen → 4) Speichern & abschließen.
 * Reads: mitarbeiter, schichtvorlagen, schichtplan. Writes: schichtplan (updateSchichtplanEntry).
 * Composes: IntentWizardShell, EntitySelectStep, StatusBadge.
 */

import { useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, parseISO, isAfter, isBefore } from 'date-fns';
import { de } from 'date-fns/locale';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { StatusBadge } from '@/components/blocks/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDashboardData } from '@/hooks/useDashboardData';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS, LOOKUP_OPTIONS } from '@/types/app';
import type { Mitarbeiter, Schichtplan } from '@/types/app';
import { formatDate, lookupKey } from '@/lib/formatters';
import {
  IconUserCheck,
  IconCalendar,
  IconClipboardList,
  IconCheck,
  IconAlertTriangle,
  IconLoader2,
  IconChevronLeft,
} from '@tabler/icons-react';

const STATUS_OPTIONS = LOOKUP_OPTIONS['schichtplan']?.['status'] ?? [];

function getWeekStart(): string {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

function getWeekEnd(): string {
  return format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

interface StatusChange {
  recordId: string;
  newStatus: string;
}

export default function SchichtStatusPage() {
  const { mitarbeiter, schichtvorlagen, schichtplan, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);
  const [selectedMitarbeiterId, setSelectedMitarbeiterId] = useState<string | null>(null);
  const [vonDatum, setVonDatum] = useState<string>(getWeekStart());
  const [bisDatum, setBisDatum] = useState<string>(getWeekEnd());
  const [statusChanges, setStatusChanges] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<{ done: number; total: number } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedMitarbeiter = useMemo<Mitarbeiter | null>(() => {
    if (!selectedMitarbeiterId) return null;
    return mitarbeiter.find(m => m.record_id === selectedMitarbeiterId) ?? null;
  }, [mitarbeiter, selectedMitarbeiterId]);

  const schichtvorlagenMap = useMemo(() => {
    const map = new Map<string, string>();
    schichtvorlagen.forEach(s => map.set(s.record_id, s.fields.schichtname ?? '—'));
    return map;
  }, [schichtvorlagen]);

  const filteredSchichten = useMemo<Schichtplan[]>(() => {
    if (!selectedMitarbeiterId || !vonDatum || !bisDatum) return [];
    const mitarbeiterUrl = createRecordUrl(APP_IDS.MITARBEITER, selectedMitarbeiterId);
    return schichtplan.filter(s => {
      if (s.fields.mitarbeiter !== mitarbeiterUrl) return false;
      const statusK = lookupKey(s.fields.status);
      if (statusK === 'abwesend' || statusK === 'vertreten') return false;
      const datum = s.fields.datum;
      if (!datum) return false;
      const d = parseISO(datum.slice(0, 10));
      const von = parseISO(vonDatum);
      const bis = parseISO(bisDatum);
      return !isBefore(d, von) && !isAfter(d, bis);
    });
  }, [selectedMitarbeiterId, vonDatum, bisDatum, schichtplan]);

  const changedEntries = useMemo(() => {
    return filteredSchichten.filter(s => statusChanges.has(s.record_id));
  }, [filteredSchichten, statusChanges]);

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSchichten.forEach(s => {
      const chosenKey = statusChanges.get(s.record_id) ?? lookupKey(s.fields.status) ?? 'geplant';
      counts[chosenKey] = (counts[chosenKey] ?? 0) + 1;
    });
    return counts;
  }, [filteredSchichten, statusChanges]);

  function handleSelectMitarbeiter(id: string) {
    setSelectedMitarbeiterId(id);
    setStatusChanges(new Map());
    setStep(2);
  }

  function handleStatusChange(recordId: string, newStatus: string) {
    setStatusChanges(prev => {
      const next = new Map(prev);
      next.set(recordId, newStatus);
      return next;
    });
  }

  async function handleSave() {
    if (changedEntries.length === 0) {
      setStep(4);
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveProgress({ done: 0, total: changedEntries.length });
    try {
      let done = 0;
      for (const entry of changedEntries) {
        const newStatus = statusChanges.get(entry.record_id)!;
        await LivingAppsService.updateSchichtplanEntry(entry.record_id, { status: newStatus });
        done++;
        setSaveProgress({ done, total: changedEntries.length });
      }
      await fetchAll();
      setStep(4);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setSelectedMitarbeiterId(null);
    setVonDatum(getWeekStart());
    setBisDatum(getWeekEnd());
    setStatusChanges(new Map());
    setSaveProgress(null);
    setSaveError(null);
    setStep(1);
  }

  const mitarbeiterName = selectedMitarbeiter
    ? `${selectedMitarbeiter.fields.vorname ?? ''} ${selectedMitarbeiter.fields.nachname ?? ''}`.trim()
    : '';

  return (
    <IntentWizardShell
      title="Schicht-Status-Review"
      subtitle="Schichten prüfen und Status für einen Mitarbeiter im gewählten Zeitraum aktualisieren"
      steps={[
        { label: 'Mitarbeiter' },
        { label: 'Zeitraum' },
        { label: 'Review' },
        { label: 'Fertig' },
      ]}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* Step 1: Mitarbeiter wählen */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Mitarbeiter auswählen</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Wähle den Mitarbeiter, dessen Schichten du reviewen möchtest.
            </p>
          </div>
          <EntitySelectStep
            items={mitarbeiter.map(m => ({
              id: m.record_id,
              title: `${m.fields.vorname ?? ''} ${m.fields.nachname ?? ''}`.trim() || m.record_id,
              subtitle: [m.fields.abteilung, m.fields.position].filter(Boolean).join(' · '),
              icon: <IconUserCheck size={20} className="text-primary" />,
            }))}
            onSelect={handleSelectMitarbeiter}
            searchPlaceholder="Mitarbeiter suchen..."
            emptyText="Keine Mitarbeiter gefunden."
            emptyIcon={<IconUserCheck size={32} />}
          />
        </div>
      )}

      {/* Step 2: Zeitraum wählen */}
      {step === 2 && (
        selectedMitarbeiterId ? (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Zeitraum wählen</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Wähle den Zeitraum für <span className="font-medium">{mitarbeiterName}</span>.
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="vonDatum">Von</label>
                  <Input
                    id="vonDatum"
                    type="date"
                    value={vonDatum}
                    onChange={e => setVonDatum(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="bisDatum">Bis</label>
                  <Input
                    id="bisDatum"
                    type="date"
                    value={bisDatum}
                    onChange={e => setBisDatum(e.target.value)}
                  />
                </div>
              </div>
              {vonDatum && bisDatum && vonDatum > bisDatum && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <IconAlertTriangle size={14} />
                  Das Startdatum muss vor dem Enddatum liegen.
                </p>
              )}
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="gap-1.5"
              >
                <IconChevronLeft size={16} />
                Zurück
              </Button>
              <Button
                onClick={() => {
                  setStatusChanges(new Map());
                  setStep(3);
                }}
                disabled={!vonDatum || !bisDatum || vonDatum > bisDatum}
              >
                Schichten laden
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">Dieser Schritt braucht die Auswahl aus Schritt 1.</p>
            <Button variant="outline" onClick={() => setStep(1)}>Neu starten</Button>
          </div>
        )
      )}

      {/* Step 3: Schichten reviewen */}
      {step === 3 && (
        selectedMitarbeiterId ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Schichten reviewen</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {mitarbeiterName} · {formatDate(vonDatum)} – {formatDate(bisDatum)}
              </p>
            </div>

            {/* Live-Zählung */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STATUS_OPTIONS.map(opt => (
                <div key={opt.key} className="rounded-xl border bg-card p-3 text-center">
                  <div className="text-2xl font-bold">{countByStatus[opt.key] ?? 0}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    <StatusBadge statusKey={opt.key} label={opt.label} />
                  </div>
                </div>
              ))}
            </div>

            {filteredSchichten.length === 0 ? (
              <div className="rounded-2xl border bg-card p-8 text-center">
                <IconClipboardList size={32} className="mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">
                  Keine offenen Schichten im gewählten Zeitraum gefunden.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Schichten mit Status "Abwesend" oder "Vertreten" werden nicht angezeigt.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSchichten.map(schicht => {
                  const currentStatusKey = lookupKey(schicht.fields.status) ?? 'geplant';
                  const chosenStatusKey = statusChanges.get(schicht.record_id) ?? currentStatusKey;
                  const schichtvorlagenId = extractRecordId(schicht.fields.schichtvorlage);
                  const schichtname = schichtvorlagenId ? (schichtvorlagenMap.get(schichtvorlagenId) ?? '—') : '—';

                  return (
                    <div key={schicht.record_id} className="rounded-xl border bg-card overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <IconCalendar size={20} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">{schichtname}</span>
                              <StatusBadge statusKey={currentStatusKey} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(schicht.fields.datum?.slice(0, 10))}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 ml-13">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Status setzen:</p>
                          <div className="flex gap-2 flex-wrap">
                            {STATUS_OPTIONS.map(opt => (
                              <button
                                key={opt.key}
                                onClick={() => handleStatusChange(schicht.record_id, opt.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                  chosenStatusKey === opt.key
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-card text-muted-foreground border-border hover:bg-accent hover:text-foreground'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3 flex-wrap items-center">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="gap-1.5"
              >
                <IconChevronLeft size={16} />
                Zurück
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-1.5"
              >
                {saving ? (
                  <>
                    <IconLoader2 size={16} className="animate-spin" />
                    Wird gespeichert...
                  </>
                ) : (
                  <>
                    <IconCheck size={16} />
                    {changedEntries.length > 0
                      ? `${changedEntries.length} ${changedEntries.length === 1 ? 'Änderung' : 'Änderungen'} speichern`
                      : 'Weiter (keine Änderungen)'}
                  </>
                )}
              </Button>
              {saveProgress && saving && (
                <span className="text-sm text-muted-foreground">
                  {saveProgress.done} von {saveProgress.total} gespeichert
                </span>
              )}
              {saveError && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <IconAlertTriangle size={14} />
                  {saveError}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">Dieser Schritt braucht die Auswahl aus Schritt 1.</p>
            <Button variant="outline" onClick={() => setStep(1)}>Neu starten</Button>
          </div>
        )
      )}

      {/* Step 4: Fertig */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="rounded-2xl border bg-card p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto">
              <IconCheck size={28} className="text-green-700" stroke={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Schichten aktualisiert</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {mitarbeiterName && (
                  <>
                    Mitarbeiter: <span className="font-medium">{mitarbeiterName}</span>
                    <br />
                  </>
                )}
                Zeitraum: {formatDate(vonDatum)} – {formatDate(bisDatum)}
              </p>
            </div>
            {saveProgress && (
              <div className="rounded-xl bg-secondary p-3 inline-block">
                <p className="text-sm font-medium">
                  {saveProgress.done} {saveProgress.done === 1 ? 'Eintrag' : 'Einträge'} aktualisiert
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {STATUS_OPTIONS.map(opt => (
                countByStatus[opt.key] ? (
                  <div key={opt.key} className="rounded-xl border bg-secondary p-2 text-center">
                    <div className="text-lg font-bold">{countByStatus[opt.key]}</div>
                    <StatusBadge statusKey={opt.key} label={opt.label} className="mt-0.5" />
                  </div>
                ) : null
              ))}
            </div>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <Button onClick={handleReset} variant="outline">
              Neues Review starten
            </Button>
            <a href="#/">
              <Button>Zurück zum Dashboard</Button>
            </a>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
