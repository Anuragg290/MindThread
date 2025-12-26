import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  User,
  Camera,
  Share2,
  Edit,
  Loader2
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [fullName, setFullName] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [institution, setInstitution] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [major, setMajor] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  // Load user data from backend
  useEffect(() => {
    if (user) {
      setFullName(user.username || '');
      setEmail(user.email || '');
      setInstitution(user.institution || '');
      setAcademicYear(user.academicYear || '');
      setMajor(user.major || '');
      setBio(user.bio || '');
      setInterests(user.interests || []);
      setProfilePhotoUrl(user.avatar || null);
    }
  }, [user]);

  const userInitials = fullName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'File size must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingPhoto(true);
    const response = await api.uploadAvatar(file);
    
    if (response.success && response.data) {
      setProfilePhotoUrl(response.data.avatar || null);
      updateUser(response.data);
      toast({
        title: 'Success',
        description: 'Profile photo updated successfully',
      });
    } else {
      toast({
        title: 'Error',
        description: response.error || 'Failed to upload profile photo',
        variant: 'destructive',
      });
    }
    setIsUploadingPhoto(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    const response = await api.updateProfile({
      username: fullName,
      institution: institution || undefined,
      academicYear: academicYear || undefined,
      major: major || undefined,
      bio: bio || undefined,
      interests: interests.length > 0 ? interests : undefined,
    });

    if (response.success && response.data) {
      updateUser(response.data);
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
      setIsEditing(false);
    } else {
      toast({
        title: 'Error',
        description: response.error || 'Failed to update profile',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

  const handleCancel = () => {
    // Reset to user data
    if (user) {
      setFullName(user.username || '');
      setInstitution(user.institution || '');
      setAcademicYear(user.academicYear || '');
      setMajor(user.major || '');
      setBio(user.bio || '');
      setInterests(user.interests || []);
    }
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-white/20">
                <AvatarImage src={profilePhotoUrl || user?.avatar} alt={user?.username} />
                <AvatarFallback className="bg-white/20 text-white text-2xl">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors cursor-pointer">
                {isUploadingPhoto ? (
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 text-blue-600" />
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={isUploadingPhoto}
                />
              </label>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{fullName || user?.username || 'User'}</h1>
              <p className="text-blue-100 mb-3">
                {institution && academicYear ? `${institution} • ${academicYear}` : institution || academicYear || 'Student'}
              </p>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-white/20 rounded-full text-sm backdrop-blur-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Share2 className="h-4 w-4 mr-2" />
              Share Profile
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-foreground" />
                <h2 className="text-xl font-semibold text-foreground">Personal Information</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={isEditing}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>

            <div className="space-y-5">
              <div>
                <Label htmlFor="fullName" className="text-foreground mb-2 block">
                  Full Name *
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={!isEditing}
                  className="h-11"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-foreground mb-2 block">
                  Email Address *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="h-11 bg-muted"
                />
              </div>

              <div>
                <Label htmlFor="institution" className="text-foreground mb-2 block">
                  Institution *
                </Label>
                <Input
                  id="institution"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  disabled={!isEditing}
                  className="h-11"
                />
              </div>

              <div>
                <Label htmlFor="academicYear" className="text-foreground mb-2 block">
                  Academic Year *
                </Label>
                <select
                  id="academicYear"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  disabled={!isEditing}
                  className="w-full h-11 px-3 border border-border rounded-md bg-background text-foreground disabled:bg-muted disabled:cursor-not-allowed"
                >
                  <option value="">Select academic year</option>
                  <option value="Freshman">Freshman</option>
                  <option value="Sophomore">Sophomore</option>
                  <option value="Junior">Junior</option>
                  <option value="Senior">Senior</option>
                  <option value="Graduate">Graduate</option>
                </select>
              </div>

              <div>
                <Label htmlFor="major" className="text-foreground mb-2 block">
                  Major / Field of Study
                </Label>
                <Input
                  id="major"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  disabled={!isEditing}
                  className="h-11"
                />
              </div>

              <div>
                <Label htmlFor="bio" className="text-foreground mb-2 block">
                  Bio
                </Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={!isEditing}
                  rows={4}
                  className="resize-none"
                />
              </div>

              {isEditing && (
                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSave} className="flex-1" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleCancel} className="flex-1" disabled={isLoading}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
