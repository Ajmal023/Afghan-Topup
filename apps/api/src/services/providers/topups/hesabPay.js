import axios from "axios";
import CryptoJS from "crypto-js";


function encryptPin(key, iv, data) {
    const CIPHER_KEY_LEN = 16; 
    

    let processedKey = key;
    if (processedKey.length < CIPHER_KEY_LEN) {
        processedKey = processedKey.padEnd(CIPHER_KEY_LEN, "0");
    } else if (processedKey.length > CIPHER_KEY_LEN) {
        processedKey = processedKey.substring(0, CIPHER_KEY_LEN);
    }
    
    const keyWordArray = CryptoJS.enc.Utf8.parse(processedKey);
    const ivWordArray = CryptoJS.enc.Utf8.parse(iv);
    const dataWordArray = CryptoJS.enc.Utf8.parse(data);
    
    const encrypted = CryptoJS.AES.encrypt(dataWordArray, keyWordArray, {
        iv: ivWordArray,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    
    const encryptedDataWordArray = encrypted.ciphertext;
    const encodedEncryptedData = CryptoJS.enc.Base64.stringify(encryptedDataWordArray);
    const encodedIV = CryptoJS.enc.Base64.stringify(ivWordArray);
    const encryptedPayload = encodedEncryptedData + ":" + encodedIV;
    
    let hexEncodedPayload = '';
    for (let i = 0; i < encryptedPayload.length; i++) {
        const charCode = encryptedPayload.charCodeAt(i);
        const hexChar = charCode.toString(16);
        hexEncodedPayload += (hexChar.length < 2 ? '0' : '') + hexChar;
    }
    
    return hexEncodedPayload;
}


function getAuthHeader(clientId, clientSecret) {
    const credentials = `${clientId}:${clientSecret}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

export const hesabPayTopupProvider = {
    name: "hesabpay",

    /**
     * @param { order, item, variant, externalId }
     * 
     */
    async topup({ order, item, variant, externalId }) {
        const endpoint = process.env.HESABPAY_TOPUP_ENDPOINT || "https://api.hesabpay.com/thirdparty/wallet/top-up";
        const clientId = process.env.HESABPAY_CLIENT_ID;
        const clientSecret = process.env.HESABPAY_CLIENT_SECRET;
        const bankHeader = process.env.HESABPAY_BANK_HEADER || "test";
        const encryptionKey = process.env.HESABPAY_ENCRYPTION_KEY || "98jK6Y7tlYh6Z87D";
        const encryptionIv = process.env.HESABPAY_ENCRYPTION_IV || "XY4tlJRYewqFhg5T";
        const sourceAccount = process.env.HESABPAY_SOURCE_ACCOUNT;
        const sourcePin = process.env.HESABPAY_SOURCE_PIN;


        if (!clientId || !clientSecret || !sourceAccount || !sourcePin) {
            return {
                status: "failed",
                error_code: "CONFIGURATION",
                error_message: "Missing required HesabPay configuration (clientId, clientSecret, sourceAccount, sourcePin)",
                request: null,
                response: null
            };
        }

        const rechargeAmount = item?.unit_price_minor ?? variant?.amount_minor;

        if (rechargeAmount < 25 || rechargeAmount > 5000) {
            return {
                status: "failed",
                error_code: "VALIDATION",
                error_message: `Amount ${rechargeAmount} AFN is outside allowed limits (25-5000 AFN)`,
                request: null,
                response: null
            };
        }


        const encryptedPin = encryptPin(encryptionKey, encryptionIv, sourcePin);

        const payload = {
            rrn: externalId, 
            account_no: sourceAccount,
            amount: rechargeAmount,
            to_account_number: item.msisdn,
            pin: encryptedPin
        };

        const authHeader = getAuthHeader(clientId, clientSecret);

        let httpResponse;
        try {
            httpResponse = await axios.post(endpoint, payload, {
                headers: {
                    "Authorization": authHeader,
                    "bank": bankHeader,
                    "Content-Type": "application/json"
                },
                timeout: 30_000
            });
        } catch (err) {
            return {
                status: "failed",
                error_code: "NETWORK",
                error_message: err.message,
                request: payload,
                response: err.response?.data || null
            };
        }

        const response = httpResponse.data;


        if (httpResponse.status === 400) {
            return {
                status: "failed",
                error_code: response.status_code === 117 ? "DUPLICATE_RRN" : "AUTH",
                error_message: response.message || "Authentication failed",
                request: payload,
                response: response,
                provider_txn_id: externalId
            };
        }

        if (response.success === true) {
            return {
                status: "accepted",
                provider_txn_id: response.data?.hesab_transaction_id || externalId,
                hesab_transaction_id: response.data?.hesab_transaction_id,
                request: payload,
                response: response
            };
        }


        return {
            status: "failed",
            error_code: "VALIDATION",
            error_message: typeof response.message === 'string' 
                ? response.message 
                : JSON.stringify(response.message),
            request: payload,
            response: response,
            provider_txn_id: externalId
        };
    },

    /**
     * 
     * @param {string} rrn
     * @param {string} txnId
     */
    async checkStatus(rrn, txnId) {
        const endpoint = process.env.HESABPAY_STATUS_ENDPOINT || "https://api.hesabpay.com/thirdparty/wallet/get-txn-status";
        const clientId = process.env.HESABPAY_CLIENT_ID;
        const clientSecret = process.env.HESABPAY_CLIENT_SECRET;
        const bankHeader = process.env.HESABPAY_BANK_HEADER || "test";

        if (!clientId || !clientSecret) {
            return {
                status: "failed",
                error_code: "CONFIGURATION",
                error_message: "Missing required HesabPay configuration"
            };
        }

        const payload = {
            rrn: rrn,
            txn_id: txnId
        };

        const authHeader = getAuthHeader(clientId, clientSecret);

        try {
            const httpResponse = await axios.post(endpoint, payload, {
                headers: {
                    "Authorization": authHeader,
                    "bank": bankHeader,
                    "Content-Type": "application/json"
                },
                timeout: 15_000
            });

            const response = httpResponse.data;

            if (httpResponse.status === 404) {
                return {
                    status: "failed",
                    error_code: "NOT_FOUND",
                    error_message: "Transaction not found"
                };
            }

            if (response.success === true) {
                let status;
                switch (response.transaction_status) {
                    case "completed":
                        status = "success";
                        break;
                    case "pending":
                        status = "accepted";
                        break;
                    case "failed":
                        status = "failed";
                        break;
                    default:
                        status = "accepted";
                }

                return {
                    status: status,
                    provider_txn_id: txnId,
                    transaction_status: response.transaction_status,
                    amount: response.amount,
                    message: response.message,
                    response: response
                };
            }

            return {
                status: "failed",
                error_code: "UNKNOWN",
                error_message: response.message || "Unknown error checking status"
            };

        } catch (err) {
            return {
                status: "failed",
                error_code: "NETWORK",
                error_message: err.message,
                response: err.response?.data || null
            };
        }
    }
};