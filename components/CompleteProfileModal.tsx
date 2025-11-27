import React, { useState } from 'react';
import { Modal, View, ScrollView, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/nativewindui/Text';
import { Button } from '@/components/nativewindui/Button';
import { ActivityIndicator } from '@/components/nativewindui/ActivityIndicator';

type ProfileData = {
  name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  height: number;
  weight: number;
};

type CompleteProfileModalProps = {
  visible: boolean;
  initialName: string;
  onComplete: (data: ProfileData) => Promise<void>;
};

export function CompleteProfileModal({ visible, initialName, onComplete }: CompleteProfileModalProps) {
  const [name, setName] = useState(initialName);
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    try {
      const finalDay = parseInt(day) || 17;
      const finalMonth = parseInt(month) || 9;
      const finalYear = parseInt(year) || 2004;
      
      // Validate date
      if (finalDay < 1 || finalDay > 31) {
        alert('Ngày không hợp lệ (1-31)');
        setLoading(false);
        return;
      }
      if (finalMonth < 1 || finalMonth > 12) {
        alert('Tháng không hợp lệ (1-12)');
        setLoading(false);
        return;
      }
      if (finalYear < 1900 || finalYear > new Date().getFullYear()) {
        alert('Năm không hợp lệ');
        setLoading(false);
        return;
      }
      
      // Check if date is valid (e.g., not Feb 30)
      const dateObj = new Date(finalYear, finalMonth - 1, finalDay);
      if (dateObj.getDate() !== finalDay || dateObj.getMonth() !== finalMonth - 1) {
        alert('Ngày tháng không hợp lệ');
        setLoading(false);
        return;
      }
      
      await onComplete({
        name,
        date_of_birth: `${finalYear}-${String(finalMonth).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`,
        gender,
        height: parseFloat(height) || 160,
        weight: parseFloat(weight) || 60,
      });
    } catch (error) {
      console.error('Failed to complete profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Hoàn thành hồ sơ</Text>
          <Text style={styles.subtitle}>
            Vui lòng cập nhật thông tin cá nhân để tiếp tục
          </Text>
        </View>
        
        <View style={styles.form}>
          {/* Name - Hidden but kept for data */}
          {/* <View style={styles.inputSection}>
            <Text style={styles.label}>Họ và tên</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nhập họ tên"
              placeholderTextColor="#999"
              editable={!loading}
            />
          </View> */}

          {/* Date of Birth */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Ngày sinh</Text>
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
                  editable={!loading}
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
                  editable={!loading}
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
                  editable={!loading}
                />
              </View>
            </View>
          </View>

          {/* Gender */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Giới tính</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'male' && styles.genderButtonActive]}
                onPress={() => setGender('male')}
                disabled={loading}
              >
                <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>
                  Nam
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'female' && styles.genderButtonActive]}
                onPress={() => setGender('female')}
                disabled={loading}
              >
                <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>
                  Nữ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.genderButton, gender === 'other' && styles.genderButtonActive]}
                onPress={() => setGender('other')}
                disabled={loading}
              >
                <Text style={[styles.genderText, gender === 'other' && styles.genderTextActive]}>
                  Khác
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Height */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Chiều cao (cm)</Text>
            <TextInput
              style={styles.input}
              value={height}
              onChangeText={setHeight}
              placeholder="VD: 170"
              placeholderTextColor="#999"
              keyboardType="numeric"
              editable={!loading}
            />
          </View>

          {/* Weight */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Cân nặng (kg)</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              placeholder="VD: 60"
              placeholderTextColor="#999"
              keyboardType="numeric"
              editable={!loading}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleComplete}
            disabled={loading}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFF" />
                <Text style={styles.submitButtonText}>Đang xử lý...</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>Hoàn thành</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F6',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    paddingTop: 25,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
  },
  form: {
    gap: 20,
  },
  inputSection: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  input: {
    borderWidth: 2,
    borderColor: '#FFB3A3',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#FFF0EC',
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
    borderColor: '#FFB3A3',
    borderRadius: 12,
    paddingVertical: 14,
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
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFB3A3',
    backgroundColor: '#FFF0EC',
    alignItems: 'center',
  },
  genderButtonActive: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFE5E5',
  },
  genderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  genderTextActive: {
    color: '#E74C3C',
  },
  submitButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#E74C3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
