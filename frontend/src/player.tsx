import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";
import type { Mix } from "./types";

type PlayerState = {
  currentMix: Mix | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  play: (mix: Mix) => void;
  toggle: () => void;
  stop: () => void;
};

const PlayerCtx = createContext<PlayerState | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentMix, setCurrentMix] = useState<Mix | null>(null);
  const player = useAudioPlayer();
  const status = useAudioPlayerStatus(player);
  const loadedId = useRef<string | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
  }, []);

  useEffect(() => {
    if (currentMix && loadedId.current !== currentMix.id) {
      try {
        player.replace({ uri: currentMix.audio_url });
        player.play();
        loadedId.current = currentMix.id;
      } catch {}
    }
  }, [currentMix, player]);

  const play = useCallback(
    (mix: Mix) => {
      if (currentMix?.id === mix.id) {
        try { player.play(); } catch {}
        return;
      }
      setCurrentMix(mix);
    },
    [currentMix, player]
  );

  const toggle = useCallback(() => {
    if (!currentMix) return;
    try {
      if (status.playing) player.pause();
      else player.play();
    } catch {}
  }, [currentMix, player, status.playing]);

  const stop = useCallback(() => {
    try { player.pause(); } catch {}
    setCurrentMix(null);
    loadedId.current = null;
  }, [player]);

  return (
    <PlayerCtx.Provider
      value={{
        currentMix,
        isPlaying: !!status.playing,
        position: status.currentTime || 0,
        duration: status.duration || currentMix?.duration_sec || 0,
        play,
        toggle,
        stop,
      }}
    >
      {children}
    </PlayerCtx.Provider>
  );
}

export function usePlayer(): PlayerState {
  const ctx = useContext(PlayerCtx);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}
