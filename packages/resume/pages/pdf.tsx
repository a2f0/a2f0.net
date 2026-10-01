import Main from "../components/layout/Main";
import PdfResume from "../components/PdfResume";
import { RESUME_NAME } from "@a2f0/shared/resumeName";

export default function Pdf() {
  return (
    <Main title={`${RESUME_NAME} – Resume (PDF)`}>
      <PdfResume />
    </Main>
  );
}
