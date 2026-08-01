import crypto from 'node:crypto';
import { FormUrlEncoded } from '../utilities.js';
import { request, SHARE_CIPHERS } from '../transport.js';

export default class ShareMethods {
    /**
     * Retrieves a list of shares created by the user
     * @returns {Promise<Object>} The share list JSON (includes share entries)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async shareList(page = 1){
        const url = new URL(this.params.whost + '/share/teratransfer/sharelist');
        
        try{
            url.search = new URLSearchParams({
                // ...this.params.app,
                page_size: 100,
                page: page,
            });
            
            const req = await request(url, {
                headers: {
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
                },
                signal: AbortSignal.timeout(this.TERABOX_TIMEOUT),
            });
            
            const rdata = await req.body.json();
            return rdata;
        }
        catch (error) {
            throw new Error('shareList', { cause: error });
        }
    }

    /**
     * Sets sharing parameters (e.g., password, expiration) for specified files
     * @param {Array<string>} filelist - Array of file paths to share
     * @param {string} [pass=''] - Optional 4-character alphanumeric password
     * @param {number} [period=0] - Sharing period in days (0 for no expiration)
     * @returns {Promise<Object>} The share set response JSON (includes share IDs)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async shareSet(filelist, pass = '', period = 0){
        const url = new URL(this.params.whost + '/share/pset');
        
        try{
            url.search = new URLSearchParams({
                // ...this.params.app,
            });
            
            filelist = Array.isArray(filelist) ? filelist : [];
            filelist = JSON.stringify(filelist);
            
            pass = typeof pass === 'string' && pass.match(/^[0-9a-z]{4}$/i) ? pass : '';
            const schannel = pass !== '' ? 4 : 0;
            
            // 0 - infinity, otherwise valid X days
            period = parseInt(period);
            period = !isNaN(period) && Number.isSafeInteger(period) ? period : 0;
            
            const formData = new FormUrlEncoded();
            formData.append('schannel', schannel);
            formData.append('channel_list', '[]');
            formData.append('period', period);
            formData.append('path_list', filelist);
            formData.append('pwd', pass);
            
            const req = await request(url, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
                    Referer: this.params.whost,
                },
                body: formData.str(),
                signal: AbortSignal.timeout(this.TERABOX_TIMEOUT),
            });
            
            const rdata = await req.body.json();
            return rdata;
        }
        catch (error) {
            throw new Error('shareSet', { cause: error });
        }
    }

    /**
     * Cancels existing shares by share ID
     * @param {Array<number>} [shareid_list=[]] - Array of share IDs to cancel
     * @returns {Promise<Object>} The share cancel response JSON
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async shareCancel(shareid_list = []){
        const url = new URL(this.params.whost + '/share/cancel');
        
        try{
            url.search = new URLSearchParams({
                // ...this.params.app,
            });
            
            shareid_list = Array.isArray(shareid_list) ? shareid_list : [];
            shareid_list = JSON.stringify(shareid_list);
            
            const formData = new FormUrlEncoded();
            formData.append('shareid_list', shareid_list);
            
            const req = await request(url, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
                    Referer: this.params.whost,
                },
                body: formData.str(),
                signal: AbortSignal.timeout(this.TERABOX_TIMEOUT),
            });
            
            const rdata = await req.body.json();
            return rdata;
        }
        catch (error) {
            throw new Error('shareCancel', { cause: error });
        }
    }

    /**
     * Retrieves information for a shortened URL share
     * @param {string} shortUrl - The short url: after "surl="
     * @returns {Promise<Object>} The short URL info JSON (includes file list, permissions)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async shortUrlInfo(shortUrl){
        const url = new URL(this.params.whost + '/api/shorturlinfo');
        
        try{
            url.search = new URLSearchParams({
                //...this.params.app,
                shorturl: '1' + shortUrl,
                root: 1,
            });
            
            const buf = crypto.randomBytes(44);
            const b64 = buf.toString('base64');
            const cookieWithBrowserId = this.params.cookie + '; browserid=' + b64;
            
            const req = await request(url, {
                method: 'GET',
                headers: {
                    'User-Agent': this.params.ua,
                    'Cookie': cookieWithBrowserId,
                },
                ciphers: SHARE_CIPHERS,
                signal: AbortSignal.timeout(this.TERABOX_TIMEOUT),
            });
            
            if (req.statusCode !== 200) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            return rdata;
        }
        catch (error) {
            throw new Error('shortUrlInfo', { cause: error });
        }
    }

    /**
     * Lists files under a shortened URL share
     * @param {string} shortUrl - The short url: after "surl="
     * @param {string} [remoteDir=''] - Remote directory under share (empty for root)
     * @param {number} [page=1] - Page number for pagination
     * @returns {Promise<Object>} The short URL file list JSON (includes entries array)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async shortUrlList(shortUrl, remoteDir = '', page = 1){
        const url = new URL(this.params.whost + '/share/list');
        remoteDir = remoteDir || '';
        
        try{
            if(this.data.jsToken === ''){
                await this.updateAppData();
            }
            
            url.search = new URLSearchParams({
                ...this.params.app,
                jsToken: this.data.jsToken,
                shorturl: shortUrl,
                by: 'name',
                order: 'asc',
                num: 20000,
                dir: remoteDir,
                page: page,
            });
        
            if(remoteDir === ''){
                url.searchParams.append('root', '1');
            }
            
            const req = await request(url, {
                method: 'GET',
                headers: {
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
                },
                ciphers: SHARE_CIPHERS,
                signal: AbortSignal.timeout(this.TERABOX_TIMEOUT),
            });
            
            if (req.statusCode !== 200) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            // rdata.errno: 4000020 - need verify
            if(rdata.errno === 4000020){
                await this.updateAppData();
                return await this.shortUrlList(shortUrl, remoteDir, page);
            }
            return rdata;
        }
        catch (error) {
            throw new Error('shortUrlList', { cause: error });
        }
    }

    /**
     * Queries transfer information for a shared URL
     * <br>
     * <br>Used to check if shared files can be transferred to the user's account
     * <br>before performing the actual transfer operation.
     *
     * @param {number} shareId - The share ID from shortUrlList response
     * @param {number} fromUk - The owner user ID (uk) from shortUrlList response
     * @returns {Promise<Object>} The query transfer response JSON
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async querySurlTransfer(shareId, fromUk){
        const url = new URL(this.params.whost + '/share/querysurltransfer');
        
        try{
            if(this.data.jsToken === ''){
                await this.updateAppData();
            }
            
            url.search = new URLSearchParams({
                ...this.params.app,
                jsToken: this.data.jsToken,
                'dp-logid': this.data.logid,
                bdstoken: this.data.bdstoken,
            });
            
            const formData = new FormUrlEncoded();
            formData.append('sid', shareId);
            formData.append('suk', fromUk);
            
            const req = await request(url, {
                method: 'POST',
                body: formData.str(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
                    Referer: this.params.whost,
                },
                signal: AbortSignal.timeout(this.TERABOX_TIMEOUT),
            });
            
            if (req.statusCode !== 200) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            return rdata;
        }
        catch (error) {
            throw new Error('querySurlTransfer', { cause: error });
        }
    }

    /**
     * Transfers (saves) shared files to the user's account
     * <br>
     * <br>This method saves files from a shared link to the user's own TeraBox storage.
     * <br>The files will be copied to the specified destination path.
     *
     * @param {number} shareId - The share ID of the shared content
     * @param {number} fromUk - The user ID (uk) of the share owner
     * @param {Array<number>} fsIds - Array of file system IDs to transfer
     * @param {string} [destPath='/'] - Destination path in user's storage
     * @param {Object} [options={}] - Optional parameters
     * @param {string} [options.ondup='newcopy'] - Duplicate handling strategy
     * @returns {Promise<Object>} The transfer response JSON (includes task_id on success)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async shareTransfer(shareId, fromUk, fsIds, destPath = '/', options = {}){
        const url = new URL(this.params.whost + '/share/transfer');
        
        try{
            if(this.data.jsToken === ''){
                await this.updateAppData();
            }
            
            url.search = new URLSearchParams({
                ...this.params.app,
                jsToken: this.data.jsToken,
                'dp-logid': this.data.logid,
                ondup: options.ondup || 'newcopy',
                async: 1,
                shareid: shareId,
                from: fromUk,
            });
            
            const formData = new FormUrlEncoded();
            formData.append('fsidlist', JSON.stringify(fsIds));
            formData.append('path', destPath);
            
            const req = await request(url, {
                method: 'POST',
                body: formData.str(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
                    Referer: this.params.whost,
                },
                signal: AbortSignal.timeout(this.TERABOX_TIMEOUT),
            });
            
            if (req.statusCode !== 200) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            // Handle verification errors by refreshing token and retrying
            if(rdata.errno === 400810){
                await this.updateAppData();
                return await this.shareTransfer(shareId, fromUk, fsIds, destPath, options);
            }
            return rdata;
        }
        catch (error) {
            throw new Error('shareTransfer', { cause: error });
        }
    }
}
