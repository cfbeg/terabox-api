import { FormUrlEncoded } from '../utilities.js';
import { request } from '../transport.js';

export default class RemoteMethods {
    /**
     * Attempts a upload file from remote server
     * @param {string} urls - Source urls (coma-separated)
     * @param {string} remote_dir - Remote directory path
     * @returns {Promise<Object>} The remote upload response JSON (indicates success or fallback)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200, or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async remoteUpload(urls, remote_dir = '/Remote Upload'){
        const formData = new FormUrlEncoded({
            urls: urls,
            upload_to: remote_dir,
        });
        
        const url = new URL(this.params.whost + '/api/webmaster/remoteupload/submit');
        
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
            return rdata;
        }
        catch (error) {
            throw new Error('remoteUpload', { cause: error });
        }
    }

    /**
     * Get RemoteUpload list
     * @param {string} page      - page number
     * @param {string} page_size - items per page
     * @param {string} order_by  - sort by field, for example "ctime"
     * @param {string} order     - asc or desc
     * @returns {Promise<Object>} Response JSON (indicates success or fallback)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200, or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async remoteUploadList(page = 1, page_size = 20, order_by = 'ctime', order = 'desc'){
        const formData = new FormUrlEncoded({
            page: page,
            page_size: page_size,
            order: order,
            by: order_by,
        });
        
        const url = new URL(this.params.whost + '/api/webmaster/remoteupload/record');
        
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
            return rdata;
        }
        catch (error) {
            throw new Error('remoteUploadList', { cause: error });
        }
    }

    /**
     * Remove task from remote upload api
     * @param {string} task_id - task id to remove
     * @returns {Promise<Object>} Response JSON (indicates success or fallback)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200, or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async remoteUploadDelete(task_id){
        const formData = new FormUrlEncoded({
            task_id: task_id,
        });
        
        const url = new URL(this.params.whost + '/api/webmaster/remoteupload/delete');
        
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
            return rdata;
        }
        catch (error) {
            throw new Error('remoteUpload', { cause: error });
        }
    }

    /**
     * Cloud_DL service: Get task list
     * @param {string} start  - task list offset
     * @param {string} limit  - tasks per page
     * @param {string} status - list tasks status filter,
     *     <br>0: Download successful
     *     <br>1: Download in progress
     *     <br>2: System error
     *     <br>3: The resource does not exist
     *     <br>4: Download timeout
     *     <br>5: The resource exists but the download failed
     *     <br>6: Insufficient storage space
     *     <br>7: The target address data already exists
     *     <br>8: Task canceled
     *     <br>255: All tasks
     * @returns {Promise<Object>} Cloud_DL service task list JSON
     * @async
     * @throws {Error} Throws error if HTTP status is not 200, or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async clouddl_tasklist(start = 0, limit = 20, status = 255){
        const formData = new FormUrlEncoded({
            method: 'list_task',
            need_task_info: 1,
            start: start,
            limit: limit,
            status: status,
        });
        
        const url = new URL(this.params.whost + '/rest/2.0/services/cloud_dl');
        url.search = new URLSearchParams({
            ...this.params.app,
            bdstoken: this.data.bdstoken,
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
            return rdata;
        }
        catch (error) {
            throw new Error('clouddl_tasklist', { cause: error });
        }
    }

    /**
     * Cloud_DL service: Query task info
     * @param {string} op_type  - Operation type; 0: Check task information, 1: Check progress information
     * @param {string} task_ids - Task ID info (comma-separated)
     * @returns {Promise<Object>} Cloud_DL service task info JSON
     * @async
     * @throws {Error} Throws error if HTTP status is not 200/403, or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async clouddl_query_task(op_type, task_ids){
        const formData = new FormUrlEncoded({
            method: 'query_task',
            task_ids: task_ids,
            op_type: op_type,
        });
        
        const url = new URL(this.params.whost + '/rest/2.0/services/cloud_dl');
        url.search = new URLSearchParams({
            ...this.params.app,
            bdstoken: this.data.bdstoken,
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
            
            if (![200, 403].includes(req.statusCode)) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            return rdata;
        }
        catch (error) {
            throw new Error('clouddl_query_task', { cause: error });
        }
    }

    /**
     * Cloud_DL service: Add task
     * @param {string} source       - remote torrent file path, ed2k, magnet or https link
     * @param {string} sha1hash     - torrent hash (fetch it from clouddl_query_sinfo), required for torrent
     * @param {string} save_path    - remote save path (directory)
     * @param {string} selected_idx - select file indexes from torrent file / magnet (comma-separated with starting index 1)
     * @returns {Promise<Object>} Cloud_DL service task info JSON
     * @async
     * @throws {Error} Throws error if HTTP status is not 200/400/403/405/500, or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async clouddl_add_task(source = '', sha1hash = '', selected_idx = '', save_path = '/Remote Upload'){
        const formData = new FormUrlEncoded({
            timeout: 1000 * 60 * 60 * 24,
            method: 'add_task',
        });
        
        try{
            if(typeof source !== 'string'){
                throw new Error('Source should be string!');
            }
            
            source = source.trim();
            const srcLC = source.toLowerCase();
            
            if(srcLC.startsWith('http://') || srcLC.startsWith('https://')){
                formData.append('type', '0'); // 0 is http(s) link
                formData.append('task_from', '0');
                formData.append('source_url', source);
            }
            else if(srcLC.startsWith('/') && srcLC.endsWith('.torrent')){
                formData.append('type', '2'); // 2 is torrent file
                formData.append('task_from', '2');
                formData.append('file_sha1', sha1hash);
                formData.append('source_path', source);
                formData.append('selected_idx', selected_idx);
            }
            else if(srcLC.startsWith('ed2k://')){
                formData.append('type', '3'); // 3 is ed2k link
                formData.append('source_url', source);
            }
            else if(srcLC.startsWith('magnet:')){
                formData.append('type', '4'); // 4 is magnet link
                formData.append('task_from', '1');
                formData.append('source_url', source);
                formData.append('selected_idx', selected_idx);
            }
            else{
                throw new Error('Unknown Source value!');
            }
        
            formData.append('save_path', save_path);
            
            // alternative url is
            // 'https://od.' + this.TERABOX_DOMAIN + '/api/od_dl'
            const url = new URL(this.params.whost + '/rest/2.0/services/cloud_dl');
            
            url.search = new URLSearchParams({
                ...this.params.app,
                bdstoken: this.data.bdstoken,
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
            
            if (![200, 400, 403, 405, 500].includes(req.statusCode)) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            return rdata;
        }
        catch (error) {
            throw new Error('clouddl_add_task', { cause: error });
        }
    }

    /**
     * Cloud_DL service: Cancel task
     * @param {string} task_id - Task to cancel by id
     * @returns {Promise<Object>} Cloud_DL service task info JSON
     * @async
     * @throws {Error} Throws error if HTTP status is not 200/400/404/409, or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async clouddl_cancel_task(task_id){
        const formData = new FormUrlEncoded({
            method: 'cancel_task',
            task_id: task_id,
            
        });
        
        const url = new URL(this.params.whost + '/rest/2.0/services/cloud_dl');
        url.search = new URLSearchParams({
            ...this.params.app,
            bdstoken: this.data.bdstoken,
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
            
            if (![200, 400, 404, 409].includes(req.statusCode)) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            return rdata;
        }
        catch (error) {
            throw new Error('clouddl_cancel_task', { cause: error });
        }
    }

    /**
     * Cloud_DL service: Delete task
     * @param {string} task_id - Task to delete by id
     * @returns {Promise<Object>} Cloud_DL service task info JSON
     * @async
     * @throws {Error} Throws error if HTTP status is not 200/400/403/404, or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async clouddl_delete_task(task_id){
        const formData = new FormUrlEncoded({
            method: 'delete_task',
            task_id: task_id,
            
        });
        
        const url = new URL(this.params.whost + '/rest/2.0/services/cloud_dl');
        url.search = new URLSearchParams({
            ...this.params.app,
            //jsToken: this.data.jsToken,
            bdstoken: this.data.bdstoken,
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
            
            if (![200, 400, 403, 404].includes(req.statusCode)) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            return rdata;
        }
        catch (error) {
            throw new Error('clouddl_delete_task', { cause: error });
        }
    }

    /**
     * Cloud_DL service: Query torrent file info
     * @param {string} source_path - file path to the torrent file on TB drive
     * @returns {Promise<Object>} Cloud_DL torrent file info JSON
     * @async
     * @throws {Error} Throws error if HTTP status is not 200/400/403/404/500, or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async clouddl_query_sinfo(source_path){
        const url = new URL(this.params.whost + '/rest/2.0/services/cloud_dl');
        
        url.search = new URLSearchParams({
            method: 'query_sinfo',
            ...this.params.app,
            //bdstoken: this.data.bdstoken,
            source_path: source_path,
            type: 2,
        });
        
        try{
            const req = await request(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
                },
                signal: AbortSignal.timeout(this.TERABOX_TIMEOUT),
            });
            
            if (![200, 403, 400, 404, 500].includes(req.statusCode)) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            return rdata;
        }
        catch (error) {
            throw new Error('clouddl_query_sinfo', { cause: error });
        }
    }

    /**
     * Cloud_DL service: Query magnet link info
     * @param {string} magnet_link - magnet link url
     * @returns {Promise<Object>} Cloud_DL magnet link info JSON
     * @async
     * @throws {Error} Throws error if HTTP status is not 200/403, or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async clouddl_query_magnetinfo(magnet_link){
        const formData = new FormUrlEncoded({
            method: 'query_magnetinfo',
            source_url: magnet_link,
            type: 4,
        });
        
        const url = new URL(this.params.whost + '/rest/2.0/services/cloud_dl');
        
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
            
            if (![200, 403].includes(req.statusCode)) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            return rdata;
        }
        catch (error) {
            throw new Error('clouddl_query_magnetinfo', { cause: error });
        }
    }
}
