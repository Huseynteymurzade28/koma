import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_PANELS } from '@/page/layouts';
import { createPage, deletePage, exportFile, listPages } from '@/page/store';
import { PAGE_H, PAGE_W, type Page } from '@/page/types';
import { color, font, space } from '@/theme';
import { Button } from '@/ui/kit';

export default function Library() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [pages, setPages] = useState<Page[] | null>(null);
  const [creating, setCreating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      listPages().then(setPages);
    }, []),
  );

  const newPage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PANELS,
      orderedSelection: true,
      quality: 0.9,
    });
    if (res.canceled || res.assets.length === 0) return;
    setCreating(true);
    try {
      const chapter = (pages ?? []).reduce((m, p) => Math.max(m, p.chapter), 0) + 1;
      const page = await createPage(res.assets.slice(0, MAX_PANELS).map((a) => a.uri), chapter);
      router.push({ pathname: '/page/[id]', params: { id: page.id } });
    } catch (e) {
      Alert.alert('Could not create the page', String((e as Error).message ?? e));
    } finally {
      setCreating(false);
    }
  };

  const remove = (page: Page) =>
    Alert.alert(`Delete chapter ${page.chapter}?`, page.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deletePage(page.id);
          setPages((ps) => ps?.filter((p) => p.id !== page.id) ?? null);
        },
      },
    ]);

  const gap = space(4);
  const colW = (width - space(5) * 2 - gap) / 2;

  return (
    <View style={[s.screen, { paddingTop: insets.top + space(4) }]}>
      <View style={s.header}>
        <Text style={s.wordmark}>KOMA</Text>
        <Text style={s.tagline}>Your days, drawn as manga.</Text>
      </View>

      {pages && pages.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No chapters yet.</Text>
          <Text style={s.emptyBody}>
            Pick up to four photos from your day.{'\n'}Koma turns them into a manga page.
          </Text>
        </View>
      ) : (
        <FlatList
          data={pages ?? []}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap }}
          contentContainerStyle={{ paddingHorizontal: space(5), paddingBottom: 120, gap: space(6) }}
          renderItem={({ item }) => (
            <PageCard page={item} width={colW} onPress={() => router.push({ pathname: '/page/[id]', params: { id: item.id } })} onLongPress={() => remove(item)} />
          )}
        />
      )}

      <View style={[s.footer, { paddingBottom: insets.bottom + space(4) }]}>
        <Button label={creating ? 'Drawing…' : 'New page'} variant="solid" onPress={newPage} disabled={creating} style={s.cta} />
      </View>
    </View>
  );
}

function PageCard({ page, width, onPress, onLongPress }: { page: Page; width: number; onPress: () => void; onLongPress: () => void }) {
  const thumb = exportFile(page.id);
  const h = (width * PAGE_H) / PAGE_W;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [{ width }, pressed && { opacity: 0.6 }]}>
      <View style={[s.thumb, { height: h }]}>
        {thumb.exists ? (
          <Image source={{ uri: `${thumb.uri}?v=${page.updatedAt}` }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <Text style={s.thumbTitle} numberOfLines={3}>
            {page.title.toUpperCase()}
          </Text>
        )}
      </View>
      <Text style={s.meta}>
        Ch. {page.chapter} · {new Date(page.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </Text>
      <Text style={s.cardTitle} numberOfLines={1}>
        {page.title}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  header: { paddingHorizontal: space(5), paddingBottom: space(6) },
  wordmark: { fontFamily: font.display, fontSize: 44, color: color.ink, letterSpacing: 1 },
  tagline: { fontFamily: font.regular, fontSize: 14, color: color.muted, marginTop: -2 },

  empty: { flex: 1, justifyContent: 'center', paddingHorizontal: space(10), paddingBottom: 120 },
  emptyTitle: { fontFamily: font.semibold, fontSize: 18, color: color.ink, marginBottom: space(2) },
  emptyBody: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.muted },

  thumb: {
    backgroundColor: color.sheet,
    borderWidth: 1,
    borderColor: color.line,
    justifyContent: 'center',
    padding: space(3),
    overflow: 'hidden',
  },
  thumbTitle: { fontFamily: font.display, fontSize: 22, color: color.ink, textAlign: 'center' },
  meta: { fontFamily: font.regular, fontSize: 12, color: color.muted, marginTop: space(2) },
  cardTitle: { fontFamily: font.medium, fontSize: 14, color: color.ink, marginTop: 2 },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space(5),
    paddingTop: space(3),
    backgroundColor: color.paper,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
  cta: { height: 52 },
});
