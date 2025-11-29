"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Label, Card, CardContent, CardDescription, CardHeader, CardTitle, FileUpload } from "@/components/ui";
import { Zap, Mail, Lock, User, GraduationCap, RefreshCw } from "lucide-react";

type Step = "register" | "verify-email" | "verify-id";

export default function SignupPage() {
  const [step, setStep] = useState<Step>("register");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    college: "",
    otp: "",
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          college: formData.college,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setUserId(data.user.id);
      // In development, the OTP is returned for testing
      if (data.otp) {
        setFormData((prev) => ({ ...prev, otp: data.otp }));
      }
      setStep("verify-email");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          otp: formData.otp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setStep("verify-id");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    
    setResendLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to resend OTP");
      }

      // In development, the OTP is returned for testing
      if (data.otp) {
        setFormData((prev) => ({ ...prev, otp: data.otp }));
      }
      
      setSuccessMessage("A new verification code has been sent to your email.");
      
      // Start cooldown timer (60 seconds)
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyId = async () => {
    setLoading(true);
    setError(null);

    try {
      // In a real app, this would upload the image to storage first
      const mockIdPhotoUrl = "https://example.com/student-id.jpg";

      const res = await fetch("/api/auth/verify-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          idPhotoUrl: mockIdPhotoUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "ID verification failed");
      }

      // Redirect to home page on success
      window.location.href = "/home";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Zap className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold">QuickGrab</span>
          </div>
          <CardTitle>
            {step === "register" && "Create Your Account"}
            {step === "verify-email" && "Verify Your Email"}
            {step === "verify-id" && "Verify Your Student ID"}
          </CardTitle>
          <CardDescription>
            {step === "register" && "Join the verified student marketplace"}
            {step === "verify-email" && "Enter the OTP sent to your email"}
            {step === "verify-id" && "Upload your student ID for AI verification"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4 text-sm">
              {successMessage}
            </div>
          )}

          {step === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="name"
                    placeholder="John Doe"
                    className="pl-10"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">College Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@university.edu"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="college">College/University</Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="college"
                    placeholder="State University"
                    className="pl-10"
                    value={formData.college}
                    onChange={(e) => setFormData({ ...formData, college: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={8}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          )}

          {step === "verify-email" && (
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  placeholder="123456"
                  className="text-center text-2xl tracking-widest"
                  value={formData.otp}
                  onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                  maxLength={6}
                  required
                />
                <p className="text-xs text-gray-500 text-center">
                  Check your email for the 6-digit code
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying..." : "Verify Email"}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendLoading || resendCooldown > 0}
                  className="text-sm text-blue-600 hover:underline disabled:text-gray-400 disabled:no-underline inline-flex items-center gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${resendLoading ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : resendLoading
                    ? "Sending..."
                    : "Didn't receive the code? Resend"}
                </button>
              </div>
            </form>
          )}

          {step === "verify-id" && (
            <div className="space-y-4">
              <FileUpload
                accept="image/*"
                maxSize={10}
                onFileSelect={setIdFile}
                placeholder="Upload your student ID card photo"
                hint="AI will verify your name, college, and expiry date"
              />
              <Button onClick={handleVerifyId} className="w-full" disabled={loading || !idFile}>
                {loading ? "Verifying ID..." : "Verify Student ID"}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => (window.location.href = "/home")}
              >
                Skip for now
              </Button>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/signin" className="text-blue-600 hover:underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
