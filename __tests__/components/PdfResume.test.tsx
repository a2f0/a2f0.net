import React from 'react';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi } from 'vitest';
import PdfResume from '../../components/PdfResume';
import resumeConfigReducer from '../../lib/resumeConfigSlice';
import invariant from 'invariant';

vi.mock('pdfobject', () => ({
  embed: vi.fn(),
}));

// Mock PdfResumeFactory
vi.mock('../../lib/pdfResumeFactory', () => {
  const mockFactory = vi.fn().mockImplementation(() => {
    return {
      getResume: vi.fn().mockReturnValue({
        output: vi.fn().mockReturnValue('mock-pdf-data-uri'),
      }),
    };
  });

  return { default: mockFactory };
});

describe('PdfResume', () => {
  const createMockStore = () => {
    return configureStore({
      reducer: {
        resumeConfig: resumeConfigReducer,
      },
    });
  };

  it('renders with correct width styling', () => {
    const store = createMockStore();
    const { container } = render(
      <Provider store={store}>
        <PdfResume />
      </Provider>
    );

    const pdfContainer = container.querySelector('#pdfObjectContainer');
    invariant(pdfContainer, 'pdfContainer is not found');
    const styles = window.getComputedStyle(pdfContainer);
    expect(styles.getPropertyValue('width')).toBe('100%');
    expect(pdfContainer).toMatchSnapshot();
  });

  it('applies the correct height calculation', () => {
    const store = createMockStore();
    const { container } = render(
      <Provider store={store}>
        <PdfResume />
      </Provider>
    );

    const pdfContainer = container.querySelector('#pdfObjectContainer');
    invariant(pdfContainer, 'pdfContainer is not found');
    const styles = window.getComputedStyle(pdfContainer);
    expect(styles.getPropertyValue('height')).toBe('calc( 100vh - var(--header-height) - var(--header-bottom-border) - var( --footer-height ) )');
  });
});
