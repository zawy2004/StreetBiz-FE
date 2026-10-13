import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Card, Icon } from '@/components/common';
import { colors } from '@/theme';
import { useAuthStore } from '@/store/auth-store';
import { AiSuggestionCard } from './AiSuggestionCard';
import { complianceApi, type GeofenceDriftItem } from '../ward-api';

const levelLabels: Record<GeofenceDriftItem['level'], string> = {
  WATCH: 'Theo dõi',
  DRIFT: 'Lệch vị trí',
};

/** AIC-06: permits whose QR scans repeatedly land away from their licensed slot over the last
 * 30 days. The level/pattern/distance are plain geometry (AiInsightRules); only the DRIFT items'
 * narrative explanation is (optionally) AI-written. */
export function GeofenceDriftPanel() {
  const userId = useAuthStore((state) => state.user?.id);
  const report = useQuery({
    queryKey: ['ward', userId, 'geofence-drift'],
    queryFn: complianceApi.geofenceDrift,
  });

  if (report.isPending || !report.data || report.data.items.length === 0) return null;

  return (
    <Card>
      <h2 className="text-headline-sm">Lệch vị trí quét giấy phép (AIC-06)</h2>
      <p className="mt-xs text-body-sm text-muted">
        {report.data.items.length} ô có lượt quét lệch quá {report.data.toleranceMeters}m trong{' '}
        {report.data.windowDays} ngày qua.
      </p>
      <div className="mt-sm flex flex-col gap-sm">
        {report.data.items.map((item) => (
          <DriftItemCard key={item.permitId} item={item} />
        ))}
      </div>
    </Card>
  );
}

function DriftItemCard({ item }: { item: GeofenceDriftItem }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-sm border border-border p-sm">
      <div className="flex flex-wrap items-center justify-between gap-xs">
        <p className="font-medium text-text">
          {item.slotCode} · {item.vendorName}
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-body-xs font-semibold ${
            item.level === 'DRIFT' ? 'bg-danger/10 text-danger' : 'bg-amber-500/10 text-amber-600'
          }`}
        >
          {levelLabels[item.level]}
        </span>
      </div>
      <p className="mt-1 text-body-sm text-text">
        {item.offSiteCount}/{item.scanCount} lần quét lệch &gt; 25 m
        {item.meanOffsetMeters != null && item.meanOffsetBearingDegrees != null
          ? ` · lệch trung bình ~${Math.round(item.meanOffsetMeters)} m`
          : ''}
        {item.maxDistanceMeters ? ` · xa nhất ${item.maxDistanceMeters} m` : ''}
      </p>
      <AiSuggestionCard
        title={item.isAiGenerated ? 'Nhận định AI [AI]' : 'Nhận định [Hệ thống — chưa xác minh bằng AI]'}
        aiLogId={item.aiLogId}
      >
        {item.explanation}
      </AiSuggestionCard>
      <button
        type="button"
        className="mt-xs flex items-center gap-1 text-body-sm text-indigo"
        onClick={() => setExpanded((v) => !v)}
      >
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.indigo} />
        {expanded ? 'Thu gọn' : `Xem ${item.scans.length} lượt quét`}
      </button>
      {expanded && (
        <ul className="mt-xs space-y-1 text-body-sm text-muted">
          {item.scans.map((scan) => (
            <li key={scan.scanId}>
              {new Date(scan.scannedAt).toLocaleString('vi-VN')} · cách {scan.distanceMeters} m ·{' '}
              {scan.scanContext === 'PUBLIC_CHECK' ? 'khách quét' : 'cán bộ quét'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
