import { Redirect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, TextInput, View, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';
import { Text } from '@/components/nativewindui/Text';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthUser } from '@/lib/auth';

const DEFAULT_AVATAR = "https://scontent-hkg4-1.xx.fbcdn.net/v/t39.30808-6/401686719_1869956583402321_3996360809266226594_n.jpg?_nc_cat=106&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeEKSLokGIEG3KJoPqkuWJu8I4xBfA-i9J8jjEF8D6L0nwp8iIm-8wNBi0xf8InbabTgygUA5HLgf86ikf3vac1f&_nc_ohc=vCUlhHkDG-0Q7kNvwFOM3Rw&_nc_oc=AdltHatPCFU3YAbPdiqb70FYWDDnJ4znp3r4uaxMJjWz_FzZEkAN85c3AKPKQ6NA6Avji_r4mh05B5Da-I8N-465&_nc_zt=23&_nc_ht=scontent-hkg4-1.xx&_nc_gid=_5f_mukf6N8ZY0OAl1QYtg&oh=00_AfiB4zt_q6Dwsym8vdTyjPBoFSQkpoaBntumub0eWfJIAg&oe=69308065";
// Heart Icon Component
function HeartIcon({ size = 24, color = '#FF9A8B' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </Svg>
  );
}

// Drop icon for water
function DropIcon({ size = 24, color = '#38BDF8' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2c0 0-7 8.5-7 14.5 0 4.14 3.36 7.5 7.5 7.5s7.5-3.36 7.5-7.5C19.5 10.5 12 2 12 2z" />
    </Svg>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isInitializing, refreshUser, logout, updateProfile, error, clearError } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      void refreshUser();
    }
  }, [isAuthenticated, refreshUser]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      if (user.date_of_birth) {
        const [y, m, d] = user.date_of_birth.split('-');
        setYear(y || '');
        setMonth(m || '');
        setDay(d || '');
      }
      setGender((user.gender as 'male' | 'female' | 'other') || 'male');
      setHeight(user.height?.toString() || '');
      setWeight(user.weight?.toString() || '');
    }
  }, [user]);

  useEffect(() => {
    if (error) {
      setFormError(error);
    }
  }, [error]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setFormError(null);
    clearError();
  }, [clearError]);

  const handleCancel = useCallback(() => {
    if (user) {
      setName(user.name || '');
      if (user.date_of_birth) {
        const [y, m, d] = user.date_of_birth.split('-');
        setYear(y || '');
        setMonth(m || '');
        setDay(d || '');
      }
      setGender((user.gender as 'male' | 'female' | 'other') || 'male');
      setHeight(user.height?.toString() || '');
      setWeight(user.weight?.toString() || '');
    }
    setIsEditing(false);
    setFormError(null);
    clearError();
  }, [user, clearError]);

  const handleSave = useCallback(async () => {
    if (!user) return;

    setFormError(null);
    clearError();

    const finalDay = parseInt(day) || 17;
    const finalMonth = parseInt(month) || 9;
    const finalYear = parseInt(year) || 2004;
    
    if (finalDay < 1 || finalDay > 31) {
      Alert.alert('Lỗi', 'Ngày không hợp lệ (1-31)');
      return;
    }
    if (finalMonth < 1 || finalMonth > 12) {
      Alert.alert('Lỗi', 'Tháng không hợp lệ (1-12)');
      return;
    }
    if (finalYear < 1900 || finalYear > new Date().getFullYear()) {
      Alert.alert('Lỗi', 'Năm không hợp lệ');
      return;
    }
    
    const dateObj = new Date(finalYear, finalMonth - 1, finalDay);
    if (dateObj.getDate() !== finalDay || dateObj.getMonth() !== finalMonth - 1) {
      Alert.alert('Lỗi', 'Ngày tháng không hợp lệ');
      return;
    }

    setIsSaving(true);

    try {
      const updatedData: AuthUser = {
        id: user.id,
        username: user.username,
        name: name.trim() || user.name,
        date_of_birth: `${finalYear}-${String(finalMonth).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`,
        gender: gender,
        height: parseFloat(height) || 160,
        weight: parseFloat(weight) || 60,
      };

      await updateProfile(updatedData);
      setIsEditing(false);
      setFormError(null);
      Alert.alert('Thành công', 'Cập nhật hồ sơ thành công!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không thể cập nhật hồ sơ. Vui lòng thử lại.';
      setFormError(message);
      Alert.alert('Lỗi', message);
    } finally {
      setIsSaving(false);
    }
  }, [user, name, day, month, year, gender, height, weight, updateProfile, clearError]);

  // --- Calculation Helpers ---
  const calculateAge = (dateString?: string) => {
    if (!dateString) return 20; // Default age if missing
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const calculateBMI = (h: number, w: number) => {
    const heightInMeters = h / 100;
    return Math.round((w / (heightInMeters * heightInMeters)) * 10) / 10;
  };

  const getBMIStatus = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Thiếu cân', color: '#EAB308' }; 
    if (bmi < 25) return { label: 'Bình thường', color: '#10B981' };
    if (bmi < 30) return { label: 'Thừa cân', color: '#F97316' }; 
    return { label: 'Béo phì', color: '#EF4444' }; 
  };

  const calculateBFP = (bmi: number, age: number, gender: string) => {
    // Formula: (1.20 * BMI) + (0.23 * Age) - (10.8 * sex) - 5.4
    // Sex: 1 for male, 0 for female.
    const sexFactor = gender === 'male' ? 1 : 0;
    let bfp = (1.20 * bmi) + (0.23 * age) - (10.8 * sexFactor) - 5.4;
    return Math.max(0, Math.round(bfp * 10) / 10);
  };

  const calculateWaterNeed = (weight: number) => {
    return Math.round(weight * 0.033 * 100) / 100;
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  // --- View Mode Calculations ---
  const viewHeight = user?.height || 170;
  const viewWeight = user?.weight || 60;
  const viewBMI = calculateBMI(viewHeight, viewWeight);
  const viewBMIStatus = getBMIStatus(viewBMI);
  const viewAge = calculateAge(user?.date_of_birth);
  const viewBFP = calculateBFP(viewBMI, viewAge, user?.gender || 'male');
  const viewWater = calculateWaterNeed(viewWeight);

  // Edit Mode
  if (isEditing) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.editHeader}>
          <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.editTitle}>Chỉnh sửa hồ sơ</Text>
        </View>

        {/* Edit Form */}
        <View style={styles.formContainer}>
          {/* Name */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <HeartIcon size={18} color="#FFF" />
              </View>
              <Text style={styles.cardTitle}>Tên</Text>
            </View>
            <TextInput
              style={styles.fullInput}
              value={name}
              onChangeText={setName}
              placeholder="Nhập tên của bạn"
              placeholderTextColor="#999"
              editable={!isSaving}
            />
          </View>

          {/* Date of Birth */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <HeartIcon size={18} color="#FFF" />
              </View>
              <Text style={styles.cardTitle}>Ngày sinh</Text>
            </View>
            <View style={styles.dateContainer}>
              <View style={styles.dateInputWrapper}>
                <Text style={styles.dateLabel}>Ngày</Text>
                <TextInput
                  style={styles.dateInput}
                  value={day}
                  onChangeText={setDay}
                  placeholder="17"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  editable={!isSaving}
                />
              </View>
              <View style={styles.dateInputWrapper}>
                <Text style={styles.dateLabel}>Tháng</Text>
                <TextInput
                  style={styles.dateInput}
                  value={month}
                  onChangeText={setMonth}
                  placeholder="09"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  editable={!isSaving}
                />
              </View>
              <View style={styles.dateInputWrapper}>
                <Text style={styles.dateLabel}>Năm</Text>
                <TextInput
                  style={styles.dateInput}
                  value={year}
                  onChangeText={setYear}
                  placeholder="2004"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  editable={!isSaving}
                />
              </View>
            </View>
          </View>

          {/* Gender */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <HeartIcon size={18} color="#FFF" />
              </View>
              <Text style={styles.cardTitle}>Giới tính</Text>
            </View>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'male' && styles.genderButtonActive]}
                onPress={() => setGender('male')}
                disabled={isSaving}
              >
                <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>
                  Nam
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'female' && styles.genderButtonActive]}
                onPress={() => setGender('female')}
                disabled={isSaving}
              >
                <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>
                  Nữ
                </Text>
              </TouchableOpacity>
              {/* <TouchableOpacity
                style={[styles.genderButton, gender === 'other' && styles.genderButtonActive]}
                onPress={() => setGender('other')}
                disabled={isSaving}
              >
                <Text style={[styles.genderText, gender === 'other' && styles.genderTextActive]}>
                  Khác
                </Text>
              </TouchableOpacity> */}
            </View>
          </View>

          {/* Physical Stats */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <HeartIcon size={18} color="#FFF" />
              </View>
              <Text style={styles.cardTitle}>Chỉ số cơ thể</Text>
            </View>
            <View style={styles.physicalRow}>
              <View style={styles.physicalInputWrapper}>
                <Text style={styles.label}>Chiều cao (cm)</Text>
                <TextInput
                  style={styles.input}
                  value={height}
                  onChangeText={setHeight}
                  placeholder="170"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  editable={!isSaving}
                />
              </View>
              <View style={styles.physicalInputWrapper}>
                <Text style={styles.label}>Cân nặng (kg)</Text>
                <TextInput
                  style={styles.input}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="60"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  editable={!isSaving}
                />
              </View>
            </View>
          </View>

          {/* Error Message */}
          {formError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={isSaving}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  // View Mode
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header with Avatar */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Image 
            source={{ uri: DEFAULT_AVATAR }}
            style={styles.avatar}
            resizeMode="cover"
            onError={(e) => console.log('Avatar load error:', e.nativeEvent.error)}
          />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{user?.name || 'Người dùng'}</Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Text style={styles.editButtonText}>Chỉnh sửa</Text>
        </TouchableOpacity>
      </View>

      {/* NEW: Health Assessment Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <HeartIcon size={18} color="#FFF" />
          </View>
          <Text style={styles.cardTitle}>Đánh giá tổng quan</Text>
        </View>
        
        {/* BMI Row */}
        <View style={styles.statRow}>
          <View style={styles.statLeft}>
            <Text style={styles.statLabel}>Chỉ số BMI</Text>
            <Text style={[styles.statStatus, { color: viewBMIStatus.color }]}>
              {viewBMIStatus.label}
            </Text>
          </View>
          <View style={styles.statRight}>
            <Text style={styles.statValue}>{viewBMI}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Body Fat Row */}
        <View style={styles.statRow}>
           <View style={styles.statLeft}>
            <Text style={styles.statLabel}>Tỷ lệ mỡ (BFP)</Text>
            <Text style={styles.statSubText}>Ước tính theo BMI & Tuổi</Text>
          </View>
          <View style={styles.statRight}>
            <Text style={styles.statValue}>{viewBFP}%</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Water Row */}
        <View style={styles.statRow}>
          <View style={styles.statLeft}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
               <Text style={styles.statLabel}>Nước cần uống</Text>
            </View>
            <Text style={styles.statSubText}>Mỗi ngày</Text>
          </View>
          <View style={styles.statRight}>
            <Text style={[styles.statValue, { color: '#38BDF8' }]}>{viewWater} L</Text>
          </View>
        </View>
      </View>

      {/* Info Cards */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <HeartIcon size={18} color="#FFF" />
          </View>
          <Text style={styles.cardTitle}>Thông tin cơ bản</Text>
        </View>
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxLabel}>Ngày sinh</Text>
            <Text style={styles.infoBoxValue}>
              {user?.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString('vi-VN') : '—'}
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxLabel}>Giới tính</Text>
            <Text style={styles.infoBoxValue}>
              {user?.gender === 'male' ? 'Nam' : user?.gender === 'female' ? 'Nữ' : 'Khác'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <HeartIcon size={18} color="#FFF" />
          </View>
          <Text style={styles.cardTitle}>Chỉ số cơ thể</Text>
        </View>
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxLabel}>Chiều cao</Text>
            <Text style={styles.infoBoxValue}>{user?.height} cm</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxLabel}>Cân nặng</Text>
            <Text style={styles.infoBoxValue}>{user?.weight} kg</Text>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={() => {
          void logout().then(() => {
            router.replace('/login');
          });
        }}
      >
        <Text style={styles.logoutButtonText}>Đăng xuất</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8F6',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#FFAB9D',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#FFAB9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#FFF',
    backgroundColor: '#FFF',
  },
  headerInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
    paddingTop: 9
  },
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFC9BE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF9A8B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#FFF0EC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFC9BE',
    alignItems: 'center',
  },
  infoBoxLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  infoBoxValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FFC9BE',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9A8B',
  },
  // Edit Mode Styles
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FFC9BE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: {
    fontSize: 24,
    color: '#FF9A8B',
  },
  editTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    paddingTop: 8,
  },
  formContainer: {
    gap: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dateInputWrapper: {
    flex: 1,
    gap: 4,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
  },
  dateInput: {
    borderWidth: 2,
    borderColor: '#FFC9BE',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#FFF0EC',
    textAlign: 'center',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFC9BE',
    backgroundColor: '#FFF0EC',
    alignItems: 'center',
  },
  genderButtonActive: {
    borderColor: '#FF9A8B',
    backgroundColor: '#FFE5E5',
  },
  genderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  genderTextActive: {
    color: '#FF9A8B',
  },
  physicalRow: {
    flexDirection: 'row',
    gap: 12,
  },
  physicalInputWrapper: {
    flex: 1,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  input: {
    borderWidth: 2,
    borderColor: '#FFC9BE',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#FFF0EC',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#FF9A8B',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF9A8B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FFC9BE',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  fullInput: {
    borderWidth: 2,
    borderColor: '#FFC9BE',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#FFF0EC',
  },
  // NEW STYLES for Stats Card
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statLeft: {
    flex: 1,
  },
  statRight: {
    alignItems: 'flex-end',
  },
  statLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  statStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  statSubText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  divider: {
    height: 1,
    backgroundColor: '#FFE4DE',
    marginVertical: 12,
  },
});