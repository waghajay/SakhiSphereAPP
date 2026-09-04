import { ResizeMode, Video } from "expo-av";
import { useRef, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

const { width, height } = Dimensions.get("window");

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  visible: boolean;
  onClose: () => void;
}

export function VideoPlayer({
  videoUrl,
  thumbnailUrl,
  visible,
  onClose,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<Video>(null);

  const handlePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleClose = async () => {
    if (videoRef.current) {
      await videoRef.current.stopAsync();
    }
    setIsPlaying(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        {/* Video Player */}
        <TouchableOpacity
          style={styles.videoContainer}
          activeOpacity={1}
          onPress={() => setShowControls(!showControls)}
        >
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            onPlaybackStatusUpdate={(status) => {
              if (status.isLoaded) {
                setIsLoading(false);
                setIsPlaying(status.isPlaying);
              }
            }}
            onLoadStart={() => setIsLoading(true)}
            onLoad={() => setIsLoading(false)}
            useNativeControls={false}
          />

          {/* Loading Indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          )}

          {/* Play/Pause Button */}
          {showControls && !isLoading && (
            <TouchableOpacity
              style={styles.playPauseButton}
              onPress={handlePlayPause}
            >
              <Text style={styles.playPauseIcon}>
                {isPlaying ? "⏸️" : "▶️"}
              </Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
  },
  videoContainer: {
    width,
    height: height * 0.8,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: "100%",
    height: "100%",
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
  loadingContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  playPauseButton: {
    position: "absolute",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  playPauseIcon: {
    fontSize: 28,
  },
});
