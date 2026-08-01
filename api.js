import SessionMethods from './internal/methods/session.js';
import AccountMethods from './internal/methods/account.js';
import FilesMethods from './internal/methods/files.js';
import UploadMethods from './internal/methods/upload.js';
import RemoteMethods from './internal/methods/remote.js';
import ShareMethods from './internal/methods/share.js';

/**
 * Main module for api interacting with TeraBox
 * @module api
 */

/**
 * TeraBoxApp API client class
 *
 * Provides a comprehensive interface for interacting with TeraBox services,
 * including encryption utilities, API request handling, and session management.
 *
 * @class
 * @property {string} TERABOX_DOMAIN - Default TeraBox domain
 * @property {number} TERABOX_TIMEOUT - Default API timeout (10 seconds)
 *
 * @property {Object} data - Application data including tokens and keys
 * @property {string} data.csrf - CSRF token
 * @property {string} data.logid - Log ID
 * @property {string} data.pcftoken - PCF token
 * @property {string} data.bdstoken - BDS token
 * @property {string} data.jsToken - JavaScript token
 * @property {string} data.pubkey - Public key
 *
 * @property {TeraBoxAppParams} params - Application parameters and configuration
 */
class TeraBoxApp {
    // Constants
    TERABOX_DOMAIN = 'terabox.com';
    TERABOX_TIMEOUT = 10000;
    
    // app data
    data = {
        csrf: '',
        logid: '0',
        pcftoken: '',
        bdstoken: '',
        jsToken: '',
        pubkey: '',
    };
    
    // Application parameters and configuration
    params = {
        whost: 'https://www.' + this.TERABOX_DOMAIN,
        uhost: 'https://c-all.' + this.TERABOX_DOMAIN,
        lang: 'en',
        app: {
            app_id: 250528,
            web: 1,
            channel: 'dubox',
            clienttype: 0, // 5 is wap?
        },
        ver_android: '3.44.2',
        ua: 'terabox;1.40.0.132;PC;PC-Windows;10.0.26100;WindowsTeraBox',
        cookie: '',
        auth: {},
        account_id: 0,
        account_name: '',
        is_vip: false,
        vip_type: 0,
        space_used: 0,
        space_total: Math.pow(1024, 3),
        space_available: Math.pow(1024, 3),
        cursor: 'null',
    };
    
    /**
     * Creates a new TeraBoxApp instance
     * @param {string} authData - Authentication data (NDUS token)
     * @param {string} [authType='ndus'] - Authentication type (currently only 'ndus' supported)
     * @throws {Error} Throws error if authType is not supported
     */
    constructor(authData, authType = 'ndus') {
        this.params.cookie = `lang=${this.params.lang}`;
        if(authType === 'ndus'){
            this.params.cookie += authData ? '; ndus=' + authData : '';
        }
        else{
            throw new Error('initTBApp', { cause: 'AuthType Not Supported!' });
        }
    }
}

function installMethods(methodClass) {
    const descriptors = Object.getOwnPropertyDescriptors(methodClass.prototype);
    delete descriptors.constructor;
    Object.defineProperties(TeraBoxApp.prototype, descriptors);
}

[SessionMethods, AccountMethods, FilesMethods, UploadMethods, RemoteMethods, ShareMethods].forEach(installMethods);

export default TeraBoxApp;
export { TeraBoxApp };
