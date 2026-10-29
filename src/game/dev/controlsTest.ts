/** QA probe type. The battle screen assigns window.__controlsTest while Ascension or Legacy is mounted. */
export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  setKeys?: (codes: string[]) => void;
  getPos?: () => { x: number; z: number };
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}
