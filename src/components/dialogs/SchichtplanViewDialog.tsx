import type { Schichtplan, Mitarbeiter, Schichtvorlagen } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { APP_IDS } from '@/types/app';
import { AttachmentsSection } from '@/components/AttachmentsSection';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface SchichtplanViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Schichtplan | null;
  onEdit: (record: Schichtplan) => void;
  mitarbeiterList: Mitarbeiter[];
  schichtvorlagenList: Schichtvorlagen[];
}

export function SchichtplanViewDialog({ open, onClose, record, onEdit, mitarbeiterList, schichtvorlagenList }: SchichtplanViewDialogProps) {
  function getMitarbeiterDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return mitarbeiterList.find(r => r.record_id === id)?.fields.vorname ?? '—';
  }

  function getSchichtvorlagenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return schichtvorlagenList.find(r => r.record_id === id)?.fields.schichtname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schichtplan anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Einsatzdatum</Label>
            <p className="text-sm">{formatDate(record.fields.datum)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Mitarbeiter</Label>
            <p className="text-sm">{getMitarbeiterDisplayName(record.fields.mitarbeiter)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Schichtvorlage</Label>
            <p className="text-sm">{getSchichtvorlagenDisplayName(record.fields.schichtvorlage)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Badge variant="secondary">{record.fields.status?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.notizen ?? '—'}</p>
          </div>
          <div className="pt-2 border-t border-border">
            <AttachmentsSection appId={APP_IDS.SCHICHTPLAN} recordId={record.record_id} readOnly />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}