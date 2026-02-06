import { useCallback, useRef, useState } from 'react';

import {
  init,
  step,
  type ActionEnvelope,
  type State,
  type UIAction,
} from '../engine';
import BootScene from '../ui/scenes/S00_Boot';
import TitleScene from '../ui/scenes/S01_Title';

const buildEnvelope = (
  clientSeq: number,
  action: UIAction
): ActionEnvelope => ({
  clientSeq,
  action,
});

export default function App() {
  const [state, setState] = useState<State>(() => init());
  const clientSeqRef = useRef(0);

  const dispatch = useCallback(
    (action: UIAction) => {
      clientSeqRef.current += 1;
      const envelope = buildEnvelope(clientSeqRef.current, action);
      const result = step(state, envelope);

      if (result.error) {
        console.warn(result.error.message, result.error.data);
      }

      setState(result.nextState);
    },
    [state]
  );

  switch (state.sceneId) {
    case 'S00_BOOT':
      return <BootScene onBootDone={() => dispatch({ type: 'BOOT_DONE' })} />;
    case 'S01_TITLE':
      return <TitleScene />;
    default:
      return <div>Scene: {state.sceneId}</div>;
  }
}
