import React from 'react';
import ReactDOM from 'react-dom/client';
import ArtChart from './ArtChart';

const rootElement = document.getElementById('art-chart-root');
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <ArtChart />
        </React.StrictMode>
    );
}
