import { request } from '../transport.js';

export default class AccountMethods {
    /**
     * Sets default VIP parameters
     * @returns {void}
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    setVipDefaults(){
        this.params.is_vip = true;
        this.params.vip_type = 1; // 1: VIP, 2: SVIP
        this.params.space_total = Math.pow(1024, 3) * 2;
        this.params.space_available = Math.pow(1024, 3) * 2;
    }

    /**
     * Retrieves system configuration from the TeraBox API
     * @returns {Promise<Object>} The system configuration JSON data
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async getSysCfg(){
        const url = new URL(this.params.whost + '/api/getsyscfg');
        url.search = new URLSearchParams({
            clienttype: this.params.app.clienttype,
            language_type: this.params.lang,
            cfg_category_keys: '[]',
            version: 0,
        });
        
        try{
            const req = await request(url, {
                headers: {
                    'User-Agent': this.params.ua,
                    // 'Cookie': this.params.cookie,
                },
                signal: AbortSignal.timeout(this.TERABOX_TIMEOUT),
            });
            
            if (req.statusCode !== 200) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            return rdata;
        }
        catch(error){
            throw new Error('getSysCfg', { cause: error });
        }
    }

    /**
     * Retrieves passport user information for the current session
     * @returns {Promise<Object>} The passport user info JSON (includes display_name)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async passportGetInfo(){
        const url = new URL(this.params.whost + '/passport/get_info');
        
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
                this.params.account_name = rdata.data.display_name;
            }
            return rdata;
        }
        catch (error) {
            throw new Error('getPassport', { cause: error });
        }
    }

    /**
     * Fetches membership information for the current user
     * @returns {Promise<Object>} The membership JSON (includes VIP status)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async userMembership(){
        const url = new URL(this.params.whost + '/rest/2.0/membership/proxy/user');
        url.search = new URLSearchParams({
            method: 'query',
        });
        
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
            if(rdata.error_code === 0){
                this.params.is_vip = rdata.data.member_info.is_vip > 0 ? true : false;
                // this.params.vip_type = this.params.is_vip ? 2 : 0;
                if(this.params.is_vip === 0){
                    this.params.vip_type = 0;
                }
            }
            return rdata;
        }
        catch(error){
            throw new Error('userMembership', { cause: error });
        }
    }

    /**
     * Retrieves current user information (username, VIP status)
     * @returns {Promise<Object>} The user info JSON (includes records array)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async getCurrentUserInfo(){
        try{
            if(this.params.account_id === 0){
                await this.checkLogin();
            }
            
            const curUser = await this.getUserInfo(this.params.account_id);
            if(curUser.records.length > 0){
                const thisUser = curUser.records[0];
                this.params.account_name = thisUser.uname;
                this.params.is_vip = thisUser.vip_type > 0 ? true : false;
                this.params.vip_type = thisUser.vip_type;
            }
            return curUser;
        }
        catch (error) {
            throw new Error('getCurrentUserInfo', { cause: error });
        }
    }

    /**
     * Retrieves information for a specific user ID
     * @param {number|string} user_id - The user ID to look up
     * @returns {Promise<Object>} The user info JSON (includes data)
     * @async
     * @throws {Error} Throws error if user_id is invalid, HTTP status is not 200, or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async getUserInfo(user_id){
        user_id = parseInt(user_id);
        const url = new URL(this.params.whost + '/api/user/getinfo');
        url.search = new URLSearchParams({
            user_list: JSON.stringify([user_id]),
            need_relation: 0,
            need_secret_info: 1,
        });
        
        try{
            if(isNaN(user_id) || !Number.isSafeInteger(user_id)){
                throw new Error(`${user_id} is not user id`);
            }
            
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
            throw new Error('getUserInfo', { cause: error });
        }
    }

    /**
     * Retrieves storage quota information for the current account
     * @returns {Promise<Object>} The quota JSON (includes total, used, available)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async getQuota(){
        const url = new URL(this.params.whost + '/api/quota');
        url.search = new URLSearchParams({
            checkexpire: 1,
            checkfree: 1,
        });
        
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
                rdata.available = rdata.total - rdata.used;
                this.params.space_available = rdata.available;
                this.params.space_total = rdata.total;
                this.params.space_used = rdata.used;
            }
            return rdata;
        }
        catch (error) {
            throw new Error('getQuota', { cause: error });
        }
    }

    /**
     * Set user Birthday and set adult status
     * @param {string}        birthday - User Birthday in YYYY-MM-DD format
     * @param {number|string} is_adult - Is User adult status (0 or 1)
     * @returns {Promise<Object>} Status JSON
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async setUserBirthday(birthday, is_adult){
        const url = new URL(this.params.whost + '/main/age/set');
        url.search = new URLSearchParams({
            birthday: birthday,
            is_adult: is_adult,
        });
        
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
            return rdata;
        }
        catch (error) {
            throw new Error('setUserBirthday', { cause: error });
        }
    }

    /**
     * Retrieves the user's coins count (points)
     * @returns {Promise<Object>} The coins count JSON (includes records of coin usage)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async getCoinsCount(){
        const url = new URL(this.params.whost + '/rest/1.0/inte/system/getrecord');
        
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
            return rdata;
        }
        catch (error) {
            throw new Error('getCoinsCount', { cause: error });
        }
    }
}
