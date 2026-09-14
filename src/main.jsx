import React from 'react';
import ReactDOM from 'react-dom/client';
import { TIDProvider } from '@trimble-oss/trimble-id-react';

import '@trimble-oss/modus-bootstrap/dist/css/modus-bootstrap.min.css';
import '@trimble-oss/modus-icons/dist/modus-solid/fonts/modus-icons.css';
import '@trimble-oss/modus-icons-css/css/modus-icons.css';
import './index.css';

import App from './App.jsx';
import I18nProvider from './i18n/I18nProvider.jsx';
import tidClient from './api/client.ts';

const stripAuthParams = (target = '/') => {
  window.history.replaceState({}, document.title, target);
};

// After the PKCE exchange: clear the query string and return to the app instead of
// leaving the user parked on /callback.
const handleRedirect = (authState) => {
  const returnTo = authState?.returnTo;
  const next =
    !returnTo || returnTo.startsWith('/callback') || returnTo.startsWith('/logout-callback')
      ? '/'
      : returnTo;
  stripAuthParams(next);
};

if (window.location.pathname.replace(/\/$/, '') === '/logout-callback') {
  stripAuthParams('/');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <TIDProvider tidClient={tidClient} onRedirectCallback={handleRedirect} checkRedirectUrlMatch>
    <I18nProvider>
      <App />
    </I18nProvider>
  </TIDProvider>,
);
