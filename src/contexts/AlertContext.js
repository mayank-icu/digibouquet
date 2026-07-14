import React, { createContext, useContext, useCallback, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

const AlertContext = createContext();

export function AlertProvider({ children }) {
  const [alertData, setAlertData] = useState(null);

  const showAlert = useCallback((title, message, buttons = [{ text: 'OK' }]) => {
    setAlertData({ title, message, buttons });
  }, []);

  const handleClose = () => {
    setAlertData(null);
  };

  const handleButtonPress = (button) => {
    handleClose();
    if (button.onPress) {
      // Need a small timeout to let modal close state settle, especially on iOS
      setTimeout(() => button.onPress(), 50);
    }
  };

  return (
    <AlertContext.Provider value={showAlert}>
      {children}
      {alertData && (
        <Modal 
          transparent 
          animationType="fade" 
          visible={true} 
          onRequestClose={handleClose}
          statusBarTranslucent
        >
          <View style={styles.overlay}>
            <View style={styles.alertBox}>
              {alertData.title ? <Text style={styles.title}>{alertData.title}</Text> : null}
              {alertData.message ? <Text style={styles.message}>{alertData.message}</Text> : null}
              <View style={styles.buttonContainer}>
                {alertData.buttons.map((btn, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.7}
                    style={[
                      styles.button,
                      btn.style === 'cancel' && styles.cancelButton,
                      btn.style === 'destructive' && styles.destructiveButton,
                    ]}
                    onPress={() => handleButtonPress(btn)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        btn.style === 'cancel' && styles.cancelButtonText,
                        btn.style === 'destructive' && styles.destructiveButtonText,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      )}
    </AlertContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  title: {
    fontSize: 20,
    color: '#2A1F00',
    marginBottom: 10,
    fontFamily: 'Manrope-Bold',
  },
  message: {
    fontSize: 15,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
    fontFamily: 'Manrope-Regular',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 12,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#E7C071', // Brand color
    minWidth: 80,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Manrope-Bold',
  },
  cancelButton: {
    backgroundColor: '#f1f1f1',
  },
  cancelButtonText: {
    color: '#444',
  },
  destructiveButton: {
    backgroundColor: '#e53e3e',
  },
  destructiveButtonText: {
    color: '#fff',
  },
});

export function useCustomAlert() {
  return useContext(AlertContext);
}
