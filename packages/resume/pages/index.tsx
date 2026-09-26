import type { GetStaticProps } from "next";
import Main from "../components/layout/Main";
import SvgResume from "../components/SvgResume";

interface HomeProps {
  desktopSvg: string | null;
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  if (process.env.NODE_ENV !== "production") {
    return { props: { desktopSvg: null } };
  }

  const { readFile } = await import("node:fs/promises");
  const { resolve } = await import("node:path");
  const desktopSvg = await readFile(resolve(".generated/desktop.svg"), "utf8");
  return { props: { desktopSvg } };
};

export default function Home({ desktopSvg }: HomeProps) {
  return (
    <Main>
      <SvgResume desktopSvg={desktopSvg} />
    </Main>
  );
}
