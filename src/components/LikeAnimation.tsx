import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface LikeAnimationProps {
  visible: boolean;
  onComplete?: () => void;
}

export function LikeAnimation({ visible, onComplete }: LikeAnimationProps) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1.2,
            friction: 3,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -20,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.spring(scale, {
            toValue: 1,
            friction: 3,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        scale.setValue(0);
        opacity.setValue(1);
        translateY.setValue(0);
        if (onComplete) onComplete();
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.heartContainer,
          {
            transform: [{ scale }, { translateY }],
            opacity,
          },
        ]}
      >
        <Text style={styles.heart}>❤️</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -40,
    marginTop: -40,
    zIndex: 1000,
  },
  heartContainer: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  heart: {
    fontSize: 64,
  },
});
