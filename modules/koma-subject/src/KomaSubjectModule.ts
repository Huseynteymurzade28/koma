import { requireOptionalNativeModule } from 'expo';

type KomaSubjectModule = {
  // Writes a grey PNG mask of the photo's subject (white = subject) to `output`.
  segment(input: string, output: string): Promise<void>;
};

// Android only, and only in builds that include the module: null everywhere else.
export default requireOptionalNativeModule<KomaSubjectModule>('KomaSubject');
