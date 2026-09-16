import { useState } from 'react';

import { Button, Card, IconButton } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { colors } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function CategoriesScreen() {
  const categories = useMockDb((s) => s.foodCategories);
  const addCategory = useMockDb((s) => s.addFoodCategory);
  const removeCategory = useMockDb((s) => s.removeFoodCategory);
  const [name, setName] = useState('');

  return (
    <Screen>
      <AppHeader title="Danh mục món ăn" />
      <div className="flex items-end gap-sm">
        <div className="flex-1">
          <TextField
            label="Danh mục mới"
            value={name}
            onChangeText={setName}
            placeholder="VD: Bánh tráng trộn"
          />
        </div>
        <Button
          label="Thêm"
          fullWidth={false}
          disabled={!name.trim()}
          onPress={() => {
            addCategory(name.trim());
            setName('');
          }}
        />
      </div>
      {categories.map((c) => (
        <Card key={c.id}>
          <div className="flex items-center justify-between">
            <div>
              <span className="block text-headline-sm text-text">{c.name}</span>
              <span className="block text-body-sm text-muted">{c.itemCount} món</span>
            </div>
            <IconButton
              icon="trash-can-outline"
              accessibilityLabel="Xoá danh mục"
              color={colors.error}
              onPress={() => removeCategory(c.id)}
            />
          </div>
        </Card>
      ))}
    </Screen>
  );
}
