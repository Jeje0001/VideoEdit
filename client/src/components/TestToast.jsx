import React from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const TestToast = () => {
  return (
    <div>
      <button onClick={() => toast.success("✅ Toast works!")}>Test Toast</button>
      <ToastContainer />
    </div>
  );
};

export default TestToast;
