import React from 'react';
import { View, FlatList, StyleSheet, Text, Image } from 'react-native';

const DATA = [
  { id: '1', title: 'Attack on Titan', image: 'https://example.com/images/aot.jpg' },
  { id: '2', title: 'My Hero Academia', image: 'https://example.com/images/mha.jpg' },
  { id: '3', title: 'Demon Slayer', image: 'https://example.com/images/ds.jpg' },
  { id: '4', title: 'One Piece', image: 'https://example.com/images/op.jpg' },
  { id: '5', title: 'Naruto', image: 'https://example.com/images/naruto.jpg' },
  { id: '6', title: 'Sword Art Online', image: 'https://example.com/images/sa.jpg' },
];

const HomeScreen = () => {
  return (
    <View style={styles.container}>
      <FlatList
        data={DATA}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <Text style={styles.title}>{item.title}</Text>
          </View>
        )}
        keyExtractor={item => item.id}
        numColumns={3}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#000',
  },
  item: {
    flex: 1,
    margin: 5,
    backgroundColor: '#333',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: 150,
    height: 200,
    borderRadius: 10,
  },
  title: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 5,
  },
});

export default HomeScreen;
