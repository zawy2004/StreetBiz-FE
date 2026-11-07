import { useState } from 'react';

import { Button } from '@/components/common';
import { showToast } from '@/components/feedback';
import { SegmentedControl } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { errorMessage, wardTaxApi } from '@/core/api';
import { isLiveApi } from '@/core/config/env';
import { saveFile } from '@/core/utils/save-file';
import { TaxNeedsServer } from '../components/TaxParts';
import { WardTaxAnnouncements } from '../components/WardTaxAnnouncements';
import { WardTaxHouseholds } from '../components/WardTaxHouseholds';
import { WardTaxOverview, type WardTaxTab } from '../components/WardTaxOverview';
import { WardTaxReferrals } from '../components/WardTaxReferrals';
import { currentTaxYear } from '../tax-format';

const TABS: { value: WardTaxTab; label: string }[] = [
  { value: 'overview', label: 'Tổng quan' },
  { value: 'households', label: 'Hộ kinh doanh' },
  { value: 'referrals', label: 'Đề nghị cơ quan thuế' },
  { value: 'announcements', label: 'Thông báo' },
];

/**
 * The ward's tax desk: how its households stand, the list it keeps for the tax office, the cases to
 * pass on, and reminders to households. The ward collects no tax and sees revenue only with consent.
 */
export function WardTaxScreen() {
  const [tab, setTab] = useState<WardTaxTab>('overview');
  const [exporting, setExporting] = useState(false);

  const exportWorkbook = async () => {
    setExporting(true);
    try {
      const year = currentTaxYear();
      saveFile(await wardTaxApi.exportWorkbook(year), `ho-kinh-doanh-thue-${year}.xlsx`);
    } catch (error) {
      showToast(errorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen width="wide">
      <AppHeader
        title="Thuế hộ kinh doanh"
        subtitle="Phường hỗ trợ hộ và cung cấp thông tin cho cơ quan thuế. Phường không thu thuế."
        right={
          isLiveApi ? (
            <Button
              label="Xuất danh sách cho cơ quan thuế (Excel)"
              variant="outline"
              size="sm"
              fullWidth={false}
              loading={exporting}
              onPress={() => void exportWorkbook()}
            />
          ) : undefined
        }
      />
      {!isLiveApi ? (
        <TaxNeedsServer />
      ) : (
        <>
          <SegmentedControl options={TABS} value={tab} onChange={setTab} />
          {tab === 'overview' ? <WardTaxOverview onOpen={setTab} /> : null}
          {tab === 'households' ? <WardTaxHouseholds /> : null}
          {tab === 'referrals' ? <WardTaxReferrals /> : null}
          {tab === 'announcements' ? <WardTaxAnnouncements /> : null}
        </>
      )}
    </Screen>
  );
}
