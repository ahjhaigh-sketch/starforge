import { useEffect, useMemo, useState } from 'react';
import { type BackupMeta, listBackups } from '../../app/backups';
import { commands } from '../../app/commands';
import { previewImport } from '../../app/reports';
import { useSnap } from '../../app/uiSnapshot';
import { MUSIC_CHOICES } from '../../audio/music';
import { UPDATES } from '../../content/updates';
import type { Notation, Settings } from '../../engine/state';
import { Button } from '../kit/Chunk';
import { Panel } from '../kit/Panel';
import { installApp, useAppShell } from '../../app/pwa';
import { useUi } from '../store';
import { HUD_PARTS, menusReport } from '../../app/menus';
import { useReport } from '../kit/useReport';
import { Icon } from '../kit/Icon';
import { cx } from '../kit/Chunk';

const NOTATIONS: Array<{ v: Notation; label: string }> = [
  { v: 'suffix', label: '1.23M' },
  { v: 'scientific', label: '1.23e6' },
  { v: 'engineering', label: '12.3e5' },
];
const AUTOSAVES = [5, 15, 30, 60];
const SCALES = [0.8, 0.9, 1, 1.1, 1.2, 1.3];
const ENGINE_LISTS: Array<{ v: 'auto' | 'full' | 'compact' | 'min'; label: string; title: string }> = [
  { v: 'auto', label: 'Auto', title: 'Full rows, then minimized to one line once every engine has its auto-buyer on' },
  { v: 'full', label: 'Full', title: 'Always full rows' },
  { v: 'compact', label: 'Compact', title: 'Always compact rows' },
  { v: 'min', label: 'Minimized', title: 'Always one line (Show opens it)' },
];

/** 1.2.0: every menu you have, each with Hide or Show (three are always on the rails). */
function Menus() {
  const rows = useReport('settings', menusReport, 500);
  const autoHide = useSnap((s) => s.autoHideMenus);
  return (
    <>
      <div className="set-row">
        <div className="set-ctl">
          <Toggle on={autoHide} setting="autoHideMenus">
            Tuck away menus that run themselves
          </Toggle>
        </div>
      </div>
      <ul className="menu-list well" data-testid="menu-list">
        {rows?.map((m) => (
          <li key={m.id} className={cx('menu-row', m.state)} data-menu={m.id}>
            <span className="menu-ico chunk" style={{ ['--c' as string]: m.color }}>
              <Icon name={m.icon} />
            </span>
            <span className="menu-name">
              <b>{m.name}</b>
              {m.why && <small>{m.why}</small>}
            </span>
            {m.state === 'always' ? (
              <small className="menu-always">Always shown</small>
            ) : (
              <Button size="sm" gloss={false} color={m.state === 'shown' ? '#5A5F8F' : 'var(--cyan)'} onClick={() => commands.setMenuHidden(m.id, m.state === 'shown')} aria-pressed={m.state !== 'shown'}>
                {m.state === 'shown' ? 'Hide' : 'Show'}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * The permanent reset: three steps (what it does, are you sure, type RESET), with a save code
 * offered first. A backup of the game is still kept in Backups, in case you want it back.
 */
function PermanentReset({ onExport }: { onExport: () => void }) {
  const toast = useUi((s) => s.pushToast);
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState('');
  const cancel = () => {
    setStep(0);
    setTyped('');
  };
  if (step === 0)
    return (
      <Button size="sm" color="var(--red)" onClick={() => setStep(1)} data-testid="reset-1">
        Reset everything
      </Button>
    );
  return (
    <div className="hard-reset well" role="group" aria-label="Reset everything" data-testid="hard-reset">
      <b className="hard-reset-step">Step {step} of 3</b>
      {step === 1 && (
        <>
          <p>This starts a brand-new game from a protostar. Every Stardust, layer, tree, medal and unlock goes. Export a save code first if you might want this game back.</p>
          <div className="set-ctl">
            <Button size="sm" color="var(--cyan)" onClick={onExport}>
              Export a save code
            </Button>
            <Button size="sm" color="var(--red)" onClick={() => setStep(2)} data-testid="reset-2">
              Continue
            </Button>
            <Button size="sm" color="#5A5F8F" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </>
      )}
      {step === 2 && (
        <>
          <p>Are you sure? The game can't undo this by itself. (A backup of this game is kept in Backups above, in case you change your mind.)</p>
          <div className="set-ctl">
            <Button size="sm" color="var(--red)" onClick={() => setStep(3)} data-testid="reset-3">
              Yes, I'm sure
            </Button>
            <Button size="sm" color="#5A5F8F" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </>
      )}
      {step === 3 && (
        <>
          <p>
            Last check: type <b>RESET</b> to start again.
          </p>
          <div className="set-ctl">
            <input className="hard-reset-input well" value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Type RESET to confirm" placeholder="RESET" data-testid="reset-type" />
            <Button
              size="sm"
              color="var(--red)"
              disabled={typed.trim().toUpperCase() !== 'RESET'}
              data-testid="reset-go"
              onClick={() => {
                cancel();
                void commands.resetEverything().then(() => toast({ title: 'A fresh start', body: 'Starting again from a protostar. Your old game is in Backups.', icon: 'gear' }));
              }}
            >
              Reset for good
            </Button>
            <Button size="sm" color="#5A5F8F" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
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
  const storySeen = useSnap((s) => s.storySeen);
  const canInstall = useAppShell((s) => s.canInstall);
  const openPanel = useUi((s) => s.open);
  const muted = useSnap((s) => s.muted);
  const volumeMaster = useSnap((s) => s.volumeMaster);
  const volumeSfx = useSnap((s) => s.volumeSfx);
  const volumeMusic = useSnap((s) => s.volumeMusic);
  const soundtrack = useSnap((s) => s.soundtrack);
  const autosave = useSnap((s) => s.autosaveSeconds);
  const confirmResets = useSnap((s) => s.confirmResets);
  const showToasts = useSnap((s) => s.showToasts);
  const hotkeys = useSnap((s) => s.hotkeys);
  const uiScale = useSnap((s) => s.uiScale);
  const engineList = useSnap((s) => s.engineList);
  const shipAlerts = useSnap((s) => s.shipAlerts);
  const resetFx = useSnap((s) => s.resetFx);
  const hiddenHud = useSnap((s) => s.hiddenHud);
  const toast = useUi((s) => s.pushToast);
  const [code, setCode] = useState('');
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
          {[...MUSIC_CHOICES.map((t) => ({ v: t.id, label: t.name, mood: t.mood })), { v: 'off', label: 'Off', mood: 'no music' }].map((t) => (
            <Button key={t.v} size="sm" gloss={false} color={soundtrack === t.v ? 'var(--cyan)' : '#5A5F8F'} onClick={() => commands.setSetting('soundtrack', t.v)} aria-pressed={soundtrack === t.v} title={t.mood} data-soundtrack={t.v}>
              {t.label}
            </Button>
          ))}
          <small className="set-note">Journey plays a new song for each layer you reach, and every layer adds an instrument. Evolving, resets, medals and new systems each have their own theme.</small>
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
      <div className="set-row">
        <span className="lbl">Alerts</span>
        <div className="set-ctl">
          <Toggle on={shipAlerts} setting="shipAlerts">
            Ships-home pop-ups
          </Toggle>
          <Toggle on={resetFx} setting="resetFx">
            Reset animations
          </Toggle>
          <small className="set-note">With reset animations off, resets still happen and still pay: you just don't see the flash. Resets made by automation are always quiet.</small>
        </div>
      </div>
      <h3>Interface</h3>
      <div className="set-row">
        <span className="lbl">Size</span>
        <div className="set-ctl" data-testid="ui-scale">
          {SCALES.map((v) => (
            <Button key={v} size="sm" gloss={false} color={Math.abs(uiScale - v) < 0.001 ? 'var(--cyan)' : '#5A5F8F'} onClick={() => commands.setSetting('uiScale', v)} aria-pressed={Math.abs(uiScale - v) < 0.001}>
              {Math.round(v * 100)}%
            </Button>
          ))}
        </div>
      </div>
      <div className="set-row">
        <span className="lbl">Engines</span>
        <div className="set-ctl">
          {ENGINE_LISTS.map((x) => (
            <Button key={x.v} size="sm" gloss={false} color={engineList === x.v ? 'var(--cyan)' : '#5A5F8F'} onClick={() => commands.setSetting('engineList', x.v)} aria-pressed={engineList === x.v} title={x.title}>
              {x.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="set-row">
        <span className="lbl">Hide</span>
        <div className="set-ctl" data-testid="hud-parts">
          {HUD_PARTS.map((p) => {
            const hidden = hiddenHud.split(' ').includes(p.id);
            return (
              <Button key={p.id} size="sm" gloss={false} color={hidden ? 'var(--flare)' : '#5A5F8F'} onClick={() => commands.toggleHud(p.id)} aria-pressed={hidden} data-hud={p.id}>
                {hidden ? `${p.name}: hidden` : p.name}
              </Button>
            );
          })}
        </div>
      </div>
      <h3>Menus</h3>
      <Menus />
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
      <h3>Update log</h3>
      <div className="upd-log" data-testid="update-log">
        {UPDATES.map((u, i) => (
          <details key={u.version} className="well upd" open={i === 0}>
            <summary>
              <b className="num">{u.version}</b> {u.title} <small>{u.date}</small>
            </summary>
            <ul>
              {u.notes.map((x, k) => (
                <li key={k}>{x}</li>
              ))}
            </ul>
          </details>
        ))}
      </div>
      <h3>About</h3>
      <p>
        Starforge <span className="num">{__APP_VERSION__}</span>. It plays offline once loaded{canInstall ? ', and can be installed as an app' : ''}.
      </p>
      <div className="set-row">
        <div className="set-ctl">
          {canInstall && (
            <Button size="sm" color="var(--lime)" onClick={() => void installApp()} data-testid="install-app">
              Install Starforge
            </Button>
          )}
          {storySeen && (
            <Button size="sm" color="#7B3FD6" onClick={() => openPanel('story')}>
              Read the ending again
            </Button>
          )}
          <Button size="sm" color="#5A2A8C" onClick={() => {
              commands.poke('credits');
              openPanel('credits');
            }} data-testid="open-credits">
            Credits
          </Button>
        </div>
      </div>
      <div className="set-row">
        <span className="lbl">Danger</span>
        <div className="set-ctl">
          <PermanentReset onExport={exportNow} />
        </div>
      </div>
    </Panel>
  );
}
