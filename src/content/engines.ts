/**
 * The 30 Stardust engines (Math and balance tab, "Stardust layer numbers"; 16 to 30 arrived in 1.2.0).
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
  { id: 'magnetar', name: 'Magnetar Coil', baseCost: 3.25e18, baseProd: 3.75e11, color: '#C23FA0', icon: 'pulsar+magnet', blurb: 'Winds the fury of a magnetar into a spring.' },
  { id: 'press', name: 'Neutron Press', baseCost: 7.5e19, baseProd: 2.5e12, color: '#4A6FC4', icon: 'atom+hand', blurb: 'Squeezes neutron stars until they shine.' },
  { id: 'reef', name: 'Plasma Reef', baseCost: 1.6e21, baseProd: 1.7e13, color: '#2EC4A8', icon: 'nebula+drop', blurb: 'A living reef of plasma that grows stardust.' },
  { id: 'wellpump', name: 'Gravity Well Pump', baseCost: 3.5e22, baseProd: 1.2e14, color: '#3A2470', icon: 'blackhole+arrowup', blurb: 'Pumps light up out of a gravity well.' },
  { id: 'crown', name: 'Corona Crown', baseCost: 7.5e23, baseProd: 8e14, color: '#FF9A3D', icon: 'giant+coin', blurb: 'A ring of fire worn by a giant star.' },
  { id: 'hatchery', name: 'Comet Hatchery', baseCost: 1.7e25, baseProd: 5.5e15, color: '#1A9DB8', icon: 'comet+plus', blurb: 'Raises comets from tiny ice eggs.' },
  { id: 'reservoir', name: 'Starlight Reservoir', baseCost: 3.75e26, baseProd: 3.75e16, color: '#FFC83D', icon: 'stardust+drop', blurb: 'A lake of saved-up starlight.' },
  { id: 'novaforge', name: 'Nova Furnace', baseCost: 8e27, baseProd: 2.5e17, color: '#FF4FC1', icon: 'shard+flame', blurb: 'Runs on little supernovas, one a second.' },
  { id: 'dmmill', name: 'Dark Matter Mill', baseCost: 1.8e29, baseProd: 1.7e18, color: '#6B4BC8', icon: 'darkmatter+gear', blurb: 'Grinds the unseen into the bright.' },
  { id: 'wormtap', name: 'Wormhole Tap', baseCost: 4e30, baseProd: 1.2e19, color: '#2B7FD0', icon: 'wormhole+drop', blurb: 'Siphons stardust from another sky.' },
  { id: 'spinner', name: 'Galaxy Spinner', baseCost: 9e31, baseProd: 8e19, color: '#3F7A12', icon: 'galaxy+swirl', blurb: 'Spins a whole galaxy like a top.' },
  { id: 'harp', name: 'Cosmic String Harp', baseCost: 1.9e33, baseProd: 5.5e20, color: '#B06BFF', icon: 'loom+note', blurb: 'Plucks the strings the universe is tied with.' },
  { id: 'crystal', name: 'Time Crystal Lattice', baseCost: 4.25e34, baseProd: 3.75e21, color: '#9FE7FF', icon: 'prism+clock', blurb: 'A crystal that ticks in every direction at once.' },
  { id: 'kiln', name: 'Big Bang Kiln', baseCost: 9.5e35, baseProd: 2.5e22, color: '#FF5640', icon: 'crunch+flame', blurb: 'Fires a tiny universe and keeps the heat.' },
  { id: 'infinity', name: 'Infinity Engine', baseCost: 2e37, baseProd: 1.7e23, color: '#7B3FD6', icon: 'multiverse+bolt', blurb: 'It never stops, and it never stops getting faster.' },
];

export const ENGINE_BY_ID: ReadonlyMap<string, EngineDef> = new Map(ENGINES.map((e) => [e.id, e]));
