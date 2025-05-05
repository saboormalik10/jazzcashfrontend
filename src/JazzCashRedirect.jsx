import React, { useEffect, useRef } from 'react';

const JazzCashRedirect = ({ data, action }) => {
    const hasSubmitted = useRef(false); // Track if submitted already
    
    useEffect(() => {
        // Only proceed if the form hasn't been submitted already
        if (hasSubmitted.current) return;

        hasSubmitted.current = true; // Mark as submitted

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = action;

        // Add hidden inputs for each0 key-value pair in data
        Object.entries(data).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
        });

        // Append form to body and submit it
        document.body.appendChild(form);
        form.submit();

        // Cleanup: Remove the form from DOM after submission
        return () => {
            document.body.removeChild(form);
        };
    }, [data, action]); // Runs only when 'data' or 'action' changes

    return <div>Redirecting to JazzCash...</div>;
};

export default JazzCashRedirect;
