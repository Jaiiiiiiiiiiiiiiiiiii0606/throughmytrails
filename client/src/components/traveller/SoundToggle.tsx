import { preview, usePreview } from '../../lib/preview';
import { SoundOffIcon, SoundOnIcon } from './TIcons';

/** "Sound on hover" switch. Shows a gentle hint when the browser is still holding sound back. */
export function SoundToggle({ className = '' }: { className?: string }) {
  const { soundOn, blocked } = usePreview();
  return (
    <button
      type="button"
      className={`sound-toggle ${soundOn ? 'on' : ''} ${blocked ? 'blocked' : ''} ${className}`}
      onClick={() => preview.setSound(!soundOn)}
      aria-pressed={soundOn}
      title={blocked ? 'Click anywhere on the page once to let your browser play sound' : undefined}
    >
      {soundOn ? <SoundOnIcon size={18} /> : <SoundOffIcon size={18} />}
      <span>{soundOn ? (blocked ? 'Tap to hear places' : 'Sound on') : 'Sound off'}</span>
    </button>
  );
}
