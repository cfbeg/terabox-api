import { FormUrlEncoded, signDownload } from '../utilities.js';
import { request } from '../transport.js';

export default class FilesMethods {
    /**
     * Retrieves the contents of a remote directory
     * @param {string} remoteDir - Remote directory path to list
     * @param {number} [page=1] - Page number for pagination
     * @returns {Promise<Object>} The directory listing JSON (includes entries array)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async getRemoteDir(remoteDir, page = 1){
        const url = new URL(this.params.whost + '/api/list');
        
        try{
            const formData = new FormUrlEncoded();
            formData.append('order', 'name');
            formData.append('desc', 0);
            formData.append('dir', remoteDir);
            formData.append('num', 20000);
            formData.append('page', page);
            formData.append('showempty', 0);
            
            const req = await request(url, {
                method: 'POST',
                body: formData.str(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
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
            throw new Error('getRemoteDir', { cause: error });
        }
    }

    /**
     * Search remote directories and files
     * @param {string} term - term to search
     * @param {number} [page=1] - Page number for pagination
     * @returns {Promise<Object>} The file listing JSON (includes entries array)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async search(term, page = 1){
        const url = new URL(this.params.whost + '/api/search');
        
        try{
            url.searchParams.append('order', 'name');
            url.searchParams.append('desc', 0);
            url.searchParams.append('num', 1000);
            url.searchParams.append('page', page);
            url.searchParams.append('recursion', 1);
            url.searchParams.append('key', term);
            
            const req = await request(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
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
            throw new Error('search', { cause: error });
        }
    }

    /**
     * Retrieves the contents of a remote directory with specific file category
     * @param {number} [categoryId=1] - selected category:
     *     <br>1: video
     *     <br>2: audio
     *     <br>3: pictures
     *     <br>4: documents
     *     <br>5: apps (not working?)
     *     <br>6: other
     *     <br>7: torrent (now included in category 6, not working)
     * @param {string} remoteDir - Remote directory path to list
     * @param {number} [page=1] - Page number for pagination
     * @returns {Promise<Object>} The directory listing JSON (includes entries array)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async getCategoryList(categoryId = 1, remoteDir = '/', page = 1, order = 'name', desc = 0, num = 20000){
        const url = new URL(this.params.whost + '/api/categorylist');
        
        try{
            const formData = new FormUrlEncoded();
            formData.append('order', order);
            formData.append('desc', desc);
            formData.append('dir', remoteDir);
            formData.append('num', num);
            formData.append('page', page);
            formData.append('category', categoryId);
            
            const req = await request(url, {
                method: 'POST',
                body: formData.str(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
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
            throw new Error('getCategoryList', { cause: error });
        }
    }

    /**
     * Retrieves the contents of the recycle bin
     * @returns {Promise<Object>} The recycle bin listing JSON (includes entries array)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async getRecycleBin(page = 1){
        const url = new URL(this.params.whost + '/api/recycle/list');
        
        try{
            url.search = new URLSearchParams({
                // order: 'name',
                desc: 0,
                num: 20000,
                page: page,
            });
            
            
            const req = await request(url, {
                headers: {
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
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
            throw new Error('getRecycleBin', { cause: error });
        }
    }

    /**
     * Clears all items in the recycle bin
     * @returns {Promise<Object>} The clear recycle bin response JSON
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async clearRecycleBin(){
        const url = new URL(this.params.whost + '/api/recycle/clear');
        
        try{
            url.search = new URLSearchParams({
                'async': 1,
            });
            
            const req = await request(url, {
                headers: {
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
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
            throw new Error('clearRecycleBin', { cause: error });
        }
    }

    /**
     * Retrieves file difference (delta) information for synchronization
     * @returns {Promise<Object>} The file diff JSON (includes entries, request_id, has_more flag)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200, request fails, or on recursive errors
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async fileDiff(){
        const formData = new FormUrlEncoded();
        formData.append('cursor', this.params.cursor);
        if(this.params.cursor === 'null'){
            formData.append('c', 'full');
        }
        formData.append('action', 'manual');
        
        const url = new URL(this.params.whost + '/api/filediff');
        url.search = new URLSearchParams({
            ...this.params.app,
            block_list: 1,
            // rand: '',
            // time: '',
            // vip: this.params.vip_type,
            // wp_retry_num: 2,
            // lang: this.params.lang,
            // logid: '',
        });
        
        try{
            const req = await request(url, {
                method: 'POST',
                body: formData.str(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
                },
                signal: AbortSignal.timeout(this.TERABOX_TIMEOUT),
            });
            
            if (req.statusCode !== 200) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            if(rdata.errno === 0){
                this.params.cursor = rdata.cursor;
                if(!Array.isArray(rdata.request_id)){
                    rdata.request_id = [ rdata.request_id ];
                }
                if(rdata.has_more){
                    // Extra FileDiff request...
                    const rFileDiff = await this.fileDiff();
                    if(rFileDiff.errno === 0){
                        rdata.reset = rFileDiff.reset;
                        rdata.request_id = rdata.request_id.concat(rFileDiff.request_id);
                        rdata.entries = Object.assign({}, rdata.entries, rFileDiff.entries);
                        rdata.has_more = rFileDiff.has_more;
                    }
                }
            }
            return rdata;
        }
        catch (error) {
            this.params.cursor = 'null';
            throw new Error('fileDiff', { cause: error });
        }
    }

    /**
     * Generates a PAN token for subsequent API requests
     * @returns {Promise<Object>} The PAN token response JSON (includes pan token and expire)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async genPanToken(){
        const url = new URL(this.params.whost + '/api/pantoken');
        
        try{
            url.search = new URLSearchParams({
                ...this.params.app,
                lang: this.params.lang,
                u: 'https://www.terabox.com',
            });
            
            const req = await request(url, {
                headers: {
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
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
            throw new Error('genPanToken', { cause: error });
        }
    }

    /**
     * Retrieves home page information (user info, sign data)
     * @returns {Promise<Object>} The home info JSON (includes sign1, sign3, data.signb)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async getHomeInfo(){
        const url = new URL(this.params.whost + '/api/home/info');
        
        try{
            const req = await request(url, {
                headers: {
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
                },
                signal: AbortSignal.timeout(this.TERABOX_TIMEOUT),
            });
            
            if (req.statusCode !== 200) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            if(rdata.errno === 0){
                rdata.data.signb = signDownload(rdata.data.sign3, rdata.data.sign1);
            }
            return rdata;
        }
        catch (error) {
            throw new Error('getHomeInfo', { cause: error });
        }
    }

    /**
     * Initiates a download request for specified file IDs
     * @param {Array<number>} fs_ids - Array of file system IDs to download
     * @param {string} signb - Base64-encoded signature from getHomeInfo
     * @returns {Promise<Object>} The download response JSON (includes dlink URLs)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async download(fs_ids){
        const url = new URL(this.params.whost + '/api/download');
        
        try{
            const homeInfo = await this.getHomeInfo();
            if(homeInfo.errno !== 0){
                throw new Error('API error! Bad HomeInfo response');
            }
            
            const formData = new FormUrlEncoded({
                fidlist: JSON.stringify(fs_ids),
                type: 'dlink',
                vip: 2, // this.params.vip_type
                sign: homeInfo.data.signb,
                timestamp: homeInfo.data.timestamp,
                need_speed: 1, // Premium speed?..
            });
            
            const req = await request(url, {
                method: 'POST',
                body: formData.str(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
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
            throw new Error('download', { cause: error });
        }
    }

    /**
     * Retrieves the streaming contents of a remote file
     * @param {string} remotePath - Remote video file
     * @param {string} type - Streaming type:
     *    <br>M3U8_FLV_264_480
     *    <br>M3U8_AUTO_240
     *    <br>M3U8_AUTO_360
     *    <br>M3U8_AUTO_480
     *    <br>M3U8_AUTO_720
     *    <br>M3U8_AUTO_1080
     *    <br>M3U8_SUBTITLE_SRT
     * @returns {Promise<Object>} m3u8 playlist, or JSON with error
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async getStream(remotePath = '/video.mp4', type = 'M3U8_AUTO_480'){
        const url = new URL(this.params.whost + '/api/streaming');
        
        try{
            const formData = new FormUrlEncoded();
            formData.append('path', remotePath);
            formData.append('type', type);
            formData.append('vip', 2);
            
            const req = await request(url, {
                method: 'POST',
                body: formData.str(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
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
            throw new Error('getStream', { cause: error });
        }
    }

    /**
     * Retrieves metadata for specified remote files
     * @param {Array<Object>} remote_file_list - Array of file descriptor objects { fs_id, path, etc. }
     * @returns {Promise<Object>} The file metadata JSON (includes size, md5, etc.)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async getFileMeta(remote_file_list){
        const url = new URL(this.params.whost + '/api/filemetas');
        
        try{
            const formData = new FormUrlEncoded({
                dlink: 1,
                origin: 'dlna',
                target: JSON.stringify(remote_file_list),
            });
            
            const req = await request(url, {
                method: 'POST',
                body: formData.str(),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
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
            throw new Error('getFileMeta', { cause: error });
        }
    }

    /**
     * Retrieves a list of recent uploads for the account
     * @param {number} [page=1] - Page number for pagination
     * @returns {Promise<Object>} The recent uploads JSON (includes records array)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async getRecentUploads(page = 1){
        const url = new URL(this.params.whost + '/rest/recent/listall');
        
        try{
            url.search = new URLSearchParams({
                ...this.params.app,
                version:  this.params.ver_android,
                // num: 20000, ???
                // page: page, // ???
            });
            
            const req = await request(url, {
                method: 'GET',
                headers: {
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
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
            throw new Error('getRecentUploads', { cause: error });
        }
    }
}
