import { useSearchParams } from 'react-router-dom';

const PaymentSuccess = () => {
    const [params] = useSearchParams();
    const txnRef = params.get('txnRef');

    return (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
            <h1 style={{ color: 'green' }}>🎉 Payment Successful!</h1>
            <p>Your transaction was successful.</p>
            <p><strong>Transaction Ref:</strong> {txnRef}</p>
        </div>
    );
};

export default PaymentSuccess;
