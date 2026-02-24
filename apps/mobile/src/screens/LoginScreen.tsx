import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuthStore } from "../store/auth";

interface Props {
  onNavigateRegister: () => void;
}

export default function LoginScreen({ onNavigateRegister }: Props) {
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      Alert.alert("Login Failed", err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        {/* Brand */}
        <View style={styles.brand}>
          <Text style={styles.logo}>DeliveryBridge</Text>
          <Text style={styles.tagline}>One app, every route</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#64748B"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Register link */}
        <TouchableOpacity onPress={onNavigateRegister} style={styles.registerLink}>
          <Text style={styles.registerText}>
            Don't have an account?{" "}
            <Text style={styles.registerBold}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  brand: {
    alignItems: "center",
    marginBottom: 48,
  },
  logo: {
    fontSize: 32,
    fontWeight: "800",
    color: "#3B82F6",
  },
  tagline: {
    fontSize: 16,
    color: "#94A3B8",
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#334155",
  },
  button: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  registerLink: {
    alignItems: "center",
    marginTop: 24,
  },
  registerText: {
    fontSize: 14,
    color: "#94A3B8",
  },
  registerBold: {
    color: "#3B82F6",
    fontWeight: "600",
  },
});
