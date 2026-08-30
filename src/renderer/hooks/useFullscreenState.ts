import { useEffect, useState } from 'react';

/** Следит за тем, находится ли документ в полноэкранном режиме. */
export function useFullscreenState(): boolean {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(
    () => !!document.fullscreenElement,
  );

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);

    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  return isFullscreen;
}

export default useFullscreenState;
