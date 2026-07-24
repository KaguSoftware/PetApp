import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import PixelSprite from "@/components/pixel/PixelSprite";
import { CAT_SPRITE } from "@/components/pixel/petSprites";
import { font, useColors, type Colors } from "@/lib/theme";

/**
 * The PetPal brand lockup for auth screens: the pixel mascot (the one place
 * pixel art belongs — the pets) over a clean wordmark.
 */
export default function BrandMark() {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.wrap}>
      <PixelSprite sprite={CAT_SPRITE} size={48} />
      <Text style={styles.wordmark}>PetPal</Text>
    </View>
  );
}

const makeStyles = (colors: Colors) =>
  StyleSheet.create({
    wrap: { alignItems: "center" },
    wordmark: { marginTop: 12, fontSize: 24, fontFamily: font.bold, letterSpacing: -0.5, color: colors.label },
  });
