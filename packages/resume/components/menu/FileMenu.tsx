import { downloadPdf, downloadSvg } from "@a2f0/shared/downloads";

import { useAppSelector } from "../../lib/hooks";
import {
  selectBackgroundColor,
  selectForegroundColor,
  selectHighlightColor,
} from "../../lib/resumeConfigSlice";
import { selectScale } from "../../lib/resumeConfigSlice";
import CheckMark from "./CheckMark";
import { useDropdownMenu } from "./DropdownMenuContext";
import MenuAction from "./MenuAction";
import MenuLabel from "./MenuLabel";

const FileMenu = () => {
  const { close } = useDropdownMenu();
  const foregroundColor = useAppSelector(selectForegroundColor);
  const backgroundColor = useAppSelector(selectBackgroundColor);
  const highlightColor = useAppSelector(selectHighlightColor);
  const scale = useAppSelector(selectScale);

  const colors = { foregroundColor, backgroundColor, highlightColor };

  const downloadPDF = () => {
    downloadPdf(colors);
    close();
  };

  const downloadSVG = async () => {
    await downloadSvg(colors);
    close();
  };

  return (
    <ul>
      <li>
        <MenuAction
          type="button"
          id="downloadPdfMenuOption"
          onClick={downloadPDF}
          $scale={scale}
        >
          <CheckMark $isActive={false} />
          <MenuLabel>Download PDF</MenuLabel>
        </MenuAction>
      </li>
      <li>
        <MenuAction
          type="button"
          id="downloadSvgMenuOption"
          onClick={downloadSVG}
          $scale={scale}
        >
          <CheckMark $isActive={false} />
          <MenuLabel>Download SVG</MenuLabel>
        </MenuAction>
      </li>
    </ul>
  );
};
export default FileMenu;
