import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_PANELS, MAX_SHEETS } from '@/page/layouts';
import { createPage, deletePage, duplicatePage, exportFile, listPages, renamePage } from '@/page/store';
import { pickPhotos } from '@/page/photos';
import { PAGE_H, PAGE_W, type Page } from '@/page/types';
import { pageColor } from '@/page/colors';
import { getSettings, setSettings, type Settings } from '@/settings';
import { font, space, themed, usePalette } from '@/theme';
import { Button, Row, Segmented } from '@/ui/kit';

// photos a new chapter can start with; more than fit one page are spread over several
const MAX_START_PHOTOS = 12;

type Sort = Settings['librarySort'];

const SORTS: { id: Sort; label: string }[] = [
  { id: 'recent', label: 'Recent' },
  { id: 'chapter', label: 'Chapter' },
];

const sorted = (pages: Page[], sort: Sort) =>
  [...pages].sort((a, b) => (sort === 'chapter' ? a.chapter - b.chapter || a.createdAt - b.createdAt : b.updatedAt - a.updatedAt));

const nextChapter = (pages: Page[] | null) => (pages ?? []).reduce((m, p) => Math.max(m, p.chapter), 0) + 1;

export default function Library() {
  const s = useStyles();
  const color = usePalette();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [pages, setPages] = useState<Page[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [sort, setSort] = useState<Sort>(() => getSettings().librarySort);
  // the chapter whose menu is open, and its new title while renaming
  const [menu, setMenu] = useState<{ page: Page; title: string | null } | null>(null);

  useFocusEffect(
    useCallback(() => {
      listPages().then(setPages);
    }, []),
  );

  // the menu is an overlay, not a Modal, so Android back has to close it
  const open = !!menu;
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setMenu(null);
      return true;
    });
    return () => sub.remove();
  }, [open]);

  const changeSort = (next: Sort) => {
    setSort(next);
    setSettings({ librarySort: next });
  };

  const newPage = async () => {
    try {
      const uris = await pickPhotos(Math.min(MAX_START_PHOTOS, MAX_PANELS * MAX_SHEETS));
      if (uris.length === 0) return;
      setCreating(true);
      const page = await createPage(uris, nextChapter(pages));
      router.push({ pathname: '/page/[id]', params: { id: page.id } });
    } catch (e) {
      Alert.alert('Could not create the page', String((e as Error).message ?? e));
    } finally {
      setCreating(false);
    }
  };

  const replace = (page: Page) => setPages((ps) => ps?.map((p) => (p.id === page.id ? page : p)) ?? null);

  const rename = async () => {
    const title = menu?.title?.trim();
    if (!menu || !title) return;
    setMenu(null);
    replace(await renamePage(menu.page, title));
  };

  const duplicate = async (page: Page) => {
    setMenu(null);
    try {
      const copy = await duplicatePage(page, nextChapter(pages));
      setPages((ps) => [copy, ...(ps ?? [])]);
    } catch (e) {
      Alert.alert('Could not copy the chapter', String((e as Error).message ?? e));
    }
  };

  const remove = (page: Page) => {
    setMenu(null);
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
  };

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
            Pick photos from your day, or take one now.{'\n'}Koma turns them into manga pages.
          </Text>
        </View>
      ) : (
        <FlatList
          data={sorted(pages ?? [], sort)}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap }}
          ListHeaderComponent={
            pages && pages.length > 1 ? (
              <View style={s.sort}>
                <Segmented options={SORTS} value={sort} onChange={changeSort} />
              </View>
            ) : undefined
          }
          contentContainerStyle={{ paddingHorizontal: space(5), paddingBottom: 120, gap: space(6) }}
          renderItem={({ item }) => (
            <PageCard
              page={item}
              width={colW}
              onPress={() => router.push({ pathname: '/page/[id]', params: { id: item.id } })}
              onLongPress={() => setMenu({ page: item, title: null })}
            />
          )}
        />
      )}

      <View style={[s.footer, { paddingBottom: insets.bottom + space(4) }]}>
        <Button label={creating ? 'Drawing…' : 'New page'} variant="solid" onPress={newPage} disabled={creating} style={s.cta} />
      </View>

      {menu && (
        <KeyboardAvoidingView style={[StyleSheet.absoluteFill, s.modalWrap]} behavior="padding">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenu(null)} />
          <View style={[s.modal, { paddingBottom: insets.bottom + space(4) }]}>
            <Text style={s.modalTitle} numberOfLines={1}>
              Chapter {menu.page.chapter} · {menu.page.title}
            </Text>
            {menu.title === null ? (
              <>
                <Button label="Rename" onPress={() => setMenu({ ...menu, title: menu.page.title })} />
                <Button label="Duplicate" onPress={() => duplicate(menu.page)} />
                <Button label="Delete" danger onPress={() => remove(menu.page)} />
                <Button label="Cancel" variant="plain" onPress={() => setMenu(null)} />
              </>
            ) : (
              <>
                <TextInput
                  value={menu.title}
                  onChangeText={(title) => setMenu((m) => (m ? { ...m, title } : m))}
                  onSubmitEditing={rename}
                  style={s.input}
                  autoFocus
                  maxLength={60}
                  returnKeyType="done"
                  placeholder="Chapter title"
                  placeholderTextColor={color.muted}
                  selectionColor={color.ink}
                />
                <Row>
                  <Button label="Cancel" onPress={() => setMenu(null)} style={s.flex} />
                  <Button label="Save" variant="solid" onPress={rename} disabled={!menu.title.trim()} style={s.flex} />
                </Row>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

function PageCard({ page, width, onPress, onLongPress }: { page: Page; width: number; onPress: () => void; onLongPress: () => void }) {
  const s = useStyles();
  const n = page.sheets.length;
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
        {n > 1 ? ` · ${n} pages` : ''}
      </Text>
      <Text style={s.cardTitle} numberOfLines={1}>
        {page.title}
      </Text>
    </Pressable>
  );
}

const useStyles = themed((color) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  flex: { flex: 1 },
  header: { paddingHorizontal: space(5), paddingBottom: space(6) },
  wordmark: { fontFamily: font.display, fontSize: 44, color: color.ink, letterSpacing: 1 },
  tagline: { fontFamily: font.regular, fontSize: 14, color: color.muted, marginTop: -2 },
  sort: { alignSelf: 'flex-start', width: 200 },

  empty: { flex: 1, justifyContent: 'center', paddingHorizontal: space(10), paddingBottom: 120 },
  emptyTitle: { fontFamily: font.semibold, fontSize: 18, color: color.ink, marginBottom: space(2) },
  emptyBody: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: color.muted },

  thumb: {
    backgroundColor: pageColor.sheet,
    borderWidth: 1,
    borderColor: color.line,
    justifyContent: 'center',
    padding: space(3),
    overflow: 'hidden',
  },
  thumbTitle: { fontFamily: font.display, fontSize: 22, color: pageColor.ink, textAlign: 'center' },
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

  modalWrap: { justifyContent: 'flex-end', backgroundColor: color.scrim },
  modal: { backgroundColor: color.paper, padding: space(4), gap: space(3) },
  modalTitle: { fontFamily: font.semibold, fontSize: 15, color: color.ink, marginBottom: space(1) },
  input: {
    fontFamily: font.regular,
    fontSize: 18,
    color: color.ink,
    borderWidth: 1,
    borderColor: color.ink,
    padding: space(3),
  },
}));
