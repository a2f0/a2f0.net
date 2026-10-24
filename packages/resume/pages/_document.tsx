import Document, {
  type DocumentContext,
  Head,
  Html,
  Main,
  NextScript,
} from "next/document";
import { ServerStyleSheet } from "styled-components";

import { DEPLOY_TIER, robotsDirectives } from "../lib/deployTier";

export default class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const sheet = new ServerStyleSheet();
    const originalRenderPage = ctx.renderPage;

    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: (App) => (props) =>
            sheet.collectStyles(<App {...props} />),
        });

      const initialProps = await Document.getInitialProps(ctx);
      return {
        ...initialProps,
        styles: [initialProps.styles, sheet.getStyleElement()],
      };
    } finally {
      sheet.seal();
    }
  }

  render() {
    // Staging's rule is on every exported page, the 404 page included, and
    // its _headers repeats it for every response. Production's is on the 404
    // page alone.
    const robots = robotsDirectives(DEPLOY_TIER, this.props.__NEXT_DATA__.page);
    return (
      <Html lang="en">
        <Head>{robots && <meta name="robots" content={robots} />}</Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
