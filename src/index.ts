import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';
import axios, { AxiosResponse } from 'axios';
import cors from 'cors';
import { format } from 'date-fns';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Environment variables
const {
    PORT = 4000,
    JAZZCASH_MERCHANT_ID,
    JAZZCASH_PASSWORD,
    JAZZCASH_HASH_KEY,
    JAZZCASH_API_URL,
    RETURN_URL
} = process.env;

// Types
interface JazzCashPaymentRequest {
    pp_Amount: string;
    pp_BillReference: string;
    pp_Description: string;
    pp_MobileNumber?: string;
    pp_CNIC?: string;
    pp_Email?: string;
}

interface JazzCashResponseData {
    pp_ResponseCode: string;
    pp_ResponseMessage: string;
    pp_TxnRefNo: string;
    pp_RetreivalReferenceNo: string;
    pp_Amount: string;
    pp_TxnCurrency: string;
    pp_TxnDateTime: string;
    pp_TxnType: string;
    pp_MerchantID: string;
    pp_SecureHash: string;
    pp_BillReference: string;
    pp_SettlementExpiry: string;
    pp_TxnStatus: string;
    [key: string]: string; // For flexibility
}

export function generateSecureHash(data: Record<string, string>, integritySalt: string): string {
    const sortedKeys = Object.keys(data)
        .filter(key => data[key] !== '') // skip empty values
        .sort();

    const hashString = sortedKeys.map(key => `${data[key]}`).join('&');
    const finalString = `${integritySalt}&${hashString}`;
    console.log({ finalString })

    return crypto
        .createHmac('sha256', integritySalt)
        .update(finalString, 'utf8')
        .digest('hex')
        .toUpperCase();
}

// Generate transaction reference number
const generateTransactionRefNo = (): string => {
    const date = new Date();
    return `T${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
};

// API to verify transaction
// API to verify transaction
app.post('/payment/verify', async (req: any, res: any) => {
    const { transactionId, secureHash } = req.body;

    if (!transactionId || !secureHash) {
        return res.status(400).json({ message: 'Transaction ID and Secure Hash are required.' });
    }

    const payload = {
        pp_TransactionID: transactionId, // Transaction ID received from JazzCash
        pp_SecureHash: secureHash,       // Secure hash for validation
    };

    try {
        // Add headers if necessary
        const headers = {
            'Content-Type': 'application/json',
            // 'Authorization': 'Bearer YOUR_API_KEY', // Uncomment if authentication is required
        };

        const response = await axios.post('https://sandbox.jazzcash.com.pk/transaction/verify', payload, { headers });
        console.log(response.data); // Print the response data to check status
        return res.status(200).json(response.data); // Return the response data back to client
    } catch (error: any) {
        console.error('Error verifying transaction:', error);
        return res.status(500).json({ message: 'Error verifying transaction.', error: error.message });
    }
});

app.post('/api/payment/initiate', async (req: any, res: any) => {
    try {
        const {
            pp_Amount,
            pp_BillReference,
            pp_Description,
            pp_MobileNumber,
            pp_CNIC,
            pp_Email,
        } = req.body;
        function formatDateToYmdHisInKarachi(date: any) {
            const options: any = {
                timeZone: 'Asia/Karachi',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            };

            const formatter = new Intl.DateTimeFormat('en-GB', options);
            const parts = formatter.formatToParts(date);

            const dateParts: any = {};
            for (const part of parts) {
                if (part.type !== 'literal') {
                    dateParts[part.type] = part.value;
                }
            }

            return (
                dateParts.year +
                dateParts.month +
                dateParts.day +
                dateParts.hour +
                dateParts.minute +
                dateParts.second
            );
        }

        const now = new Date();
        const pp_TxnDateTime = formatDateToYmdHisInKarachi(now);
        console.log(pp_TxnDateTime); // Outputs: e.g., "20250505112045"

        const formatDate = (date: Date) =>
            date.toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);

        const pp_TxnExpiryDateTime = formatDateToYmdHisInKarachi(new Date(now.getTime() + 230 * 60000));
        const pp_TxnRefNo = `T${pp_TxnDateTime}${Math.floor(Math.random() * 1000)}`;


        const paymentData: Record<string, string> = {
            "pp_Version": "2.0",
            "pp_TxnType": "MWALLET",
            "pp_Language": "EN",
            "pp_MerchantID": process.env.JAZZCASH_MERCHANT_ID!,
            "pp_SubMerchantID": "",
            "pp_Password": process.env.JAZZCASH_PASSWORD!,
            "pp_BankID": "TBANK",
            "pp_ProductID": "RETL",
            "pp_TxnRefNo": pp_TxnRefNo,
            "pp_Amount": "1000",
            "pp_TxnCurrency": 'PKR',
            "pp_TxnDateTime": pp_TxnDateTime,
            "pp_BillReference": "billRef",
            "pp_Description": "Description of transaction",
            "pp_TxnExpiryDateTime.": pp_TxnExpiryDateTime,
            "pp_ReturnURL": process.env.RETURN_URL!,
            "ppmpf_1": "1",
            "ppmpf_2": "2",
            "ppmpf_3": "3",
            "ppmpf_4": "4",
            "ppmpf_5": "5",
            "pp_SecureHashType": 'SHA256',
        };

        // Optional fields
        // if (pp_MobileNumber) paymentData['pp_MobileNumber'] = pp_MobileNumber;
        // if (pp_CNIC) paymentData['pp_CNIC'] = pp_CNIC;

        // Add hash
        const pp_SecureHash = generateSecureHash(paymentData, process.env.JAZZCASH_HASH_KEY!);
        paymentData['pp_SecureHash'] = pp_SecureHash;
        console.log({ paymentData })
        return res.json({
            success: true,
            data: paymentData,
            action:
                'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Payment initiation failed' });
    }
});
app.post('/api/payment/verify', (req: any, res: any) => {
    try {
        const originalResponse = { ...req.body };
        console.log({ originalResponse });

        const secureHash = originalResponse.pp_SecureHash;

        // Step 1: Remove pp_SecureHash and JazzCash-added fields
        const excludedFields = ['pp_SecureHash', 'pp_ResponseCode', 'pp_ResponseMessage'];

        const filteredData = Object.keys(originalResponse)
            .filter(key => !excludedFields.includes(key) && originalResponse[key] !== undefined)
            .reduce((obj, key) => {
                obj[key] = String(originalResponse[key]); // Convert value to string
                return obj;
            }, {} as Record<string, string>);

        // Step 2: Generate secure hash
        const generatedHash = generateSecureHash(filteredData, process.env.JAZZCASH_HASH_KEY!);
        const txnRef = originalResponse.pp_TxnRefNo;

        // Step 3: Compare hashes and check the response code
        if (generatedHash === secureHash && originalResponse.pp_ResponseCode === '000') {
            // Success: Redirect to frontend success page
            const successRedirectUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            res.redirect(`${successRedirectUrl}/payment-success?txnRef=${txnRef}`);
        } else {
            // Failure: Redirect to frontend failure page
            const failureRedirectUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            res.redirect(`${failureRedirectUrl}/payment-failed`);
        }
    } catch (err) {
        console.error(err);
        // Handle any unexpected errors
        res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
});


// // Callback handler
// app.post('/api/payment/callback', (req: any, res: any) => {
//     try {
//         const responseData: JazzCashResponseData = req.body;

//         const { pp_SecureHash, ...dataToVerify } = responseData;
//         const calculatedHash = generateSecureHash(dataToVerify);

//         if (calculatedHash !== pp_SecureHash) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Invalid secure hash'
//             });
//         }

//         if (responseData.pp_ResponseCode === '000') {
//             return res.json({
//                 success: true,
//                 message: 'Payment successful',
//                 data: responseData
//             });
//         } else {
//             return res.json({
//                 success: false,
//                 message: `Payment failed: ${responseData.pp_ResponseMessage}`,
//                 data: responseData
//             });
//         }
//     } catch (error) {
//         console.error('Payment callback error:', error);
//         return res.status(500).json({
//             success: false,
//             message: 'Failed to process payment callback',
//             error: error instanceof Error ? error.message : 'Unknown error'
//         });
//     }
// });

// // Payment status check
app.get('/api/payment/status/:txnRefNo', async (req: any, res: any) => {
    try {
        const { txnRefNo } = req.params;

        const pp_TxnDateTime = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);

        const statusData: Record<string, string> = {
            pp_Language: 'EN',
            pp_MerchantID: JAZZCASH_MERCHANT_ID || '',
            pp_Password: JAZZCASH_PASSWORD || '',
            pp_TxnRefNo: txnRefNo,
            pp_TxnDateTime,
            pp_Version: '1.1',
            pp_SecureHashType: 'SHA256',
        };

        statusData['pp_SecureHash'] = generateSecureHash(statusData, process.env.JAZZCASH_HASH_KEY!);

        const response: AxiosResponse = await axios.post(`${JAZZCASH_API_URL}/Inquiry`, statusData);

        return res.json({
            success: true,
            data: response.data
        });
    } catch (error) {
        console.error('Payment status inquiry error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to check payment status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`JazzCash payment server running on port ${PORT}`);
});

export default app;
