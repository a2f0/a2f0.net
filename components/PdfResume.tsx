import Color from 'color';
import PDFObject from 'pdfobject';
import React, {useEffect} from 'react';
import styled from 'styled-components';

import {useAppSelector} from '../lib/hooks';
import PdfResumeFactory from '../lib/pdfResumeFactory';
import {resume} from '../lib/resume';
import type {ResumeConfig} from '../lib/resumeConfig';
import {
  selectBackgroundColor,
  selectForegroundColor,
  selectHighlightColor,
} from '../lib/resumeConfigSlice';
import {selectScale} from '../lib/resumeConfigSlice';

const PdfObjectContainer = styled.div`
  height: calc(
    100vh - var(--header-height) - var(--header-bottom-border) - var(
        --footer-height
      )
  );
  width: 100%;
`;

export default function PdfResume() {
  const foregroundColor = useAppSelector(selectForegroundColor);
  const backgroundColor = useAppSelector(selectBackgroundColor);
  const highlightColor = useAppSelector(selectHighlightColor);
  const scale = useAppSelector(selectScale);

  useEffect(() => {
    const config: ResumeConfig = {
      foregroundColor: Color(foregroundColor),
      backgroundColor: Color(backgroundColor),
      highlightColor: Color(highlightColor),
    };
    const resumeFactory = new PdfResumeFactory(config, resume);
    const pdfResume = resumeFactory.getResume();
    PDFObject.embed(pdfResume.output('datauristring'), '#pdfObjectContainer', {
      id: 'pdfObject',
      pdfOpenParams: {
        scrollbars: '0',
        toolbar: '0',
        statusbar: '0',
        navpanes: '0',
        zoom: `${scale * 100}`,
        pagemode: 'none',
      },
    });
  });

  return <PdfObjectContainer id="pdfObjectContainer" />;
}
