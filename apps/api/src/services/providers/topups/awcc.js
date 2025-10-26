import axios from "axios";
import { create } from "xmlbuilder";

function buildEnvelope({
    recipientMsisdn,
    originatorMsisdn,
    productName,
    rechargeAmount,
    parentSalespointName,
    externalTransactionId,
    accountId
}) {
    const xml = create("soapenv:Envelope", { encoding: "UTF-8" })
        .att("xmlns:soapenv", "http://schemas.xmlsoap.org/soap/envelope/")
        .att("xmlns:adm", "http://admin.soap.efill.topup.redknee.com/")
        .ele("soapenv:Header").up()
        .ele("soapenv:Body")
        .ele("adm:eFillRecharge")
        .ele("recipientMsisdn").text(recipientMsisdn).up()
        .ele("recipientSubscriberCode").text("").up()
        .ele("recipientSmsConfirmation").text("false").up()
        .ele("originatorMsisdn").text(originatorMsisdn).up()
        .ele("originatorSubscriberCode").text("").up()
        .ele("originatorSmsConfirmation").text("false").up()
        .ele("productName").text(productName).up()
        .ele("rechargeAmount").text(String(rechargeAmount)).up()
        .ele("parentSalespointName").text(parentSalespointName).up()
        .ele("accountId").text(accountId).up()
        .up()
        .up()
        .end({ pretty: false });

    return xml;
}

export const awccTopupProvider = {
    name: "awcc",

    /**
     * @param { order, item, variant, externalId }
     * variant.amount_minor is AFN (no decimals)
     */
    async topup({ order, item, variant, externalId }) {
        const endpoint = process.env.AWCC_SOAP_ENDPOINT;
        const username = process.env.AWCC_SOAP_USERNAME;
        const password = process.env.AWCC_SOAP_PASSWORD;
        const rechargeAmount = item?.unit_price_minor ?? variant?.amount_minor;
        const amount_minor = rechargeAmount * 100;

        const payloadXml = buildEnvelope({
            recipientMsisdn: item.msisdn,
            recipientSubscriberCode: "?",
            recipientSmsConfirmation: false,
            originatorMsisdn: "93701243940",
            originatorSubscriberCode: "?",
            originatorSmsConfirmation: false,
            productName: "Default Product",
            rechargeAmount: amount_minor,
            parentSalespointName: "log_abdul_zahir_sp",
            accountId: 4065
        });

        let httpResponse;
        try {
            httpResponse = await axios.post(endpoint, payloadXml, {
                headers: { "Content-Type": "text/xml; charset=UTF-8" },
                auth: username && password ? { username, password } : undefined,
                timeout: 15_000
            });
        } catch (err) {
            return {
                status: "failed",
                error_code: "NETWORK",
                error_message: err.message,
                request: payloadXml,
                response: err.response?.data || null
            };
        }

        const body = String(httpResponse.data ?? "");
        // Quick SOAP fault detection
        const isFault = body.includes("<soap:Fault") || body.includes("<SOAP-ENV:Fault");
        if (httpResponse.status !== 200 || isFault) {
            // Try to extract a faultstring if present
            const m = body.match(/<faultstring>([^<]+)<\/faultstring>/i);
            const msg = m?.[1]?.trim() || "SOAP fault";
            // If it’s an auth-type failure, mark as terminal (let the caller decide to stop retrying)
            const authFail = /Authorization failed/i.test(msg) || httpResponse.status === 401 || httpResponse.status === 403;
            return {
                status: authFail ? "failed" : "failed",
                error_code: authFail ? "AUTH" : "SOAP_FAULT",
                error_message: msg,
                request: payloadXml,
                response: body
            };
        }

        return {
            status: "accepted",
            provider_txn_id: externalId,
            request: payloadXml,
            response: body
        };
    }

}
