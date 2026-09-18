import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import api from '../api/axios';

export default function TeamCommsScreen() {
  const { user, token, recentWorkspace } = useAuth();
  const router = useRouter();
  const themeColor = recentWorkspace?.companyColor || '#2563EB';

  const [team, setTeam] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await api.get('/api/teams');
        if (res.data && res.data.length > 0) {
          setTeam(res.data[0]);
        }
      } catch (error) {
        console.error("Failed to fetch team", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeam();
  }, [token]);

  useEffect(() => {
    if (!team) return;
    let interval: NodeJS.Timeout;

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/api/teams/${team.id}/messages`);
        setMessages(res.data);
      } catch (error) {
        console.error("Failed to fetch messages", error);
      }
    };

    fetchMessages();
    interval = setInterval(fetchMessages, 5000); // Poll every 5s
    
    return () => clearInterval(interval);
  }, [team, token]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !team || isSending) return;
    setIsSending(true);
    
    // Optimistic update
    const tempMsg = {
      id: Date.now().toString(),
      content: newMessage,
      senderId: user?.id,
      createdAt: new Date().toISOString(),
      sender: user
    };
    setMessages(prev => [...prev, tempMsg]);
    const messageToSend = newMessage;
    setNewMessage('');
    flatListRef.current?.scrollToEnd({ animated: true });

    try {
      await api.post(`/api/teams/${team.id}/messages`, { content: messageToSend });
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    const isMe = item.senderId === user?.id;
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showAvatar = !prevMsg || prevMsg.senderId !== item.senderId;
    
    const senderName = item.sender?.fullName || 'Unknown';
    const senderRole = item.sender?.role?.replace('_', ' ') || '';
    
    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperOther]}>
        {!isMe && showAvatar && (
          <View style={[styles.avatarBox, { backgroundColor: `${themeColor}20` }]}>
            <Text style={[styles.avatarText, { color: themeColor }]}>{senderName.charAt(0)}</Text>
          </View>
        )}
        {!isMe && !showAvatar && <View style={styles.avatarSpacer} />}
        
        <View style={styles.messageContent}>
          {!isMe && showAvatar && (
            <View style={styles.senderInfo}>
              <Text style={styles.senderName}>{senderName}</Text>
              <Text style={styles.senderRole}>{senderRole}</Text>
            </View>
          )}
          <View style={[styles.bubble, isMe ? [styles.bubbleMe, { backgroundColor: themeColor }] : styles.bubbleOther]}>
            <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
              {item.content}
            </Text>
          </View>
          <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={themeColor} />
      </View>
    );
  }

  if (!team) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="chatbubbles-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No Team Assigned</Text>
        <Text style={styles.emptyDesc}>You are not currently assigned to a team.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>{team.name} Comms</Text>
          <Text style={styles.headerSubtitle}>
            <Ionicons name="people" size={12} /> {team._count?.members || 0} Members
          </Text>
        </View>
      </View>

      {/* Chat Area */}
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles" size={48} color="#D1D5DB" />
              <Text style={styles.emptyChatText}>No messages yet. Start the conversation!</Text>
            </View>
          }
        />

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Type your message..."
            placeholderTextColor="#9CA3AF"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[styles.sendBtn, (!newMessage.trim() || isSending) && styles.sendBtnDisabled, { backgroundColor: themeColor }]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            <Ionicons name="send" size={18} color="#FFF" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#374151', marginTop: 16 },
  emptyDesc: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  backBtn: { marginTop: 24, backgroundColor: '#111827', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: '#FFF', fontWeight: 'bold' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  backIconBtn: { padding: 8, marginRight: 8 },
  headerTitleBox: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  headerSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  
  keyboardView: { flex: 1 },
  chatList: { padding: 16, paddingBottom: 24 },
  emptyChat: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyChatText: { marginTop: 12, color: '#9CA3AF', fontSize: 14 },
  
  messageWrapper: { flexDirection: 'row', marginBottom: 16, width: '100%' },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperOther: { justifyContent: 'flex-start' },
  
  avatarBox: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  avatarSpacer: { width: 40 },
  avatarText: { fontSize: 14, fontWeight: 'bold' },
  
  messageContent: { maxWidth: '75%' },
  senderInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, marginLeft: 4 },
  senderName: { fontSize: 11, fontWeight: '600', color: '#4B5563', marginRight: 4 },
  senderRole: { fontSize: 9, color: '#9CA3AF', textTransform: 'capitalize' },
  
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  bubbleMe: { borderTopRightRadius: 4 },
  bubbleOther: { backgroundColor: '#FFF', borderTopLeftRadius: 4, borderWidth: 1, borderColor: '#F3F4F6' },
  
  messageText: { fontSize: 14, lineHeight: 20 },
  messageTextMe: { color: '#FFF' },
  messageTextOther: { color: '#1F2937' },
  
  timeText: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
  timeTextMe: { alignSelf: 'flex-end' },
  timeTextOther: { alignSelf: 'flex-start', marginLeft: 4 },
  
  inputContainer: { 
    flexDirection: 'row', alignItems: 'flex-end', 
    paddingHorizontal: 16, paddingVertical: 12, 
    backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    maxHeight: 100,
    fontSize: 14,
    color: '#111827',
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  sendBtnDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
  }
});
