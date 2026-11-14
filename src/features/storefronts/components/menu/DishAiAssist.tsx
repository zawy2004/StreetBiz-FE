import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Button, Icon, formatVnd } from '@/components/common';
import { AiHint } from '@/components/status';
import { errorMessage } from '@/core/api';
import { aiApi, type DishDescriptionSuggestion, type DishRecognition } from '@/core/api/ai-api';

/**
 * AIP-02: from the dish photo, suggests a name, one of the platform's categories and a price people
 * usually pay. Nothing is filled in by itself: each part is applied only when the vendor presses its
 * button, and the vendor can still type over it.
 */
export function DishRecognitionAssist({
  imageUrl,
  onUseName,
  onUseCategory,
  onUsePrice,
}: {
  /** The server URL of the photo the vendor uploaded; the button waits for it. */
  imageUrl: string | null;
  onUseName: (name: string) => void;
  onUseCategory: (categoryId: number) => void;
  onUsePrice: (price: number) => void;
}) {
  const [result, setResult] = useState<DishRecognition | null>(null);
  const recognize = useMutation({
    mutationFn: (url: string) => aiApi.dishRecognition(url),
    onSuccess: setResult,
  });

  return (
    <div className="flex flex-col gap-xs">
      <Button
        label="Nhận diện món từ ảnh"
        variant="outline"
        size="sm"
        fullWidth={false}
        icon={<Icon name="creation" size={16} color="currentColor" weight="fill" />}
        disabled={!imageUrl}
        loading={recognize.isPending}
        describedBy="dish-recognition-help"
        onPress={() => {
          setResult(null);
          if (imageUrl) recognize.mutate(imageUrl);
        }}
      />
      <p id="dish-recognition-help" className="text-body-sm text-muted">
        {imageUrl
          ? 'AI gợi ý tên món, danh mục và giá tham khảo từ ảnh. Bạn quyết định dùng hay không.'
          : 'Chọn ảnh món trước để dùng gợi ý này.'}
      </p>
      {recognize.isError ? (
        <p role="alert" className="text-body-sm font-medium text-error">
          {errorMessage(recognize.error)} Bạn vẫn có thể tự nhập.
        </p>
      ) : null}
      {result && !result.available ? (
        <p role="status" className="text-body-sm text-muted">
          {result.message}
        </p>
      ) : null}
      {result?.available && !result.recognized ? (
        <p role="status" className="text-body-sm text-muted">
          {result.message}
        </p>
      ) : null}
      {result?.available && result.recognized ? (
        <AiHint title={result.dishName ?? 'Món ăn'}>
          <ul className="flex flex-col gap-xs">
            <li className="flex flex-wrap items-center gap-xs">
              <span>
                Tên gợi ý: <strong className="text-text">{result.dishName}</strong>
                {result.confidence !== null ? ` (độ chắc ${result.confidence}%)` : ''}
              </span>
              {result.dishName ? (
                <Button
                  label="Dùng tên"
                  size="sm"
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => onUseName(result.dishName!)}
                />
              ) : null}
            </li>
            {result.categoryId !== null ? (
              <li className="flex flex-wrap items-center gap-xs">
                <span>
                  Danh mục: <strong className="text-text">{result.categoryName}</strong>
                </span>
                <Button
                  label="Dùng danh mục"
                  size="sm"
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => onUseCategory(result.categoryId!)}
                />
              </li>
            ) : null}
            {result.referencePrice ? (
              <li className="flex flex-wrap items-center gap-xs">
                <span>
                  Giá tham khảo từ {result.referencePrice.dishCount} món cùng danh mục trên nền
                  tảng: {formatVnd(result.referencePrice.lowest)} –{' '}
                  {formatVnd(result.referencePrice.highest)}, thường khoảng{' '}
                  <strong className="text-text">{formatVnd(result.referencePrice.median)}</strong>.
                </span>
                <Button
                  label="Dùng giá này"
                  size="sm"
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => onUsePrice(result.referencePrice!.median)}
                />
              </li>
            ) : result.categoryId !== null ? (
              <li className="text-muted">Chưa đủ món cùng danh mục để gợi ý giá.</li>
            ) : null}
          </ul>
        </AiHint>
      ) : null}
    </div>
  );
}

/**
 * AIP-01: a draft description for the dish. It only lands in the form when the vendor presses
 * "Dùng mô tả này", and when the vendor has already written something the button says it will replace it.
 */
export function DishDescriptionAssist({
  name,
  imageUrl,
  hasDescription,
  onUse,
}: {
  name: string;
  imageUrl: string | null;
  hasDescription: boolean;
  onUse: (description: string) => void;
}) {
  const [result, setResult] = useState<DishDescriptionSuggestion | null>(null);
  const suggest = useMutation({
    mutationFn: () => aiApi.dishDescription(name.trim(), imageUrl),
    onSuccess: setResult,
  });
  const ready = name.trim().length >= 2;

  return (
    <div className="flex flex-col gap-xs">
      <Button
        label="Gợi ý mô tả bằng AI"
        variant="outline"
        size="sm"
        fullWidth={false}
        icon={<Icon name="creation" size={16} color="currentColor" weight="fill" />}
        disabled={!ready}
        loading={suggest.isPending}
        onPress={() => {
          setResult(null);
          suggest.mutate();
        }}
      />
      {!ready ? <p className="text-body-sm text-muted">Nhập tên món để nhận gợi ý.</p> : null}
      {suggest.isError ? (
        <p role="alert" className="text-body-sm font-medium text-error">
          {errorMessage(suggest.error)} Bạn vẫn có thể tự viết mô tả.
        </p>
      ) : null}
      {result && !result.description ? (
        <p role="status" className="text-body-sm text-muted">
          {result.message}
        </p>
      ) : null}
      {result?.description ? (
        <AiHint title="Mô tả gợi ý">
          <p className="text-text">{result.description}</p>
          <div className="mt-xs flex flex-wrap gap-xs">
            <Button
              label={hasDescription ? 'Thay mô tả hiện tại' : 'Dùng mô tả này'}
              size="sm"
              variant="approve"
              fullWidth={false}
              onPress={() => {
                onUse(result.description!);
                setResult(null);
              }}
            />
            <Button
              label="Bỏ qua"
              size="sm"
              variant="ghost"
              fullWidth={false}
              onPress={() => setResult(null)}
            />
          </div>
        </AiHint>
      ) : null}
    </div>
  );
}
