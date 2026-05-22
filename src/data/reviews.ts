import { reviewAvatars } from './images';

export type Review = {
  name: string;
  city: string;
  text: string;
  avatar: string;
  rating: 5;
};

// Hinweis: Anonymisierte, plausible Kundenstimmen für die Erst-Version.
// Vor Live-Schaltung durch echte, schriftliche Kundenstimmen ersetzen.
export const reviews: Review[] = [
  {
    name: 'Reto K.',
    city: 'Wallisellen',
    text:
      'Sturmschaden am Sonntagabend, am Montag morgens war ein Team auf dem Dach. So funktioniert echter Notdienst.',
    avatar: reviewAvatars.rev1,
    rating: 5,
  },
  {
    name: 'Andrea M.',
    city: 'Zürich Oerlikon',
    text:
      'Flachdach-Sanierung mit Begrünung. Offerte war fair, Termin gehalten, Baustelle jeden Abend besenrein. Empfehlung.',
    avatar: reviewAvatars.rev2,
    rating: 5,
  },
  {
    name: 'Markus F.',
    city: 'Bassersdorf',
    text:
      'Steildach komplett neu eingedeckt inklusive Solar. Ein Ansprechpartner für beides — endlich keine zwei Handwerker mehr koordinieren.',
    avatar: reviewAvatars.rev3,
    rating: 5,
  },
];
