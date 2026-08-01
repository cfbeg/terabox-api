import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import TeraBoxApp from '../api.js';
import { hashFile, uploadChunks } from '../helper.js';

const enabled = process.env.npm_lifecycle_event === 'test:live' || process.env.TERABOX_LIVE === '1';

test('runs reversible operations against a real TeraBox account', { skip: !enabled }, async t => {
    let config;
    try {
        config = JSON.parse(await fs.readFile(new URL('../.config.json', import.meta.url)));
    }
    catch {
        t.skip('create .config.json with {"accounts":{"main":"NDUS"}}');
        return;
    }

    const ndus = config.accounts?.main;
    assert.equal(typeof ndus, 'string', '.config.json must contain accounts.main');

    const id = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const remoteDir = `/terabox-api-smoke-${id}`;
    const filename = `upload-${id}.bin`;
    const rapidFilename = `rapid-${id}.bin`;
    const localDir = await fs.mkdtemp(path.join(os.tmpdir(), 'terabox-api-live-'));
    const localFile = path.join(localDir, filename);
    await fs.writeFile(localFile, crypto.randomBytes(300 * 1024));

    const app = new TeraBoxApp(ndus);
    let shareId;
    let directoryCreated = false;
    try {
        assert.equal((await app.checkLogin()).errno, 0);
        await app.updateAppData();
        assert.equal((await app.getQuota()).errno, 0);
        assert.equal((await app.getRemoteDir('/')).errno, 0);

        assert.equal((await app.createDir(remoteDir)).errno, 0);
        directoryCreated = true;

        const stat = await fs.stat(localFile);
        const data = {
            remote_dir: remoteDir,
            file: filename,
            size: stat.size,
            hash: await hashFile(localFile),
        };
        data.uploaded = data.hash.chunks.map(() => false);
        const precreate = await app.precreateFile(data);
        assert.equal(precreate.errno, 0);
        assert.equal(typeof precreate.uploadid, 'string');
        data.upload_id = precreate.uploadid;

        assert.equal((await app.getUploadHost()).errno, 0);
        assert.equal((await uploadChunks(app, data, localFile, 2, 2)).ok, true);
        assert.equal((await app.createFile(data)).errno, 0);
        assert.equal((await app.rapidUpload({ ...data, file: rapidFilename })).errno, 0);

        const listing = await app.getRemoteDir(remoteDir);
        assert.equal(listing.errno, 0);
        const entries = listing.list || listing.records || [];
        const uploaded = entries.find(entry => entry.server_filename === filename || entry.path === `${remoteDir}/${filename}`);
        assert.ok(uploaded, 'uploaded file must appear in its directory');

        assert.equal((await app.search(filename)).errno, 0);
        assert.equal((await app.getFileMeta([{ fs_id: uploaded.fs_id, path: uploaded.path }])).errno, 0);
        assert.equal((await app.download([uploaded.fs_id])).errno, 0);

        const share = await app.shareSet([uploaded.path], '', 1);
        assert.equal(share.errno, 0);
        shareId = share.shareid ?? share.data?.shareid;
        assert.ok(shareId, 'shareSet must return a share ID for cleanup');
        assert.equal((await app.shareList()).errno, 0);
        assert.equal((await app.shareCancel([shareId])).errno, 0);
        shareId = undefined;
    }
    finally {
        if(shareId) await app.shareCancel([shareId]).catch(() => {});
        if(directoryCreated) await app.filemanager('delete', [remoteDir]).catch(() => {});
        await fs.rm(localDir, { recursive: true, force: true });
    }
});
