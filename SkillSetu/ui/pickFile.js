import { Platform } from 'react-native';

// Opens the browser file chooser and resolves with the chosen File (or null).
// Web-only; native callers receive null.
export function pickFile({ accept = '*/*' } = {}) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.onchange = () => {
      const file = input.files && input.files[0] ? input.files[0] : null;
      document.body.removeChild(input);
      resolve(file);
    };
    document.body.appendChild(input);
    input.click();
  });
}
