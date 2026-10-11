import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** The release identity (Tech tab: "never change the app identifier after release, or saves reset"). */
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string; dependencies: Record<string, string> };
const conf = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8')) as { version: string; identifier: string; productName: string };
const cargoLines = readFileSync('src-tauri/Cargo.toml', 'utf8').split(/\r?\n/);

describe('the release', () => {
  it('keeps the Windows app identifier for good', () => {
    expect(conf.identifier).toBe('io.github.ahjhaigh-sketch.starforge');
    expect(conf.productName).toBe('Starforge');
  });

  it('has one version everywhere: package.json, tauri.conf.json and Cargo.toml', () => {
    expect(conf.version).toBe(pkg.version);
    expect(cargoLines).toContain(`version = "${pkg.version}"`);
  });

  it('pins the Tauri crate to the same major.minor as @tauri-apps/api (the CLI refuses a mismatch)', () => {
    const api = pkg.dependencies['@tauri-apps/api']!.split('.').slice(0, 2).join('.');
    expect(cargoLines.find((l) => l.startsWith('tauri = '))).toContain(`version = "~${api}.`);
  });
});
