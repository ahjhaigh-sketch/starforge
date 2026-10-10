/**
 * The 15 Stardust engines (Math and balance tab, "Stardust layer numbers").
 * IDs never change once released; names and numbers may be retuned.
 */
export interface EngineDef {
  id: string;
  name: string;
  /** Price of the first one. */
  baseCost: number;
  /** Stardust per second each, before multipliers. */
  baseProd: number;
  /** Tile colour in the shop. */
  color: string;
  icon: string;
  blurb: string;
}

export const ENGINES: readonly EngineDef[] = [
  { id: 'mote', name: 'Spark Motes', baseCost: 15, baseProd: 0.1, color: '#C99A1E', icon: 'mote', blurb: 'Tiny sparks that circle the star and skim its light.' },
  { id: 'catcher', name: 'Comet Catcher', baseCost: 120, baseProd: 1, color: '#1A9DB8', icon: 'comet', blurb: 'A net of gravity that snags passing ice.' },
  { id: 'moonmill', name: 'Moon Mill', baseCost: 1400, baseProd: 8, color: '#6E5CC8', icon: 'moon', blurb: 'Grinds moonrock into glittering dust.' },
  { id: 'drill', name: 'Asteroid Drill', baseCost: 16_000, baseProd: 50, color: '#C2561E', icon: 'drill', blurb: 'Bores through asteroids for buried stardust.' },
  { id: 'siphon', name: 'Gas Giant Siphon', baseCost: 200_000, baseProd: 300, color: '#3E9E2A', icon: 'giant', blurb: 'Sips the storms of a striped giant.' },
  { id: 'sail', name: 'Solar Sail Array', baseCost: 2.5e6, baseProd: 1800, color: '#B08A1A', icon: 'sail', blurb: 'Wide sails that catch the star wind.' },
  { id: 'dyson', name: 'Dyson Lattice', baseCost: 33e6, baseProd: 11_000, color: '#B0701A', icon: 'dyson', blurb: 'A cage of mirrors wrapped around the light.' },
  { id: 'pulsar', name: 'Pulsar Lighthouse', baseCost: 450e6, baseProd: 70_000, color: '#5B45C2', icon: 'pulsar', blurb: 'Bottles a spinning star’s beam.' },
  { id: 'quasar', name: 'Quasar Engine', baseCost: 6.5e9, baseProd: 450_000, color: '#B23A8E', icon: 'quasar', blurb: 'Feeds on the jets of a hungry core.' },
  { id: 'choir', name: 'Celestial Choir', baseCost: 100e9, baseProd: 3e6, color: '#1E8FA8', icon: 'choir', blurb: 'Stars that sing stardust into being.' },
  { id: 'loom', name: 'Starlight Loom', baseCost: 1.6e12, baseProd: 20e6, color: '#C23F6A', icon: 'loom', blurb: 'Weaves loose starlight into thread.' },
  { id: 'turbine', name: 'Aurora Turbine', baseCost: 26e12, baseProd: 140e6, color: '#2E9C78', icon: 'turbine', blurb: 'Spun by curtains of polar light.' },
  { id: 'bellows', name: 'Nebula Bellows', baseCost: 450e12, baseProd: 1e9, color: '#2B7FD0', icon: 'bellows', blurb: 'Breathes whole clouds into the furnace.' },
  { id: 'foundry', name: 'Comet Foundry', baseCost: 8e15, baseProd: 7.5e9, color: '#D0602B', icon: 'foundry', blurb: 'Casts new comets from molten ice.' },
  { id: 'lantern', name: 'Void Lantern', baseCost: 150e15, baseProd: 55e9, color: '#6A3FC4', icon: 'lantern', blurb: 'A light that shines from the dark itself.' },
];

export const ENGINE_BY_ID: ReadonlyMap<string, EngineDef> = new Map(ENGINES.map((e) => [e.id, e]));
