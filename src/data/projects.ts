import { beforeAfterImages } from './images';

export type Project = {
  slug: string;
  title: string;
  city: string;
  scope: string;
  duration: string;
  category: 'steildach' | 'flachdach' | 'metalldach' | 'spenglerei' | 'solar' | 'begruenung';
  before: string;
  after: string;
};

export const projects: Project[] = [
  {
    slug: 'efh-wallisellen-steildach',
    title: 'Steildach-Sanierung Einfamilienhaus',
    city: 'Wallisellen',
    scope: 'Komplette Neueindeckung mit anthrazitfarbenen Betondachsteinen, neue Spenglerarbeiten, Dämmung erneuert.',
    duration: '12 Werktage',
    category: 'steildach',
    before: beforeAfterImages.ba1Before,
    after: beforeAfterImages.ba1After,
  },
  {
    slug: 'mfh-glattpark-flachdach',
    title: 'Flachdach-Sanierung mit Begrünung',
    city: 'Glattpark (Opfikon)',
    scope: 'Neue Bitumenabdichtung, extensive Sedum-Begrünung, Blitzschutz erneuert, Notüberläufe ergänzt.',
    duration: '18 Werktage',
    category: 'flachdach',
    before: beforeAfterImages.ba2Before,
    after: beforeAfterImages.ba2After,
  },
  {
    slug: 'bauernhaus-bassersdorf-metalldach',
    title: 'Metalldach-Erneuerung Bauernhaus',
    city: 'Bassersdorf',
    scope: 'Doppelfalz Zink-Eindeckung in matt anthrazit, Spengleranschlüsse Kamin, Verblechungen rundherum.',
    duration: '9 Werktage',
    category: 'metalldach',
    before: beforeAfterImages.ba3Before,
    after: beforeAfterImages.ba3After,
  },
];
