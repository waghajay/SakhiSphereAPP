import { useEffect, useRef, useState } from "react";
import { PermissionsAndroid, Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { AGORA_MEETING_HTML } from "./AgoraMeetingHTML";

interface Props {
  appId: string;
  channelName: string;
  token: string;
  uid: number;
  onJoined?: () => void;
  onLeft?: () => void;
  onError?: (message: string) => void;
  onMicToggled?: (on: boolean) => void;
  onCamToggled?: (on: boolean) => void;
}

/**
 * Request native camera + mic permissions on Android before mounting WebView.
 * On iOS, the WebView shows the permission prompt automatically.
 */
async function requestMediaPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  try {
    const camera = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: "Camera Permission",
        message: "SakhiSphere needs camera access for video calls.",
        buttonPositive: "Allow",
        buttonNegative: "Deny",
      },
    );

    const mic = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: "Microphone Permission",
        message: "SakhiSphere needs microphone access for video calls.",
        buttonPositive: "Allow",
        buttonNegative: "Deny",
      },
    );

    return (
      camera === PermissionsAndroid.RESULTS.GRANTED &&
      mic === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch (err) {
    console.warn("Permission request failed:", err);
    return false;
  }
}

export function AgoraRoom({
  appId,
  channelName,
  token,
  uid,
  onJoined,
  onLeft,
  onError,
  onMicToggled,
  onCamToggled,
}: Props) {
  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  // Request native permissions on mount
  useEffect(() => {
    let mounted = true;
    requestMediaPermissions().then((granted) => {
      if (mounted) setPermissionsGranted(granted);
      if (!granted) {
        onError?.(
          "Camera and microphone permissions are required for video calls.",
        );
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Once WebView is ready AND permissions granted, send init
  useEffect(() => {
    if (ready && permissionsGranted) {
      const message = JSON.stringify({
        type: "init",
        payload: { appId, channelName, token, uid },
      });
      webRef.current?.postMessage(message);
    }
  }, [ready, permissionsGranted, appId, channelName, token, uid]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case "ready":
          setReady(true);
          break;
        case "joined":
          onJoined?.();
          break;
        case "left":
          onLeft?.();
          break;
        case "error":
          onError?.(data.payload?.message || "Unknown error");
          break;
        case "mic-toggled":
          onMicToggled?.(Boolean(data.payload?.on));
          break;
        case "cam-toggled":
          onCamToggled?.(Boolean(data.payload?.on));
          break;
        default:
          break;
      }
    } catch (e) {
      // ignore parse errors
    }
  };

  /**
   * CRITICAL: Grant camera/mic permission to the WebView's embedded page.
   * Without this, Agora Web SDK cannot access camera inside the WebView.
   */
  const handlePermissionRequest = (event: any) => {
    const { resources } = event.nativeEvent;
    const granted: string[] = [];

    for (const resource of resources) {
      // Android resource names: "android.webkit.resource.VIDEO_CAPTURE",
      // "android.webkit.resource.AUDIO_CAPTURE"
      // iOS resource names: "camera", "microphone"
      const r = String(resource).toLowerCase();
      if (
        r.includes("video") ||
        r.includes("camera") ||
        r.includes("audio") ||
        r.includes("microphone")
      ) {
        granted.push(resource);
      }
    }

    if (granted.length > 0) {
      event.nativeEvent.grant(granted);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        source={{ html: AGORA_MEETING_HTML }}
        onMessage={handleMessage}
        onPermissionRequest={handlePermissionRequest}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        startInLoadingState
        // Extra settings that help with camera on Android
        androidLayerType="hardware"
        allowsFullscreenVideo
        mixedContentMode="always"
        // Allow file access for older devices
        allowFileAccess
        allowUniversalAccessFromFileURLs
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  webview: { flex: 1, backgroundColor: "#000" },
});
