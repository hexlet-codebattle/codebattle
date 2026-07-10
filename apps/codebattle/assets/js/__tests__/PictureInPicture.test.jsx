import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PictureInPicture, { copyStyles } from '../widgets/components/PictureInPicture';

describe('PictureInPicture component', () => {
  let mockPipWindow;

  beforeEach(() => {
    mockPipWindow = {
      document: {
        body: {
          appendChild: vi.fn(),
          style: {},
        },
        createElement: vi.fn().mockImplementation((tag) => {
          return document.createElement(tag);
        }),
      },
      addEventListener: vi.fn(),
      close: vi.fn(),
    };

    window.documentPictureInPicture = {
      requestWindow: vi.fn().mockResolvedValue(mockPipWindow),
    };
  });

  afterEach(() => {
    delete window.documentPictureInPicture;
  });

  test('does not render when isActive is false', () => {
    const { container } = render(
      <PictureInPicture isActive={false} onClose={vi.fn()}>
        <div>Timer Content</div>
      </PictureInPicture>,
    );

    expect(container).toBeEmptyDOMElement();
    expect(window.documentPictureInPicture.requestWindow).not.toHaveBeenCalled();
  });

  test('opens pip window and renders children via portal when isActive is true', async () => {
    const onCloseMock = vi.fn();

    render(
      <PictureInPicture isActive={true} onClose={onCloseMock}>
        <div data-testid="pip-child">Timer Content</div>
      </PictureInPicture>,
    );

    await waitFor(() => {
      expect(window.documentPictureInPicture.requestWindow).toHaveBeenCalled();
    });

    expect(mockPipWindow.document.body.appendChild).toHaveBeenCalled();
  });

  test('closes pip window on unmount', async () => {
    const { unmount } = render(
      <PictureInPicture isActive={true} onClose={vi.fn()}>
        <div>Timer Content</div>
      </PictureInPicture>,
    );

    await waitFor(() => {
      expect(window.documentPictureInPicture.requestWindow).toHaveBeenCalled();
    });

    unmount();
    expect(mockPipWindow.close).toHaveBeenCalled();
  });

  test('calls onClose when requestWindow fails', async () => {
    window.documentPictureInPicture.requestWindow.mockRejectedValue(new Error('Permission denied'));
    const onCloseMock = vi.fn();

    render(
      <PictureInPicture isActive={true} onClose={onCloseMock}>
        <div>Timer Content</div>
      </PictureInPicture>,
    );

    await waitFor(() => {
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  test('copyStyles copies styleSheets correctly', () => {
    const sourceDoc = {
      styleSheets: [
        {
          cssRules: [{ cssText: '.test-rule { color: red; }' }],
        },
        {
          href: 'http://example.com/styles.css',
        },
      ],
    };

    const targetDoc = {
      createElement: vi.fn().mockImplementation((tag) => {
        return {
          appendChild: vi.fn(),
          appendChildNode: vi.fn(),
        };
      }),
      createTextNode: vi.fn().mockImplementation((text) => text),
      head: {
        appendChild: vi.fn(),
      },
    };

    copyStyles(sourceDoc, targetDoc);

    expect(targetDoc.createElement).toHaveBeenCalledWith('style');
    expect(targetDoc.createElement).toHaveBeenCalledWith('link');
    expect(targetDoc.head.appendChild).toHaveBeenCalled();
  });
});
