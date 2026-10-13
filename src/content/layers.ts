/**
 * 1.4.0: every reset layer in order, from the Stardust run (layer 0) to the tenth reset, and what counts
 * them. A layer you've passed runs itself (systems/layerAuto): one layer up its reset, tree and
 * constants (everything but its last few things), two layers up all of it. IDs never change.
 */
export const LAYER_IDS = ['stardust', 'supernova', 'nebula', 'singularity', 'galactic', 'crunch', 'multiverse', 'hyperverse', 'omniverse', 'genesis', 'apotheosis'] as const;
export type LayerId = (typeof LAYER_IDS)[number];

/** The layers that can run themselves: all but the last (nothing is above it). */
export const AUTO_LAYERS = LAYER_IDS.slice(0, -1) as readonly Exclude<LayerId, 'apotheosis'>[];
export type AutoLayer = (typeof AUTO_LAYERS)[number];

export const layerIndex = (id: string): number => LAYER_IDS.indexOf(id as LayerId);

/** The stat that counts each layer's resets in this run of the layer above, and over all time. */
export const LAYER_COUNTERS: Readonly<Record<string, { run: string; all: string }>> = {
  supernova: { run: 'supernovas', all: 'supernovasAll' },
  nebula: { run: 'nebulas', all: 'nebulasAll' },
  singularity: { run: 'singularities', all: 'singularitiesAll' },
  galactic: { run: 'galactics', all: 'galacticsAll' },
  crunch: { run: 'crunches', all: 'crunchesAll' },
  multiverse: { run: 'multiverses', all: 'multiversesAll' },
  hyperverse: { run: 'hyperverses', all: 'hyperversesAll' },
  omniverse: { run: 'omniverses', all: 'omniversesAll' },
  genesis: { run: 'geneses', all: 'genesesAll' },
  apotheosis: { run: 'apotheoses', all: 'apotheosesAll' },
};

/** What each layer is called where its automation is listed. */
export const LAYER_NAMES: Readonly<Record<LayerId, string>> = {
  stardust: 'Stardust',
  supernova: 'Supernova',
  nebula: 'Nebula',
  singularity: 'Singularity',
  galactic: 'Galactic Rebirth',
  crunch: 'Big Crunch',
  multiverse: 'Multiverse',
  hyperverse: 'Hyperverse',
  omniverse: 'Omniverse',
  genesis: 'Genesis',
  apotheosis: 'Apotheosis',
};

/** Each layer's colour (the reset buttons and the rails' section titles). */
export const LAYER_COLORS: Readonly<Record<LayerId, string>> = {
  stardust: '#FFC83D',
  supernova: '#FF4FC1',
  nebula: '#2EE6FF',
  singularity: '#9B7CFF',
  galactic: '#B4F04A',
  crunch: '#FF8A3D',
  multiverse: '#FF6AD5',
  hyperverse: '#5CF2C8',
  omniverse: '#FFD86B',
  genesis: '#9DFF8A',
  apotheosis: '#FFFFFF',
};
