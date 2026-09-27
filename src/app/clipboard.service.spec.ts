import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClipboardService } from './clipboard.service';

describe('Clipboard writer', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('writes without reading the clipboard or querying permissions and waits for completion', async () => {
    let complete!: () => void;
    const pending = new Promise<void>(resolve => { complete = resolve; });
    const writeText = vi.fn().mockReturnValue(pending);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const completed = vi.fn();
    const write = new ClipboardService().writeText('applied FEN').then(completed);
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledExactlyOnceWith('applied FEN');
    expect(completed).not.toHaveBeenCalled();
    complete();
    await write;
    expect(completed).toHaveBeenCalledOnce();
  });

  it('rejects when Clipboard API is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    await expect(new ClipboardService().writeText('FEN')).rejects.toThrow('unavailable');
  });

  it('propagates denied writes', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } });
    await expect(new ClipboardService().writeText('FEN')).rejects.toThrow('Denied');
  });
});
