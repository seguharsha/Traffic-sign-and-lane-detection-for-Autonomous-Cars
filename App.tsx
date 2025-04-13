import React, { useState, useRef, useEffect } from "react";
import { View, Button, ActivityIndicator, Text, StyleSheet } from "react-native";
import { Camera, useCameraDevices } from "react-native-vision-camera";
import Video from "react-native-video";

const BACKEND_URL = "https://d6cc-34-125-180-34.ngrok-free.app/detect-video/"; // Change this to your actual backend URL

export default function App() {
  const devices = useCameraDevices();
  const device = devices.find((d)=>d.position==='back');
  const cameraRef = useRef<Camera>(null);
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [processedVideoUri, setProcessedVideoUri] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const permission = await Camera.requestCameraPermission();
      if (permission !== "granted") {
        console.warn("Camera permission denied");
      }
    })();
  }, []);

  const startRecording = async () => {
    if (!cameraRef.current) return;
    setRecording(true);
    setProcessedVideoUri(null); // Clear the previous processed video

    try {
      const video = await cameraRef.current.startRecording({
        flash: "off",
        onRecordingFinished: (video) => {
          setVideoUri(video.path); // Save the recorded video path
          setRecording(false);
          uploadVideo(video.path); // Automatically upload after recording
        },
        onRecordingError: (error) => {
          console.error("Recording error:", error);
          setRecording(false);
        },
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      setRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current) return;
    await cameraRef.current.stopRecording();
    setRecording(false);
  };

  const uploadVideo = async (path: string) => {
    setProcessing(true);
    const formData = new FormData();
    formData.append("file", {
      uri: `file://${path}`,
      type: "video/mp4",
      name: "recorded_video.mp4",
    });

    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        body: formData,
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = await response.json();
      if (data.video_url) {
        setProcessedVideoUri(data.video_url);
      } else {
        console.error("Processing failed:", data.error);
      }
    } catch (error) {
      console.error("Error uploading video:", error);
    } finally {
      setProcessing(false);
    }
  };

  if (!device) return <View style={styles.center}><Text>No camera found</Text></View>;

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        device={device}
        isActive={true}
        video={true}
      />

      <View style={styles.controls}>
        {processing ? (
          <ActivityIndicator size="large" color="#00ff00" />
        ) : recording ? (
          <Button title="Stop Recording" onPress={stopRecording} color="red" />
        ) : (
          <Button title="Start Recording" onPress={startRecording} />
        )}
      </View>

      {processedVideoUri && (
        <View style={styles.videoContainer}>
          <Text>Processed Video:</Text>
          <Video
            source={{ uri: processedVideoUri }}
            style={styles.video}
            controls
            resizeMode="contain"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  camera: { width: "100%", height: "60%" },
  controls: { marginTop: 20 },
  videoContainer: { marginTop: 20, width: "100%", height: 300 },
  video: { width: "100%", height: "100%" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
