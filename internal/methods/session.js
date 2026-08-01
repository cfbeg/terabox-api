import { FormUrlEncoded, changeBase64Type, decryptAES, encryptRSA, prandGen } from '../utilities.js';
import { request, updateCookies, getCookie } from '../transport.js';

export default class SessionMethods {
    /**
     * Updates application data including tokens and user information
     * @param {string} [customPath] - Custom path to use for the update request
     * @param {number} [retries=4] - Number of retry attempts
     * @returns {Promise<Object>} The updated template data
     * @async
     * @throws {Error} Throws error if request fails or parsing fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async updateAppData(customPath, retries = 4){
        const url = new URL(this.params.whost + (customPath ? `/${customPath}` : '/main'));
        
        try{
            const req = await request(url, {
                headers:{
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
                },
                signal: AbortSignal.timeout(this.TERABOX_TIMEOUT + 10000),
            });
            
            if(req.statusCode === 302){
                if(req.headers.location === '/login'){
                    req.headers.location = this.params.whost + '/login';
                }
                const newUrl = new URL(req.headers.location);
                if(this.params.whost !== newUrl.origin){
                    this.params.whost = newUrl.origin;
                    console.warn(`[WARN] Default hostname changed to ${newUrl.origin}`);
                }
                const toPathname = newUrl.pathname.replace(/^\//, '');
                const finalUrl = toPathname + newUrl.search;
                return await this.updateAppData(finalUrl, retries);
            }
            
            if(req.headers['set-cookie']){
                this.params.cookie = updateCookies(this.params.cookie, req.headers['set-cookie']);
            }
            
            const rdata = await req.body.text();
            const tdataRegex = /<script>var templateData = (.*);<\/script>/;
            const jsTokenRegex = /window.jsToken%20%3D%20a%7D%3Bfn%28%22(.*)%22%29/;
            const tdata = rdata.match(tdataRegex) ? JSON.parse(rdata.match(tdataRegex)[1].split(';</script>')[0]) : {};
            const isLoginReq = req.headers.location === '/login' ? true : false;
            
            if(tdata.jsToken){
                tdata.jsToken = tdata.jsToken.match(/%28%22(.*)%22%29/)[1];
            }
            else if(rdata.match(jsTokenRegex)){
                tdata.jsToken = rdata.match(jsTokenRegex)[1];
            }
            else if(isLoginReq){
                console.error('[ERROR] Failed to update jsToken [Login Required]');
            }
            
            if(req.headers.logid){
                this.data.logid = req.headers.logid;
            }
            
            this.data.csrf = tdata.csrf || '';
            this.data.pcftoken = tdata.pcftoken || '';
            this.data.bdstoken = tdata.bdstoken || '';
            this.data.jsToken = tdata.jsToken || '';
            
            this.params.account_id = parseInt(tdata.uk) || 0;
            if(typeof tdata.userVipIdentity === 'number' && tdata.userVipIdentity > 0){
                this.params.is_vip = true;
                this.params.vip_type = 1;
            }
            
            return tdata;
        }
        catch(error){
            if(error.name === 'TimeoutError' && retries > 0){
                await new Promise(resolve => setTimeout(resolve, 500));
                return await this.updateAppData(customPath, retries - 1);
            }
            const errorPrefix = '[ERROR] Failed to update jsToken:';
            if(error.name === 'TimeoutError'){
                console.error(errorPrefix, error.message);
                return;
            }
            const errorReturn = new Error('updateAppData', { cause: error });
            console.error(errorPrefix, errorReturn);
        }
    }

    /**
     * Makes an API request with retry logic
     * @param {string} req_url - The request URL (relative to whost)
     * @param {Object} [req_options={}] - Request options (headers, body, etc.)
     * @param {number} [retries=4] - Number of retry attempts
     * @returns {Promise<Object>} The JSON-parsed response data
     * @async
     * @throws {Error} Throws error if all retries fail
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async doReq(req_url, req_options = {}, retries = 4){
        const url = new URL(this.params.whost + req_url);
        let reqm_options = structuredClone(req_options);
        let req_headers = {};
        
        if(reqm_options.headers){
            req_headers = reqm_options.headers;
            delete reqm_options.headers;
        }
        
        const save_cookies = reqm_options.save_cookies;
        delete reqm_options.save_cookies;
        const silent_retry = reqm_options.silent_retry;
        delete reqm_options.silent_retry;
        const req_timeout = reqm_options.timeout ? reqm_options.timeout : this.TERABOX_TIMEOUT;
        delete reqm_options.timeout;
        
        try {
            const options = {
                headers: {
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
                    ...req_headers,
                },
                ...reqm_options,
                signal: AbortSignal.timeout(req_timeout),
            };
            
            const req = await request(url, options);
            
            if(save_cookies && req.headers['set-cookie']){
                this.params.cookie = updateCookies(this.params.cookie, req.headers['set-cookie']);
            }
            
            const rdata = await req.body.json();
            return rdata;
        }
        catch(error){
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, 500));
                if(!silent_retry){
                    console.error('[ERROR] DoReq:', req_url, '|', error.code, ':', error.message, '(retrying...)');
                }
                return await this.doReq(req_url, req_options, retries - 1);
            }
            throw new Error('doReq', { cause: error });
        }
    }

    /**
     * Checks login status of the current session.
     * @returns {Promise<CheckLoginResponse>} The login status JSON data.
     * @throws {Error} Throws error if HTTP status is not 200 or request fails.
     * @async
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async checkLogin(){
        const url = new URL(this.params.whost + '/api/check/login');
        
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
            
            const regionPrefix = req.headers['region-domain-prefix'];
            if(regionPrefix){
                const newHostname = `https://${regionPrefix}.${this.TERABOX_DOMAIN}`;
                console.warn(`[WARN] Default hostname changed to ${newHostname}`);
                this.params.whost = new URL(newHostname).origin;
                return await this.checkLogin();
            }
            
            const rdata = await req.body.json();
            if(rdata.errno === 0){
                this.params.account_id = rdata.uk;
            }
            return rdata;
        }
        catch(error){
            throw new Error('checkLogin', { cause: error });
        }
    }

    /**
     * Initiates the pre-login step for passport authentication
     * @param {string} email - The user's email address
     * @returns {Promise<Object>} The pre-login data JSON (includes seval, random, timestamp)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async passportPreLogin(email){
        const url = new URL(this.params.whost + '/passport/prelogin');
        const authUrl = 'wap/outlogin/login';
        
        try{
            if(this.data.pcftoken === ''){
                await this.updateAppData(authUrl);
            }
            
            const formData = new FormUrlEncoded();
            formData.append('client', 'web');
            formData.append('pass_version', '2.8');
            formData.append('clientfrom', 'h5');
            formData.append('pcftoken', this.data.pcftoken);
            formData.append('email', email);
            
            const req = await request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
                    Referer: this.params.whost,
                },
                body: formData.str(),
                signal: AbortSignal.timeout(this.TERABOX_TIMEOUT),
            });
            
            if (req.statusCode !== 200) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            return rdata;
        }
        catch (error) {
            throw new Error('passportPreLogin', { cause: error });
        }
    }

    /**
     * Completes the passport login process using preLoginData and password
     * @param {Object} preLoginData - Data returned from passportPreLogin
     * @param {string} preLoginData.seval - The seval value from pre-login.
     * @param {string} preLoginData.random - The random value from pre-login.
     * @param {number} preLoginData.timestamp - The timestamp from pre-login.
     * @param {string} email - The user's email address
     * @param {string} pass - The user's plaintext password
     * @returns {Promise<Object>} The login response JSON (includes ndus token on success)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async passportLogin(preLoginData, email, pass){
        const url = new URL(this.params.whost + '/passport/login');
        
        try{
            if(this.data.pubkey === ''){
                await this.getPublicKey();
            }
            
            const browserid = getCookie(this.params.cookie, 'browserid');
            const encpwd = changeBase64Type(encryptRSA(pass, this.data.pubkey, 2));
            
            const prand = prandGen('web', preLoginData.seval, encpwd, email, browserid, preLoginData.random);
            
            const formData = new FormUrlEncoded();
            formData.append('client', 'web');
            formData.append('pass_version', '2.8');
            formData.append('clientfrom', 'h5');
            formData.append('pcftoken', this.data.pcftoken);
            formData.append('prand', prand);
            formData.append('email', email);
            formData.append('pwd', encpwd);
            formData.append('seval', preLoginData.seval);
            formData.append('random', preLoginData.random);
            formData.append('timestamp', preLoginData.timestamp);
            
            const req = await request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
                    Referer: this.params.whost,
                },
                body: formData.str(),
                signal: AbortSignal.timeout(this.TERABOX_TIMEOUT),
            });
            
            if (req.statusCode !== 200) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            if(rdata.code === 0){
                rdata.data.ndus = getCookie(updateCookies('', req.headers['set-cookie']), 'ndus');
            }
            return rdata;
        }
        catch (error) {
            throw new Error('passportLogin', { cause: error });
        }
    }

    /**
     * Sends a registration code to the specified email
     * @param {string} email - The email address to send the code to
     * @returns {Promise<Object>} The send code response JSON (includes code and message)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async regSendCode(email){
        const url = new URL(this.params.whost + '/passport/register_v4/sendcode');
        const emailRegUrl = 'wap/outlogin/emailRegister';
        
        try{
            if(this.data.pcftoken === ''){
                await this.updateAppData(emailRegUrl);
            }
            
            const formData = new FormUrlEncoded();
            formData.append('client', 'web');
            formData.append('pass_version', '2.8');
            formData.append('clientfrom', 'h5');
            formData.append('pcftoken', this.data.pcftoken);
            formData.append('email', email);
            
            const req = await request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
                    Referer: this.params.whost,
                },
                body: formData.str(),
            });
            
            if (req.statusCode !== 200) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            // rdata.code: 0 - OK
            // rdata.code: 10 - Email format invalid
            // rdata.code: 11 - Email has been register before
            // rdata.code: 60 - Send code too fast, wait ~60sec
            return rdata;
        }
        catch (error) {
            throw new Error('regSendCode', { cause: error });
        }
    }

    /**
     * Verifies the registration code received via email
     * @param {string} regToken - Registration token from send code response
     * @param {string|number} code - The verification code sent to email
     * @returns {Promise<Object>} The verification response JSON
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async regVerify(regToken, code){
        const url = new URL(this.params.whost + '/passport/register_v4/verify');
        
        try{
            const formData = new FormUrlEncoded();
            formData.append('client', 'web');
            formData.append('pass_version', '2.8');
            formData.append('clientfrom', 'h5');
            formData.append('pcftoken', this.data.pcftoken);
            formData.append('token', regToken);
            formData.append('code', code);
            
            const req = await request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
                    Referer: this.params.whost,
                },
                body: formData.str(),
            });
            
            if (req.statusCode !== 200) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            // rdata.code: 0 - OK
            // rdata.code: 59 - Email code is wrong
            return rdata;
        }
        catch (error) {
            throw new Error('regVerify', { cause: error });
        }
    }

    /**
     * Completes the registration process by setting a password
     * @param {string} regToken - Registration token from verification step
     * @param {string} pass - The new password to set, length is 6-15 and contains at least 1 Latin letter
     * @returns {Promise<Object>} The finish registration response JSON (includes ndus token on success)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async regFinish(regToken, pass){
        const url = new URL(this.params.whost + '/passport/register_v4/finish');
        
        try{
            if(this.data.pubkey === ''){
                await this.getPublicKey();
            }
            
            if(typeof pass !== 'string' || pass.length < 6 || pass.length > 15 || !pass.match(/[a-z]/i)){
                return { code: -2, logid: 0, msg: 'invalid password', };
            }
            
            const encpwd = changeBase64Type(encryptRSA(pass, this.data.pubkey, 2));
            
            const formData = new FormUrlEncoded();
            formData.append('client', 'web');
            formData.append('pass_version', '2.8');
            formData.append('clientfrom', 'h5');
            formData.append('pcftoken', this.data.pcftoken);
            formData.append('token', regToken);
            formData.append('pwd', encpwd);
            
            const req = await request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': this.params.ua,
                    'Cookie': this.params.cookie,
                    Referer: this.params.whost,
                },
                body: formData.str(),
            });
            
            if (req.statusCode !== 200) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            if(rdata.code === 0 && req.headers['set-cookie']){
                rdata.data.ndus = getCookie(updateCookies('', req.headers['set-cookie']), 'ndus');
            }
            return rdata;
        }
        catch (error) {
            throw new Error('regFinish', { cause: error });
        }
    }

    /**
     * Retrieves the RSA public key from the server for encryption
     * @returns {Promise<Object>} The public key response JSON (includes pp1 and pp2)
     * @async
     * @throws {Error} Throws error if HTTP status is not 200 or request fails
     * @memberof module:api~TeraBoxApp
     * @instance
     */
    async getPublicKey(){
        const url = new URL(this.params.whost + '/passport/getpubkey');
        
        try{
            const req = await request(url, {
                method: 'GET',
                headers: {
                    'User-Agent': this.params.ua,
                },
                signal: AbortSignal.timeout(this.TERABOX_TIMEOUT),
            });
            
            if (req.statusCode !== 200) {
                throw new Error(`HTTP error! Status: ${req.statusCode}`);
            }
            
            const rdata = await req.body.json();
            
            if(rdata.code === 0){
                this.data.pubkey = decryptAES(rdata.data.pp1, rdata.data.pp2);
            }
            
            return rdata;
        }
        catch (error) {
            throw new Error('getPublicKey', { cause: error });
        }
    }
}
