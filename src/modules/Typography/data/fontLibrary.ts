// src/modules/Typography/data/fontLibrary.ts

const BASE_URL = 'https://raw.githack.com/mrdoob/three.js/master/examples/fonts';

export const FONT_LIBRARY = [
    { name: 'Helvetiker (Reg)', category: 'Standard', googleFont: 'Roboto', url: `${BASE_URL}/helvetiker_regular.typeface.json` },
    { name: 'Helvetiker (Bold)', category: 'Standard', googleFont: 'Roboto', url: `${BASE_URL}/helvetiker_bold.typeface.json` },
    { name: 'Optimer (Reg)', category: 'Elegant', googleFont: 'Optima', url: `${BASE_URL}/optimer_regular.typeface.json` },
    { name: 'Optimer (Bold)', category: 'Elegant', googleFont: 'Optima', url: `${BASE_URL}/optimer_bold.typeface.json` },
    { name: 'Gentilis (Reg)', category: 'Modern', googleFont: 'Open Sans', url: `${BASE_URL}/gentilis_regular.typeface.json` },
    { name: 'Gentilis (Bold)', category: 'Modern', googleFont: 'Open Sans', url: `${BASE_URL}/gentilis_bold.typeface.json` },
    { name: 'Droid Sans (Reg)', category: 'Tech', googleFont: 'Lato', url: `${BASE_URL}/droid/droid_sans_regular.typeface.json` },
    { name: 'Droid Sans (Bold)', category: 'Tech', googleFont: 'Lato', url: `${BASE_URL}/droid/droid_sans_bold.typeface.json` },
    { name: 'Droid Mono', category: 'Code', googleFont: 'Roboto Mono', url: `${BASE_URL}/droid/droid_sans_mono_regular.typeface.json` },
    { name: 'Droid Serif (Reg)', category: 'Serif', googleFont: 'Merriweather', url: `${BASE_URL}/droid/droid_serif_regular.typeface.json` },
    { name: 'Droid Serif (Bold)', category: 'Serif', googleFont: 'Merriweather', url: `${BASE_URL}/droid/droid_serif_bold.typeface.json` },
];