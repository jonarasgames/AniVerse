import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Video from 'react-native-video';

const PlayerScreen = () => {
  const [paused, setPaused] = React.useState(true);
  const videoRef = React.useRef(null);

  const handlePlayPause = () => {
    setPaused(!paused);
  };

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri: 'http://path/to/your/video.mp4' }} // Replace with your video source
        style={styles.video}
        paused={paused}
        resizeMode='contain'
        onEnd={() => console.log('Video Ended')}
      />
      <TouchableOpacity style={styles.playPauseButton} onPress={handlePlayPause}>
        <Text style={styles.buttonText}>{paused ? 'Play' : 'Pause'}</Text>
      </TouchableOpacity>
      <Text style={styles.instructions}>Use remote control to navigate and play/pause the video.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '80%',
  },
  playPauseButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: 'blue',
    borderRadius: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
  },
  instructions: {
    color: '#fff',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default PlayerScreen;