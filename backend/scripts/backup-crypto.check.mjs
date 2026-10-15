import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { encryptArchive, decryptArchive } from './backup-crypto.mjs';

test('encrypted archive round trip, wrong keys and altered ciphertext', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'erp-backup-test-'));
  try {
    const key = randomBytes(32);
    const data = randomBytes(131072);
    const source = join(directory, 'source');
    const encrypted = join(directory, 'encrypted');
    await writeFile(source, data);
    await encryptArchive(source, encrypted, key);
    assert.equal((await readFile(encrypted)).includes(data.subarray(0, 32)), false);
    await decryptArchive(encrypted, join(directory, 'restored'), key);
    assert.deepEqual(await readFile(join(directory, 'restored')), data);
    await assert.rejects(decryptArchive(encrypted, join(directory, 'wrong-key'), randomBytes(32)));
    const altered = await readFile(encrypted);
    altered[100] ^= 1;
    await writeFile(join(directory, 'altered'), altered);
    await assert.rejects(decryptArchive(join(directory, 'altered'), join(directory, 'tampered'), key));
    await assert.rejects(encryptArchive(source, encrypted, key));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
