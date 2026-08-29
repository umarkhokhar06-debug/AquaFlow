import { Component, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/app/components/ui';
import { colors, spacing, typography } from '@/theme';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Without this, an uncaught render-time error unmounts the whole tree and,
// in a release build (no red box), leaves the screen permanently blank with
// nothing logged anywhere -- exactly the failure mode that made two real
// production bugs nearly impossible to diagnose remotely. This turns that
// into a visible, readable screen instead.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('Uncaught render error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{error.message}</Text>
          {error.stack ? <Text style={styles.stack}>{error.stack}</Text> : null}
          <Button label="Try again" onPress={() => this.setState({ error: null })} size="lg" style={styles.button} />
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral[0],
    paddingTop: 80,
  },
  scroll: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: typography.h1.fontFamily,
    fontSize: typography.h1.fontSize,
    color: colors.neutral[900],
    marginBottom: spacing.md,
  },
  message: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: colors.neutral[700],
    marginBottom: spacing.lg,
  },
  stack: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: colors.neutral[400],
    marginBottom: spacing.xxl,
  },
  button: {
    marginTop: spacing.md,
  },
});
