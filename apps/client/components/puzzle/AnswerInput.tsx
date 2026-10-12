import { View, Text, StyleSheet, TextInput, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { useRef, useEffect } from 'react';

interface AnswerInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  placeholder: string;
  result?: 'correct' | 'incorrect' | null;
}

export function AnswerInput({ value, onChangeText, onSubmit, disabled, placeholder, result }: AnswerInputProps) {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (result === 'incorrect') {
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 1,
          duration: 50,
          easing: Easing.linear,
          useNativeDriver: false
        }),
        Animated.timing(shakeAnim, {
          toValue: -1,
          duration: 50,
          easing: Easing.linear,
          useNativeDriver: false
        }),
        Animated.timing(shakeAnim, {
          toValue: 1,
          duration: 50,
          easing: Easing.linear,
          useNativeDriver: false
        }),
        Animated.timing(shakeAnim, {
          toValue: -1,
          duration: 50,
          easing: Easing.linear,
          useNativeDriver: false
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 50,
          easing: Easing.linear,
          useNativeDriver: false
        })
      ]).start();
    }

    if (result === 'correct') {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: false
        })
      ]).start();
    }
  }, [result, shakeAnim, pulseAnim]);

  const shakeStyle = {
    transform: [{ translateX: shakeAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: [-10, 0, 10] }) }]
  };

  const pulseStyle = {
    transform: [{ scale: pulseAnim }]
  };

  const getResultStyles = () => {
    if (result === 'correct') {
      return {
        borderColor: Colors.success,
        backgroundColor: Colors.success + '10',
        iconColor: Colors.success,
        iconName: 'checkmark-circle',
        buttonBg: Colors.success
      };
    }
    if (result === 'incorrect') {
      return {
        borderColor: Colors.error,
        backgroundColor: Colors.error + '10',
        iconColor: Colors.error,
        iconName: 'close-circle',
        buttonBg: Colors.error
      };
    }
    return {
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
      iconColor: Colors.primary,
      iconName: 'send',
      buttonBg: Colors.primary
    };
  };

  const { borderColor, backgroundColor, iconColor, iconName, buttonBg } = getResultStyles();

  const handleSubmit = () => {
    if (!disabled && value.trim()) {
      onSubmit();
    }
  };

  return (
    <Animated.View style={[styles.container, shakeStyle, result === 'correct' && pulseStyle, { backgroundColor, borderColor }]}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textTertiary}
          disabled={disabled || !!result}
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: buttonBg }]}
          onPress={handleSubmit}
          disabled={disabled || !!result || !value.trim()}
          activeOpacity={0.8}
        >
          <Ionicons name={iconName} size={24} color={iconColor} />
        </TouchableOpacity>
      </View>

      {result && (
        <Animated.View
          style={[
            styles.resultText,
            { color: result === 'correct' ? Colors.success : Colors.error }
          ]}
          entering={Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: false })}
        >
          {result === 'correct' ? (
            <>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} style={styles.resultIcon} />
              <Text style={styles.resultMessage}>Correct! +10 XP</Text>
            </>
          ) : (
            <>
              <Ionicons name="close-circle" size={16} color={Colors.error} style={styles.resultIcon} />
              <Text style={styles.resultMessage}>Incorrect. Try the next one!</Text>
            </>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 12,
    borderWidth: 2,
    gap: Spacing.sm
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.regular,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.md
  },
  submitButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  resultText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border
  },
  resultIcon: {},
  resultMessage: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.semiBold
  }
});