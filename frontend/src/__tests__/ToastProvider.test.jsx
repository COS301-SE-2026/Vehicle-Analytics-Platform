import { renderHook } from '@testing-library/react';
import { toast as sonnerToast } from 'sonner';
import { useToast } from '@/components/alerts/ToastProvider';

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    dismiss: jest.fn(),
  },
}));

describe('useToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('success() delegates to sonnerToast.success with title, description and extra opts', () => {
    const { result } = renderHook(() => useToast());

    result.current.success('Saved', 'Your changes were saved.', { duration: 4000 });

    expect(sonnerToast.success).toHaveBeenCalledWith('Saved', {
      description: 'Your changes were saved.',
      duration: 4000,
    });
  });

  test('success() works with no extra opts', () => {
    const { result } = renderHook(() => useToast());

    result.current.success('Saved', 'Your changes were saved.');

    expect(sonnerToast.success).toHaveBeenCalledWith('Saved', {
      description: 'Your changes were saved.',
    });
  });

  test('error() delegates to sonnerToast.error with title, description and extra opts', () => {
    const { result } = renderHook(() => useToast());

    result.current.error('Failed', 'Something went wrong.', { duration: 6000 });

    expect(sonnerToast.error).toHaveBeenCalledWith('Failed', {
      description: 'Something went wrong.',
      duration: 6000,
    });
  });

  test('warning() delegates to sonnerToast.warning with title, description and extra opts', () => {
    const { result } = renderHook(() => useToast());

    result.current.warning('Heads up', 'This action is irreversible.');

    expect(sonnerToast.warning).toHaveBeenCalledWith('Heads up', {
      description: 'This action is irreversible.',
    });
  });

  test('dismiss() delegates to sonnerToast.dismiss with the given id', () => {
    const { result } = renderHook(() => useToast());

    result.current.dismiss('toast-123');

    expect(sonnerToast.dismiss).toHaveBeenCalledWith('toast-123');
  });

  test('dismiss() works with no id (dismiss all)', () => {
    const { result } = renderHook(() => useToast());

    result.current.dismiss();

    expect(sonnerToast.dismiss).toHaveBeenCalledWith(undefined);
  });

  test('each call returns a fresh toast API object, all backed by the same sonnerToast', () => {
    const { result, rerender } = renderHook(() => useToast());
    const first = result.current;

    rerender();
    const second = result.current;

  
    expect(first).not.toBe(second);
    expect(typeof first.success).toBe('function');
    expect(typeof second.success).toBe('function');
  });
});