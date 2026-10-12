// One React Native screen with one Croche agent: send, and render streamed replies.
// Copy this file over App.tsx in a new React Native app (see README.md).
import React, { useEffect, useRef, useState } from 'react';
import { Button, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Croche, type AgentEvent, type CrocheAgent } from '@h1r-ai/croche-react-native';
import croche from './croche.config.json';   // { cloudUrl, projectKey, debugToken }: gitignored, never committed

type Line = { id: string; who: 'you' | 'agent'; text: string };

export default function App() {
  const agent = useRef<CrocheAgent | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let project: Croche | undefined;
    let subscription: { close(): void } | undefined;
    (async () => {
      project = await Croche.open({
        cloudUrl: croche.cloudUrl,
        projectKey: croche.projectKey,
        debugToken: __DEV__ ? croche.debugToken : undefined,   // development only
        user: 'demo-user',                                       // your app's id for the person
        config: { instructions: 'You are a friendly assistant. Answer in a few short sentences.' },
      });
      agent.current = await project.agent();
      subscription = agent.current.subscribe({ onEvent: (event: AgentEvent) => {
        if (event.type !== 'message.delta' && event.type !== 'message.end') return;
        const id = String(event.id), piece = String(event.text);
        // Each message.delta carries the next piece; message.end carries the whole final text.
        setLines(all => {
          const found = all.find(l => l.id === id);
          if (!found) return [...all, { id, who: 'agent', text: piece }];
          return all.map(l => l.id !== id ? l : { ...l, text: event.type === 'message.end' ? piece : l.text + piece });
        });
      } });
    })().catch(e => setError(String(e?.code ?? e)));
    return () => { subscription?.close(); void project?.close(); };
  }, []);

  const send = async () => {
    const value = text.trim();
    if (!value || !agent.current) return;
    setText('');
    const id = `in-${Date.now()}`;
    setLines(all => [...all, { id, who: 'you', text: value }]);
    await agent.current.send({ id, text: value }).catch(e => setError(String(e?.code ?? e)));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {error && <Text style={styles.error}>{error}</Text>}
        <FlatList data={lines} keyExtractor={l => l.id} contentContainerStyle={styles.list}
          renderItem={({ item }) => <Text style={item.who === 'you' ? styles.you : styles.agent}>{item.text}</Text>} />
        <View style={styles.row}>
          <TextInput style={styles.input} value={text} onChangeText={setText} onSubmitEditing={send} placeholder="Say something" />
          <Button title="Send" onPress={send} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: 16, gap: 8 },
  you: { color: '#555' },
  agent: { color: '#111' },
  error: { color: '#b00020', padding: 16 },
  row: { flexDirection: 'row', gap: 8, padding: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 8 },
});
