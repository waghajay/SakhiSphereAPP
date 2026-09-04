import { useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    FlatList,
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

const { width, height } = Dimensions.get("window");

interface ImageGalleryProps {
  images: string[];
  visible: boolean;
  initialIndex?: number;
  onClose: () => void;
  onDelete?: (index: number) => void;
  showDelete?: boolean;
}

export function ImageGallery({
  images,
  visible,
  initialIndex = 0,
  onClose,
  onDelete,
  showDelete = false,
}: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);
  const scale = useRef(new Animated.Value(1)).current;

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / width);
    setCurrentIndex(index);
  };

  const handleDoubleTap = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.5,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const renderImage = ({ item, index }: { item: string; index: number }) => (
    <View style={styles.imageContainer}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onClose}
        style={styles.imageWrapper}
      >
        <Animated.Image
          source={{ uri: item }}
          style={[styles.image, { transform: [{ scale }] }]}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );

  if (!visible || images.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        {/* Image Counter */}
        {images.length > 1 && (
          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        )}

        {/* Delete Button */}
        {showDelete && onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(currentIndex)}
          >
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        )}

        {/* Image Gallery */}
        <FlatList
          ref={flatListRef}
          data={images}
          renderItem={renderImage}
          keyExtractor={(item, index) => `${item}_${index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          initialScrollIndex={initialIndex}
          getItemLayout={(data, index) => ({
            length: width,
            offset: width * index,
            index,
          })}
        />

        {/* Dot Indicators */}
        {images.length > 1 && (
          <View style={styles.dotsContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === currentIndex && styles.dotActive]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
  },
  imageContainer: {
    width,
    height,
    justifyContent: "center",
    alignItems: "center",
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width,
    height: height * 0.9,
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  counterContainer: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  counterText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    position: "absolute",
    bottom: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255, 0, 0, 0.7)",
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIcon: {
    fontSize: 22,
  },
  dotsContainer: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
