import { useEffect, useMemo, useState } from 'react';
import { type BackupMeta, listBackups } from '../../app/backups';
import { commands } from '../../app/commands';
import { previewImport } from '../../app/reports';
import { useSnap } from '../../app/uiSnapshot';
import { SOUNDTRACKS } from '../../audio/music';
import type { Notation, Settings } from '../../engine/state';
import { Button } from '../kit/Chunk';
import { Panel } from '../kit/Panel';
import { useUi } from '../store';

const NOTATIONS: Array<{ v: Notation; label: string }> = [
  { v: 'suffix', label: '1.23M' },
  { v: 'scientific', label: '1.23e6' },
  { v: 'engineering', label: '12.3e5' },
];
const AUTOSAVES = [5, 15, 30, 60];
export const HOTKEYS: Array<[string, string]> = [
  ['T', 'Tap the star'],
  ['E', 'Evolve'],
  ['1 to 6', 'Buy x1, x10, x100, x1K, Max, Next'],
  ['C', 'Catch the comet'],
  ['M', 'Mute or unmute'],
  ['Esc', 'Close a panel'],
];

type BoolSetting = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

function Toggle({ on, setting, children }: { on: boolean; setting: BoolSetting; children: string }) {
  return (
    <Button size="sm" gloss={false} color={on ? 'var(--cyan)' : '#5A5F8F'} onClick={() => commands.setSetting(setting, !on)} aria-pressed={on}>
      {children} {on ? 'on' : 'off'}
    </Button>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="slider">
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        aria-label={`${label} volume`}
      />
      <span className="num">{Math.round(value * 100)}%</span>
    </label>
  );
}

function Backups() {
  const panelOpen = useUi((s) => s.panel === 'settings');
  const toast = useUi((s) => s.pushToast);
  const [list, setList] = useState<BackupMeta[] | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => {
    if (panelOpen) void listBackups().then(setList);
  }, [panelOpen]);
  if (!list) return <p>Looking for backups…</p>;
  if (list.length === 0) return <p>No backups yet. One is made every 5 minutes of play and whenever you come back after a while.</p>;
  return (
    <ul className="backups well">
      {list.map((b) => (
        <li key={b.key}>
          <span>
            <b>{new Date(b.time).toLocaleString()}</b>
            <small>{b.summary}</small>
          </span>
          <Button
            size="sm"
            color={armed === b.key ? 'var(--flare)' : '#5A5F8F'}
            onClick={() => {
              if (armed !== b.key) {
                setArmed(b.key);
                setTimeout(() => setArmed((k) => (k === b.key ? null : k)), 3000);
                return;
              }
              setArmed(null);
              void commands
                .restoreBackup(b.key)
                .then((err) =>
                  toast(
                    err
                      ? { title: 'Restore failed', body: err, icon: 'lock' }
                      : { title: 'Backup restored', body: 'Your previous game was backed up first.', icon: 'gear' },
                  ),
                );
            }}
          >
            {armed === b.key ? 'Click again' : 'Restore'}
          </Button>
        </li>
      ))}
    </ul>
  );
}

export function SettingsPanel() {
  const notation = useSnap((s) => s.notation);
  const saveLabel = useSnap((s) => s.saveLabel);
  const reducedMotion = useSnap((s) => s.reducedMotion);
  const reduceFlashing = useSnap((s) => s.reduceFlashing);
  const muted = useSnap((s) => s.muted);
  const volumeMaster = useSnap((s) => s.volumeMaster);
  const volumeSfx = useSnap((s) => s.volumeSfx);
  const volumeMusic = useSnap((s) => s.volumeMusic);
  const soundtrack = useSnap((s) => s.soundtrack);
  const autosave = useSnap((s) => s.autosaveSeconds);
  const confirmResets = useSnap((s) => s.confirmResets);
  const showToasts = useSnap((s) => s.showToasts);
  const hotkeys = useSnap((s) => s.hotkeys);
  const toast = useUi((s) => s.pushToast);
  const [code, setCode] = useState('');
  const [wipeArmed, setWipeArmed] = useState(false);
  const preview = useMemo(() => (code.trim() ? previewImport(code) : null), [code]);

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
    toast(
      err ? { title: 'Import failed', body: err, icon: 'lock' } : { title: 'Imported', body: 'Save loaded. Your previous game was saved first.', icon: 'gear' },
    );
  };
  const loadFile = (file: File | undefined) => {
    if (!file) return;
    void file.text().then((t) => setCode(t.trim()));
  };

  return (
    <Panel id="settings" title="Settings" color="#4A4F7A" size="small">
      <div className="set-row">
        <span className="lbl">Numbers</span>
        <div className="set-ctl">
          {NOTATIONS.map((n) => (
            <Button
              key={n.v}
              size="sm"
              gloss={false}
              color={notation === n.v ? 'var(--cyan)' : '#5A5F8F'}
              onClick={() => commands.setNotation(n.v)}
              aria-pressed={notation === n.v}
            >
              {n.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="set-row">
        <span className="lbl">Motion</span>
        <div className="set-ctl">
          <Toggle on={reducedMotion} setting="reducedMotion">
            Reduce motion
          </Toggle>
          <Toggle on={reduceFlashing} setting="reduceFlashing">
            Reduce flashing
          </Toggle>
        </div>
      </div>
      <div className="set-row">
        <span className="lbl">Sound</span>
        <div className="set-ctl">
          <Toggle on={muted} setting="muted">
            Mute
          </Toggle>
          <Slider label="Master" value={volumeMaster} onChange={(v) => commands.setSetting('volumeMaster', v)} />
          <Slider label="Effects" value={volumeSfx} onChange={(v) => commands.setSetting('volumeSfx', v)} />
          <Slider label="Music" value={volumeMusic} onChange={(v) => commands.setSetting('volumeMusic', v)} />
        </div>
      </div>
      <div className="set-row">
        <span className="lbl">Music</span>
        <div className="set-ctl">
          {[...SOUNDTRACKS.map((t) => ({ v: t.id, label: t.name })), { v: 'off', label: 'Off' }].map((t) => (
            <Button key={t.v} size="sm" gloss={false} color={soundtrack === t.v ? 'var(--cyan)' : '#5A5F8F'} onClick={() => commands.setSetting('soundtrack', t.v)} aria-pressed={soundtrack === t.v} data-soundtrack={t.v}>
              {t.label}
            </Button>
          ))}
          <small className="set-note">Each layer you reach adds an instrument.</small>
        </div>
      </div>
      <div className="set-row">
        <span className="lbl">Play</span>
        <div className="set-ctl">
          <Toggle on={confirmResets} setting="confirmResets">
            Ask before resets
          </Toggle>
          <Toggle on={showToasts} setting="showToasts">
            Pop-up messages
          </Toggle>
          <Toggle on={hotkeys} setting="hotkeys">
            Hotkeys
          </Toggle>
        </div>
      </div>
      {hotkeys && (
        <p className="hotkeys">
          {HOTKEYS.map(([k, what]) => (
            <span key={k}>
              <kbd>{k}</kbd> {what}
            </span>
          ))}
        </p>
      )}
      <h3>Saves</h3>
      <div className="set-row">
        <span className="lbl">Autosave every</span>
        <div className="set-ctl">
          {AUTOSAVES.map((sec) => (
            <Button
              key={sec}
              size="sm"
              gloss={false}
              color={autosave === sec ? 'var(--cyan)' : '#5A5F8F'}
              onClick={() => commands.setSetting('autosaveSeconds', sec)}
              aria-pressed={autosave === sec}
            >
              {sec} s
            </Button>
          ))}
        </div>
      </div>
      <p>{saveLabel}. The game also saves whenever you switch tabs or close it.</p>
      <div className="set-row">
        <div className="set-ctl">
          <Button size="sm" onClick={() => commands.saveNow() && toast({ title: 'Saved', body: 'Your progress is stored in this browser.', icon: 'gear' })}>
            Save now
          </Button>
          <Button size="sm" color="var(--cyan)" onClick={exportNow}>
            Export
          </Button>
          <Button size="sm" color="var(--cyan)" onClick={download}>
            Download
          </Button>
          <Button size="sm" color="#5A5F8F" onClick={importNow} disabled={!preview?.ok}>
            Import
          </Button>
          <label className="btn chunk pop sm" style={{ ['--c' as string]: '#5A5F8F' }}>
            Load file
            <input type="file" accept=".txt,text/plain" hidden onChange={(e) => loadFile(e.target.files?.[0])} />
          </label>
        </div>
      </div>
      <textarea
        className="code well"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Exported save codes appear here. Paste a save code to see what's in it, then press Import."
        aria-label="Save code"
      />
      {preview && (
        <p className={`preview ${preview.ok ? 'ok' : 'bad'}`} data-testid="import-preview">
          {preview.ok ? `This save: ${preview.summary}. Saved ${preview.savedAt}.` : `Can't import this: ${preview.error}`}
        </p>
      )}
      <p style={{ fontSize: '0.8rem' }}>Safari deletes site data after 7 days without a visit, so export a code now and then.</p>
      <h3>Backups</h3>
      <Backups />
      <div className="set-row">
        <span className="lbl">Danger</span>
        <div className="set-ctl">
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
      </div>
    </Panel>
  );
}
