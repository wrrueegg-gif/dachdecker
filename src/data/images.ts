// Higgsfield-generierte Bilder als CDN-URLs.
// Beim Deploy: in /public/img/ kopieren und Pfade hier durch lokale ersetzen.

const HF =
  'https://d8j0ntlcm91z4.cloudfront.net/user_3DDXb2XXb22iTA632oCV4ZKM1Kd';

export const heroImage = `${HF}/hf_20260522_112617_40fbea47-d679-452f-b200-432bdde10be7_min.webp`;
export const ctaImage = `${HF}/hf_20260522_114159_cfc567f1-5516-454f-9577-44e6d6c20e19_min.webp`;

export const beforeAfterImages = {
  // Projekt 1: Steildach-Sanierung Wallisellen
  ba1Before: `${HF}/hf_20260522_114139_b5da5b28-b9a2-47ce-bee5-55e3a6a9df19_min.webp`,
  ba1After: `${HF}/hf_20260522_114151_aa2cc2fa-45e0-4c14-b565-439b9fafc630_min.webp`,
  // Projekt 2: Flachdach + Begrünung Glattpark
  ba2Before: `${HF}/hf_20260522_114744_fe52aa93-7b3f-4b98-8489-be85ce495766_min.webp`,
  ba2After: `${HF}/hf_20260522_114747_eeee4175-ed55-437a-849d-dce5a3bd7e29_min.webp`,
  // Projekt 3: Bauernhaus Metalldach Bassersdorf
  ba3Before: `${HF}/hf_20260522_114751_e3f9976a-e07c-4225-b458-6df89ba38e8b_min.webp`,
  ba3After: `${HF}/hf_20260522_114754_e0ef191e-f524-4380-b1df-67617203263b_min.webp`,
} as const;

export const reviewAvatars = {
  rev1: `${HF}/hf_20260522_114824_c25ba622-a16e-4582-a632-42f1acc39106_min.webp`,
  rev2: `${HF}/hf_20260522_114826_a3a68594-080f-4c2a-912c-25f471ac4439_min.webp`,
  rev3: `${HF}/hf_20260522_114829_c5303489-b791-4ddd-bcee-3390303092be_min.webp`,
} as const;

export const serviceImages = {
  bedachung: `${HF}/hf_20260522_114757_27f83f5d-be50-4baa-bb1c-5dc96019b9d4_min.webp`,
  spenglerei: `${HF}/hf_20260522_114800_665f94a4-c458-40fb-b9cc-2fe9ceacdafa_min.webp`,
  solar: `${HF}/hf_20260522_114803_e92393ba-cd1e-4b9a-9d70-775ebaa81e13_min.webp`,
} as const;
