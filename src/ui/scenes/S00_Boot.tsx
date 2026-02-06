import { useEffect } from 'react';

type BootSceneProps = {
  onBootDone: () => void;
};

export default function BootScene({ onBootDone }: BootSceneProps) {
  useEffect(() => {
    onBootDone();
  }, [onBootDone]);

  return <div>Booting...</div>;
}
