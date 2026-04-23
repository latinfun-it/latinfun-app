import { Redirect } from "expo-router";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { useAuth } from "../src/auth";
import { colors } from "../src/theme";

export default function Index() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={styles.c}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }
  return <Redirect href={user ? "/(tabs)/home" : "/(auth)/login"} />;
}

const styles = StyleSheet.create({
  c: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
});
