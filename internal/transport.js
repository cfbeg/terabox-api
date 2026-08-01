import https from 'node:https';
import tls from 'node:tls';

const SHARE_CIPHERS = tls.DEFAULT_CIPHERS + ':!ECDHE-RSA-AES128-SHA';

async function request(url, options = {}) {
    const { ciphers, ...fetchOptions } = options;
    if (ciphers) return httpsRequest(url, fetchOptions, ciphers);

    const response = await fetch(url, { redirect: 'manual', ...fetchOptions });
    const headers = Object.fromEntries(response.headers);
    const setCookies = response.headers.getSetCookie();
    if (setCookies.length) headers['set-cookie'] = setCookies;
    return { statusCode: response.status, headers, body: response };
}

function httpsRequest(url, options, ciphers) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, { ...options, ciphers }, response => {
            const chunks = [];
            response.on('data', chunk => chunks.push(chunk));
            response.on('error', reject);
            response.on('end', () => {
                const data = Buffer.concat(chunks).toString();
                resolve({
                    statusCode: response.statusCode,
                    headers: response.headers,
                    body: {
                        json: async () => JSON.parse(data),
                        text: async () => data,
                    },
                });
            });
        });
        req.on('error', reject);
        req.end();
    });
}

function parseCookies(header = '') {
    return new Map(header.split(/;\s*/).flatMap(cookie => {
        const separator = cookie.indexOf('=');
        return separator > 0 ? [[cookie.slice(0, separator), cookie.slice(separator + 1)]] : [];
    }));
}

function updateCookies(header, setCookies = []) {
    const cookies = parseCookies(header);
    if (typeof setCookies === 'string') setCookies = [setCookies];
    for (const setCookie of setCookies) {
        const [pair, ...attributes] = setCookie.split(/;\s*/);
        const separator = pair.indexOf('=');
        if (separator < 1) continue;
        const name = pair.slice(0, separator);
        const value = pair.slice(separator + 1);
        const expired = attributes.some(attribute => {
            const [key, rawValue = ''] = attribute.split('=', 2);
            if (key.toLowerCase() === 'max-age') return Number(rawValue) <= 0;
            if (key.toLowerCase() === 'expires') return Date.parse(rawValue) <= Date.now();
            return false;
        });
        if (expired) cookies.delete(name);
        else cookies.set(name, value);
    }
    return [...cookies].map(cookie => cookie.join('=')).join('; ');
}

function getCookie(header, name) {
    return parseCookies(header).get(name) || '';
}

export { request, updateCookies, getCookie, SHARE_CIPHERS };
