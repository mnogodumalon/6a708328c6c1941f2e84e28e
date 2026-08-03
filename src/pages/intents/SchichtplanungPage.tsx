/**
 * Schichtplanung — 4-Schritt-Wizard.
 * Steps: 1) Datum wählen → 2) Schichtvorlage auswählen → 3) Mitarbeiter zuweisen → 4) Zusammenfassung & Anlegen.
 * Reads: schichtvorlagen, mitarbeiter. Writes: schichtplan (createSchichtplanEntry — einmal pro Mitarbeiter).
 * Composes: IntentWizardShell, EntitySelectStep.
 */

import { useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { IntentWizardShell } from '@/components/blocks/IntentWizardShell';
import { EntitySelectStep } from '@/components/blocks/EntitySelectStep';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Mitarbeiter, Schichtvorlagen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  IconCalendar,
  IconClock,
  IconUser,
  IconCheck,
  IconAlertCircle,
  IconUsers,
  IconLayersIntersect,
} from '@tabler/icons-react';

const WIZARD_STEPS = [
  { label: 'Datum' },
  { label: 'Schicht' },
  { label: 'Mitarbeiter' },
  { label: 'Bestätigen' },
];

export default function SchichtplanungPage() {
  const { schichtvorlagen, mitarbeiter, loading, error, fetchAll } = useDashboardData();

  const [step, setStep] = useState(1);

  // Step 1 — Datum
  const [datum, setDatum] = useState('');

  // Step 2 — Schichtvorlage
  const [selectedVorlageId, setSelectedVorlageId] = useState<string | null>(null);

  // Step 2 — Neue Schichtvorlage anlegen
  const [showCreateVorlage, setShowCreateVorlage] = useState(false);
  const [newSchichtname, setNewSchichtname] = useState('');
  const [newStartzeit, setNewStartzeit] = useState('');
  const [newEndzeit, setNewEndzeit] = useState('');
  const [newBereich, setNewBereich] = useState('');
  const [creatingVorlage, setCreatingVorlage] = useState(false);

  // Step 3 — Mitarbeiter (multiple selection)
  const [selectedMitarbeiterIds, setSelectedMitarbeiterIds] = useState<Set<string>>(new Set());

  // Step 3 — Neuen Mitarbeiter anlegen
  const [showCreateMitarbeiter, setShowCreateMitarbeiter] = useState(false);
  const [newVorname, setNewVorname] = useState('');
  const [newNachname, setNewNachname] = useState('');
  const [newAbteilung, setNewAbteilung] = useState('');
  const [creatingMitarbeiter, setCreatingMitarbeiter] = useState(false);

  // Step 4 — Anlegen
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);
  const [done, setDone] = useState(false);

  // Derived: selected Vorlage object
  const selectedVorlage: Schichtvorlagen | undefined = schichtvorlagen.find(
    v => v.record_id === selectedVorlageId
  );

  // Derived: selected Mitarbeiter objects
  const selectedMitarbeiterList: Mitarbeiter[] = mitarbeiter.filter(m =>
    selectedMitarbeiterIds.has(m.record_id)
  );

  // Toggle Mitarbeiter selection
  const toggleMitarbeiter = useCallback((id: string) => {
    setSelectedMitarbeiterIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Create new Schichtvorlage
  const handleCreateVorlage = useCallback(async () => {
    if (!newSchichtname || !newStartzeit || !newEndzeit) return;
    setCreatingVorlage(true);
    try {
      const result = await LivingAppsService.createSchichtvorlagenEntry({
        schichtname: newSchichtname,
        startzeit: newStartzeit,
        endzeit: newEndzeit,
        bereich: newBereich || undefined,
      });
      await fetchAll();
      setSelectedVorlageId(result.record_id);
      setShowCreateVorlage(false);
      setNewSchichtname('');
      setNewStartzeit('');
      setNewEndzeit('');
      setNewBereich('');
      setStep(3);
    } finally {
      setCreatingVorlage(false);
    }
  }, [newSchichtname, newStartzeit, newEndzeit, newBereich, fetchAll]);

  // Create new Mitarbeiter
  const handleCreateMitarbeiter = useCallback(async () => {
    if (!newVorname || !newNachname) return;
    setCreatingMitarbeiter(true);
    try {
      const result = await LivingAppsService.createMitarbeiterEntry({
        vorname: newVorname,
        nachname: newNachname,
        abteilung: newAbteilung || undefined,
      });
      await fetchAll();
      setSelectedMitarbeiterIds(prev => {
        const next = new Set(prev);
        next.add(result.record_id);
        return next;
      });
      setShowCreateMitarbeiter(false);
      setNewVorname('');
      setNewNachname('');
      setNewAbteilung('');
    } finally {
      setCreatingMitarbeiter(false);
    }
  }, [newVorname, newNachname, newAbteilung, fetchAll]);

  // Confirm and create Schichtplan entries
  const handleSubmit = useCallback(async () => {
    if (!datum || !selectedVorlageId || selectedMitarbeiterIds.size === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    setCreatedCount(0);

    const mitarbeiterArray = Array.from(selectedMitarbeiterIds);
    let count = 0;

    try {
      for (const mitarbeiterId of mitarbeiterArray) {
        await LivingAppsService.createSchichtplanEntry({
          datum: datum,
          schichtvorlage: createRecordUrl(APP_IDS.SCHICHTVORLAGEN, selectedVorlageId),
          mitarbeiter: createRecordUrl(APP_IDS.MITARBEITER, mitarbeiterId),
          status: 'geplant',
        });
        count += 1;
        setCreatedCount(count);
      }
      setDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [datum, selectedVorlageId, selectedMitarbeiterIds]);

  const handleReset = useCallback(() => {
    setStep(1);
    setDatum('');
    setSelectedVorlageId(null);
    setSelectedMitarbeiterIds(new Set());
    setSubmitError(null);
    setCreatedCount(0);
    setDone(false);
    setShowCreateVorlage(false);
    setShowCreateMitarbeiter(false);
  }, []);

  // Format datum for display
  const datumFormatted = datum
    ? format(parseISO(datum), 'EEEE, dd. MMMM yyyy', { locale: de })
    : '–';

  return (
    <IntentWizardShell
      title="Schichtplanung"
      subtitle="Mitarbeiter für eine Schicht einplanen"
      steps={WIZARD_STEPS}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ------------------------------------------------------------------ */}
      {/* STEP 1 — Datum wählen                                               */}
      {/* ------------------------------------------------------------------ */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <IconCalendar size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-base">Datum auswählen</h2>
                <p className="text-sm text-muted-foreground">Für welchen Tag soll die Schicht geplant werden?</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Datum</label>
              <Input
                type="date"
                value={datum}
                onChange={e => setDatum(e.target.value)}
                className="max-w-xs"
              />
            </div>

            {datum && (
              <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
                <p className="text-sm text-primary font-medium">{datumFormatted}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              disabled={!datum}
              onClick={() => setStep(2)}
              className="gap-2"
            >
              Weiter: Schicht wählen
            </Button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 2 — Schichtvorlage wählen                                      */}
      {/* ------------------------------------------------------------------ */}
      {step === 2 && (
        <div className="space-y-4">
          {datum ? (
            <>
              <div className="rounded-xl border bg-secondary/30 px-4 py-2.5 flex items-center gap-2">
                <IconCalendar size={15} className="text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">Datum:</span>
                <span className="text-sm font-medium">{datumFormatted}</span>
              </div>

              <EntitySelectStep
                items={schichtvorlagen.map(v => ({
                  id: v.record_id,
                  title: v.fields.schichtname ?? '(Unbekannte Schicht)',
                  subtitle: [
                    v.fields.schichttyp?.label,
                    v.fields.startzeit && v.fields.endzeit
                      ? `${v.fields.startzeit} – ${v.fields.endzeit}`
                      : v.fields.startzeit ?? v.fields.endzeit,
                    v.fields.bereich,
                  ]
                    .filter(Boolean)
                    .join(' · '),
                  icon: <IconClock size={18} className="text-primary" />,
                  stats: v.fields.mindestbesetzung != null
                    ? [{ label: 'Mindestbesetzung', value: v.fields.mindestbesetzung }]
                    : undefined,
                }))}
                onSelect={id => {
                  setSelectedVorlageId(id);
                  setShowCreateVorlage(false);
                  setStep(3);
                }}
                searchPlaceholder="Schicht suchen..."
                emptyText="Keine Schichtvorlagen gefunden."
                emptyIcon={<IconClock size={32} />}
                createLabel="Neue Schichtvorlage"
                onCreateNew={() => setShowCreateVorlage(v => !v)}
                createDialog={showCreateVorlage ? (
                  <div className="rounded-2xl border bg-card p-4 space-y-3">
                    <h3 className="font-semibold text-sm">Neue Schichtvorlage anlegen</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Schichtname *</label>
                        <Input
                          value={newSchichtname}
                          onChange={e => setNewSchichtname(e.target.value)}
                          placeholder="z.B. Frühschicht A"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Bereich</label>
                        <Input
                          value={newBereich}
                          onChange={e => setNewBereich(e.target.value)}
                          placeholder="z.B. Produktion"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Startzeit *</label>
                        <Input
                          type="time"
                          value={newStartzeit}
                          onChange={e => setNewStartzeit(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Endzeit *</label>
                        <Input
                          type="time"
                          value={newEndzeit}
                          onChange={e => setNewEndzeit(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        disabled={!newSchichtname || !newStartzeit || !newEndzeit || creatingVorlage}
                        onClick={handleCreateVorlage}
                        size="sm"
                      >
                        {creatingVorlage ? 'Wird angelegt...' : 'Anlegen & auswählen'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreateVorlage(false)}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                ) : undefined}
              />

              <div className="flex justify-start">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Zurück
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground">Dieser Schritt braucht ein Datum aus Schritt 1.</p>
              <Button variant="outline" onClick={() => setStep(1)}>Neu starten</Button>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 3 — Mitarbeiter zuweisen                                       */}
      {/* ------------------------------------------------------------------ */}
      {step === 3 && (
        <div className="space-y-4">
          {datum && selectedVorlage ? (
            <>
              {/* Context bar */}
              <div className="rounded-xl border bg-secondary/30 px-4 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex items-center gap-2">
                  <IconCalendar size={15} className="text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{datumFormatted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconClock size={15} className="text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">
                    {selectedVorlage.fields.schichtname}
                    {selectedVorlage.fields.startzeit && selectedVorlage.fields.endzeit &&
                      ` (${selectedVorlage.fields.startzeit} – ${selectedVorlage.fields.endzeit})`}
                  </span>
                </div>
              </div>

              {/* Live feedback: count */}
              {selectedMitarbeiterIds.size > 0 && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-center gap-3">
                  <IconUsers size={18} className="text-primary shrink-0" />
                  <p className="text-sm font-medium text-primary">
                    {selectedMitarbeiterIds.size} Mitarbeiter ausgewählt
                  </p>
                </div>
              )}

              {/* Multi-select tile list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Mitarbeiter auswählen</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateMitarbeiter(v => !v)}
                    className="gap-1.5"
                  >
                    <IconUser size={14} />
                    Neuen Mitarbeiter
                  </Button>
                </div>

                {/* Create Mitarbeiter mini-form */}
                {showCreateMitarbeiter && (
                  <div className="rounded-2xl border bg-card p-4 space-y-3">
                    <h3 className="font-semibold text-sm">Neuen Mitarbeiter anlegen</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Vorname *</label>
                        <Input
                          value={newVorname}
                          onChange={e => setNewVorname(e.target.value)}
                          placeholder="Vorname"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Nachname *</label>
                        <Input
                          value={newNachname}
                          onChange={e => setNewNachname(e.target.value)}
                          placeholder="Nachname"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-medium text-muted-foreground">Abteilung</label>
                        <Input
                          value={newAbteilung}
                          onChange={e => setNewAbteilung(e.target.value)}
                          placeholder="z.B. Produktion"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        disabled={!newVorname || !newNachname || creatingMitarbeiter}
                        onClick={handleCreateMitarbeiter}
                        size="sm"
                      >
                        {creatingMitarbeiter ? 'Wird angelegt...' : 'Anlegen & auswählen'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCreateMitarbeiter(false)}
                      >
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                )}

                {/* Mitarbeiter tile grid */}
                {mitarbeiter.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <p className="text-sm">Noch keine Mitarbeiter vorhanden.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {mitarbeiter.map(m => {
                      const isSelected = selectedMitarbeiterIds.has(m.record_id);
                      return (
                        <button
                          key={m.record_id}
                          onClick={() => toggleMitarbeiter(m.record_id)}
                          className={`w-full text-left flex items-center gap-3 p-4 rounded-xl border transition-colors overflow-hidden ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border bg-card hover:bg-accent hover:border-primary/30'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}>
                            {isSelected
                              ? <IconCheck size={16} stroke={2.5} />
                              : `${(m.fields.vorname ?? '?')[0]}${(m.fields.nachname ?? '?')[0]}`}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                              {[m.fields.vorname, m.fields.nachname].filter(Boolean).join(' ') || '(Kein Name)'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {[m.fields.position, m.fields.abteilung].filter(Boolean).join(' · ') ||
                                m.fields.beschaeftigungsart?.label || ''}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Zurück
                </Button>
                <Button
                  disabled={selectedMitarbeiterIds.size === 0}
                  onClick={() => setStep(4)}
                  className="gap-2"
                >
                  Weiter: Zusammenfassung
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground">Dieser Schritt braucht Datum und Schicht aus den vorherigen Schritten.</p>
              <Button variant="outline" onClick={() => setStep(1)}>Neu starten</Button>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 4 — Zusammenfassung & Anlegen                                  */}
      {/* ------------------------------------------------------------------ */}
      {step === 4 && (
        <div className="space-y-4">
          {datum && selectedVorlage && selectedMitarbeiterIds.size > 0 ? (
            <>
              {done ? (
                /* Success state */
                <div className="rounded-2xl border bg-card p-8 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <IconCheck size={28} className="text-primary" stroke={2.5} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Schichten erfolgreich angelegt!</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {createdCount} {createdCount === 1 ? 'Schicht wurde' : 'Schichten wurden'} für den {datumFormatted} eingeplant.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <Button onClick={handleReset} variant="outline">
                      Neue Schicht einplanen
                    </Button>
                    <a href="#/">
                      <Button>Zurück zum Dashboard</Button>
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  {/* Summary card */}
                  <div className="rounded-2xl border bg-card overflow-hidden">
                    <div className="px-5 py-4 border-b bg-secondary/20">
                      <h2 className="font-semibold text-base">Zusammenfassung</h2>
                    </div>
                    <div className="p-5 space-y-4">
                      {/* Datum */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <IconCalendar size={16} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Datum</p>
                          <p className="text-sm font-medium">{datumFormatted}</p>
                        </div>
                      </div>

                      {/* Schicht */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <IconClock size={16} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Schicht</p>
                          <p className="text-sm font-medium">{selectedVorlage.fields.schichtname}</p>
                          {selectedVorlage.fields.startzeit && selectedVorlage.fields.endzeit && (
                            <p className="text-xs text-muted-foreground">
                              {selectedVorlage.fields.startzeit} – {selectedVorlage.fields.endzeit}
                              {selectedVorlage.fields.bereich && ` · ${selectedVorlage.fields.bereich}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Mitarbeiter */}
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <IconUsers size={16} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">
                            Mitarbeiter ({selectedMitarbeiterIds.size})
                          </p>
                          <div className="mt-1.5 flex flex-col gap-1">
                            {selectedMitarbeiterList.map(m => (
                              <p key={m.record_id} className="text-sm font-medium">
                                {[m.fields.vorname, m.fields.nachname].filter(Boolean).join(' ') || '(Kein Name)'}
                                {m.fields.position && (
                                  <span className="text-muted-foreground font-normal"> · {m.fields.position}</span>
                                )}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
                        <IconLayersIntersect size={18} className="text-primary shrink-0" />
                        <p className="text-sm font-medium text-primary">
                          Es werden {selectedMitarbeiterIds.size} Schichtplan-{selectedMitarbeiterIds.size === 1 ? 'Eintrag' : 'Einträge'} angelegt.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress during submit */}
                  {submitting && (
                    <div className="rounded-xl border bg-secondary/30 px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Schichten werden angelegt...</span>
                        <span className="font-medium text-primary">
                          {createdCount} von {selectedMitarbeiterIds.size}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${(createdCount / selectedMitarbeiterIds.size) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {submitError && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-start gap-2">
                      <IconAlertCircle size={16} className="text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-destructive">Fehler beim Anlegen</p>
                        <p className="text-xs text-destructive/80 mt-0.5">{submitError}</p>
                        {createdCount > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {createdCount} von {selectedMitarbeiterIds.size} Einträgen wurden bereits erstellt.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <Button variant="outline" onClick={() => setStep(3)} disabled={submitting}>
                      Zurück
                    </Button>
                    <Button
                      disabled={submitting}
                      onClick={handleSubmit}
                      className="gap-2"
                    >
                      <IconCheck size={16} />
                      {submitting ? 'Wird angelegt...' : `${selectedMitarbeiterIds.size} Schicht${selectedMitarbeiterIds.size === 1 ? '' : 'en'} anlegen`}
                    </Button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-muted-foreground">Dieser Schritt braucht die Auswahl aus den vorherigen Schritten.</p>
              <Button variant="outline" onClick={() => setStep(1)}>Neu starten</Button>
            </div>
          )}
        </div>
      )}
    </IntentWizardShell>
  );
}
