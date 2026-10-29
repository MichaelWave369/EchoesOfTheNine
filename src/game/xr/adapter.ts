/**
 * XR adapter surface.
 * Quest 3 WebXR is the target. This build detects support and exposes a
 * documented entry. Immersive rendering of the battle is NOT claimed as
 * hardware-tested. Button and keyboard casts remain the canonical path.
 */

export interface XrCapability {
  supported: boolean;
  reason: string;
}

type XrSystemLike = {
  isSessionSupported: (mode: string) => Promise<boolean>;
  requestSession: (mode: string, opts?: { optionalFeatures?: string[] }) => Promise<{ end: () => Promise<void> }>;
};

function xrOf(): XrSystemLike | undefined {
  return (navigator as Navigator & { xr?: XrSystemLike }).xr;
}

export async function detectXr(): Promise<XrCapability> {
  const xr = typeof navigator === "undefined" ? undefined : xrOf();
  if (!xr) {
    return {
      supported: false,
      reason: "This browser has no WebXR. Desktop play is the full chapter. Quest 3 entry is an adapter, not a tested headset build.",
    };
  }
  try {
    const ok = await xr.isSessionSupported("immersive-vr");
    if (!ok) {
      return {
        supported: false,
        reason: "WebXR exists, but an immersive VR session is not available here. The chapter stays fully playable on desktop.",
      };
    }
    return {
      supported: true,
      reason: "Immersive VR is advertised by this browser. A reference session can be requested. It has not been verified on Quest 3 hardware.",
    };
  } catch {
    return { supported: false, reason: "WebXR query failed. Desktop play continues." };
  }
}

export interface XrInputBinding {
  cast: "trigger";
  dodge: "primary-button";
  move: "thumbstick-or-teleport";
  turn: "snap-turn";
  notes: string;
}

export const XR_BINDINGS: XrInputBinding = {
  cast: "trigger",
  dodge: "primary-button",
  move: "thumbstick-or-teleport",
  turn: "snap-turn",
  notes:
    "Trigger and the Cast button both emit CombatAction kind 'cast' with the same ability id. Hand pose is aimEvidence and is never damage authority. Seated and standing are both valid. Room-scale sprinting is not required and is not rewarded.",
};

/**
 * Future headset presentation. Empty on purpose.
 * A later adapter may fill these. The desktop game must not call them to function.
 * Not a claim that Quest 3, haptics, or hand tracking were tested.
 */
export interface XrPresentationHooks {
  mountBattle?: (encounterId: string) => void;
  unmountBattle?: () => void;
  spatialInteract?: (hotspotId: string) => void;
  haptic?: (pulse: "light" | "heavy") => void;
}

export const XR_PRESENTATION: XrPresentationHooks = {};

export async function requestReferenceSession(): Promise<{ ok: boolean; message: string }> {
  const cap = await detectXr();
  const xr = xrOf();
  if (!cap.supported || !xr) return { ok: false, message: cap.reason };
  try {
    const session = await xr.requestSession("immersive-vr", {
      optionalFeatures: ["local-floor"],
    });
    await session.end();
    return {
      ok: true,
      message:
        "A reference immersive session opened and closed. Battle rendering inside the headset is not implemented in this chapter — Ascension on desktop is the embodied mode.",
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Session was declined." };
  }
}
