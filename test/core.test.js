import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import TeraBoxApp, { TeraBoxApp as NamedTeraBoxApp } from '../api.js';
import * as helper from '../helper.js';

const methods = [
    'checkLogin', 'clearRecycleBin', 'clouddl_add_task', 'clouddl_cancel_task',
    'clouddl_delete_task', 'clouddl_query_magnetinfo', 'clouddl_query_sinfo',
    'clouddl_query_task', 'clouddl_tasklist', 'createDir', 'createFile', 'doReq',
    'download', 'fileDiff', 'filemanager', 'genPanToken', 'getCategoryList',
    'getCoinsCount', 'getCurrentUserInfo', 'getFileMeta', 'getHomeInfo',
    'getPublicKey', 'getQuota', 'getRecentUploads', 'getRecycleBin', 'getRemoteDir',
    'getStream', 'getSysCfg', 'getUploadHost', 'getUserInfo', 'passportGetInfo',
    'passportLogin', 'passportPreLogin', 'precreateFile', 'querySurlTransfer',
    'rapidUpload', 'regFinish', 'regSendCode', 'regVerify', 'remoteUpload',
    'remoteUploadDelete', 'remoteUploadList', 'search', 'setUserBirthday',
    'setVipDefaults', 'shareCancel', 'shareList', 'shareSet', 'shareTransfer',
    'shortUrlInfo', 'shortUrlList', 'updateAppData', 'uploadChunk', 'userMembership',
];
const arities = {
    0: [
        'setVipDefaults', 'getSysCfg', 'checkLogin', 'passportGetInfo', 'userMembership',
        'getCurrentUserInfo', 'getQuota', 'getCoinsCount', 'getCategoryList',
        'getRecycleBin', 'clearRecycleBin', 'remoteUploadList', 'clouddl_tasklist',
        'clouddl_add_task', 'getUploadHost', 'shareList', 'shareCancel', 'fileDiff',
        'genPanToken', 'getHomeInfo', 'getStream', 'getRecentUploads', 'getPublicKey',
    ],
    1: [
        'updateAppData', 'doReq', 'passportPreLogin', 'regSendCode', 'getUserInfo',
        'getRemoteDir', 'search', 'precreateFile', 'rapidUpload', 'remoteUpload',
        'remoteUploadDelete', 'clouddl_cancel_task', 'clouddl_delete_task',
        'clouddl_query_sinfo', 'clouddl_query_magnetinfo', 'createDir', 'createFile',
        'shareSet', 'shortUrlInfo', 'shortUrlList', 'download', 'getFileMeta',
    ],
    2: [
        'regVerify', 'regFinish', 'setUserBirthday', 'clouddl_query_task',
        'filemanager', 'querySurlTransfer',
    ],
    3: ['passportLogin', 'shareTransfer'],
    5: ['uploadChunk'],
};

const realFetch = globalThis.fetch;
const realHttpsRequest = https.request;
test.afterEach(() => {
    globalThis.fetch = realFetch;
    https.request = realHttpsRequest;
});

test('keeps the supported public API surface', () => {
    assert.equal(TeraBoxApp, NamedTeraBoxApp);
    assert.deepEqual(
        Object.getOwnPropertyNames(TeraBoxApp.prototype).filter(name => name !== 'constructor').sort(),
        methods.sort()
    );
    for (const [length, names] of Object.entries(arities)) {
        for (const name of names) {
            const descriptor = Object.getOwnPropertyDescriptor(TeraBoxApp.prototype, name);
            assert.deepEqual(
                { length: descriptor.value.length, enumerable: descriptor.enumerable,
                    writable: descriptor.writable, configurable: descriptor.configurable },
                { length: Number(length), enumerable: false, writable: true, configurable: true },
                name
            );
        }
    }
    assert.deepEqual(Object.keys(helper).sort(), [
        'formatEta', 'getChunkSize', 'hashFile', 'unwrapErrorMessage', 'uploadChunks',
    ]);

    const app = new TeraBoxApp('token');
    assert.deepEqual(Object.keys(app), ['TERABOX_DOMAIN', 'TERABOX_TIMEOUT', 'data', 'params']);
    assert.equal(app.params.cookie, 'lang=en; ndus=token');
    assert.equal(app.TERABOX_DOMAIN, 'terabox.com');
    assert.equal(app.TERABOX_TIMEOUT, 10000);
});

test('uses native fetch without changing request, response, or cookie behavior', async () => {
    let captured;
    globalThis.fetch = async (url, options) => {
        captured = { url: url.toString(), options };
        const headers = new Headers();
        headers.append('set-cookie', 'sid=new; Path=/; HttpOnly');
        headers.append('set-cookie', 'old=; Max-Age=0');
        return new Response(JSON.stringify({ errno: 0 }), { status: 200, headers });
    };

    const app = new TeraBoxApp('token');
    app.params.cookie += '; old=value';
    const result = await app.doReq('/example', {
        method: 'POST',
        headers: { 'X-Test': 'yes' },
        body: 'a=hello%20world',
        save_cookies: true,
    }, 0);

    assert.deepEqual(result, { errno: 0 });
    assert.equal(captured.url, 'https://www.terabox.com/example');
    assert.equal(captured.options.redirect, 'manual');
    assert.equal(captured.options.method, 'POST');
    assert.equal(captured.options.headers['X-Test'], 'yes');
    assert.equal(captured.options.body, 'a=hello%20world');
    assert.equal(app.params.cookie, 'lang=en; ndus=token; sid=new');
});

test('preserves form encoding, error causes, and download signing', async () => {
    const requests = [];
    globalThis.fetch = async (url, options) => {
        requests.push({ url: url.toString(), options });
        if (url.pathname === '/api/home/info') {
            return new Response(JSON.stringify({
                errno: 0,
                data: { sign3: 'secret-key', sign1: 'data-to-sign' },
            }));
        }
        return new Response(JSON.stringify({ errno: 0 }));
    };

    const app = new TeraBoxApp();
    await app.createDir('/hello world');
    assert.equal(requests[0].options.body, 'path=%2Fhello%20world&isdir=1&block_list=%5B%5D');
    assert.equal((await app.getHomeInfo()).data.signb, '1Gk6+hnZY/VLsMJI');

    globalThis.fetch = async () => { throw new Error('network down'); };
    await assert.rejects(app.getQuota(), error =>
        error.message === 'getQuota' && error.cause?.message === 'network down'
    );
});

test('uses the standard HTTPS client for share-specific TLS settings', async () => {
    let captured;
    https.request = (url, options, callback) => {
        captured = { url: url.toString(), options };
        const request = new EventEmitter();
        request.end = () => {
            const response = new EventEmitter();
            response.statusCode = 200;
            response.headers = {};
            callback(response);
            queueMicrotask(() => {
                response.emit('data', Buffer.from('{"errno":0}'));
                response.emit('end');
            });
        };
        return request;
    };

    assert.deepEqual(await new TeraBoxApp().shortUrlInfo('abc'), { errno: 0 });
    assert.match(captured.url, /shorturl=1abc/);
    assert.match(captured.options.ciphers, /!ECDHE-RSA-AES128-SHA/);
    assert.equal(captured.options.method, 'GET');
});

test('updates application data and cookies from an HTML response', async () => {
    const template = {
        csrf: 'csrf', pcftoken: 'pcf', bdstoken: 'bds',
        jsToken: '%28%22js-token%22%29', uk: '42', userVipIdentity: 1,
    };
    globalThis.fetch = async () => new Response(
        `<script>var templateData = ${JSON.stringify(template)};</script>`,
        { headers: { logid: 'log', 'set-cookie': 'browserid=browser; Path=/' } }
    );

    const app = new TeraBoxApp('token');
    const result = await app.updateAppData();
    assert.equal(result.jsToken, 'js-token');
    assert.deepEqual(app.data, {
        csrf: 'csrf', logid: 'log', pcftoken: 'pcf', bdstoken: 'bds',
        jsToken: 'js-token', pubkey: '',
    });
    assert.equal(app.params.cookie, 'lang=en; ndus=token; browserid=browser');
    assert.equal(app.params.account_id, 42);
    assert.equal(app.params.is_vip, true);
});

test('hashes files and formats helper values compatibly', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'terabox-api-'));
    const file = path.join(directory, 'hello.txt');
    await fs.writeFile(file, 'hello world');
    const write = process.stdout.write;
    const log = console.log;
    let output = '';
    process.stdout.write = chunk => { output += chunk; return true; };
    console.log = () => {};
    try {
        assert.deepEqual(await helper.hashFile(file), {
            crc32: 222957957,
            slice: '5eb63bbbe01eeed093cb22bb8f5acdc3',
            file: '5eb63bbbe01eeed093cb22bb8f5acdc3',
            etag: '5eb63bbbe01eeed093cb22bb8f5acdc3',
            chunks: ['5eb63bbbe01eeed093cb22bb8f5acdc3'],
        });
        assert.match(output, /11\.000 B\/11\.000 B/);
    }
    finally {
        process.stdout.write = write;
        console.log = log;
        await fs.rm(directory, { recursive: true });
    }
    assert.equal(helper.getChunkSize(4 * 1024 ** 3), 4 * 1024 ** 2);
    assert.equal(helper.getChunkSize(4 * 1024 ** 3 + 1), 8 * 1024 ** 2);
    assert.equal(helper.getChunkSize(10, false), 4 * 1024 ** 2);
    assert.equal(helper.formatEta(3661), '01h01m01s');
    assert.equal(helper.formatEta(Infinity), '---------');
    assert.equal(helper.unwrapErrorMessage(new Error('outer', { cause: new Error('inner') })), 'outer: inner');
});

test('finishes active upload workers before returning a failure', async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'terabox-api-'));
    const file = path.join(directory, 'upload.bin');
    const content = Buffer.alloc(4 * 1024 ** 2 + 1, 1);
    await fs.writeFile(file, content);
    const first = content.subarray(0, 4 * 1024 ** 2);
    const second = content.subarray(4 * 1024 ** 2);
    const data = {
        remote_dir: '/test', file: 'upload.bin', size: content.length,
        hash: {
            chunks: [first, second].map(chunk => crypto.createHash('md5').update(chunk).digest('hex')),
        },
        uploaded: [false, false],
    };
    let completed = 0;
    const app = {
        async uploadChunk(_data, partSeq) {
            if (partSeq === 0) throw new Error('expected failure');
            await new Promise(resolve => setTimeout(resolve, 20));
            completed++;
            return { md5: data.hash.chunks[partSeq] };
        },
    };
    const write = process.stdout.write;
    const error = console.error;
    const log = console.log;
    process.stdout.write = () => true;
    console.error = console.log = () => {};
    try {
        assert.equal((await helper.uploadChunks(app, data, file, 2, 1)).ok, false);
        assert.equal(completed, 1);
    }
    finally {
        process.stdout.write = write;
        console.error = error;
        console.log = log;
        await fs.rm(directory, { recursive: true });
    }
});
