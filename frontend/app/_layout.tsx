import React from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { AuthProvider } from "../src/auth";
import { PlayerProvider } from "../src/player";
import { I18nProvider } from "../src/i18n";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#050505" }}>
      <I18nProvider>
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
      </I18nProvider>
    </GestureHandlerRootView>
  );
}
