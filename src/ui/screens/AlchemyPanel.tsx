import { useState } from 'react';
import { alchemyReport } from '../../app/alchemyReports';
import { commands } from '../../app/commands';
import { RECIPE_BY_ID } from '../../content/alchemy';
import { BuyAmountControl } from '../kit/BuyAmountControl';
import { Button, cx, tint } from '../kit/Chunk';
import { Icon } from '../kit/Icon';
import { Panel } from '../kit/Panel';
import { useReport } from '../kit/useReport';

/** Phase 20.2: Starlight Alchemy, a cauldron of three slots, the Recipe Book and the shelf. */

const TEAL = '#1E8F7A';

const HINTS = [
  'None of these belong to a recipe you haven’t found.',
  'One of these belongs to a recipe you haven’t found.',
  'Two of these belong together in a recipe you haven’t found.',
  'All three belong to recipes you haven’t found, just not together.',
];

export function AlchemyPanel() {
  const [slots, setSlots] = useState<string[]>([]);
  const [message, setMessage] = useState<{ text: string; good: boolean } | null>(null);
  // useReport keeps the builder it opened with, so it only paces the refresh here; the read-out is
  // built each render so the cauldron's slots are never stale (12 recipes and 8 ingredients: cheap)
  useReport('alchemy', () => performance.now(), 300);
  const data = alchemyReport(slots);
  const add = (id: string) => setSlots((s) => (s.length < 3 ? [...s, id] : s));
  const removeAt = (i: number) => setSlots((s) => s.filter((_, k) => k !== i));
  const brew = () => {
    const res = commands.brew(slots);
    if (!res) return;
    if (res.kind === 'elixir') {
      const name = RECIPE_BY_ID.get(res.recipe)!.name;
      setMessage({ text: res.first ? `New recipe: ${name}! It's in your Recipe Book.` : `You brewed ${name}.`, good: true });
    } else {
      setMessage({ text: `Murky Sludge. ${HINTS[res.hint] ?? HINTS[3]}${res.again ? ' (You tried this mix before.)' : ''}`, good: false });
    }
    setSlots([]);
  };
  return (
    <Panel id="alchemy" title="Starlight Alchemy" color={TEAL} size="wide">
      {!data.open ? (
        <p className="depth-locked">
          <Icon name="lock" /> The cauldron opens at {data.req}.
        </p>
      ) : (
        <>
          <p className="mv-note">
            Put three ingredients in the cauldron. A mix that matches a recipe makes an elixir and writes the recipe in your book; any other mix makes Murky Sludge and a hint. Each dose takes a twentieth of what you hold. Stuck? Press Hint on a recipe in the book to see one of its ingredients.
          </p>
          <div className="alc-cols">
            <div className="well alc-cauldron">
              <h4>The cauldron</h4>
              <div className="alc-slots">
                {[0, 1, 2].map((i) => {
                  const id = slots[i];
                  const ing = data.ingredients.find((x) => x.id === id);
                  return (
                    <button key={i} type="button" className={cx('alc-slot chunk', !ing && 'empty')} style={tint(ing?.color ?? '#3B4370')} onClick={() => ing && removeAt(i)} aria-label={ing ? `Take ${ing.name} out` : 'Empty slot'} data-slot={i}>
                      {ing ? ing.name : '+'}
                    </button>
                  );
                })}
              </div>
              {slots.length === 3 && (
                <p className="alc-cost">
                  {data.knownMix ? <b>{data.knownMix}. </b> : data.tried ? <b>Tried before. </b> : null}
                  Takes {data.cost}.
                </p>
              )}
              <Button size="lg" color={TEAL} disabled={!data.canBrew} onClick={brew} data-testid="brew">
                Brew
              </Button>
              {message && (
                <p className={cx('alc-msg', message.good ? 'good' : 'bad')} role="status">
                  {message.text}
                </p>
              )}
            </div>
            <div className="well alc-ings">
              <h4>Ingredients</h4>
              <div className="alc-grid">
                {data.ingredients.map((i) => (
                  <button key={i.id} type="button" className="alc-ing chunk pop" style={tint(i.color)} disabled={slots.length >= 3 || !i.can} onClick={() => add(i.id)} data-ingredient={i.id}>
                    <b>{i.name}</b>
                    <span className="num">{i.held}</span>
                    <small>dose {i.dose}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <h4 className="section-h">
            Recipe Book ({data.found} of {data.recipes.length})
          </h4>
          <BuyAmountControl />
          <div className="alc-book">
            {data.recipes.map((rec) => (
              <div key={rec.id} className={cx('alc-recipe well', !rec.known && 'unknown')} style={{ ['--c' as string]: rec.color }} data-recipe={rec.id}>
                <span className="alc-flask" aria-hidden="true" />
                <div className="alc-text">
                  <b>{rec.name}</b>
                  <span>{rec.desc}</span>
                  {rec.known && <small>{rec.mix.join(' + ')}</small>}
                  {!rec.known && rec.hintText && <small className="alc-hint">{rec.hintText}</small>}
                  {rec.known && (
                    <small className="alc-batch">
                      x{rec.batch} takes {rec.batchCost}
                    </small>
                  )}
                </div>
                {!rec.known && (
                  <div className="alc-actions">
                    {rec.hintMix.length === 3 ? (
                      <Button size="sm" color={TEAL} onClick={() => setSlots(rec.hintMix)} data-hint-fill={rec.id}>
                        Put it in the cauldron
                      </Button>
                    ) : (
                      <Button size="sm" color="#2E9C78" onClick={() => commands.hintRecipe(rec.id)} data-hint={rec.id}>
                        Hint
                      </Button>
                    )}
                  </div>
                )}
                {rec.known && (
                  <div className="alc-actions">
                    <span className="num alc-shelf">x{rec.shelf}</span>
                    {rec.left && <span className="alc-left num">{rec.left}</span>}
                    <Button size="sm" color={rec.color} disabled={rec.shelf < 1} onClick={() => commands.drink(rec.id)} data-drink={rec.id}>
                      Drink
                    </Button>
                    <Button size="sm" color={TEAL} disabled={!rec.canBatch} onClick={() => commands.brew(RECIPE_BY_ID.get(rec.id)!.mix.slice(), rec.batch)} data-brew={rec.id}>
                      Brew x{rec.batch}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {data.triedCount > 0 && <p className="mv-note">Mixes tried that made sludge: {data.triedCount}.</p>}
        </>
      )}
    </Panel>
  );
}
