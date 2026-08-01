import crypto from 'node:crypto';

/**
 * A utility class for handling application/x-www-form-urlencoded data
 * Wraps URLSearchParams with additional convenience methods and encoding behavior
 * @class
 */
class FormUrlEncoded {
    /**
     * Creates a new FormUrlEncoded instance
     * @param {Object.<string, string>} [params] - Optional initial parameters as key-value pairs
     * @example
     * const form = new FormUrlEncoded({ foo: 'bar', baz: 'qux' });
     */
    constructor(params) {
        this.data = new URLSearchParams();
        if(typeof params === 'object' && params !== null){
            for (const [key, value] of Object.entries(params)) {
                this.data.append(key, value);
            }
        }
    }
    /**
     * Sets or replaces a parameter value
     * @param {string} param - The parameter name
     * @param {string} value - The parameter value
     * @returns {void}
     */
    set(param, value){
        this.data.set(param, value);
    }
    /**
     * Appends a new value to an existing parameter
     * @param {string} param - The parameter name
     * @param {string} value - The parameter value
     * @returns {void}
     */
    append(param, value){
        this.data.append(param, value);
    }
    /**
     * Removes a parameter
     * @param {string} param - The parameter name to remove
     * @returns {void}
     */
    delete(param){
        this.data.delete(param);
    }
    /**
     * Returns the encoded string representation (space encoded as %20)
     * Suitable for application/x-www-form-urlencoded content
     * @returns {string} The encoded form data
     * @example
     * form.str(); // returns "foo=bar&baz=qux"
     */
    str(){
        return this.data.toString().replace(/\+/g, '%20');
    }
    /**
     * Returns the underlying URLSearchParams object
     * @returns {URLSearchParams} The native URLSearchParams instance
     */
    url(){
        return this.data;
    }
}

/**
 * Constructs a remote file path by combining a directory and filename, ensuring proper slash formatting
 * @param {string} sdir - The directory path (with or without trailing slash)
 * @param {string} sfile - The filename to append to the directory path
 * @returns {string} The combined full path with exactly one slash between directory and filename
 * @example
 * makeRemoteFPath('documents', 'file.txt')    // returns 'documents/file.txt'
 * makeRemoteFPath('documents/', 'file.txt')   // returns 'documents/file.txt'
 * @ignore
 */
function makeRemoteFPath(sdir, sfile){
    const tdir = sdir.match(/\/$/) ? sdir : sdir + '/';
    return tdir + sfile;
}

/**
 * Generates a signed download token using a modified RC4-like algorithm
 *
 * This function implements a stream cipher similar to RC4 that:
 * <br>1. Initializes a permutation array using the secret key (s1)
 * <br>2. Generates a pseudorandom keystream
 * <br>3. XORs the input data (s2) with the keystream
 * <br>4. Returns the result as a Base64-encoded string
 *
 * @param {string} s1 - The secret key used for signing (should be at least 1 character)
 * @param {string} s2 - The input data to be signed
 * @returns {string} Base64-encoded signature
 * @example
 * const signature = signDownload('secret-key', 'data-to-sign');
 * // Returns something like: "X3p8YFJjUA=="
 */
function signDownload(s1, s2) {
    const p = new Uint8Array(256);
    const a = new Uint8Array(256);
    const result = [];

    for (let i = 0; i < 256; i++) {
        a[i] = s1.charCodeAt(i % s1.length);
        p[i] = i;
    }

    let j = 0;
    for (let i = 0; i < 256; i++) {
        j = (j + p[i] + a[i]) % 256;
        [p[i], p[j]] = [p[j], p[i]];
    }

    let i = 0; j = 0;
    for (let q = 0; q < s2.length; q++) {
        i = (i + 1) % 256;
        j = (j + p[i]) % 256;
        [p[i], p[j]] = [p[j], p[i]];
        const k = p[(p[i] + p[j]) % 256];
        result.push(s2.charCodeAt(q) ^ k);
    }

    return Buffer.from(result).toString('base64');
}

/**
 * Validates whether a string is a properly formatted MD5 hash
 * <br>
 * <br>Checks if the input:
 * <br>1. Is exactly 32 characters long
 * <br>2. Contains only hexadecimal characters (a-f, 0-9)
 * <br>3. Is in lowercase
 * <br>
 * <br>Note: This only validates the format, not the cryptographic correctness of the hash.
 *
 * @param {*} md5 - The value to check (typically a string)
 * @returns {boolean} True if the input is a valid MD5 format, false otherwise
 * @example
 * checkMd5val('d41d8cd98f00b204e9800998ecf8427e') // returns true
 * checkMd5val('D41D8CD98F00B204E9800998ECF8427E') // returns false (uppercase)
 * checkMd5val('z41d8cd98f00b204e9800998ecf8427e') // returns false (invalid character)
 * checkMd5val('d41d8cd98f')                       // returns false (too short)
 */
function checkMd5val(md5){
    if(typeof md5 !== 'string') return false;
    return /^[a-f0-9]{32}$/.test(md5);
}

/**
 * Validates that all elements in an array are properly formatted MD5 hashes
 * <br>
 * <br>Checks if:
 * <br>1. The input is an array
 * <br>2. Every element in the array passes checkMd5val() validation
 * <br>(32-character hexadecimal strings in lowercase)
 *
 * @param {*} arr - The array to validate
 * @returns {boolean} True if all elements are valid MD5 hashes, false otherwise
 *                   (also returns false if input is not an array)
 * @see {@link module:api~checkMd5val|Function CheckMd5Val} for individual MD5 hash validation logic
 *
 * @example
 * checkMd5arr(['d41d8cd98f00b204e9800998ecf8427e', '5d41402abc4b2a76b9719d911017c592']) // true
 * checkMd5arr(['d41d8cd98f00b204e9800998ecf8427e', 'invalid']) // false
 * checkMd5arr('not an array') // false
 * checkMd5arr([]) // false (empty array is considered invalid)
 */
function checkMd5arr(arr) {
    if (!Array.isArray(arr)) return false;
    if (arr.length === 0) return false;
    return arr.every(item => {
        return checkMd5val(item);
    });
}

/**
 * Applies a custom transformation to what appears to be an MD5 hash
 * <br>
 * <br>This function performs a series of reversible transformations on an input string
 * <br>that appears to be an MD5 hash (32 hexadecimal characters). The transformation includes:
 * <br>1. Character restoration at position 9
 * <br>2. XOR operation with position-dependent values
 * <br>3. Byte reordering of the result
 *
 * @param {string} md5 - The input string (expected to be 32 hexadecimal characters)
 * @returns {string} The transformed result (32 hexadecimal characters)
 * @throws Will return the original input unchanged if length is not 32
 *
 * @example
 * decodeMd5('a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6') // returns transformed value
 * decodeMd5('short') // returns 'short' (unchanged)
 */
function decodeMd5(md5) {
    // Return unchanged if not 32 characters
    if (md5.length !== 32) return md5;
    
    // Restore character at position 9
    const restoredHexChar = (md5.charCodeAt(9) - 'g'.charCodeAt(0)).toString(16);
    const o = md5.slice(0, 9) + restoredHexChar + md5.slice(10);
    
    // Apply XOR transformation to each character
    let n = '';
    for (let i = 0; i < o.length; i++) {
        const orig = parseInt(o[i], 16) ^ (i & 15);
        n += orig.toString(16);
    }
    
    // Reorder the bytes in the result
    const e =
        n.slice(8, 16) +  // original bytes 8-15 (now first)
        n.slice(0, 8) +   // original bytes 0-7 (now second)
        n.slice(24, 32) + // original bytes 24-31 (now third)
        n.slice(16, 24);   // original bytes 16-23 (now last)
    
    return e;
}

/**
 * Converts between standard and URL-safe Base64 encoding formats
 * <br>
 * <br>Base64 strings may contain '+', '/' and '=' characters that need to be replaced
 * <br>for safe use in URLs. This function provides bidirectional conversion:
 * <br>- Mode 1: Converts to URL-safe Base64 (RFC 4648 §5)
 * <br>- Mode 2: Converts back to standard Base64
 *
 * @param {string} str - The Base64 string to convert
 * @param {number} [mode=1] - Conversion direction:
 *                            1 = to URL-safe (default),
 *                            2 = to standard
 * @returns {string} The converted Base64 string
 *
 * @example
 * // To URL-safe Base64
 * changeBase64Type('a+b/c=') // returns 'a-b_c='
 *
 * // To standard Base64
 * changeBase64Type('a-b_c=', 2) // returns 'a+b/c='
 *
 * @see {@link https://tools.ietf.org/html/rfc4648#section-5|RFC 4648 §5} for URL-safe Base64
 */
function changeBase64Type(str, mode = 1) {
    return mode === 1
        ? str.replace(/\+/g, '-').replace(/\//g, '_')  // to url-safe
        : str.replace(/-/g,  '+').replace(/_/g,  '/'); // to standard
}

/**
 * Decrypts AES-128-CBC encrypted data using provided parameters
 * <br>
 * <br>This function:
 * <br>1. Converts both parameters from URL-safe Base64 to standard Base64
 * <br>2. Extracts the IV (first 16 bytes) and ciphertext from pp1
 * <br>3. Uses pp2 as the decryption key
 * <br>4. Performs AES-128-CBC decryption
 *
 * @param {string} pp1 - Combined IV and ciphertext in URL-safe Base64 format:
 *                      First 16 bytes are IV, remainder is ciphertext
 * @param {string} pp2 - Encryption key in URL-safe Base64 format
 * @returns {string} The decrypted UTF-8 string
 * @throws {Error} May throw errors for invalid inputs or decryption failures
 *
 * @example
 * // Example usage (with actual encrypted data)
 * const decrypted = decryptAES(
 *     'MTIzNDU2Nzg5MDEyMzQ1Ng==...',  // IV + ciphertext
 *     'c2VjcmV0LWtleS1kYXRhCg=='      // Key
 * );
 *
 * @requires crypto Node.js crypto module
 * @see {@link module:api~changeBase64Type|Function ChangeBase64Type} for Base64 format conversion
 */
function decryptAES(pp1, pp2) {
    // Convert from URL-safe Base64 to standard Base64
    pp1 = changeBase64Type(pp1, 2);
    pp2 = changeBase64Type(pp2, 2);
    
    // Extract ciphertext (after first 16 bytes) and IV (first 16 bytes)
    const cipherText = pp1.substring(16);
    const key = Buffer.from(pp2, 'utf8');
    const iv = Buffer.from(pp1.substring(0, 16), 'utf8');
    
    // Create decipher with AES-128-CBC algorithm
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    
    // Perform decryption
    let decrypted = decipher.update(cipherText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

/**
 * Encrypts data using RSA with a public key, with optional MD5 preprocessing
 * <br>
 * <br>Supports two encryption modes:
 * <br>1. Direct encryption of the message (default)
 * <br>2. MD5 hash preprocessing (applies MD5 + length padding before encryption)
 *
 * @param {string} message - The plaintext message to encrypt
 * @param {string|Buffer} publicKeyPEM - RSA public key in PEM format
 * @param {number} [mode=1] - Encryption mode:
 *                            1 = direct encryption,
 *                            2 = MD5 hash preprocessing
 * @returns {string} Base64-encoded encrypted data
 * @throws {Error} May throw errors for invalid keys or encryption failures
 *
 * @example
 * // Direct encryption
 * encryptRSA('secret message', publicKey);
 *
 * // With MD5 preprocessing
 * encryptRSA('secret message', publicKey, 2);
 *
 * @requires crypto Node.js crypto module
 */
function encryptRSA(message, publicKeyPEM, mode = 1) {
    // Mode 2: Apply MD5 hash and length padding
    if (mode === 2) {
        const md5 = crypto.createHash('md5').update(message).digest('hex');
        message = md5 + (md5.length<10?'0':'') + md5.length;
    }
    
    // Convert message to Buffer
    const buffer = Buffer.from(message, 'utf8');
    
    // Perform RSA encryption
    const encrypted = crypto.publicEncrypt({
        key: publicKeyPEM,
        padding: crypto.constants.RSA_PKCS1_PADDING,
    }, buffer);
    
    // Return as Base64 string
    return encrypted.toString('base64');
}

/**
 * Generates a pseudo-random SHA-1 hash from combined client parameters
 * <br>
 * <br>Creates a deterministic hash value by combining multiple client-specific parameters.
 * <br>This is typically used for generating session tokens or unique identifiers.
 *
 * @param {string} [client='web'] - Client identifier (e.g., 'web', 'mobile')
 * @param {string} seval - Session evaluation parameter
 * @param {string} encpwd - Encrypted password or password hash
 * @param {string} email - User's email address
 * @param {string} [browserid=''] - Browser fingerprint or identifier
 * @param {string} random - Random value
 * @returns {string} SHA-1 hash of the combined parameters (40-character hex string)
 *
 * @example
 * // Basic usage
 * const token = prandGen('web', 'session123', 'encryptedPwd', 'user@example.com', 'browser123', 'randomValue');
 *
 * // With default client and empty browserid
 * const token = prandGen(undefined, 'session123', 'encryptedPwd', 'user@example.com', '', 'randomValue');
 *
 * @requires crypto Node.js crypto module
 */
function prandGen(client = 'web', seval, encpwd, email, browserid = '', random) {
    // Combine all parameters with hyphens
    const combined = `${client}-${seval}-${encpwd}-${email}-${browserid}-${random}`;
    
    // Generate SHA-1 hash and return as hex string
    return crypto.createHash('sha1').update(combined).digest('hex');
}

export { FormUrlEncoded, makeRemoteFPath, signDownload, checkMd5val, checkMd5arr, decodeMd5, changeBase64Type, decryptAES, encryptRSA, prandGen };

