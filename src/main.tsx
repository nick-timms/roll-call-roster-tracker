
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add fonts
const fontLinkElement = document.createElement('link');
fontLinkElement.rel = 'stylesheet';
fontLinkElement.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
document.head.appendChild(fontLinkElement);

createRoot(document.getElementById("root")!).render(<App />);
