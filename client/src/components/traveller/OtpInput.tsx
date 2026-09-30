import { ClipboardEvent, KeyboardEvent, useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onComplete: (v: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  length?: number;
}

/** Six single-digit boxes that behave like one field: typing advances, backspace retreats, paste fills. */
export function OtpInput({ value, onChange, onComplete, disabled, invalid, length = 6 }: Props) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  useEffect(() => {
    refs.current[Math.min(value.length, length - 1)]?.focus();
    // Only on mount: later focus follows the user's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) onComplete(clean);
    return clean;
  };

  const onInput = (i: number, raw: string) => {
    const d = raw.replace(/\D/g, '');
    if (!d) return;
    if (d.length > 1) {
      // Autofill from the OS ("one-time-code") can drop the whole code into one box.
      const filled = set(d);
      refs.current[Math.min(filled.length, length - 1)]?.focus();
      return;
    }
    const arr = digits.slice();
    arr[i] = d;
    const joined = arr.join('').slice(0, length);
    set(joined);
    if (i < length - 1) refs.current[i + 1]?.focus();
  };

  const onKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arr = digits.slice();
      if (arr[i]) arr[i] = '';
      else if (i > 0) {
        arr[i - 1] = '';
        refs.current[i - 1]?.focus();
      }
      onChange(arr.join('').replace(/\s/g, ''));
    } else if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    else if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  };

  const onPaste = (e: ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (!/\d/.test(text)) return;
    e.preventDefault();
    const filled = set(text);
    refs.current[Math.min(filled.length, length - 1)]?.focus();
  };

  return (
    <div className={`otp ${invalid ? 'invalid' : ''}`} role="group" aria-label="6-digit code" onPaste={onPaste}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          pattern="[0-9]*"
          maxLength={i === 0 ? length : 1}
          aria-label={`Digit ${i + 1}`}
          disabled={disabled}
          onChange={(e) => onInput(i, e.target.value)}
          onKeyDown={(e) => onKey(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
