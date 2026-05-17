//import { ReportHandler } from 'web-vitals';

//const reportWebVitals = (onPerfEntry?: ReportHandler) => {
//  if (onPerfEntry && onPerfEntry instanceof Function) {
//    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
//      getCLS(onPerfEntry);
//      getFID(onPerfEntry);
//      getFCP(onPerfEntry);
//      getLCP(onPerfEntry);
//      getTTFB(onPerfEntry);
//    });
//  }
//};

//export default reportWebVitals;


// src/reportWebVitals.ts
import type { ReportCallback } from 'web-vitals';

const reportWebVitals = (onPerfEntry?: ReportCallback) => {
    if (onPerfEntry) {
        import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
            onCLS(onPerfEntry);
            onINP(onPerfEntry);   // ← replaces onFID in v4
            onFCP(onPerfEntry);
            onLCP(onPerfEntry);
            onTTFB(onPerfEntry);
        });
    }
};

export default reportWebVitals;

