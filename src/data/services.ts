export type Service = {
  slug: string;
  title: string;
  shortTitle: string;
  category: 'bedachung' | 'spenglerei' | 'solar' | 'begruenung' | 'wartung' | 'notdienst';
  teaser: string;
  href: string;
  icon: string;
  features: string[];
};

export const services: Service[] = [
  {
    slug: 'bedachung',
    title: 'Bedachung',
    shortTitle: 'Bedachung',
    category: 'bedachung',
    teaser:
      'Flach-, Steil- und Metalldächer. Neueindeckung, Sanierung und Unterhalt aus einer Hand.',
    href: '/bedachung',
    icon: 'home',
    features: [
      'Ziegel, Eternit, Steinplatten für Steildächer',
      'Bitumen, Folie, Kies und Begrünung für Flachdächer',
      'Metalldach in Prefa, Doppelfalz, Sinus- und Trapezblech',
      'Dämmung und Abdichtung nach SIA-Norm',
    ],
  },
  {
    slug: 'spenglerei',
    title: 'Spenglerei',
    shortTitle: 'Spenglerei',
    category: 'spenglerei',
    teaser:
      'Dachrinnen, Fallrohre, Verkleidungen und Blitzschutz — präzises Schweizer Spenglerhandwerk seit 1907.',
    href: '/spenglerei',
    icon: 'pipette',
    features: [
      'Dachrinnen und Fallrohre in Kupfer, Zink oder Titanzink',
      'Verblechungen, Dachränder, Kaminverkleidungen',
      'Blitzschutz nach SEV-Norm, geprüft und zertifiziert',
      'Historische Sanierungen mit Originaltreue',
    ],
  },
  {
    slug: 'solar',
    title: 'Solaranlagen',
    shortTitle: 'Solar',
    category: 'solar',
    teaser:
      'Photovoltaik direkt vom Dachdecker — bauphysikalisch korrekt integriert, ohne Schnittstellen-Risiko.',
    href: '/solar',
    icon: 'sun',
    features: [
      'In-Dach- und Aufdach-Anlagen',
      'Indachsysteme bauphysikalisch korrekt eingebunden',
      'Ein Ansprechpartner für Dach und Solar',
      'Förderbeiträge Pronovo und Kanton Zürich vorbereitet',
    ],
  },
  {
    slug: 'dachbegruenung',
    title: 'Dachbegrünung',
    shortTitle: 'Begrünung',
    category: 'begruenung',
    teaser:
      'Extensive und intensive Dachbegrünungen — gut für Klima, Lebensdauer der Abdichtung und Wärmehaushalt.',
    href: '/dachbegruenung',
    icon: 'leaf',
    features: [
      'Extensive Sedum- und Kräuterbegrünung',
      'Intensive Dachgärten mit Bewässerung',
      'Verlängert die Lebensdauer der Abdichtung',
      'Förderprogramme Kanton Zürich kompatibel',
    ],
  },
  {
    slug: 'wartung',
    title: 'Wartung & Unterhalt',
    shortTitle: 'Wartung',
    category: 'wartung',
    teaser:
      'Regelmässige Dachkontrollen finden Probleme bevor sie teuer werden. Wartungsverträge ab 1× pro Jahr.',
    href: '/wartung',
    icon: 'wrench',
    features: [
      'Jährliche Dachinspektion mit Fotodokumentation',
      'Reinigung von Rinnen, Fallrohren und Abläufen',
      'Sofortmeldung kritischer Schwachstellen',
      'Wartungsvertrag oder Einzelauftrag',
    ],
  },
  {
    slug: 'notdienst',
    title: '24h-Notdienst',
    shortTitle: 'Notdienst',
    category: 'notdienst',
    teaser:
      'Sturm, Hagel, undicht? Wir sind rund um die Uhr erreichbar und schnellstmöglich vor Ort.',
    href: '/notdienst',
    icon: 'alert',
    features: [
      'Erreichbar 24/7 unter +41 44 297 97 97',
      'Sturm-, Hagel- und Wasserschäden',
      'Sofortmassnahmen zur Schadensbegrenzung',
      'Schriftliche Offerte für die anschliessende Reparatur',
    ],
  },
];

export const serviceBySlug = (slug: string) =>
  services.find((s) => s.slug === slug);
