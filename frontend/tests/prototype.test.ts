import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { prototypeExamples } from '../src/api/mock/mockApi';
import { settings } from '../src/lib/settings';
import targets from '../scripts/screenshot-targets.json';

describe('prototype housekeeping', () => {
  test('the screenshot targets match the illustrative data', () => {
    const { _about, ...rest } = targets;
    expect(_about).toBeTruthy();
    expect(rest).toEqual(prototypeExamples());
  });

  // NFR-01 pass condition 3: none of the banned words appears anywhere in the interface source.
  test('wording check: no banned words in the front-end source', () => {
    const root = join(__dirname, '..', 'src');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(tsx?|css|html)$/.test(name)) files.push(p);
      }
    };
    walk(root);
    files.push(join(__dirname, '..', 'index.html'));
    const pattern = new RegExp(`\\b(${settings.bannedWords.join('|')})`, 'i');
    const hits = files.flatMap((f) =>
      readFileSync(f, 'utf8')
        .split('\n')
        .flatMap((line, i) => (pattern.test(line) ? [`${f}:${i + 1}: ${line.trim()}`] : [])),
    );
    expect(hits).toEqual([]);
  });
});
