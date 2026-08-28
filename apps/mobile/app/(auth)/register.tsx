import { Link } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { ApiError } from '../../src/api/client';
import { Button } from '../../src/components/ui/Button';
import { Text } from '../../src/components/ui/Text';
import { TextField } from '../../src/components/ui/TextField';
import { useRegister } from '../../src/hooks/useAuth';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const register = useRegister();

  const errorMessage =
    register.error instanceof ApiError
      ? register.error.status === 409
        ? 'An account with this email already exists.'
        : register.error.message
      : register.isError
        ? 'Something went wrong. Please try again.'
        : null;

  const passwordTooShort = password.length > 0 && password.length < 8;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-surface-light dark:bg-surface-dark"
    >
      <ScrollView contentContainerClassName="flex-1 justify-center px-6 py-10" keyboardShouldPersistTaps="handled">
        <Image
          source={require('../../assets/photos/healthy-bowl.jpg')}
          style={{ width: '100%', height: 150, borderRadius: 24, marginBottom: 20 }}
          resizeMode="cover"
          accessible={false}
        />
        <View className="gap-2">
          <Text variant="title">Create your account</Text>
          <Text variant="body" className="mb-6">
            Your personal AI health companion.
          </Text>
        </View>

        <View className="gap-4">
          <TextField
            label="Name"
            value={name}
            onChangeText={setName}
            textContentType="name"
            autoComplete="name"
          />
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
            textContentType="newPassword"
            autoComplete="password-new"
            error={passwordTooShort ? 'Password must be at least 8 characters.' : undefined}
          />

          {errorMessage ? (
            <Text variant="caption" className="text-red-500">
              {errorMessage}
            </Text>
          ) : null}

          <Button
            label="Create account"
            loading={register.isPending}
            disabled={!name || !email || password.length < 8}
            onPress={() => register.mutate({ name, email, password })}
          />
        </View>

        <View className="mt-8 flex-row justify-center gap-1">
          <Text variant="body">Already have an account?</Text>
          <Link href="/login">
            <Text variant="body" className="font-semibold text-primary-600 dark:text-primary-400">
              Log in
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
