import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { ApiError } from '../../src/api/client';
import { Button } from '../../src/components/ui/Button';
import { Text } from '../../src/components/ui/Text';
import { TextField } from '../../src/components/ui/TextField';
import { useLogin } from '../../src/hooks/useAuth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();

  const errorMessage =
    login.error instanceof ApiError
      ? login.error.status === 401
        ? 'Incorrect email or password.'
        : login.error.message
      : login.isError
        ? 'Something went wrong. Please try again.'
        : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-white dark:bg-surface-dark"
    >
      <ScrollView contentContainerClassName="flex-1 justify-center px-6 py-10" keyboardShouldPersistTaps="handled">
        <View className="gap-2">
          <Text variant="title">Welcome back</Text>
          <Text variant="body" className="mb-6">
            Log in to continue your health journey.
          </Text>
        </View>

        <View className="gap-4">
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            autoComplete="password"
          />

          {errorMessage ? (
            <Text variant="caption" className="text-red-500">
              {errorMessage}
            </Text>
          ) : null}

          <Button
            label="Log in"
            loading={login.isPending}
            disabled={!email || !password}
            onPress={() => login.mutate({ email, password })}
          />
        </View>

        <View className="mt-8 flex-row justify-center gap-1">
          <Text variant="body">Don&apos;t have an account?</Text>
          <Link href="/register">
            <Text variant="body" className="font-semibold text-primary-600 dark:text-primary-400">
              Sign up
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
