"use client";

import { authClient } from "@/lib/auth-client";

export function useAuth() {
  const session = authClient.useSession();
  const user= session.data?.user
    ? {
        id: session.data.user.id,
        email: session.data.user.email,
        name: session.data.user.name,
        image: session.data.user.image,
        emailVerified: session.data.user.emailVerified,
      }
    : null;

  const signIn = async (email, password) => {
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      const errorMessage = result.error?.message || JSON.stringify(result.error) || 'Authentication failed';
      throw new Error(errorMessage);
    }
    return result;
  };

  const signUp = async (email, password, name) => {
    const result = await authClient.signUp.email({
      email,
      password,
      name: name || "",
    });
    if (result.error) {
      const errorMessage = result.error?.message || JSON.stringify(result.error) || 'Sign up failed';
      throw new Error(errorMessage);
    }
    return result;
  };

  const signInWithGoogle = async () => {
    return authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  };

  const signInWithApple = async () => {
    return authClient.signIn.social({
      provider: "apple",
      callbackURL: "/",
    });
  };

  const signInWithGithub = async () => {
    return authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    });
  };

  const signOut = async () => {
    await authClient.signOut();
  };

  return {
    user,
    loading: session.isPending,
    isAuthenticated: !!session.data?.user,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    signInWithGithub,
    signOut,
  };
}

export default useAuth;
