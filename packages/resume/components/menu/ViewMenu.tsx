import type { Icon } from "@phosphor-icons/react";
import { BezierCurveIcon } from "@phosphor-icons/react/dist/csr/BezierCurve";
import { CodeIcon } from "@phosphor-icons/react/dist/csr/Code";
import { EyeIcon } from "@phosphor-icons/react/dist/csr/Eye";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { MagnifyingGlassPlusIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlassPlus";
import { MoonIcon } from "@phosphor-icons/react/dist/csr/Moon";
import { RulerIcon } from "@phosphor-icons/react/dist/csr/Ruler";
import { SunIcon } from "@phosphor-icons/react/dist/csr/Sun";
import Link from "next/link";
import { useRouter } from "next/router";

import { resumeConfiguration } from "@a2f0/shared/configuration";
import { useAppDispatch, useAppSelector } from "../../lib/hooks";
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
import MenuIcon from "./MenuIcon";
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
  const dispatch = useAppDispatch();
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

  const scaleOption = (factor: number, icon: Icon, label: string) => (
    <li>
      <MenuAction
        type="button"
        aria-pressed={scale === factor}
        onClick={() => setScaleFactor(factor)}
        $scale={scale}
      >
        <CheckMark $isActive={scale === factor} />
        <MenuIcon icon={icon} scale={scale} />
        <MenuLabel>{label}</MenuLabel>
      </MenuAction>
    </li>
  );

  const pageOption = (path: string, icon: Icon, label: string) => (
    <li>
      <MenuAction
        as={Link}
        href={path}
        aria-current={asPath === path ? "page" : undefined}
        onClick={close}
        $scale={scale}
      >
        <CheckMark $isActive={asPath === path} />
        <MenuIcon icon={icon} scale={scale} />
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
            <MenuIcon icon={MoonIcon} scale={scale} />
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
            <MenuIcon icon={SunIcon} scale={scale} />
            <MenuLabel>Light Theme</MenuLabel>
          </MenuAction>
        </li>
      </ul>
      <MenuDivider />
      <ul aria-label="Size">
        {scaleOption(1.5, MagnifyingGlassPlusIcon, "150%")}
        {scaleOption(1.25, MagnifyingGlassIcon, "125%")}
        {scaleOption(1, RulerIcon, "Real Size")}
      </ul>
      <MenuDivider />
      <ul aria-label="Format">
        {pageOption("/", BezierCurveIcon, "SVG")}
        {pageOption("/pdf", EyeIcon, "PDF Preview")}
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
            <MenuIcon icon={CodeIcon} scale={scale} />
            <MenuLabel>Source Code</MenuLabel>
          </MenuAction>
        </li>
      </ul>
    </>
  );
};

export default ViewMenu;
