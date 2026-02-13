import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const DEFAULT_AVATAR =
  'https://cdn-icons-png.flaticon.com/512/149/149071.png';

const EditProfileScreen = ({ navigation }) => {
  const user = auth().currentUser;

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [techStack, setTechStack] = useState([]);
  const [hobbies, setHobbies] = useState([]);
  const [techInput, setTechInput] = useState('');
  const [hobbyInput, setHobbyInput] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const doc = await firestore().collection('users').doc(user.uid).get();
      if (doc.exists) {
        const data = doc.data();
        setName(data.name || '');
        setUsername(data.username || '');
        setBio(data.bio || '');
        setTechStack(data.techStack || []);
        setHobbies(data.hobbies || []);
        setPhotoURL(data.photoURL || '');
      }
    };

    fetchUser();
  }, []);

  const addTag = (value, list, setList, setInput) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    setInput('');
  };

  const removeTag = (index, list, setList) => {
    const updated = list.filter((_, i) => i !== index);
    setList(updated);
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      await firestore().collection('users').doc(user.uid).update({
        name,
        username,
        bio,
        techStack,
        hobbies,
      });

      setLoading(false);
      navigation.goBack();
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0A1E" />

      <LinearGradient
        colors={['#0F0A1E', '#130D28']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Edit Profile</Text>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: photoURL || DEFAULT_AVATAR }}
            style={styles.avatar}
          />
          <TouchableOpacity style={styles.cameraBtn}>
            <Icon name="camera" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Name */}
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#6B7280"
        />

        {/* Username */}
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="username"
          placeholderTextColor="#6B7280"
          autoCapitalize="none"
        />

        {/* Bio */}
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell the world about yourself"
          placeholderTextColor="#6B7280"
          multiline
        />

        {/* Tech Stack */}
        <Text style={styles.label}>Tech Stack</Text>
        <View style={styles.tagContainer}>
          {techStack.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.tag}
              onPress={() => removeTag(index, techStack, setTechStack)}
            >
              <Text style={styles.tagText}>{item}</Text>
              <Icon name="close" size={12} color="#A78BFA" />
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          value={techInput}
          onChangeText={setTechInput}
          placeholder="Add tech & press Enter"
          placeholderTextColor="#6B7280"
          returnKeyType="done"
          onSubmitEditing={() =>
            addTag(techInput, techStack, setTechStack, setTechInput)
          }
        />

        {/* Hobbies */}
        <Text style={styles.label}>Hobbies</Text>
        <View style={styles.tagContainer}>
          {hobbies.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.tag, styles.hobbyTag]}
              onPress={() => removeTag(index, hobbies, setHobbies)}
            >
              <Text style={[styles.tagText, styles.hobbyText]}>
                {item}
              </Text>
              <Icon name="close" size={12} color="#34D399" />
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          value={hobbyInput}
          onChangeText={setHobbyInput}
          placeholder="Add hobby & press Enter"
          placeholderTextColor="#6B7280"
          returnKeyType="done"
          onSubmitEditing={() =>
            addTag(hobbyInput, hobbies, setHobbies, setHobbyInput)
          }
        />

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={loading}
        >
          <LinearGradient
            colors={['#7C3AED', '#5B21B6']}
            style={styles.saveGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>Save Changes</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditProfileScreen;


/* ===========================
   STYLES
=========================== */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0F0A1E',
  },
  container: {
    padding: 20,
    paddingBottom: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#EDE9FE',
    marginBottom: 24,
  },
  avatarContainer: {
    alignSelf: 'center',
    marginBottom: 25,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: '#7C3AED',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#7C3AED',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A78BFA',
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#16102A',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    color: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#2D2150',
  },
  bioInput: {
    height: 90,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124,58,237,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    marginRight: 8,
    marginBottom: 8,
  },
  hobbyTag: {
    backgroundColor: 'rgba(52,211,153,0.1)',
    borderColor: 'rgba(52,211,153,0.25)',
  },
  tagText: {
    fontSize: 12,
    color: '#A78BFA',
    marginRight: 6,
    fontWeight: '600',
  },
  hobbyText: {
    color: '#34D399',
  },
  saveBtn: {
    marginTop: 35,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveGradient: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
