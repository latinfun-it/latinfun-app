import React from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { AuthProvider } from "../src/auth";
import { PlayerProvider } from "../src/player";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#050505" }}>
      <AuthProvider>
        <PlayerProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#050505" },
              animation: "fade",
            }}
          />
        </PlayerProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
