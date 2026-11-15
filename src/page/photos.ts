import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const QUALITY = 0.9;

async function fromLibrary(limit: number): Promise<string[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    orderedSelection: true,
    quality: QUALITY,
  });
  return res.canceled ? [] : res.assets.slice(0, limit).map((a) => a.uri);
}

async function fromCamera(): Promise<string[]> {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) throw new Error('Koma needs permission to use the camera.');
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: QUALITY });
  return res.canceled ? [] : res.assets.slice(0, 1).map((a) => a.uri);
}

// Asks where the photos should come from, then returns their uris.
// Resolves to an empty list when the user backs out at any step.
export function pickPhotos(limit = 1): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const run = (source: () => Promise<string[]>) => () => source().then(resolve, reject);
    Alert.alert(
      limit > 1 ? 'Add photos' : 'Add a photo',
      undefined,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve([]) },
        { text: 'Take photo', onPress: run(fromCamera) },
        { text: limit > 1 ? 'Choose photos' : 'Choose photo', onPress: run(() => fromLibrary(limit)) },
      ],
      { cancelable: true, onDismiss: () => resolve([]) },
    );
  });
}
