import { Head, Html, Main, NextScript } from "next/document";

export default function ExperimentDocument() {
  return (
    // data-pristine lasts until the first key or pointer press; see Desktop.
    <Html lang="en" data-theme="dark" data-pristine="">
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
