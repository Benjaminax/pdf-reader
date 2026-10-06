import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './index.css';

registerSW({ immediate: true });

// Nota: sin StrictMode porque react-pageflip manipula el DOM directamente
// y el doble montaje de StrictMode en desarrollo puede interferir con él.
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
