import { useState } from 'react';
import { commands } from '../../app/commands';
import { useSnap } from '../../app/uiSnapshot';
import type { Notation } from '../../engine/state';
import { Button } from '../kit/Chunk';
import { Panel } from '../kit/Panel';
import { useUi } from '../store';

const NOTATIONS: Array<{ v: Notation; label: string }> = [
  { v: 'suffix', label: '1.23M' },
  { v: 'scientific', label: '1.23e6' },
  { v: 'engineering', label: '12.3e5' },
];

export function SettingsPanel() {
  const notation = useSnap((s) => s.notation);
  const saveLabel = useSnap((s) => s.saveLabel);
  const reducedMotion = useSnap((s) => s.reducedMotion);
  const reduceFlashing = useSnap((s) => s.reduceFlashing);
  const toast = useUi((s) => s.pushToast);
  const [code, setCode] = useState('');
  const [wipeArmed, setWipeArmed] = useState(false);

  const exportNow = () => {
    const r = commands.exportCode();
    if (!r.ok) {
      toast({ title: 'Export failed', body: r.error, icon: 'lock' });
      return;
    }
    setCode(r.code);
    navigator.clipboard?.writeText(r.code).then(
      () => toast({ title: 'Exported', body: 'Save code copied to your clipboard.', icon: 'gear' }),
      () => toast({ title: 'Exported', body: 'Copy the save code from the box.', icon: 'gear' }),
    );
  };
  const download = () => {
    const r = commands.exportCode();
    if (!r.ok) return;
    const blob = new Blob([r.code], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `starforge-save-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importNow = () => {
    const err = commands.importCode(code);
    toast(err ? { title: 'Import failed', body: err, icon: 'lock' } : { title: 'Imported', body: 'Save loaded.', icon: 'gear' });
  };
  const loadFile = (file: File | undefined) => {
    if (!file) return;
    void file.text().then((t) => setCode(t.trim()));
  };

  return (
    <Panel id="settings" title="Settings" color="#4A4F7A" size="small">
      <div className="set-row">
        <span className="lbl">Numbers</span>
        {NOTATIONS.map((n) => (
          <Button key={n.v} size="sm" gloss={false} color={notation === n.v ? 'var(--cyan)' : '#5A5F8F'} onClick={() => commands.setNotation(n.v)} aria-pressed={notation === n.v}>
            {n.label}
          </Button>
        ))}
      </div>
      <div className="set-row">
        <span className="lbl">Motion</span>
        <Button size="sm" gloss={false} color={reducedMotion ? 'var(--cyan)' : '#5A5F8F'} onClick={() => commands.setSetting('reducedMotion', !reducedMotion)} aria-pressed={reducedMotion}>
          Reduce motion {reducedMotion ? 'on' : 'off'}
        </Button>
        <Button size="sm" gloss={false} color={reduceFlashing ? 'var(--cyan)' : '#5A5F8F'} onClick={() => commands.setSetting('reduceFlashing', !reduceFlashing)} aria-pressed={reduceFlashing}>
          Reduce flashing {reduceFlashing ? 'on' : 'off'}
        </Button>
      </div>
      <h3>Saves</h3>
      <p>{saveLabel}. The game autosaves every 15 seconds and whenever you switch tabs or close it.</p>
      <div className="set-row">
        <Button size="sm" onClick={() => commands.saveNow() && toast({ title: 'Saved', body: 'Your progress is stored in this browser.', icon: 'gear' })}>
          Save now
        </Button>
        <Button size="sm" color="var(--cyan)" onClick={exportNow}>
          Export
        </Button>
        <Button size="sm" color="var(--cyan)" onClick={download}>
          Download
        </Button>
        <Button size="sm" color="#5A5F8F" onClick={importNow} disabled={!code.trim()}>
          Import
        </Button>
        <label className="btn chunk pop sm" style={{ ['--c' as string]: '#5A5F8F' }}>
          Load file
          <input type="file" accept=".txt,text/plain" hidden onChange={(e) => loadFile(e.target.files?.[0])} />
        </label>
      </div>
      <textarea
        className="code well"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Exported save codes appear here. Paste a save code, then press Import."
        aria-label="Save code"
      />
      <p style={{ fontSize: '0.8rem' }}>Safari deletes site data after 7 days without a visit, so export a code now and then.</p>
      <div className="set-row">
        <span className="lbl">Danger</span>
        <Button
          size="sm"
          color="var(--red)"
          onClick={() => {
            if (!wipeArmed) {
              setWipeArmed(true);
              setTimeout(() => setWipeArmed(false), 3000);
              return;
            }
            commands.wipe();
            setWipeArmed(false);
            toast({ title: 'Save wiped', body: 'Starting again from a protostar.', icon: 'gear' });
          }}
        >
          {wipeArmed ? 'Click again to wipe' : 'Wipe save'}
        </Button>
      </div>
    </Panel>
  );
}
