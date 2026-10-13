import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FormPage } from './FormPage';
import '../styles.css';
import './form.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FormPage />
  </StrictMode>,
);
