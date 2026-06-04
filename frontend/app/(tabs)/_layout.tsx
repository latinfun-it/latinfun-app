import React from "react";
import { View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import MiniPlayer from "../../src/MiniPlayer";
import { colors } from "../../src/theme";
import { usePlayer } from "../../src/player";
import { useI18n } from "../../src/i18n";

function TabIcon({ name, color }: { name: any; color: string }) {
  return <Ionicons name={name} size={22} color={color} />;
}

export default function TabsLayout() {
  const { currentMix } = usePlayer();
  const { t } = useI18n();
  const extraPadding = currentMix ? 74 : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brand,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3 },
          tabBarStyle: {
            backgroundColor: "rgba(5,5,5,0.96)",
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 68 + extraPadding,
            paddingTop: 8,
            paddingBottom: 12,
          },
          sceneStyle: { backgroundColor: colors.bg },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: t("tabs.home"),
            tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
            tabBarButtonTestID: "tab-home",
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: t("tabs.events"),
            tabBarIcon: ({ color }) => <TabIcon name="calendar" color={color} />,
            tabBarButtonTestID: "tab-events",
          }}
        />
        <Tabs.Screen
          name="locali"
          options={{
            title: t("tabs.locali"),
            tabBarIcon: ({ color }) => <Ionicons name="restaurant" size={22} color={color} />,
            tabBarButtonTestID: "tab-locali",
          }}
        />
        <Tabs.Screen
          name="match"
          options={{
            title: t("tabs.match"),
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="fire" size={24} color={color} />
            ),
            tabBarButtonTestID: "tab-match",
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t("tabs.profile"),
            tabBarIcon: ({ color }) => <TabIcon name="person" color={color} />,
            tabBarButtonTestID: "tab-profile",
          }}
        />
        {/* Hidden tabs (still routable but not shown in tab bar) */}
        <Tabs.Screen
          name="schools"
          options={{
            href: null,
            title: t("tabs.schools"),
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="dance-ballroom" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="djs"
          options={{
            href: null,
            title: t("tabs.djs"),
            tabBarIcon: ({ color }) => <TabIcon name="disc" color={color} />,
          }}
        />
        <Tabs.Screen
          name="music"
          options={{
            href: null,
            title: t("tabs.music"),
            tabBarIcon: ({ color }) => <TabIcon name="musical-notes" color={color} />,
          }}
        />
      </Tabs>
      <View style={styles.miniWrap} pointerEvents="box-none">
        <MiniPlayer />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  miniWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 72,
  },
});
