import { useRouter } from "next/router";
import { useDispatch } from "react-redux";

import { resumeConfiguration } from "../../configuration";
import { useAppSelector } from "../../lib/hooks";
import {
  selectForegroundColor,
  selectScale,
  setBackgroundColor,
  setForegroundColor,
  setHighlightColor,
  setScale,
} from "../../lib/resumeConfigSlice";
import resume from "../../resume.json";
import CheckMark from "./CheckMark";
import { useDropdownMenu } from "./DropdownMenuContext";
import MenuDivider from "./MenuDivider";
import MenuLink from "./MenuLink";
import MenuListItem from "./MenuListItem";
import { useMenuParent } from "./MenuParentContext";

const {
  darkForegroundColor,
  darkBackgroundColor,
  darkHighlightColor,
  lightForegroundColor,
  lightBackgroundColor,
  lightHighlightColor,
} = resumeConfiguration;

const ViewMenu = () => {
  const context = useDropdownMenu();
  const parentContext = useMenuParent();
  const dispatch = useDispatch();
  const { asPath } = useRouter();
  const router = useRouter();
  const foregroundColor = useAppSelector(selectForegroundColor);
  const scale = useAppSelector(selectScale);

  const setDarkTheme = () => {
    dispatch(setForegroundColor(darkForegroundColor));
    dispatch(setBackgroundColor(darkBackgroundColor));
    dispatch(setHighlightColor(darkHighlightColor));
    context.setIsActive(false);
    parentContext.setActiveDropdown("");
    parentContext.setIsActive(false);
  };

  const setLightTheme = () => {
    dispatch(setForegroundColor(lightForegroundColor));
    dispatch(setBackgroundColor(lightBackgroundColor));
    dispatch(setHighlightColor(lightHighlightColor));
    context.setIsActive(false);
    parentContext.setActiveDropdown("");
    parentContext.setIsActive(false);
  };

  const setScaleFactor = (scale: number) => {
    dispatch(setScale(scale));
    context.setIsActive(false);
    parentContext.setActiveDropdown("");
    parentContext.setIsActive(false);
  };

  const dismissMenu = () => {
    context.setIsActive(false);
    parentContext.setActiveDropdown("");
    parentContext.setIsActive(false);
  };

  const sourceCode = () => {
    context.setIsActive(false);
    parentContext.setActiveDropdown("");
    parentContext.setIsActive(false);
    window.open(resume.url);
  };

  return (
    <ul>
      <MenuListItem
        id="darkThemeMenuOption"
        onClick={setDarkTheme}
        scale={scale}
      >
        <CheckMark $isActive={foregroundColor === darkForegroundColor} />
        <MenuLink>Dark Theme</MenuLink>
      </MenuListItem>
      <MenuListItem
        id="lightThemeMenuOption"
        onClick={setLightTheme}
        scale={scale}
      >
        <CheckMark $isActive={foregroundColor === lightForegroundColor} />
        <MenuLink>Light Theme</MenuLink>
      </MenuListItem>
      <MenuDivider />
      <MenuListItem onClick={() => setScaleFactor(1.5)} scale={scale}>
        <CheckMark $isActive={scale === 1.5} />
        <MenuLink onClick={dismissMenu}>150%</MenuLink>
      </MenuListItem>
      <MenuListItem onClick={() => setScaleFactor(1.25)} scale={scale}>
        <CheckMark $isActive={scale === 1.25} />
        <MenuLink onClick={dismissMenu}>125%</MenuLink>
      </MenuListItem>
      <MenuListItem onClick={() => setScaleFactor(1)} scale={scale}>
        <CheckMark $isActive={scale === 1} />
        <MenuLink onClick={dismissMenu}>Real Size</MenuLink>
      </MenuListItem>
      <MenuDivider />
      <MenuListItem
        onClick={() => {
          dismissMenu();
          router.push("/");
        }}
        scale={scale}
      >
        <CheckMark $isActive={asPath === "/"} />
        <MenuLink>SVG</MenuLink>
      </MenuListItem>
      <MenuListItem
        onClick={() => {
          dismissMenu();
          router.push("/pdf");
        }}
        scale={scale}
      >
        <CheckMark $isActive={asPath === "/pdf"} />
        <MenuLink>PDF Preview</MenuLink>
      </MenuListItem>
      <MenuDivider />
      <MenuListItem onClick={sourceCode} scale={scale}>
        <CheckMark $isActive={false} />
        <MenuLink>Source Code</MenuLink>
      </MenuListItem>
    </ul>
  );
};

export default ViewMenu;
