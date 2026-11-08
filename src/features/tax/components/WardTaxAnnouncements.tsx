import { useState } from 'react';

import { Button, Card } from '@/components/common';
import { EmptyState, ErrorState, LoadingState, showToast } from '@/components/feedback';
import { SelectField, TextField } from '@/components/forms';
import { Section } from '@/components/layout';
import { errorMessage, type TaxAnnouncementSegment } from '@/core/api';
import { SEGMENT_LABEL, currentTaxYear, formatMoment } from '../tax-format';
import { useSendTaxAnnouncement, useTaxAnnouncements } from '../useTax';

const SEGMENT_OPTIONS = (Object.keys(SEGMENT_LABEL) as TaxAnnouncementSegment[]).map((value) => ({
  value,
  label: SEGMENT_LABEL[value],
}));

/** A reminder template the officer can start from instead of a blank page. */
const TEMPLATES: { segment: TaxAnnouncementSegment; title: string; body: string }[] = [
  {
    segment: 'NOT_FILED',
    title: 'Nhắc thông báo doanh thu năm',
    body: 'Phường nhắc các hộ kinh doanh thông báo doanh thu thực tế của năm cho cơ quan thuế đúng hạn. Sau khi nộp, hộ xác nhận trong mục Thuế & doanh thu trên StreetBiz.',
  },
  {
    segment: 'NO_TAX_CODE',
    title: 'Khai mã số thuế của hộ',
    body: 'Các hộ chưa khai mã số thuế vui lòng cập nhật trong mục Thuế & doanh thu để phường hỗ trợ hướng dẫn khi cần.',
  },
];

/** Messages the ward sends its households about tax, and what it has already sent. */
export function WardTaxAnnouncements() {
  const history = useTaxAnnouncements();
  const send = useSendTaxAnnouncement();
  const [segment, setSegment] = useState<TaxAnnouncementSegment>('NOT_FILED');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [confirming, setConfirming] = useState(false);

  const valid = title.trim() !== '' && body.trim() !== '';

  const submit = () =>
    send.mutate(
      { segment, taxYear: currentTaxYear(), title: title.trim(), body: body.trim() },
      {
        onSuccess: (sent) => {
          showToast(`Đã gửi cho ${sent.recipientCount} hộ`);
          setTitle('');
          setBody('');
          setConfirming(false);
        },
        onError: (error) => {
          setConfirming(false);
          showToast(errorMessage(error));
        },
      },
    );

  return (
    <div className="flex flex-col gap-md">
      <Section title="Gửi thông báo cho hộ kinh doanh" description="Hộ nhận thông báo trong ứng dụng StreetBiz.">
        <Card>
          <div className="flex flex-col gap-md">
            <div className="flex flex-wrap gap-xs">
              {TEMPLATES.map((template) => (
                <Button
                  key={template.segment}
                  label={`Mẫu: ${template.title}`}
                  variant="ghost"
                  size="sm"
                  fullWidth={false}
                  onPress={() => {
                    setSegment(template.segment);
                    setTitle(template.title);
                    setBody(template.body);
                  }}
                />
              ))}
            </div>
            <SelectField label="Gửi cho" layout="inline" value={segment} options={SEGMENT_OPTIONS} onChange={setSegment} />
            <TextField label="Tiêu đề" value={title} onChangeText={setTitle} maxLength={150} />
            <TextField label="Nội dung" value={body} onChangeText={setBody} maxLength={800} multiline />
            {confirming ? (
              <div className="flex flex-wrap items-center gap-sm rounded-[14px] bg-sunken p-sm">
                <p className="min-w-0 flex-1 text-body-md text-text">
                  Gửi “{title.trim()}” cho <strong>{SEGMENT_LABEL[segment].toLowerCase()}</strong>? Không thể thu hồi sau khi gửi.
                </p>
                <Button label="Gửi" size="sm" fullWidth={false} loading={send.isPending} disabled={send.isPending} onPress={submit} />
                <Button label="Huỷ" size="sm" variant="outline" fullWidth={false} onPress={() => setConfirming(false)} />
              </div>
            ) : (
              <Button label="Gửi thông báo" fullWidth={false} disabled={!valid} onPress={() => setConfirming(true)} />
            )}
          </div>
        </Card>
      </Section>

      <Section title="Đã gửi">
        {history.isLoading ? (
          <LoadingState />
        ) : history.isError ? (
          <ErrorState message={errorMessage(history.error)} onRetry={() => history.refetch()} />
        ) : (history.data ?? []).length === 0 ? (
          <EmptyState icon="send-outline" title="Phường chưa gửi thông báo thuế nào" compact />
        ) : (
          <div className="grid gap-sm md:grid-cols-2">
            {(history.data ?? []).map((item) => (
              <Card key={item.announcementId}>
                <h3 className="text-headline-sm text-text">{item.title}</h3>
                <p className="text-body-sm text-muted">
                  {SEGMENT_LABEL[item.segment]} · {item.recipientCount} hộ · {formatMoment(item.createdAt)}
                  {item.createdByName ? ` · ${item.createdByName}` : ''}
                </p>
                <p className="mt-xs whitespace-pre-line text-body-md text-text">{item.body}</p>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
