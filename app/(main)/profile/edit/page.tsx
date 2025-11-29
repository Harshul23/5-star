"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Avatar,
  AvatarFallback,
  FileUpload,
} from "@/components/ui";
import { ArrowLeft, Zap, Save, Loader2, X } from "lucide-react";

interface UserData {
  id: string;
  name: string;
  email: string;
  photo: string | null;
  college: string | null;
}

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [college, setCollege] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const fetchUserData = useCallback(async () => {
    try {
      setError(null);
      const userStr = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (!userStr || !token) {
        router.push("/signin");
        return;
      }

      const currentUser = JSON.parse(userStr);
      const res = await fetch(`/api/users/${currentUser.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || "Failed to load profile");
        setLoading(false);
        return;
      }

      const data = await res.json();
      const user = data.user;

      setUserData({
        id: user.id,
        name: user.name,
        email: currentUser.email, // Email from localStorage since API doesn't expose it
        photo: user.photo,
        college: user.college,
      });

      // Set form values
      setName(user.name || "");
      setEmail(currentUser.email || "");
      setCollege(user.college || "");
      setPhoto(user.photo || null);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error fetching user data:", err);
      }
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handlePhotoSelect = (file: File | null) => {
    setPhotoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhoto(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPhoto(userData?.photo || null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      if (!token || !userData) {
        router.push("/signin");
        return;
      }

      // Prepare update data - only include changed fields
      const updateData: {
        name?: string;
        email?: string;
        college?: string | null;
        photo?: string | null;
      } = {};

      if (name !== userData.name) updateData.name = name;
      if (email !== userData.email) updateData.email = email;
      if (college !== (userData.college || "")) {
        updateData.college = college || null;
      }
      // Handle photo changes: new photo uploaded or photo removed
      if (photoFile && photo) {
        // New photo uploaded - send the base64 data URL
        updateData.photo = photo;
      } else if (photo !== userData.photo) {
        // Photo was changed (possibly removed)
        updateData.photo = photo;
      }

      // If nothing changed, show a message
      if (Object.keys(updateData).length === 0) {
        setSuccess("No changes to save");
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/users/${userData.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update profile");
        setSaving(false);
        return;
      }

      // Update localStorage with new user data
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const updatedStoredUser = {
        ...storedUser,
        name: data.user.name,
        email: data.user.email,
        photo: data.user.photo,
        college: data.user.college,
      };
      localStorage.setItem("user", JSON.stringify(updatedStoredUser));

      setSuccess("Profile updated successfully!");
      setUserData(data.user);

      // Redirect to profile page after a short delay
      setTimeout(() => {
        router.push(`/profile/${userData.id}`);
      }, 1500);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Error updating profile:", err);
      }
      setError("Failed to connect to server");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "User not found"}</p>
          <Link href="/signin" className="text-blue-600 hover:underline">
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center">
          <Link
            href={`/profile/${userData.id}`}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 flex items-center justify-center">
            <Zap className="h-6 w-6 text-blue-600 mr-2" />
            <span className="font-bold">QuickGrab</span>
          </div>
          <div className="w-5"></div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-lg">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Edit Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Profile Photo */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    {photo ? (
                      <img
                        src={photo}
                        alt={name}
                        className="h-full w-full object-cover rounded-full"
                      />
                    ) : (
                      <AvatarFallback className="text-3xl">
                        {name.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {photo && (
                    <button
                      type="button"
                      onClick={() => {
                        setPhoto(null);
                        setPhotoFile(null);
                      }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      aria-label="Remove photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <FileUpload
                  accept="image/*"
                  maxSize={5}
                  onFileSelect={handlePhotoSelect}
                  placeholder="Upload new photo"
                  hint="PNG, JPG up to 5MB"
                  className="max-w-xs"
                />
              </div>

              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  minLength={2}
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
                <p className="text-xs text-gray-500">
                  Changing your email may require re-verification
                </p>
              </div>

              {/* College Field */}
              <div className="space-y-2">
                <Label htmlFor="college">College (Optional)</Label>
                <Input
                  id="college"
                  type="text"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="Your college or university"
                />
              </div>

              {/* Error/Success Messages */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-600">{success}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>

              {/* Cancel Button */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/profile/${userData.id}`)}
                disabled={saving}
              >
                Cancel
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
