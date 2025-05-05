import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import JazzCashRedirect from './JazzCashRedirect';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentFailed from './components/PaymentFailed';

function PaymentPage() {
  const [paymentData, setPaymentData] = useState(null);

  const handlePayment = async () => {
    const payload = {
      pp_Amount: "1000",
      pp_BillReference: "ORDER92987",
      pp_Description: "Payment for Order #12345",
      pp_MobileNumber: "3054164023",
      pp_CNIC: "35202-6684926-7",
    };


    const res = await axios.post('https://4379-206-42-124-78.ngrok-free.app/api/payment/initiate', payload);
    if (res.data.success) {
      setPaymentData(res.data); // Set payment data when successful
    }
  };

  const handleClearPaymentData = () => {
    // Clear the payment data after a delay
    setTimeout(() => {
      setPaymentData(null);
    }, 500);
  };

  return (
    <div>
      <h2>JazzCash Payment Test</h2>
      <button onClick={handlePayment}>Pay with JazzCash</button>
      {paymentData && (
        <>
          <JazzCashRedirect data={paymentData.data} action={paymentData.action} />
          {handleClearPaymentData()} {/* Clear payment data after a delay */}
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PaymentPage />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failed" element={<PaymentFailed />} />
      </Routes>
    </Router>
  );
}

export default App;
