import { PropsWithChildren } from "react";
import { ImageBackground, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";

import { useAppearance } from "@/features/appearance/AppearanceProvider";
import { useAppTheme } from "@/theme/ThemeProvider";

export function AppScreen({ children }: PropsWithChildren) {
  const { preferences } = useAppearance();
  const { theme } = useAppTheme();
  const backgroundUri = preferences.globalBackgroundImageUri;

  const content = (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );

  if (backgroundUri) {
    return (
      <ImageBackground resizeMode="cover" source={{ uri: backgroundUri }} style={styles.background}>
        <View style={styles.imageWash}>{content}</View>
      </ImageBackground>
    );
  }

  return <View style={[styles.background, { backgroundColor: theme.backgroundColor }]}>{content}</View>;
}

const styles = StyleSheet.create({
  background: {
    flex: 1
  },
  imageWash: {
    backgroundColor: "rgba(247, 253, 246, 0.86)",
    flex: 1
  },
  safeArea: {
    flex: 1
  },
  content: {
    flexGrow: 1,
    gap: 14,
    padding: 20
  }
});
