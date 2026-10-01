import Link from "next/link";
import { useRouter } from "next/router";
import { useDispatch } from "react-redux";

import { resumeConfiguration } from "@a2f0/shared/configuration";
import { useAppSelector } from "../../lib/hooks";
import {
  selectForegroundColor,
  selectScale,
  setBackgroundColor,
  setForegroundColor,
  setHighlightColor,
  setScale,
} from "../../lib/resumeConfigSlice";
import resume from "@a2f0/shared/resume.json";
import CheckMark from "./CheckMark";
import { useDropdownMenu } from "./DropdownMenuContext";
import MenuAction from "./MenuAction";
import MenuDivider from "./MenuDivider";
import MenuLabel from "./MenuLabel";

const {
  darkForegroundColor,
  darkBackgroundColor,
  darkHighlightColor,
  lightForegroundColor,
  lightBackgroundColor,
  lightHighlightColor,
} = resumeConfiguration;

const ViewMenu = () => {
  const { close } = useDropdownMenu();
  const dispatch = useDispatch();
  const { asPath } = useRouter();
  const foregroundColor = useAppSelector(selectForegroundColor);
  const scale = useAppSelector(selectScale);

  const setDarkTheme = () => {
    dispatch(setForegroundColor(darkForegroundColor));
    dispatch(setBackgroundColor(darkBackgroundColor));
    dispatch(setHighlightColor(darkHighlightColor));
    close();
  };

  const setLightTheme = () => {
    dispatch(setForegroundColor(lightForegroundColor));
    dispatch(setBackgroundColor(lightBackgroundColor));
    dispatch(setHighlightColor(lightHighlightColor));
    close();
  };

  const setScaleFactor = (factor: number) => {
    dispatch(setScale(factor));
    close();
  };

  const scaleOption = (factor: number, label: string) => (
    <li>
      <MenuAction
        type="button"
        aria-pressed={scale === factor}
        onClick={() => setScaleFactor(factor)}
        $scale={scale}
      >
        <CheckMark $isActive={scale === factor} />
        <MenuLabel>{label}</MenuLabel>
      </MenuAction>
    </li>
  );

  const pageOption = (path: string, label: string) => (
    <li>
      <MenuAction
        as={Link}
        href={path}
        aria-current={asPath === path ? "page" : undefined}
        onClick={close}
        $scale={scale}
      >
        <CheckMark $isActive={asPath === path} />
        <MenuLabel>{label}</MenuLabel>
      </MenuAction>
    </li>
  );

  return (
    <>
      <ul aria-label="Theme">
        <li>
          <MenuAction
            type="button"
            id="darkThemeMenuOption"
            aria-pressed={foregroundColor === darkForegroundColor}
            onClick={setDarkTheme}
            $scale={scale}
          >
            <CheckMark $isActive={foregroundColor === darkForegroundColor} />
            <MenuLabel>Dark Theme</MenuLabel>
          </MenuAction>
        </li>
        <li>
          <MenuAction
            type="button"
            id="lightThemeMenuOption"
            aria-pressed={foregroundColor === lightForegroundColor}
            onClick={setLightTheme}
            $scale={scale}
          >
            <CheckMark $isActive={foregroundColor === lightForegroundColor} />
            <MenuLabel>Light Theme</MenuLabel>
          </MenuAction>
        </li>
      </ul>
      <MenuDivider />
      <ul aria-label="Size">
        {scaleOption(1.5, "150%")}
        {scaleOption(1.25, "125%")}
        {scaleOption(1, "Real Size")}
      </ul>
      <MenuDivider />
      <ul aria-label="Format">
        {pageOption("/", "SVG")}
        {pageOption("/pdf", "PDF Preview")}
      </ul>
      <MenuDivider />
      <ul>
        <li>
          <MenuAction
            as="a"
            href={resume.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={close}
            $scale={scale}
          >
            <CheckMark $isActive={false} />
            <MenuLabel>Source Code</MenuLabel>
          </MenuAction>
        </li>
      </ul>
    </>
  );
};

export default ViewMenu;
