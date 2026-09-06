import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './modules/Header';
import AboutUs from './modules/aboutUs';
import LegalTerms from './modules/LegalTerms';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Header />} />
        <Route path="/nosotros" element={<AboutUs />} />
        <Route path="/legal" element={<LegalTerms />} />
        <Route path="/terminos" element={<LegalTerms />} />
        <Route path="/privacidad" element={<LegalTerms />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
