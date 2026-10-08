import { downloadPdf, downloadSvg } from "@a2f0/shared/downloads";
import { printResume } from "@a2f0/shared/print";
import { FilePdfIcon } from "@phosphor-icons/react/dist/csr/FilePdf";
import { FileSvgIcon } from "@phosphor-icons/react/dist/csr/FileSvg";
import { PrinterIcon } from "@phosphor-icons/react/dist/csr/Printer";

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
import MenuDivider from "./MenuDivider";
import MenuIcon from "./MenuIcon";
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

  const print = () => {
    close();
    printResume();
  };

  return (
    <>
      <ul>
        <li>
          <MenuAction
            type="button"
            id="downloadPdfMenuOption"
            onClick={downloadPDF}
            $scale={scale}
          >
            <CheckMark $isActive={false} />
            <MenuIcon icon={FilePdfIcon} scale={scale} />
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
            <MenuIcon icon={FileSvgIcon} scale={scale} />
            <MenuLabel>Download SVG</MenuLabel>
          </MenuAction>
        </li>
      </ul>
      <MenuDivider />
      <ul>
        <li>
          <MenuAction
            type="button"
            id="printMenuOption"
            onClick={print}
            $scale={scale}
          >
            <CheckMark $isActive={false} />
            <MenuIcon icon={PrinterIcon} scale={scale} />
            <MenuLabel>Print</MenuLabel>
          </MenuAction>
        </li>
      </ul>
    </>
  );
};
export default FileMenu;
