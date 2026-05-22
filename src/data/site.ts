export const site = {
  name: 'SADA AG',
  legalName: 'SADA AG',
  shortName: 'SADA',
  tagline: 'Dachdecker in Zürich seit 1907',
  url: 'https://www.sada.ch',
  founded: 1907,
  employees: 160,
  parentGroup: {
    name: 'Burkhalter Gruppe',
    employees: 4600,
    apprentices: 900,
  },
  contact: {
    phone: '+41 44 297 97 97',
    phoneHref: 'tel:+41442979797',
    phoneFormatted: '044 297 97 97',
    whatsapp: '+41442979797',
    whatsappHref: 'https://wa.me/41442979797',
    email: 'info@sada.ch',
    emailHref: 'mailto:info@sada.ch',
  },
  address: {
    street: 'Vega-Strasse 3',
    zip: '8152',
    city: 'Glattpark (Opfikon)',
    canton: 'ZH',
    country: 'CH',
    full: 'Vega-Strasse 3, 8152 Glattpark (Opfikon)',
    googleMapsUrl:
      'https://www.google.com/maps/place/Vega-Strasse+3,+8152+Glattpark+(Opfikon)',
  },
  hours: {
    weekdays: 'Mo-Fr 7:00-17:00',
    weekdaysShort: 'Mo-Fr 7-17 Uhr',
    emergency: '24/7 Notdienst',
  },
  serviceRegion: 'Kanton Zürich',
  social: {
    linkedin: 'https://ch.linkedin.com/company/sada-ag',
  },
} as const;

export const trustFacts = [
  { label: 'Gegründet', value: '1907', meta: 'als Dachdecker-Genossenschaft' },
  { label: 'Mitarbeitende', value: '160', meta: 'in Glattpark Opfikon' },
  { label: 'Konzern', value: 'Burkhalter Gruppe', meta: '4600 Profis schweizweit' },
  { label: 'Notdienst', value: '24/7', meta: 'rund um die Uhr erreichbar' },
] as const;
