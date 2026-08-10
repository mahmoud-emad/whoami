import { beforeEach, describe, expect, it } from 'vitest';
import { useImageViewer } from './useImageViewer';

// State is module scoped by design — one viewer for the whole app — so each test starts by
// closing whatever the previous one left open.
beforeEach(() => {
  useImageViewer().close();
});

describe('useImageViewer', () => {
  it('opens with the given image', () => {
    const viewer = useImageViewer();
    viewer.open('/uploads/chair.png', 'A broken chair');
    expect(viewer.isOpen.value).toBe(true);
    expect(viewer.src.value).toBe('/uploads/chair.png');
    expect(viewer.alt.value).toBe('A broken chair');
  });

  it('treats a missing alt as no caption', () => {
    const viewer = useImageViewer();
    viewer.open('/uploads/chair.png');
    expect(viewer.alt.value).toBe('');
  });

  // A click that yields no usable src must not open an empty black overlay the reader then has
  // to dismiss.
  it('refuses to open on an empty src', () => {
    const viewer = useImageViewer();
    viewer.open('');
    expect(viewer.isOpen.value).toBe(false);
  });

  it('shares one viewer between callers', () => {
    useImageViewer().open('/uploads/a.png');
    expect(useImageViewer().isOpen.value).toBe(true);
  });

  // Blanking src on close would swap the <img> to an empty source for the length of the fade-out,
  // so the picture would vanish a beat before the backdrop.
  it('keeps the image while closing', () => {
    const viewer = useImageViewer();
    viewer.open('/uploads/chair.png', 'A broken chair');
    viewer.close();
    expect(viewer.isOpen.value).toBe(false);
    expect(viewer.src.value).toBe('/uploads/chair.png');
  });

  it('replaces the image when opened again', () => {
    const viewer = useImageViewer();
    viewer.open('/uploads/a.png', 'first');
    viewer.open('/uploads/b.png', 'second');
    expect(viewer.src.value).toBe('/uploads/b.png');
    expect(viewer.alt.value).toBe('second');
  });
});
