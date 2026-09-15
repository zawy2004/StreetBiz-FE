import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, IconButton } from '@/components/common';
import { TextField } from '@/components/forms';
import { AppHeader, Screen } from '@/components/layout';
import { colors, spacing, typography } from '@/theme';
import { useMockDb } from '@/mocks/db';

export function CategoriesScreen() {
  const categories = useMockDb((s) => s.foodCategories);
  const addCategory = useMockDb((s) => s.addFoodCategory);
  const removeCategory = useMockDb((s) => s.removeFoodCategory);
  const [name, setName] = useState('');

  return (
    <Screen>
      <AppHeader title="Danh mục món ăn" />
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <TextField
            label="Danh mục mới"
            value={name}
            onChangeText={setName}
            placeholder="VD: Bánh tráng trộn"
          />
        </View>
        <Button
          label="Thêm"
          fullWidth={false}
          disabled={!name.trim()}
          onPress={() => {
            addCategory(name.trim());
            setName('');
          }}
        />
      </View>
      {categories.map((c) => (
        <Card key={c.id}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <View>
              <Text style={[typography.headlineSm, { color: colors.text }]}>{c.name}</Text>
              <Text style={[typography.bodySm, { color: colors.muted }]}>{c.itemCount} món</Text>
            </View>
            <IconButton
              icon="trash-can-outline"
              accessibilityLabel="Xoá danh mục"
              color={colors.error}
              onPress={() => removeCategory(c.id)}
            />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
