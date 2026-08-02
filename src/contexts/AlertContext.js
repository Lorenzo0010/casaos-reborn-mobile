import React, { createContext, useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useTheme } from './ThemeContext';

const AlertContext = createContext();

export const useAlert = () => {
  return useContext(AlertContext);
};

export const AlertProvider = ({ children }) => {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);

  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });

  const showAlert = (title, message, buttons = [{ text: 'OK' }]) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons,
    });
  };

  const closeAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal
        visible={alertConfig.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeAlert}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            {!!alertConfig.message && (
              <Text style={styles.alertMessage}>{alertConfig.message}</Text>
            )}
            
            <View style={[styles.alertButtonsRow, alertConfig.buttons.length >= 3 && styles.alertButtonsColumn]}>
              {(alertConfig.buttons.length >= 3 ? [...alertConfig.buttons].reverse() : alertConfig.buttons).map((btn, idx) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                
                let btnStyle = [styles.alertButton, alertConfig.buttons.length >= 3 && styles.alertButtonColumnItem];
                let textStyle = [styles.alertButtonText];

                if (isCancel) {
                  btnStyle.push({ backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border });
                  textStyle.push({ color: colors.textSecondary });
                } else if (isDestructive) {
                  btnStyle.push({ backgroundColor: colors.error });
                }

                return (
                  <TouchableOpacity
                    key={idx}
                    style={btnStyle}
                    onPress={() => {
                      closeAlert();
                      if (btn.onPress) {
                        // Piccola attesa per permettere la chiusura fluida del modal prima di eseguire azioni pesanti
                        setTimeout(() => btn.onPress(), 100);
                      }
                    }}
                  >
                    <Text style={textStyle}>{btn.text}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

const createStyles = (colors, typography) => StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    width: '80%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  alertTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  alertMessage: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  alertButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    width: '100%',
  },
  alertButtonsColumn: {
    flexDirection: 'column',
  },
  alertButton: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  alertButtonColumnItem: {
    flex: 0,
    width: '100%',
  },
  alertButtonText: {
    ...typography.button,
    color: '#fff',
    textAlign: 'center',
  },
});
