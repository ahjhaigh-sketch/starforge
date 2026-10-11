/**
 * English plurals for nouns that come from data (layer names, requirement nouns), so the game
 * says "2 Singularities", "5 galaxies" and "3 Big Crunches". Only the last word changes.
 */
const IRREGULAR: Record<string, string> = { person: 'people', species: 'species' };

export function plural(noun: string, count: number): string {
  if (count === 1) return noun;
  const cut = noun.lastIndexOf(' ') + 1;
  const head = noun.slice(0, cut);
  const last = noun.slice(cut);
  const irregular = IRREGULAR[last.toLowerCase()];
  if (irregular) return head + irregular;
  if (/[^aeiou]y$/i.test(last)) return `${head}${last.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(last)) return `${head}${last}es`;
  return `${head}${last}s`;
}
