import axios from "axios";
import CryptoJS from "crypto-js";


function encryptAuthKey(key, data) {
    const CIPHER_KEY_LEN = 16; 
    

    let processedKey = key;
    if (processedKey.length < CIPHER_KEY_LEN) {
        processedKey = processedKey.padEnd(CIPHER_KEY_LEN, "0");
    } else if (processedKey.length > CIPHER_KEY_LEN) {
        processedKey = processedKey.substring(0, CIPHER_KEY_LEN);
    }
    
    const keyWordArray = CryptoJS.enc.Utf8.parse(processedKey);
    const dataWordArray = CryptoJS.enc.Utf8.parse(data);
    
    const encrypted = CryptoJS.AES.encrypt(dataWordArray, keyWordArray, {
        mode: CryptoJS.mode.ECB, 
        padding: CryptoJS.pad.Pkcs7
    });
    
    return encrypted.toString();
}


const OPERATORS = {
    salaam: 1,
    etisalat: 2,
    roshan: 3,
    mtn: 4,
    awcc: 5
};


const OPERATOR_LIMITS = {
    1: { min: 50, max: 5000 },  
    2: { min: 1, max: 5000 },   
    3: { min: 25, max: 5000 },   
    4: { min: 10, max: 4000 },   
    5: { min: 25, max: 12000 }   
};


function detectOperator(msisdn) {
    const prefix = msisdn.substring(0, 2);
    
    switch (prefix) {
        case '74': return 1;
        case '73':
        case '78': return 2; 
        case '79':
        case '72': return 3; 
        case '77':
        case '76': return 4;
        case '70':
        case '71': return 5;
        default: return null;
    }
}

export const setaraganTopupProvider = {
    name: "setaragan",

    /**
     * @param { order, item, variant, externalId }
     *
     */
    async topup({ order, item, variant, externalId }) {
        const endpoint = process.env.SETARAGAN_ENDPOINT || "http://172.16.49.101:8091/api/MakeMobileRecharge";
        const username = process.env.SETARAGAN_USERNAME;
        const authKey = process.env.SETARAGAN_AUTH_KEY;
        const encryptionKey = process.env.SETARAGAN_ENCRYPTION_KEY;
        const msisdn = process.env.SETARAGAN_MSISDN; 
        
        const rechargeAmount = item?.unit_price_minor ?? variant?.amount_minor;
        const customerMobile = item.msisdn;

   
        if (!username || !authKey || !encryptionKey || !msisdn) {
            return {
                status: "failed",
                error_code: "CONFIGURATION",
                error_message: "Missing required Setaragan configuration (username, authKey, encryptionKey, msisdn)",
                request: null,
                response: null
            };
        }

    
        const operatorId = detectOperator(customerMobile);
        if (!operatorId) {
            return {
                status: "failed",
                error_code: "VALIDATION",
                error_message: `Unable to detect operator for mobile number: ${customerMobile}`,
                request: null,
                response: null
            };
        }


        const limits = OPERATOR_LIMITS[operatorId];
        if (rechargeAmount < limits.min || rechargeAmount > limits.max) {
            return {
                status: "failed",
                error_code: "VALIDATION",
                error_message: `Amount ${rechargeAmount} AFN is outside allowed limits for this operator (${limits.min}-${limits.max} AFN)`,
                request: null,
                response: null
            };
        }


        const encryptedAuthKey = encryptAuthKey(encryptionKey, authKey);

        const payload = {
            operator_id: operatorId.toString(),
            customer_mobile: customerMobile,
            amount: rechargeAmount.toString(),
            msisdn: msisdn,
            request_id: externalId
        };

        let httpResponse;
        try {
            httpResponse = await axios.post(endpoint, payload, {
                headers: {
                    "username": username,
                    "authkey": encryptedAuthKey,
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

 
        if (response.status === "0") {

            return {
                status: "failed",
                error_code: "API_ERROR",
                error_message: response.data?.message || "API returned error status",
                request: payload,
                response: response,
                provider_txn_id: externalId
            };
        }


        const transactionStatus = response.data?.status?.toLowerCase();
        
        switch (transactionStatus) {
            case "success":
                return {
                    status: "success",
                    provider_txn_id: response.data?.txn_id || externalId,
                    setaragan_txn_id: response.data?.txn_id,
                    operator_txn_id: response.data?.api_txn_id,
                    current_balance: response.data?.current_balance,
                    request: payload,
                    response: response
                };
                
            case "inprocess":
                return {
                    status: "accepted", 
                    provider_txn_id: response.data?.txn_id || externalId,
                    setaragan_txn_id: response.data?.txn_id,
                    operator_txn_id: response.data?.api_txn_id,
                    current_balance: response.data?.current_balance,
                    request: payload,
                    response: response
                };
                
            case "failed":
                return {
                    status: "failed",
                    error_code: "TRANSACTION_FAILED",
                    error_message: response.data?.message || "Transaction failed",
                    request: payload,
                    response: response,
                    provider_txn_id: response.data?.txn_id || externalId
                };
                
            default:
                return {
                    status: "accepted",
                    provider_txn_id: response.data?.txn_id || externalId,
                    setaragan_txn_id: response.data?.txn_id,
                    operator_txn_id: response.data?.api_txn_id,
                    current_balance: response.data?.current_balance,
                    request: payload,
                    response: response
                };
        }
    },

    /**
     * 
     */
    async testTopup({ order, item, variant, externalId }) {
        const url = 'http://3.67.144.22/backend/V1/api/setaragan/topup';
        
        console.log('Sending to Sataragan Test API - Transaction:', {
            phone_number: item.msisdn,
            value: item?.unit_price_minor ?? variant?.amount_minor,
            transaction_id: externalId
        });

        const rechargeAmount = item?.unit_price_minor ?? variant?.amount_minor;
        const customerMobile = item.msisdn;

 
        function getPhoneNumberCategory(phoneNumber) {
            const firstTwoDigits = phoneNumber.substring(0, 2);
            
            if (firstTwoDigits === "74") return '1';
            if (firstTwoDigits === "73" || firstTwoDigits === "78") return '2';
            if (firstTwoDigits === "72" || firstTwoDigits === "79") return '3';
            if (firstTwoDigits === "77" || firstTwoDigits === "76") return '4';
            if (firstTwoDigits === "70" || firstTwoDigits === "71") return '5';
            
            return '1';
        }

        const data = {
            'operator_id': getPhoneNumberCategory(customerMobile),
            'customer_mobile': customerMobile,
            'amount': rechargeAmount.toString(),
            'msisdn': '730302030',
            'request_id': externalId || Date.now().toString(),
        };

        console.log('Sataragan Test request data:', data);

        try {
            const response = await axios.post(url, data, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 30_000
            });

            console.log('Sataragan Test API raw response:', response.data);

            let responseData = response.data;
            
   
            if (response.data && response.data.json) {
                responseData = response.data.json;
            }
            
            if (responseData && responseData.data) {
                responseData = responseData.data;
            }

            console.log('Sataragan Test API processed data:', responseData);

 
            const isSuccess = responseData.status === '1' || 
                             responseData.status === 'Success' || 
                             (responseData.data && (responseData.data.status === 'Success' || responseData.data.status === '1'));

            if (isSuccess) {
                return {
                    status: "success",
                    provider_txn_id: responseData.txn_id || externalId,
                    setaragan_txn_id: responseData.txn_id,
                    operator_txn_id: responseData.api_txn_id,
                    current_balance: responseData.current_balance,
                    message: responseData.message,
                    request: data,
                    response: responseData
                };
            } else {
                return {
                    status: "failed",
                    error_code: "API_ERROR",
                    error_message: responseData.message || "Transaction failed in test API",
                    request: data,
                    response: responseData,
                    provider_txn_id: externalId
                };
            }

        } catch (error) {
            console.error('❌ Error sending to Sataragan Test API:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });

            return {
                status: "failed",
                error_code: "NETWORK",
                error_message: error.message,
                request: data,
                response: error.response?.data || null
            };
        }
    },

    /**
     * 
     * @param {string} requestId 
     * @param {string} customerMobile
     * @param {number} amount 
     * @param {number} operatorId 
     */
    async checkStatus(requestId, customerMobile, amount, operatorId) {
        const endpoint = process.env.SETARAGAN_STATUS_ENDPOINT || "http://172.16.49.101:8091/api/getStatusbyRequestIDV3";
        const username = process.env.SETARAGAN_USERNAME;
        const authKey = process.env.SETARAGAN_AUTH_KEY;
        const encryptionKey = process.env.SETARAGAN_ENCRYPTION_KEY;
        const msisdn = process.env.SETARAGAN_MSISDN;

        if (!username || !authKey || !encryptionKey || !msisdn) {
            return {
                status: "failed",
                error_code: "CONFIGURATION",
                error_message: "Missing required Setaragan configuration"
            };
        }


        const encryptedAuthKey = encryptAuthKey(encryptionKey, authKey);

        const payload = {
            request_id: requestId,
            msisdn: msisdn,
            operator_id: operatorId.toString(),
            customer_mobile: customerMobile,
            amount: amount.toString()
        };

        try {
            const httpResponse = await axios.post(endpoint, payload, {
                headers: {
                    "username": username,
                    "authkey": encryptedAuthKey,
                    "Content-Type": "application/json"
                },
                timeout: 15_000
            });

            const response = httpResponse.data;

            if (response.status === "0") {
                return {
                    status: "failed",
                    error_code: "NOT_FOUND",
                    error_message: response.data?.message || "Transaction not found"
                };
            }

            const transactionStatus = response.data?.status?.toLowerCase();
            
            switch (transactionStatus) {
                case "success":
                    return {
                        status: "success",
                        provider_txn_id: response.data?.txn_id,
                        setaragan_txn_id: response.data?.txn_id,
                        operator_txn_id: response.data?.api_txn_id,
                        amount: response.data?.amount,
                        current_balance: response.data?.current_balance,
                        message: response.data?.message,
                        response: response
                    };
                    
                case "inprocess":
                case "pending":
                    return {
                        status: "accepted",
                        provider_txn_id: response.data?.txn_id,
                        setaragan_txn_id: response.data?.txn_id,
                        operator_txn_id: response.data?.api_txn_id,
                        amount: response.data?.amount,
                        current_balance: response.data?.current_balance,
                        message: response.data?.message,
                        response: response
                    };
                    
                case "failed":
                    return {
                        status: "failed",
                        error_code: "TRANSACTION_FAILED",
                        error_message: response.data?.message || "Transaction failed",
                        provider_txn_id: response.data?.txn_id,
                        response: response
                    };
                    
                default:
                    return {
                        status: "accepted",
                        provider_txn_id: response.data?.txn_id,
                        setaragan_txn_id: response.data?.txn_id,
                        message: response.data?.message,
                        response: response
                    };
            }

        } catch (err) {
            return {
                status: "failed",
                error_code: "NETWORK",
                error_message: err.message,
                response: err.response?.data || null
            };
        }
    },

   
    async testCheckStatus(requestId, customerMobile, amount, operatorId) {
        const url = 'http://3.67.144.22/backend/V1/api/setaragan/status';
        
        console.log('Checking status via Test API:', {
            request_id: requestId,
            customer_mobile: customerMobile,
            amount: amount,
            operator_id: operatorId
        });

        const data = {
            request_id: requestId,
            customer_mobile: customerMobile,
            amount: amount.toString(),
            operator_id: operatorId.toString()
        };

        try {
            const response = await axios.post(url, data, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 15_000
            });

            console.log('Sataragan Test Status API raw response:', response.data);

            let responseData = response.data;
            
       
            if (response.data && response.data.json) {
                responseData = response.data.json;
            }
            
            if (responseData && responseData.data) {
                responseData = responseData.data;
            }

            console.log('Sataragan Test Status API processed data:', responseData);

 
            const isSuccess = responseData.status === '1' || 
                             responseData.status === 'Success' || 
                             responseData.status === 'success';

            if (isSuccess) {
                return {
                    status: "success",
                    provider_txn_id: responseData.txn_id,
                    setaragan_txn_id: responseData.txn_id,
                    operator_txn_id: responseData.api_txn_id,
                    amount: responseData.amount,
                    current_balance: responseData.current_balance,
                    message: responseData.message,
                    response: responseData
                };
            } else {
                return {
                    status: "failed",
                    error_code: "TRANSACTION_FAILED",
                    error_message: responseData.message || "Transaction failed in test status check",
                    provider_txn_id: responseData.txn_id,
                    response: responseData
                };
            }

        } catch (err) {
            return {
                status: "failed",
                error_code: "NETWORK",
                error_message: err.message,
                response: err.response?.data || null
            };
        }
    },

    /**
     * 
     */
    async getBalance() {
        const endpoint = process.env.SETARAGAN_BALANCE_ENDPOINT || "http://172.16.49.101:8091/api/getWalletBalance";
        const username = process.env.SETARAGAN_USERNAME;
        const authKey = process.env.SETARAGAN_AUTH_KEY;
        const encryptionKey = process.env.SETARAGAN_ENCRYPTION_KEY;
        const msisdn = process.env.SETARAGAN_MSISDN;

        if (!username || !authKey || !encryptionKey || !msisdn) {
            return {
                status: "failed",
                error_code: "CONFIGURATION",
                error_message: "Missing required Setaragan configuration"
            };
        }

     
        const encryptedAuthKey = encryptAuthKey(encryptionKey, authKey);

        const payload = {
            msisdn: msisdn,
            request_id: `BAL_${Date.now()}` 
        };

        try {
            const httpResponse = await axios.post(endpoint, payload, {
                headers: {
                    "username": username,
                    "authkey": encryptedAuthKey,
                    "Content-Type": "application/json"
                },
                timeout: 15_000
            });

            const response = httpResponse.data;

            if (response.status === "1") {
                return {
                    status: "success",
                    balance: parseFloat(response.data?.main_wallet_balance),
                    message: response.data?.message,
                    response: response
                };
            } else {
                return {
                    status: "failed",
                    error_code: "BALANCE_ERROR",
                    error_message: response.data?.message || "Failed to get balance",
                    response: response
                };
            }

        } catch (err) {
            return {
                status: "failed",
                error_code: "NETWORK",
                error_message: err.message,
                response: err.response?.data || null
            };
        }
    },

 
    async testGetBalance() {
        const url = 'http://3.67.144.22/backend/V1/api/setaragan/balance';
        
        console.log('Getting balance via Test API');

        try {
            const response = await axios.get(url, {
                timeout: 15_000
            });

            console.log('Sataragan Test Balance API raw response:', response.data);

            let responseData = response.data;
            
       
            if (response.data && response.data.json) {
                responseData = response.data.json;
            }
            
            if (responseData && responseData.data) {
                responseData = responseData.data;
            }

            console.log('Sataragan Test Balance API processed data:', responseData);

    
            const isSuccess = responseData.status === '1' || 
                             responseData.status === 'Success';

            if (isSuccess) {
                return {
                    status: "success",
                    balance: parseFloat(responseData.balance || responseData.current_balance),
                    message: responseData.message,
                    response: responseData
                };
            } else {
                return {
                    status: "failed",
                    error_code: "BALANCE_ERROR",
                    error_message: responseData.message || "Failed to get balance from test API",
                    response: responseData
                };
            }

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