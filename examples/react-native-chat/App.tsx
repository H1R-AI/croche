// One React Native screen with one Croche agent: send, and render streamed replies.
// Copy this file over App.tsx in a new React Native app (see README.md).
import React, { useEffect, useRef, useState } from 'react';
import { Button, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { Croche, type Agent, type AgentEvent } from '@h1r-ai/croche-react-native';
import croche from './croche.config.json';   // { projectKey, debugKey }: gitignored, never committed

type Line = { id: string; who: 'you' | 'agent'; text: string };
const describe = (e: any) => e?.code ? `${e.code}: ${e.message}` : String(e);   // CrocheError has code and message

export default function App() {
  const agent = useRef<Agent | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let project: Croche | undefined;
    let subscription: { close(): void } | undefined;
    (async () => {
      project = await Croche.open({
        projectKey: croche.projectKey,
        debugKey: __DEV__ ? croche.debugKey : undefined,   // development only
        user: 'demo-user',                                       // your app's id for the person
        language: 'en',                                          // one of the bundle's supported languages
        bundledConfig: {
          schema: 7,
          project: {
            defaults: { model: 'deepseek/deepseek-v4.1-flash' }, // your app chooses the model; there is no SDK default
            languages: { default: 'en', supported: ['en'] },
          },
          agents: { chat: { instructions: 'You are a friendly assistant. Answer in a few short sentences.' } },
        },
      });
      agent.current = await project.agent('chat');
      subscription = agent.current.subscribe({ onEvent: (event: AgentEvent) => {
        // The stream replays the conversation after a restart, then continues live: the person's
        // inputs as `input`, the agent's replies as message.delta pieces and one final message.end.
        if (event.type === 'input' && event.kind === 'user') {
          const id = event.id, piece = event.text ?? '';
          setLines(all => all.some(l => l.id === id) ? all : [...all, { id, who: 'you', text: piece }]);
        } else if (event.type === 'message.delta' || event.type === 'message.end') {
          const id = event.id, piece = event.text, final = event.type === 'message.end';
          setLines(all => {
            const found = all.find(l => l.id === id);
            if (!found) return [...all, { id, who: 'agent', text: piece }];
            return all.map(l => l.id !== id ? l : { ...l, text: final ? piece : l.text + piece });
          });
        }
      } });
    })().catch(e => setError(describe(e)));
    return () => { subscription?.close(); void project?.close(); };
  }, []);

  const send = async () => {
    const value = text.trim();
    if (!value || !agent.current) return;
    setText('');
    const id = `in-${Date.now()}`;   // input ids are yours and unique; the stream echoes it as an `input`
    await agent.current.send({ id, input: [{ type: 'text', text: value }] }).catch(e => setError(describe(e)));
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
  screen: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  list: { padding: 16, gap: 8 },
  you: { color: '#555' },
  agent: { color: '#111' },
  error: { color: '#b00020', padding: 16 },
  row: { flexDirection: 'row', gap: 8, padding: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 6, paddingHorizontal: 8 },
});
