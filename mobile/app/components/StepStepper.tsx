import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors, spacing, typography } from '@/theme';

export type StepState = 'done' | 'active' | 'pending';

export interface Step {
  key: string;
  label: string;
  sublabel?: string;
  state: StepState;
}

interface StepStepperProps {
  steps: Step[];
}

function StepLine({ filled }: { filled: boolean }) {
  const progress = useSharedValue(filled ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(filled ? 1 : 0, { duration: 300 });
  }, [filled]);

  const style = useAnimatedStyle(() => ({
    height: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.lineTrack}>
      <Animated.View style={[styles.lineFill, style]} />
    </View>
  );
}

function ActiveDot() {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(0.4, { duration: 700, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return <Animated.View style={[styles.dot, style]} />;
}

export default function StepStepper({ steps }: StepStepperProps) {
  return (
    <View>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <View key={step.key} style={styles.row}>
            <View style={styles.nodeCol}>
              <View
                style={[
                  styles.node,
                  step.state === 'done' && styles.nodeDone,
                  step.state === 'active' && styles.nodeActive,
                  step.state === 'pending' && styles.nodePending,
                ]}
              >
                {step.state === 'done' ? (
                  <Check size={12} color={colors.neutral[0]} strokeWidth={3} />
                ) : step.state === 'active' ? (
                  <ActiveDot />
                ) : (
                  <View style={styles.pendingDot} />
                )}
              </View>
              {!isLast && <StepLine filled={step.state === 'done'} />}
            </View>
            <View style={styles.textCol}>
              <Text
                style={[
                  styles.label,
                  { color: step.state === 'pending' ? colors.neutral[400] : colors.neutral[900] },
                  step.state === 'active' && styles.labelActive,
                ]}
              >
                {step.label}
              </Text>
              {step.state === 'active' && step.sublabel && <Text style={styles.sublabel}>{step.sublabel}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const NODE_SIZE = 22;
const LINE_HEIGHT = 34;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  nodeCol: {
    alignItems: 'center',
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDone: {
    backgroundColor: colors.primary[500],
  },
  nodeActive: {
    backgroundColor: colors.primary[500],
  },
  nodePending: {
    backgroundColor: colors.neutral[200],
  },
  pendingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.neutral[400],
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.neutral[0],
  },
  lineTrack: {
    width: 2,
    height: LINE_HEIGHT,
    backgroundColor: colors.neutral[200],
    overflow: 'hidden',
  },
  lineFill: {
    width: 2,
    backgroundColor: colors.primary[500],
  },
  textCol: {
    paddingTop: 2,
    paddingBottom: spacing.md,
  },
  label: {
    fontFamily: typography.bodyMed.fontFamily,
    fontSize: typography.body.fontSize,
  },
  labelActive: {
    fontFamily: typography.h3.fontFamily,
  },
  sublabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: colors.neutral[500],
    marginTop: 2,
  },
});
