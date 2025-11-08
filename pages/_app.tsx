import {AppProps} from 'next/app';
import {ReactElement} from 'react';
import {Provider} from 'react-redux';

import {store} from '../lib/store';
import GlobalStyle from '../styles/GlobalStyle';

export default function MyApp({Component, pageProps}: AppProps): ReactElement {
  return (
    <Provider store={store}>
      <GlobalStyle />
      <Component {...pageProps} />
    </Provider>
  );
}
