/**
 * The Element Codex: all 118 elements (Game design: "Element Codex"). Each Supernova grants samples
 * of every element the star could fuse at the tier it reached (BALANCE.codex.tierMaxZ). Each family
 * gives one perk, a few elements have their own, and a completed row of the table gives x1.5.
 * IDs (the symbol in lower case) never change.
 */
export type Family = 'nonmetal' | 'noble' | 'alkali' | 'alkaline' | 'transition' | 'post' | 'metalloid' | 'halogen' | 'lanthanide' | 'actinide';

export interface ElementDef {
  id: string;
  z: number;
  symbol: string;
  name: string;
  family: Family;
  /** Row of the table (period 1 to 7). Lanthanides count as row 6, actinides as row 7. */
  period: number;
  /** Where it's drawn: grid row 1 to 7, or 9 and 10 for the lanthanide and actinide rows; column 1 to 18. */
  row: number;
  col: number;
}

const F: Record<string, Family> = { n: 'nonmetal', g: 'noble', a: 'alkali', e: 'alkaline', t: 'transition', p: 'post', m: 'metalloid', h: 'halogen', l: 'lanthanide', c: 'actinide' };

// symbol, name, family code; in order of atomic number
const RAW = `H Hydrogen n|He Helium g|Li Lithium a|Be Beryllium e|B Boron m|C Carbon n|N Nitrogen n|O Oxygen n|F Fluorine h|Ne Neon g|
Na Sodium a|Mg Magnesium e|Al Aluminium p|Si Silicon m|P Phosphorus n|S Sulfur n|Cl Chlorine h|Ar Argon g|
K Potassium a|Ca Calcium e|Sc Scandium t|Ti Titanium t|V Vanadium t|Cr Chromium t|Mn Manganese t|Fe Iron t|Co Cobalt t|Ni Nickel t|Cu Copper t|Zn Zinc t|Ga Gallium p|Ge Germanium m|As Arsenic m|Se Selenium n|Br Bromine h|Kr Krypton g|
Rb Rubidium a|Sr Strontium e|Y Yttrium t|Zr Zirconium t|Nb Niobium t|Mo Molybdenum t|Tc Technetium t|Ru Ruthenium t|Rh Rhodium t|Pd Palladium t|Ag Silver t|Cd Cadmium t|In Indium p|Sn Tin p|Sb Antimony m|Te Tellurium m|I Iodine h|Xe Xenon g|
Cs Caesium a|Ba Barium e|La Lanthanum l|Ce Cerium l|Pr Praseodymium l|Nd Neodymium l|Pm Promethium l|Sm Samarium l|Eu Europium l|Gd Gadolinium l|Tb Terbium l|Dy Dysprosium l|Ho Holmium l|Er Erbium l|Tm Thulium l|Yb Ytterbium l|Lu Lutetium l|Hf Hafnium t|Ta Tantalum t|W Tungsten t|Re Rhenium t|Os Osmium t|Ir Iridium t|Pt Platinum t|Au Gold t|Hg Mercury t|Tl Thallium p|Pb Lead p|Bi Bismuth p|Po Polonium p|At Astatine h|Rn Radon g|
Fr Francium a|Ra Radium e|Ac Actinium c|Th Thorium c|Pa Protactinium c|U Uranium c|Np Neptunium c|Pu Plutonium c|Am Americium c|Cm Curium c|Bk Berkelium c|Cf Californium c|Es Einsteinium c|Fm Fermium c|Md Mendelevium c|No Nobelium c|Lr Lawrencium c|Rf Rutherfordium t|Db Dubnium t|Sg Seaborgium t|Bh Bohrium t|Hs Hassium t|Mt Meitnerium t|Ds Darmstadtium t|Rg Roentgenium t|Cn Copernicium t|Nh Nihonium p|Fl Flerovium p|Mc Moscovium p|Lv Livermorium p|Ts Tennessine h|Og Oganesson g`;

/** Period and drawn position from the atomic number (the standard 18-column layout). */
function place(z: number): { period: number; row: number; col: number } {
  if (z <= 2) return { period: 1, row: 1, col: z === 1 ? 1 : 18 };
  if (z <= 18) {
    const period = z <= 10 ? 2 : 3;
    const i = z - (period === 2 ? 2 : 10); // 1..8 across the row
    return { period, row: period, col: i <= 2 ? i : i + 10 };
  }
  if (z <= 54) {
    const period = z <= 36 ? 4 : 5;
    return { period, row: period, col: z - (period === 4 ? 18 : 36) };
  }
  const period = z <= 86 ? 6 : 7;
  const start = period === 6 ? 54 : 86;
  const i = z - start; // 1..32
  if (i <= 2) return { period, row: period, col: i };
  if (i <= 17) return { period, row: period + 3, col: i }; // the f-block rows: cols 3..17
  return { period, row: period, col: i - 14 };
}

export const ELEMENTS: readonly ElementDef[] = RAW.split(/\|\s*/)
  .map((part) => part.trim())
  .filter(Boolean)
  .map((part, i) => {
    const [symbol, name, code] = part.split(' ') as [string, string, string];
    return { id: symbol.toLowerCase(), z: i + 1, symbol, name, family: F[code]!, ...place(i + 1) };
  });

export const ELEMENT_BY_ID: ReadonlyMap<string, ElementDef> = new Map(ELEMENTS.map((e) => [e.id, e]));

export const FAMILY_NAMES: Record<Family, string> = {
  nonmetal: 'Nonmetals',
  noble: 'Noble gases',
  alkali: 'Alkali metals',
  alkaline: 'Alkaline earths',
  transition: 'Transition metals',
  post: 'Post-transition metals',
  metalloid: 'Metalloids',
  halogen: 'Halogens',
  lanthanide: 'Lanthanides',
  actinide: 'Actinides',
};

export const FAMILY_COLORS: Record<Family, string> = {
  nonmetal: '#4FB6FF',
  noble: '#B06BFF',
  alkali: '#FF7A2E',
  alkaline: '#FFC83D',
  transition: '#8C97C2',
  post: '#5FD39B',
  metalloid: '#2EE6FF',
  halogen: '#FF4FC1',
  lanthanide: '#C2D63A',
  actinide: '#FF5640',
};

/** Elements with a perk of their own, on top of their family's. */
export const SPECIAL_PERKS: Record<string, string> = {
  he: 'Every engine gets one more x2 milestone, at 1,250 owned.',
  fe: 'One more relic slot.',
  au: 'Gold alloy x2.',
  u: 'Shard gain +10% per level.',
};
