import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Clock3, MapPin, Star, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import {
  useInternalFeedback,
  type InternalCase,
  type CaseUpdate,
} from '@/hooks/useInternalFeedback';
import ReplySuggestions from '@/components/dashboard/ReplySuggestions';
import { useOwnerTranslation } from '@/i18n/owner/useOwnerTranslation';

interface CasesListProps {
  userId: string;
  businessName?: string | null;
}

type Draft = {
  responsibleName: string;
  resolutionNote: string;
  resolutionOutcome: NonNullable<InternalCase['resolution_outcome']> | 'none';
};

const draftFrom = (item: InternalCase): Draft => ({
  responsibleName: item.responsible_name || '',
  resolutionNote: item.resolution_note || '',
  resolutionOutcome: item.resolution_outcome || 'none',
});

const CasesList: React.FC<CasesListProps> = ({ userId, businessName }) => {
  const { t, i18n } = useOwnerTranslation();
  const { loading, cases, error, resolvingId, updateCase, startCase, reopenCase } =
    useInternalFeedback(userId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const dateTimeFormat = useMemo(
    () => new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
    [i18n.language, i18n.resolvedLanguage]
  );

  const orderedCases = useMemo(() => {
    const order: Record<InternalCase['case_status'], number> = {
      new: 0,
      in_progress: 1,
      resolved: 2,
    };
    return [...cases].sort((a, b) => {
      const byStatus = order[a.case_status] - order[b.case_status];
      if (byStatus) return byStatus;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [cases]);

  const openEditor = (item: InternalCase) => {
    setEditingId(item.id);
    setDraft(draftFrom(item));
  };

  const saveAction = async (item: InternalCase, resolve: boolean) => {
    if (!draft) return;
    if ((resolve || item.case_status === 'resolved') && !draft.resolutionNote.trim()) {
      toast.error(t('reviews.cases.noteRequired'));
      return;
    }

    const now = new Date().toISOString();
    const updates: CaseUpdate = {
      responsible_name: draft.responsibleName.trim() || null,
      resolution_note: draft.resolutionNote.trim() || null,
      resolution_outcome: draft.resolutionOutcome === 'none' ? null : draft.resolutionOutcome,
      case_status: resolve ? 'resolved' : item.case_status === 'new' ? 'in_progress' : item.case_status,
      acknowledged_at: item.acknowledged_at || now,
      resolved_at: resolve ? now : item.case_status === 'resolved' ? item.resolved_at : null,
    };

    const saved = await updateCase(item.id, updates);
    if (!saved) return;
    setEditingId(null);
    setDraft(null);
  };

  const beginCase = async (item: InternalCase) => {
    const started = await startCase(item.id);
    if (!started) return;
    openEditor({
      ...item,
      case_status: 'in_progress',
      acknowledged_at: item.acknowledged_at || new Date().toISOString(),
    });
  };

  if (loading) {
    return <Card><CardContent className="py-8 text-center text-gray-500">{t('reviews.cases.loading')}</CardContent></Card>;
  }

  if (error) {
    return <Card><CardContent className="py-8 text-center text-gray-500">{error}</CardContent></Card>;
  }

  if (cases.length === 0) {
    return <Card><CardContent className="py-8 text-center text-gray-500">{t('reviews.cases.empty')}</CardContent></Card>;
  }

  const statusLabel = (status: InternalCase['case_status']) =>
    t(`reviews.cases.status.${status}`);

  return (
    <div className="space-y-4">
      {orderedCases.map((item) => {
        const isEditing = editingId === item.id && draft;
        const isBusy = resolvingId === item.id;

        return (
          <Card key={item.id} className={item.case_status === 'new' ? 'border-amber-300' : undefined}>
            <CardContent className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.customer_name || t('reviews.cases.anonCustomer')}</span>
                    <span className="text-xs text-gray-500">
                      {item.created_at ? dateTimeFormat.format(new Date(item.created_at)) : ''}
                    </span>
                    <Badge variant={item.case_status === 'resolved' ? 'secondary' : item.case_status === 'new' ? 'destructive' : 'default'}>
                      {statusLabel(item.case_status)}
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Star size={13} className="fill-yellow-400 text-yellow-400" />
                      {t('reviews.cases.rating', { count: item.rating })}
                    </span>
                    {item.qr_name && (
                      <span className="flex items-center gap-1">
                        <MapPin size={13} /> {item.qr_name}
                      </span>
                    )}
                    {item.responsible_name && (
                      <span className="flex items-center gap-1">
                        <UserRound size={13} /> {item.responsible_name}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 text-sm text-gray-700">{item.feedback_text}</p>
                  {item.customer_email && (
                    <p className="mt-2 text-xs text-gray-500">
                      {t('reviews.cases.contact')}: {item.customer_email}
                    </p>
                  )}

                  {item.resolution_note && !isEditing && (
                    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                        <CheckCircle2 size={14} /> {t('reviews.cases.actionRecorded')}
                      </div>
                      <p className="mt-1 text-sm text-gray-700">{item.resolution_note}</p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                        {item.resolution_outcome && (
                          <span>{t(`reviews.cases.outcomes.${item.resolution_outcome}`)}</span>
                        )}
                        {item.resolved_at && (
                          <span>{t('reviews.cases.completedAt', { date: dateTimeFormat.format(new Date(item.resolved_at)) })}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <ReplySuggestions
                    channel="private"
                    rating={item.rating}
                    text={item.feedback_text}
                    customerName={item.customer_name}
                    customerEmail={item.customer_email}
                    businessName={businessName}
                  />
                </div>

                <div className="flex flex-shrink-0 flex-wrap gap-2 sm:max-w-48 sm:justify-end">
                  {item.case_status === 'new' && (
                    <Button size="sm" disabled={isBusy} onClick={() => beginCase(item)}>
                      <Clock3 size={14} className="mr-2" /> {t('reviews.cases.start')}
                    </Button>
                  )}
                  {item.case_status === 'in_progress' && (
                    <Button size="sm" disabled={isBusy} onClick={() => openEditor(item)}>
                      {t('reviews.cases.prepareAction')}
                    </Button>
                  )}
                  {item.case_status === 'resolved' && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => openEditor(item)}>
                        {t('reviews.cases.editAction')}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => reopenCase(item.id)}>
                        {t('reviews.cases.reopen')}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {isEditing && (
                <div className="mt-5 space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <div>
                    <h3 className="font-medium text-gray-900">{t('reviews.cases.actionTitle')}</h3>
                    <p className="mt-1 text-sm text-gray-600">{t('reviews.cases.actionDesc')}</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`responsible-${item.id}`}>{t('reviews.cases.responsible')}</Label>
                      <Input
                        id={`responsible-${item.id}`}
                        value={draft.responsibleName}
                        onChange={(event) => setDraft({ ...draft, responsibleName: event.target.value })}
                        placeholder={t('reviews.cases.responsiblePlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('reviews.cases.outcome')}</Label>
                      <Select
                        value={draft.resolutionOutcome}
                        onValueChange={(value: Draft['resolutionOutcome']) => setDraft({ ...draft, resolutionOutcome: value })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('reviews.cases.outcomes.none')}</SelectItem>
                          <SelectItem value="recovered">{t('reviews.cases.outcomes.recovered')}</SelectItem>
                          <SelectItem value="contacted">{t('reviews.cases.outcomes.contacted')}</SelectItem>
                          <SelectItem value="operational_fix">{t('reviews.cases.outcomes.operational_fix')}</SelectItem>
                          <SelectItem value="no_response">{t('reviews.cases.outcomes.no_response')}</SelectItem>
                          <SelectItem value="not_applicable">{t('reviews.cases.outcomes.not_applicable')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`note-${item.id}`}>{t('reviews.cases.resolutionNote')}</Label>
                    <Textarea
                      id={`note-${item.id}`}
                      value={draft.resolutionNote}
                      onChange={(event) => setDraft({ ...draft, resolutionNote: event.target.value })}
                      placeholder={t('reviews.cases.resolutionPlaceholder')}
                      rows={3}
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="ghost" onClick={() => { setEditingId(null); setDraft(null); }}>
                      {t('reviews.cases.cancel')}
                    </Button>
                    <Button variant="outline" disabled={isBusy} onClick={() => saveAction(item, false)}>
                      {t('reviews.cases.saveProgress')}
                    </Button>
                    <Button disabled={isBusy} onClick={() => saveAction(item, true)}>
                      {t('reviews.cases.resolveWithRecord')}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default CasesList;
